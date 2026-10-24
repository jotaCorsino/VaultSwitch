# COMMENT-OBS-001 — Observação controlada do TXT exportado pelo KPM

**Projeto:** VaultSwitch  
**Método:** ÓRBITA — Planejar → Observar → Evidenciar → Decidir → Implementar em outra tarefa → Homologar  
**Estado:** planejada, coleta do exportador não executada  
**Issue de execução:** [#15](https://github.com/jotaCorsino/VaultSwitch/issues/15)  
**Requisito bloqueante:** [#6 — REQ-COMMENT-001](https://github.com/jotaCorsino/VaultSwitch/issues/6)  
**Investigação anterior homologada:** [COMMENT-INV-001](../evidencias/COMMENT-INV-001.md) / [PR #14](https://github.com/jotaCorsino/VaultSwitch/pull/14)  
**Outro gate:** [#12 — accountName](https://github.com/jotaCorsino/VaultSwitch/issues/12)

## Objetivo

Observar **a saída do exportador oficial** do Kaspersky Password Manager (KPM) em versão/build identificados para decidir se é possível reconstruir, a partir do TXT, comentários `Comment` com múltiplas linhas sem confundi-los com separadores, rótulos e novos registros.

A investigação anterior demonstrou **a colisão lógica no parser atual**, usando TXT criado manualmente. **Não** comprovou que o KPM oficialmente exporte aquele mesmo formato quando o usuário digita essas linhas. Esta etapa é de **coleta controlada**, não implementação do parser.

## Regra para o experimento

Criar em KPM **um conjunto isolado e descartável contendo somente informações inteiramente fictícias**, sem misturar com cofre de uso pessoal ou de cliente. Usar URLs fictícias `*.invalid` e logins/senhas inventados exclusivamente para estes testes. Se não for possível isolar dados, não exportar nenhum cofre existente: registrar o impedimento e prosseguir pela análise documental.

O TXT exportado deve ser produzido pelo **próprio KPM**, sem edição posterior. Arquivos construídos à mão testam o parser, não comprovam o comportamento do KPM.

**Não alterar parser, CSV nem UI e não abrir QA-001 nesta tarefa.**

## Registro de ambiente (obrigatório)

| Atributo | Valor observado |
| --- | --- |
| Data | A preencher |
| Kaspersky Password Manager — versão e build | A preencher |
| Windows — versão e idioma | A preencher |
| Idioma dos rótulos exportados | A preencher |
| Canal de exportação (aplicativo local / web, se aplicável) | A preencher |
| Opções/configuração da exportação | A preencher |
| Número de registros fictícios criados e exportados | A preencher |
| Observações sobre formato | A preencher |

## Lote 1 — casos críticos

Usar os nomes, URLs e credenciais fictícios definidos para cada caso e salvar cada exportação separadamente fora do repositório antes de conferir.

### C03 — `---` no próprio Comment

Criar **uma** entrada `Websites` com:

- Nome fictício: `FICTITIOUS-C03-A`
- URL: `https://c03.vaultswitch.invalid/a`
- Login name: vazio (quando permitido)
- Login: `fictional-c03@example.invalid`
- Senha: `FICTITIOUS-C03-ONLY`
- `Comment` digitado no KPM (3 linhas):

```text
linha anterior fictícia
---
linha posterior fictícia
```

Exportar oficialmente e examinar se a linha `---` inserida pelo usuário é idêntica a uma fronteira de registro ou recebe escaping, delimitação, citação ou indentação que a distingue. Registrar também se o KPM altera quebras de linha na exportação.

### C05 — Comment contendo rótulos aparentemente estruturais

Criar outra entrada fictícia com um comentário semelhante a:

```text
linha inicial fictícia
Website name: TEXTO-DO-COMENTARIO-FICTICIO
Website URL: https://rótulo.vaultswitch.invalid/
Login name:
Login: nome-mencionado-ficticio
Password: FICTITIOUS-MENTION
Comment: texto interno fictício
```

Exportar e verificar se a representação mantém o texto como `Comment` ou permite interpretá-lo como campos novos/duplicados.

### C08 — Comentário complexo seguido por outro registro verdadeiro

Criar um `Website A` com conteúdo multiline contendo `---` e sequência de rótulos falsos; **após ele**, criar um `Website B` verdadeiro com campos fictícios diferentes. Exportar os dois, registrar quantos registros realmente existiam na UI KPM e como o TXT distingue `Comment` de fronteiras.

### Par mínimo A/B — teste decisivo de identificabilidade

Comparar duas situações em ambientes fictícios:

- **A:** um website legítimo com `Comment` que imita delimitador e todos os rótulos de um segundo website.
- **B:** dois websites legítimos cujos campos correspondem à mesma sequência de texto.

Exportar ambas pela função oficial, manter bytes originais, registrar hashes e comparar o corpo estrutural. Se os arquivos se tornarem **indistinguíveis** e não houver metadados adicionais suficientes, nenhum parser do TXT isolado conseguirá reconstruir o estado original em todos os casos. A presença de diferença **não basta sozinha**: identificar qual marca é confiável e demonstrar estabilidade nas versões/variantes testadas.

## Lote 2 — completar a matriz C01–C10

Após os casos críticos:

| Caso | Conteúdo proposto |
| --- | --- |
| C01 | Comment com 2+ linhas normais |
| C02 | Parágrafos separados por linhas vazias |
| C04 | Linha `  ---  ` com espaços |
| C06 | `Websites` e `Applications` como linhas do Comment |
| C07 | Comment vazio, multiline no último registro e EOF |
| C09 | Comment multiline de `Applications`, se disponível |
| C10 | Acentos, aspas, vírgulas, URLs, dois-pontos e `---` no meio da linha |

Em cada caso, incluir, quando pertinente, uma segunda entrada fictícia para observar a fronteira com o próximo registro.

## Exame local dos bytes

**Não abrir e salvar o TXT em editor antes da inspeção.** Anotar, sem copiar dados alheios, tamanho, SHA-256, BOM/codificação, CRLF vs. LF, presença de `\r` isolado, newline final em EOF, espaçamento, escaping, separadores e ordem das seções. Comparar o Comment escrito no KPM com as linhas exportadas, caractere por caractere.

Exemplo de relatório **somente de metadados** em PowerShell, substituindo o caminho por arquivo do cofre fictício:

```powershell
$arquivo = "C:\\Caminho\\FICTITIOUS-C03.txt"
$bytes = [IO.File]::ReadAllBytes($arquivo)
$sha = (Get-FileHash -LiteralPath $arquivo -Algorithm SHA256).Hash
$bom = $bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191
$crlf = 0; $lf = 0; $cr = 0
for ($i = 0; $i -lt $bytes.Length; $i++) {
  if ($bytes[$i] -eq 13) {
    if ($i + 1 -lt $bytes.Length -and $bytes[$i+1] -eq 10) {
      $crlf++; $i++
    } else { $cr++ }
  } elseif ($bytes[$i] -eq 10) { $lf++ }
}
[pscustomobject]@{
  Bytes = $bytes.Length
  SHA256 = $sha
  UTF8_BOM = $bom
  CRLF = $crlf
  LF_Solto = $lf
  CR_Solto = $cr
  EOF_Newline = ($bytes.Length -gt 0 -and ($bytes[-1] -eq 10 -or $bytes[-1] -eq 13))
}
```

Esse comando **não valida UTF-8** nem identifica a gramática por si só. Não o interpretar como prova de preservação; examinar a estrutura dos arquivos fictícios separadamente.

## Registro de resultados

Para cada caso C01–C10:

| Campo | Registrar |
| --- | --- |
| Versão/locale KPM e ID do caso | Identificados |
| Quantidade real de itens no KPM | Número conferido |
| TXT oficial íntegro | Observado? Sim/Não |
| Estrutura de fronteira | Evidência literal fictícia |
| Preservação do comentário | Integral / Alterado / Indeterminado |
| Comparação de bytes e par mínimo | Igual / Diferente / Não realizado |
| Classificação | Distinguível / Indistinguível / Inconclusivo |
| Confiança | Comprovado na versão testada / Hipótese |

Não inserir exportações de cofre de uso diário, senhas reais ou captura da UI com informação alheia no GitHub. Arquivos oficiais fictícios podem ser versionados **somente depois de conferência humana de todo o conteúdo**.

## Decisão ÓRBITA

- **Se houver delimitação segura comprovada:** documentar a gramática real por versão, planejar `FMT-COMMENT-001` e depois `PARSE-COMMENT-001`; o código atual não é automaticamente homologado.
- **Se não houver:** registrar impossibilidade de reconstrução geral pelo TXT isolado e avaliar fonte estruturada alternativa/fluxo de verificação realmente suficiente; não adotar heurística de splitting que faça perda silenciosa.
- **Se inconclusivo:** manter Issue #6 aberta, relacionar experimentos faltantes e não prometer migração completa.

Apenas após essa decisão poderá ser iniciada implementação de suporte multiline. A [Issue #12](https://github.com/jotaCorsino/VaultSwitch/issues/12) é problema adicional e continua independente. A UI-001/PR #11 não deve ser integrada como parte desta coleta.

## Encaminhamento de execução

O Codex pode preparar scripts de inspeção de **metadados** e templates, auxiliar na comparação de exports fictícios e escrever `docs/evidencias/COMMENT-OBS-001.md`. Ele **não deve inventar observações do KPM**, modificar o parser, nem marcar testes sem exportador executado como aprovados. A coleta dependerá do responsável com acesso ao aplicativo, sem necessidade de mudar de computador se o KPM estiver disponível no equipamento atual.

Encerrar com relatório, teste de reproduzibilidade por versão e gate de revisão/homologação humana. Não realizar merge da implementação, encerrar a Issue #6, iniciar QA-001 ou liberar uso real.
