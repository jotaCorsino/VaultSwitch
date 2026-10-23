# Evidências — PARSE-001

**Tarefa:** Parser local do TXT do Kaspersky Password Manager<br>
**Data da execução:** 23/10/2026<br>
**Branch:** `feat/PARSE-001-parser`<br>
**Base sincronizada:** `main` em `edc16347f5a25ae26bab554202cd4ebda2b09778`<br>
**Commit de implementação:** `c65949119b79d86643dffe5788fffd9a006cc8de`<br>
**Correção após revisão técnica:** `1bb6ca5709ed5ed594c62432a27604b1b6acef28`<br>
**Correção de desempenho:** `4ba222ac9b29eee9a2613f4d516a284d9b4b841d`<br>
**Mitigação final de segurança:** `d14526d163ce0621c94f2983714182640e74362c`

## 1. Escopo executado

- leitura integral da tarefa PARSE-001, do contrato homologado FMT-001 e das regras locais de arquitetura e segurança;
- consulta ao fluxo, governança, Git/GitHub e segurança do Método ÓRBITA;
- implementação de parser JavaScript puro e independente de DOM em `assets/js/kaspersky-parser.js`;
- testes nativos do Node.js em `tests/kaspersky-parser.test.js`, sem dependências de terceiros;
- cobertura das 18 fixtures fictícias e de 23 cenários adicionais de borda, segurança e desempenho;
- nenhuma implementação de CSV, interface, armazenamento, telemetria ou chamadas de rede;
- nenhum uso, leitura ou cópia do arquivo real do usuário.

## 2. API e resultado

Entrada:

```text
parseKasperskyTxtBytes(ArrayBuffer | Uint8Array, { maxBytes? })
```

Saída:

```text
blocked
records[]
diagnostics[]
counts
```

Cada registro normalizado contém `type`, `title`, `accountName`, `username`, `password`, `url`, `notes`, `group` e `warnings[]`. `Login name` é preservado em `accountName`, separado de `Login`/`username`.

Diagnósticos contêm somente `code`, `severity` e coordenadas estruturais seguras quando aplicáveis: `section`, `recordIndex` e `field`. Nenhum valor do arquivo é incorporado ao diagnóstico.

O limite padrão é **5 MiB** (`DEFAULT_MAX_BYTES`) e pode ser reduzido ou ampliado explicitamente pelo chamador. A verificação ocorre antes da decodificação para limitar uso acidental de memória; exceder o limite retorna `FILE_TOO_LARGE`.

## 3. Comportamentos implementados

- UTF-8 estrito, com remoção de um BOM UTF-8 inicial;
- rejeição antecipada de BOM UTF-16/UTF-32 conhecido e de bytes UTF-8 inválidos;
- rejeição de CR isolado; normalização apenas de CRLF/LF;
- seções inglesas `Websites` e `Applications`;
- delimitadores `---` isolado e linha vazia entre registros estruturalmente completos;
- EOF sem newline final;
- separação no primeiro `:` e remoção de, no máximo, um espaço ASCII sintático;
- preservação dos demais espaços, acentuação, aspas, vírgulas, dois-pontos e `---` dentro de valores;
- ordem e repetição de registros preservadas, sem deduplicação;
- diferença entre campo ausente, vazio, duplicado e desconhecido;
- bloqueio global por qualquer erro, inclusive quando já existem registros reconhecidos em memória;
- índices de lookahead pré-computados em uma única passagem reversa, com consultas O(1) durante o parsing e processamento total aproximadamente O(n) no número de linhas.

Além dos códigos do contrato, foram adicionados diagnósticos de implementação conservadores: `FILE_TOO_LARGE`, `INVALID_LINE_ENDING`, `INVALID_SECTION` e `AMBIGUOUS_RECORD_BOUNDARY`.

## 4. Resultado das 18 fixtures

| Fixture | Resultado observado | Bloqueio |
| --- | --- | --- |
| `01-websites-lf.txt` | 2 websites; valores especiais e ordem preservados | não |
| `02-applications-crlf.txt` | 2 aplicações após normalização CRLF | não |
| `03-notes-multiline-lf.txt` | `UNKNOWN_SECTION`; `Notes` não interpretada | sim |
| `04-empty-fields-lf.txt` | 1 website; 5 `EMPTY_VALUE` de aviso; vazios preservados | não |
| `05-utf8-bom-accents-lf.txt` | BOM removido; acentuação preservada | não |
| `06-delimiter-in-values-lf.txt` | primeiro `:` usado; caracteres e `---` internos preservados | não |
| `07-multiple-accounts-hypothetical-lf.txt` | 2 contas mantidas, na ordem, sem deduplicação | não |
| `08-ptbr-labels-hypothetical-lf.txt` | `UNSUPPORTED_LOCALE`; sem tradução aproximada | sim |
| `09-unknown-section-lf.txt` | `UNKNOWN_SECTION`, seção contabilizada | sim |
| `10-invalid-lf.txt` | `NO_SUPPORTED_RECORDS` | sim |
| `11-windows-1252-hypothetical-crlf.txt` | `INVALID_UTF8`; sem fallback | sim |
| `12-utf16le-hypothetical.txt` | `ENCODING_UNSUPPORTED` | sim |
| `13-missing-required-field-negative-lf.txt` | `MISSING_FIELD` para `Website name` | sim |
| `14-duplicate-field-negative-lf.txt` | `DUPLICATE_FIELD`; nenhum valor escolhido | sim |
| `15-unknown-field-negative-lf.txt` | `UNKNOWN_FIELD`; registro não exportável | sim |
| `16-mixed-supported-unknown-negative-lf.txt` | 1 website reconhecido + `UNKNOWN_SECTION`; resultado global bloqueado | sim |
| `17-comment-multiline-hypothetical-negative-lf.txt` | `AMBIGUOUS_MULTILINE` | sim |
| `18-websites-blank-separated-crlf.txt` | 2 websites separados por linha vazia, com EOF sem newline | não |

## 5. Testes adicionais

Foram cobertos também:

- `ArrayBuffer`, `Uint8Array` e subarray com offsets;
- arquivo vazio, somente whitespace e somente BOM;
- somente cabeçalho sem registros;
- campo estrutural presente porém vazio, distinto de ausente;
- BOM UTF-8 malformado, BOM UTF-16 BE e BOM UTF-32 BE;
- CR isolado;
- campos antes de seção válida;
- conteúdo sem rótulo/multiline sem vazamento no diagnóstico;
- fronteira em branco após registro incompleto, sem fusão com o registro seguinte;
- limite máximo configurável e configuração inválida;
- tipo de entrada de API inválido sem eco do conteúdo;
- duplicidade de campo sensível sem exposição dos valores;
- esquema seguro de diagnósticos para todas as 18 fixtures;
- cabeçalho desconhecido vazio antes da primeira seção suportada;
- preâmbulo desconhecido com duas linhas sem `:` antes de seção suportada;
- seção desconhecida entre duas seções válidas após `---`;
- seção desconhecida vazia entre duas seções válidas separada por linhas em branco;
- preservação de espaços e dois-pontos após o espaço sintático;
- preâmbulo inválido sintético com 50.000 linhas, abaixo do limite padrão, sem varreduras repetidas de sufixo;
- 2.000 blocos desconhecidos sintéticos intercalados com 2.000 registros válidos, preservando bloqueio, contagens e ausência de vazamento nos diagnósticos;
- continuação fictícia de `Comment` formada exatamente por `Websites`, sem fronteira comprovada, bloqueada como `AMBIGUOUS_MULTILINE`;
- continuação fictícia de `Comment` formada exatamente por `Applications`, sem fronteira comprovada, bloqueada como `AMBIGUOUS_MULTILINE`;
- transição positiva para nova seção após linha em branco e registro completo, preservando a fronteira homologada.

## 6. Execução técnica

Runtime usado: Node.js `v24.22.1`, fornecido pelo workspace do Codex.

Comando principal equivalente:

```powershell
node --test --experimental-test-coverage tests\kaspersky-parser.test.js
```

Resultado final:

```text
tests:   41
pass:    41
fail:    0
linhas:  98,76%
branches: 97,01%
funções: 100,00%
```

`node --check` foi aprovado para parser e testes. `git diff --check` foi aprovado antes do commit de implementação.

### Evidência observacional de escalabilidade

A revisão apontou custo quadrático em entradas sem seção reconhecida. A reprodução local no HEAD anterior, com linhas fictícias no formato `Unrecognized field N: FICTITIOUS`, apresentou:

| Linhas | Bytes | Tempo observado antes |
| ---: | ---: | ---: |
| 2.000 | 70.889 | 43,21 ms |
| 4.000 | 142.889 | 132,92 ms |
| 8.000 | 286.889 | 532,93 ms |
| 16.000 | 580.889 | 2.135,11 ms |

Após o pré-cálculo dos lookaheads, cinco execuções por tamanho, com aquecimento e mediana, produziram:

| Linhas | Bytes | Mediana após a correção |
| ---: | ---: | ---: |
| 2.000 | 70.889 | 1,75 ms |
| 4.000 | 142.889 | 1,99 ms |
| 8.000 | 286.889 | 3,31 ms |
| 16.000 | 580.889 | 8,11 ms |
| 32.000 | 1.172.889 | 14,32 ms |
| 64.000 | 2.356.889 | 30,42 ms |

Os números são indicativos desta máquina e não são um benchmark portável. Nenhum valor exato de tempo é usado como gate automatizado. A evidência relevante é a remoção das varreduras de sufixo do loop principal, o crescimento aproximadamente proporcional à entrada e a execução funcional das entradas grandes na suíte.

Após a mitigação final de segurança, a mesma verificação com cinco execuções e mediana manteve o perfil aproximadamente linear: 3,57 ms, 7,95 ms, 15,54 ms e 28,30 ms para 8.000, 16.000, 32.000 e 64.000 linhas, respectivamente. Esses valores também são apenas observacionais.

## 7. Verificações de segurança

- busca estática por `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `localStorage`, `sessionStorage`, `indexedDB` e `console.*`: nenhuma ocorrência no parser ou nos testes;
- o parser não importa módulos, não lê arquivos, não usa DOM e não possui dependências de runtime;
- somente o teste usa `node:fs` para carregar as fixtures fictícias versionadas;
- todos os diagnósticos das 18 fixtures foram validados contra uma lista fechada de propriedades;
- teste específico confirma ausência de valores de senha, domínio e login nos diagnósticos;
- nenhum arquivo real, credencial real ou amostra sensível foi usado;
- não é prometida limpeza criptográfica da memória JavaScript.

## 8. Ocorrências durante a implementação e revisão

A primeira execução da implementação obteve 29/30 testes: na fixture `16`, um cabeçalho desconhecido após `---` era classificado como `AMBIGUOUS_MULTILINE`. A transição foi corrigida para `UNKNOWN_SECTION`, mantendo o registro reconhecido em memória e `blocked=true` no resultado global.

A revisão técnica do PR #5 identificou que conteúdo sem `:` antes de uma seção válida ainda era ignorado e que uma seção desconhecida vazia entre registros separados por linha em branco podia consumir o registro anterior. As quatro regressões solicitadas foram adicionadas primeiro; antes da correção, o resultado foi 33/36, com três falhas que reproduziram esses desvios.

A correção passou a:

- contabilizar como um único `UNKNOWN_SECTION` qualquer bloco desconhecido que anteceda uma próxima seção suportada;
- não reproduzir o cabeçalho ou conteúdo desconhecido nos diagnósticos;
- finalizar com segurança o registro completo anterior quando uma fronteira em branco antecede bloco desconhecido estruturalmente identificável;
- preservar os registros válidos anteriores/posteriores em memória, mantendo obrigatoriamente `blocked=true` no resultado global.

Após a primeira correção, a suíte completa passou em 36/36 testes.

A revisão adicional reproduziu crescimento próximo de O(n²) em conteúdo inválido sem seção suportada. A causa era a combinação de três lookaheads que percorriam linhas futuras durante o loop principal: próxima linha não vazia, próxima seção reconhecida e próxima evidência de seção desconhecida. A correção de desempenho passou a construir três índices `Int32Array` em uma única passagem reversa e a consultar cada posição em O(1), sem alterar os estados, diagnósticos ou regras de reconhecimento. Dois testes sintéticos grandes foram acrescentados sem limiar de tempo dependente de hardware. Após a correção, a suíte completa passou em 38/38 testes.

A revisão final demonstrou que linhas exatamente iguais a `Websites` ou `Applications` imediatamente após `Comment` eram aceitas como nova seção, mesmo sem fronteira estrutural, permitindo truncamento silencioso. As duas regressões foram adicionadas primeiro e reproduziram o problema em 39/41 testes. A mitigação agora emite `AMBIGUOUS_MULTILINE` quando um cabeçalho reconhecido aparece com registro ativo; após linha em branco, a transição só é aceita se o registro anterior estiver completo. A suíte final passou em 41/41 testes e o perfil O(n) foi preservado.

## 9. Limitações e riscos residuais

1. O suporte permanece limitado a rótulos ingleses e às duas variantes de fronteira homologadas.
2. `Notes` e conteúdo multiline reconhecível como ambíguo continuam bloqueados; nenhuma heurística tenta recuperar ou concatenar valores.
3. Windows-1252, UTF-16 e outros fallbacks não são suportados.
4. Uma única observação local fundamenta a variante de linha em branco; isso não demonstra compatibilidade geral com o KPM.
5. Quando `blocked=true`, registros reconhecidos podem permanecer em `records` para inspeção/contagem em memória. Qualquer consumidor futuro deve respeitar obrigatoriamente o gate e não exportá-los parcialmente.
6. O limite de 5 MiB é um default de proteção, não um limite documentado do KPM; o chamador pode configurá-lo conscientemente.
7. Testes automatizados não comprovam ausência de vulnerabilidades nem compatibilidade com exportações reais não avaliadas.
8. Conteúdo sem rótulo e sem fronteira/evidência estrutural suficiente pode permanecer classificado como `AMBIGUOUS_MULTILINE` em vez de `UNKNOWN_SECTION`; ambos bloqueiam globalmente e nenhum conteúdo é descartado silenciosamente.
9. O pré-cálculo usa três vetores de índices com memória O(n) no número de linhas. O limite configurável de bytes restringe a entrada, mas o consumo total em memória também inclui texto decodificado, linhas e índices.
10. Uma linha de continuação de `Comment` exatamente igual a `---` é indistinguível do delimitador pela gramática atualmente homologada e ainda pode encerrar o registro sem bloqueio. A investigação [Issue #6 — REQ-COMMENT-001](https://github.com/jotaCorsino/VaultSwitch/issues/6) é necessária antes de afirmar preservação geral de comentários multiline ou segurança para migração completa.

## 10. Gate

PARSE-001 **homologada pelo responsável para o escopo V0 limitado em 23/10/2026**. O [PR #5](https://github.com/jotaCorsino/VaultSwitch/pull/5) foi integrado à `main` por squash em `81adacb3322f2f2878d0e0b1cc516792ec083c6c`. A homologação **não** resolve o risco de `Comment` multiline com `---` isolado; [Issue #6](https://github.com/jotaCorsino/VaultSwitch/issues/6) permanece bloqueante para o uso real. CSV-001 somente preparada, sem implementação nesta fase.
