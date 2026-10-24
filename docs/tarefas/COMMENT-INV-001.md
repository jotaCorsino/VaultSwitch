# COMMENT-INV-001 — Investigar fronteiras de `Comment` multilinha no TXT Kaspersky

**Projeto:** VaultSwitch  
**Método:** ÓRBITA — Planejar → Executar → Evidenciar → Homologar  
**Estado:** investigação preparada; implementação de parser NÃO autorizada nesta tarefa  
**Dependência:** [Issue #6 — REQ-COMMENT-001](https://github.com/jotaCorsino/VaultSwitch/issues/6)  
**Base técnica:** PARSE-001 e CSV-001 homologados V0; UI-001 no [Draft PR #11](https://github.com/jotaCorsino/VaultSwitch/pull/11), sem merge  
**Outro bloqueio independente:** [Issue #12 — `Login name` / `accountName`](https://github.com/jotaCorsino/VaultSwitch/issues/12)

## 1. Objetivo

Descobrir **como o exportador Kaspersky realmente serializa** comentários com múltiplas linhas, parágrafos e texto idêntico a separadores ou rótulos estruturais; determinar se o TXT contém informações suficientes para reconstruir todos os comentários e as fronteiras de registro **sem perda nem interpretação arbitrária**.

Esta tarefa **não é implementação** do suporte multiline e não autoriza alterar a gramática, converter cofre real nem declarar o conversor pronto.

## 2. Evidência já disponível

- Um TXT de cinco websites fornecido como fictício foi comparado com seu CSV gerado: cinco entradas de origem e cinco linhas CSV, com valores equivalentes nos campos mapeados, UTF-8 sem BOM na saída, CRLF e zero divergências. Essa amostra só contém `Comment` vazio ou de uma linha e `Login name` vazio — **não comprova multiline**. Nenhum conteúdo desta amostra deve ser copiado para repositório/testes.
- O contrato `docs/06-CONTRATO-TXT-KASPERSKY.md` reconhece duas variantes de separação: `---` (evidência secundária) e linhas em branco entre registros completos (uma amostra local anteriormente observada).
- O parser de `main` consegue aceitar duas interpretações possíveis de uma sequência de bytes, **sem bloquear**. Na reprodução puramente sintética registrada no [comentário da Issue #6](https://github.com/jotaCorsino/VaultSwitch/issues/6), uma anotação de `Comment` que contém `---` isolado e várias linhas simulando os campos de um website leva a `blocked=false` e **dois registros**; uma leitura pretendida era **um registro com comentário livre multiline**. Isto comprova a ambiguidade lógica do contrato, **não** que o KPM oficial produza exatamente essa sequência.
- A [documentação oficial Kaspersky de exportação TXT](https://support.kaspersky.com/help/KPM/Win25.0/en-US/130515.htm) não estabelece um contrato normativo para escapar `---` dentro de comentários. Implementações de terceiros que dividem registros por `\n---\n` **não são prova** de resolução da ambiguidade.

## 3. Experimentos requeridos — dados integralmente fictícios

Usar versão identificada do KPM, com um **cofre de testes separado, sem credenciais reais**. Não alterar dados de cliente.

| Caso | Conteúdo do `Comment` inventado | Risco a observar |
| --- | --- | --- |
| C01 | Texto com 2 ou mais linhas simples | Continuação e quebra de linha |
| C02 | Duas linhas vazias entre parágrafos | Fronteira por linha em branco |
| C03 | Linha cujo conteúdo é exatamente `---` | Confusão com delimitador |
| C04 | Linha `---` com espaços antes/depois | Tratamento de trim/escape |
| C05 | Linhas começando com `Website name:`, `Password:`, `Comment:` | Falso registro/campo |
| C06 | Linha isolada `Websites` ou `Applications` | Falsa mudança de seção |
| C07 | Comentário vazio e comentário multilinha no último registro | EOF sem newline |
| C08 | Website A com multiline seguido de Website B normal | Fronteira entre registros |
| C09 | `Applications` com multiline, se disponível | Estrutura fora de Websites |
| C10 | Dois-pontos, acentos, aspas, URLs e caracteres `---` dentro de linha | Preservação sem normalizações indevidas |

Para cada caso, registrar **estrutura e bytes esperados** comparando a edição no KPM com o TXT oficial exportado: CRLF/LF, escape/aspas, indentação, delimitadores, duplicação de rótulos, metadados, número de registros e EOF. Usar somente exemplos com valores inventados.

Não tratar um TXT **editado manualmente** como evidência do comportamento do exportador: isso serve apenas para testar o parser, não para homologar a gramática KPM.

## 4. Análise de identificabilidade

Antes de escrever parser novo:

1. Tentar construir **dois cofres fictícios diferentes** (p.ex., um registro com comentário contendo `---` e campos falsos vs. dois registros verdadeiros) que produzem **o mesmo TXT ou saída indistinguível**.
2. Se as saídas forem indistinguíveis, **não há algoritmo que determine com certeza a intenção pelo TXT isolado**. Bloquear o processamento quando detectar risco pode ser insuficiente se a ambiguidade também imita um caso válido; documentar limitação formal e buscar uma fonte estruturada alternativa, escape próprio do exportador, ou fluxo de verificação que comprovadamente evite perda antes de lançar.
3. Se houver diferenciação observável, documentar contrato exato **por versão/variante KPM** e casos desconhecidos como bloqueados; não generalizar sem prova.
4. Distinguir nitidamente texto em `Comment` (campo de conta) de seção `Notes` do KPM, que é outra estrutura e segue não homologada na V0.

## 5. Entregáveis do Codex

- Relatório técnico `docs/evidencias/COMMENT-INV-001.md` com métodos, fontes, versões KPM quando disponíveis, matriz de casos e **conclusão condicionada às evidências**.
- Inventário de fixtures **100% artificiais**, onde forem úteis para demonstrar ambiguidade do parser; marcar explicitamente `hipotética` vs. `observada em exportação fictícia KPM`.
- Tabela indicando para cada teste: `aceito sem perda`, `bloqueado corretamente`, `aceito com risco de interpretação` ou `não verificável`.
- Decisão proposta de arquitetura: suporte comprovado, bloqueio seguro demonstrável ou necessidade de outra via de importação. Sem inventar uma gramática.
- Plano **separado** para implementação real, testes de regressão e homologação humana somente após contrato aprovado.
- Branch própria `investigation/COMMENT-INV-001` e **Draft PR**, se houver alterações documentais/fixtures. Não mexer em `assets/js/kaspersky-parser.js`, `assets/js/keepassxc-csv.js` nem nos arquivos da UI-001 nesta investigação.

## 6. Critérios de conclusão

- [ ] A diferença entre **observação do exportador** e **suposição sintética** está explícita.
- [ ] Fronteiras `---`, linhas em branco, seções, campos e EOF cobertas por matriz.
- [ ] Não foi feita migração parcial silenciosa nem inferência sem prova.
- [ ] Nenhuma credencial real, TXT/CSV pessoal ou registro com segredo foi enviado ao GitHub, ChatGPT, logs, screenshots ou fixtures.
- [ ] Existe recomendação fundamentada e decisões/gates pendentes claramente descritos.
- [ ] A Issue #6 permanece aberta até **implementação e homologação posteriores**, não se fecha por esta tarefa documental.

## 7. Ordem de trabalho

1. Inspecionar contrato/parser atual e evidências da Issue #6; propor experimentos sem tocar produção.
2. Reproduzir com dados sintéticos o contraexemplo `blocked=false` / registros extras, sem copiar anexos de usuário.
3. Produzir relatório preliminar; marcar casos KPM reais **pendentes** se não houver exportador instalado ou acesso a cofre de teste.
4. Solicitar ao responsável apenas a coleta **fictícia** faltante, com roteiro passo a passo, se necessária. Nunca travar o restante do trabalho por falta de acesso.
5. Entregar Draft PR / parecer para próxima decisão humana. Não mergear parser nem concluir Issue #6.
