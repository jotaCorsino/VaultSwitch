# 06 — Contrato do TXT do Kaspersky Password Manager

**Tarefas:** FMT-001 / PARSE-COMMENT-001<br>
**Estado:** contrato V0 homologado em 23/10/2026; emenda funcional de 24/10/2026 em Draft, sem compatibilidade universal declarada<br>
**Escopo:** leitura das estruturas observadas e fixtures fictícias correspondentes; uso com cofres reais não autorizado

## 1. Objetivo e limite de confiança

Este documento define um contrato conservador para reconhecer exportações TXT do Kaspersky Password Manager (KPM) nas estruturas documentadas. Ele não declara compatibilidade geral com todas as versões, idiomas ou tipos de entrada.

Nenhum conteúdo de exportação do usuário foi versionado. As fixtures do projeto são inteiramente inventadas e existem para tornar decisões, observações estruturais e lacunas reproduzíveis.

### Classificação das afirmações

| Classe | Significado neste documento |
| --- | --- |
| **Confirmado** | Declarado por documentação oficial da Kaspersky. |
| **Observação direta local** | Propriedade conferida por inspeção técnica de um exemplo fornecido pelo usuário; não demonstra comportamento universal de versões ou idiomas do KPM. |
| **Evidência secundária** | Observado em relato público ou implementação independente; útil, mas não normativo. |
| **Hipótese** | Comportamento proposto para teste, ainda sem evidência suficiente do exportador. |
| **Não verificado** | Não foi possível determinar com segurança. Não integra o suporte declarado. |

Uma regra de robustez proposta para o VaultSwitch não transforma uma característica do arquivo de origem em fato confirmado.

## 2. Fontes e rastreabilidade

Consulta realizada em 23/10/2026.

| ID | Fonte | Uso | Limite |
| --- | --- | --- | --- |
| E1 | [Kaspersky Password Manager 25.0 — Import and export data](https://support.kaspersky.com/kpm-for-windows/25.0/130515) | Confirma exportação de credenciais e notas para TXT e ausência de proteção do arquivo. | Não publica gramática, rótulos, delimitadores nem codificação. |
| E2 | [Kaspersky Password Manager 25.0 — Data types protected](https://support.kaspersky.com/kpm-for-windows/25.0/156239) | Confirma o modelo conceitual de websites, aplicações, contas e notas. | Não descreve a representação no TXT. |
| E3 | [Kaspersky Password Manager 25.0 — documentação PT-BR](https://support.kaspersky.com.br/kpm-for-windows/25.0/130515?page=help) | Confirma que a interface/documentação existe em PT-BR e repete o fluxo de exportação. | Não prova que os rótulos dentro do TXT sejam localizados. |
| E4 | [`Draggie306/kaspersky-to-csv`, README](https://github.com/Draggie306/kaspersky-to-csv/blob/a1ee149ed99db20c343d52276479d335f3ecb791/README.md) e [`converter.js`](https://github.com/Draggie306/kaspersky-to-csv/blob/77faeabbdd142841fa9389b7b4c165756f686ac4/converter.js) | Relata teste com KPM 23.2.0.242 e 540 entradas; reconhece seções, campos e `---`. | Implementação independente; não é especificação da Kaspersky e não demonstra outros idiomas/versões. |
| E5 | [`MrSuicideParrot/Kaspersky-Password-Manager-to-CSV`, código](https://github.com/MrSuicideParrot/Kaspersky-Password-Manager-to-CSV/blob/131fd49425ba1f634b7b8864191440b1152090ff/KPM_to_CSV.py) | Corrobora websites/aplicações; acrescenta seção de notas, continuação até linha vazia e leitura UTF-8. | Versão do KPM não identificada; suposições do conversor podem não refletir o exportador atual. |
| E6 | [Relato público de exportação do KPM 9.2](https://sourceforge.net/p/keepass/discussion/329221/thread/cbd1c7b520/) | Corrobora cabeçalho `Websites`, seis rótulos em inglês e separador `---`. | Amostra antiga, parcial e fornecida por usuário. |
| E7 | Exemplo TXT fornecido pelo usuário em 23/10/2026, examinado **somente localmente**, sem transmitir ou versionar o conteúdo | Demonstra cinco registros de `Websites`, os seis rótulos em inglês, registros separados por linha vazia, UTF-8 sem BOM, CRLF e encerramento em EOF sem quebra final. | É uma única amostra. Contém dados sensíveis que **não devem ser copiados** para este repositório, prompts ou relatórios. Não comprova `Applications`, `Notes` ou multiline. |
| E8 | [COMMENT-OBS-001 — segunda exportação fictícia observada](https://github.com/jotaCorsino/VaultSwitch/issues/15#issuecomment-6387657629), registrada sem copiar valores | Demonstra, no mesmo TXT informado como exportação KPM, `Websites`, `Applications` e `Other Accounts`; `Comment` em três linhas; BOM UTF-8; CRLF em Websites/Applications e `\r\r\n` nas continuações de Other Accounts. | Versão/build, canal e locale não informados; observação não prova todas as variantes. |
| E9 | [COMMENT-OBS-001 — C02 observado](https://github.com/jotaCorsino/VaultSwitch/issues/15#issuecomment-6387732955), registrada sem copiar valores | Demonstra `\r\n\r\n---\r\n\r\n` tanto como trecho interno de `Comment` quanto como delimitador estrutural em Websites/Applications. | Confirma risco de ambiguidade local; não contém par mínimo de arquivos completos. |
| E10 | [Decisão funcional da Issue #6](https://github.com/jotaCorsino/VaultSwitch/issues/6#issuecomment-6387967860) | Autoriza priorizar os padrões comuns observados, implementar multiline e três categorias, preservando o risco residual e os gates. | Não autoriza uso real, fechamento das Issues #6/#12/#17 ou heurística declarada como universal. |

O código de terceiros foi consultado apenas como evidência. Nenhum trecho foi incorporado ao VaultSwitch. Arquivos públicos chamados de “sample” não foram abertos, pois sua origem e sanitização não podiam ser garantidas.

## 3. O que as evidências permitem afirmar

| Afirmação | Classe | Base |
| --- | --- | --- |
| O KPM 25.0 exporta credenciais e notas para um arquivo TXT. | **Confirmado** | E1 |
| O TXT exportado não é protegido/criptografado pela aplicação. | **Confirmado** | E1 |
| Websites possuem nome, endereço e uma ou mais contas; aplicações possuem nome e contas. | **Confirmado** | E2 |
| Exportações em inglês podem conter `Websites` e `Applications`. | **Evidência secundária** para `Applications`, **observação direta local** para `Websites` | E4, E5, E6, E7 |
| Websites podem usar `Website name`, `Website URL`, `Login name`, `Login`, `Password` e `Comment`. | **Evidência secundária** | E4, E5, E6 |
| Aplicações podem usar `Application`, `Login name`, `Login`, `Password` e `Comment`. | **Evidência secundária** | E4, E5 |
| Uma linha formada por `---` pode separar registros. | **Evidência secundária** | E4, E6 |
| Uma linha em branco separa os websites no arquivo exemplificado, sem `---`. | **Observação direta local** | E7 |
| O último website pode terminar em EOF sem newline final na variante observada. | **Observação direta local** | E7 |
| Uma seção `Notes` pode usar os campos `Name` e `Text`. | **Evidência secundária**, com menor confiança | E5 |
| Comentários/notas podem continuar em linhas seguintes até uma linha vazia. | **Evidência secundária**, com menor confiança | E5; E4 não implementa a mesma regra |
| A amostra E7 é UTF-8 sem BOM e tem finais CRLF. | **Observação direta local** | E7; não comprova a codificação/EOL de outras exportações. |
| O arquivo é UTF-8. | **Evidência secundária** para comportamento geral | E5 abre explicitamente como UTF-8; E1 não especifica |
| O exportador usa sempre CRLF, LF, BOM UTF-8 ou UTF-16. | **Não verificado** | E7 prova apenas CRLF sem BOM naquela amostra; nenhuma fonte normativa define a variante geral. |
| O idioma da interface determina os rótulos no arquivo. | **Não verificado** | E3 traduz a interface, não mostra o conteúdo exportado |
| Uma conta adicional do mesmo website vira outro bloco repetido. | **Hipótese** | E2 confirma múltiplas contas, mas não sua serialização |
| Tipos como cartões, endereços, documentos e “Other” aparecem no TXT e com quais rótulos. | **Não verificado** | E2 confirma os tipos no cofre, não o formato exportado |
| Uma exportação observada contém `Other Accounts` e os rótulos `Account name`, `Login name`, `Login`, `Password`, `Comment`. | **Observação direta local da estrutura relatada** | E8 |
| Websites e Applications observados preservam continuação de `Comment` com CRLF. | **Observação direta local da estrutura relatada** | E8, E9 |
| Other Accounts observado usa `\r\r\n` nas continuações de `Comment`. | **Observação direta local da estrutura relatada** | E8 |
| `\r\n\r\n---\r\n\r\n` pode ser conteúdo de `Comment` ou delimitador estrutural. | **Observação direta local** | E9 |

## 4. Escopo V0 e emenda funcional

O suporte V0 homologado em PARSE-001 ficou limitado a:

- texto decodificado estritamente como UTF-8, com ou sem BOM UTF-8;
- finais de linha CRLF ou LF, normalizados internamente para LF;
- rótulos em inglês exatamente conhecidos;
- seções `Websites` e `Applications`;
- aceitar **duas variantes de fronteira**, sem assumir que sejam universais: separador `---` (evidência secundária) e linha(s) em branco entre registros completos (observada em E7); também aceitar EOF sem newline final;
- no caso de linhas em branco, considerar fronteira somente com bloco estruturalmente completo e próximo bloco iniciado por identificador/cabeçalho reconhecido; nunca converter conteúdo ambíguo em registro válido;
- campos conhecidos descritos abaixo;
- valores vazios explícitos, sem inventar substitutos;
- preservação da ordem dos registros e dos caracteres do valor.

Este escopo **limitado** foi homologado pelo responsável humano em 23/10/2026 após complementar a investigação com uma amostra local (E7). Websites com rótulos ingleses e separação por linhas em branco foram observados diretamente em uma única amostra; Applications e separador `---` continuam amparados apenas em evidência secundária.

Permaneceram fora do suporte V0:

- rótulos traduzidos, inclusive PT-BR;
- seção `Notes` e valores multilinha, então ainda sem decisão funcional; a lacuna foi rastreada na [Issue #6 — REQ-COMMENT-001](https://github.com/jotaCorsino/VaultSwitch/issues/6);
- codificações Windows-1252, UTF-16 ou qualquer fallback heurístico;
- tipos desconhecidos do cofre;
- arquivos que misturem formatos ou contenham estrutura ambígua.

### 4.1 Emenda funcional PARSE-COMMENT-001 — 24/10/2026

A decisão E10 amplia o parser em Draft, sem apagar os limites históricos do V0. O escopo funcional passa a incluir:

- `Comment` como o último campo conhecido do registro, com continuação livre em linhas subsequentes;
- preservação de espaços, dois-pontos, linhas vazias e linhas isoladas `---` dentro de `Comment`;
- fronteira contextual quando a continuação termina diante de um bloco completo iniciado pelo rótulo estrutural da categoria, de um próximo cabeçalho reconhecido ou de um bloco desconhecido estruturalmente identificável;
- remoção apenas da decoração terminal usada como fronteira (`linhas vazias`, `---`, `linhas vazias`), mantendo ocorrências internas;
- seção `Other Accounts`, tipo normalizado `other`, `Account name` em `title`, `Login name` em `accountName`, `Login` em `username`, `Password`, `Comment` em `notes`, URL vazia e grupo `Other Accounts`;
- UTF-8 com BOM opcional; LF/CRLF; e sequência observada `\r\r\n`, normalizada como uma única quebra lógica `\n`;
- CR isolado fora de `\r\n`/`\r\r\n`, campos desconhecidos antes de `Comment`, seções desconhecidas identificáveis, codificações inválidas e contagens inconsistentes continuam bloqueantes.

Essa política resolve os padrões comuns observados e testados, mas é uma interpretação contextual. E9 demonstra que delimitador e conteúdo podem compartilhar a mesma subsequência; portanto o risco teórico permanece e a Issue #6 não é encerrada por esta implementação.

## 5. Estrutura candidata

### 5.1 Documento

Representação informativa, não código de parser:

```text
documento       := linhas_em_branco* secao+
secao           := secao_websites | secao_apps | secao_other | secao_desconhecida
secao_websites  := "Websites" linhas_em_branco* registro_website*
secao_apps      := "Applications" linhas_em_branco* registro_application*
secao_other     := "Other Accounts" linhas_em_branco* registro_other*
registro        := campos (separador_tracos | separador_branco | proxima_secao | EOF)
separador_tracos := linha cujo conteúdo aparado é exatamente "---"
separador_branco := linha(s) vazia(s) entre registro completo e proximo registro reconhecido
proxima_secao   := cabecalho reconhecido quando não existe registro ativo
campo           := rotulo ":" espaço_sintatico_opcional valor
comment         := "Comment:" valor_inicial ("\n" linha_livre)*
```

A linha em branco imediatamente após o cabeçalho `Websites` é layout, não um registro vazio. Na variante E7, cada registro possui seis campos e os blocos são separados por uma linha em branco; o último termina em EOF sem newline. Isso é **evidência do exemplo local**, não gramática oficial do produto. Se um bloco contiver conteúdo sem rótulo ou fronteira ambígua (como possíveis valores multilinha), a análise deve bloquear em vez de perder dados.

Um cabeçalho `Websites`, `Applications` ou `Other Accounts` encontrado enquanto ainda existe registro ativo e sem contexto de fronteira suficiente é ambíguo com conteúdo multiline. O parser mantém bloqueio para o cabeçalho isolado sem bloco completo/fronteira, evitando truncamento silencioso do registro anterior.

Cabeçalhos e rótulos são comparados literalmente e com diferenciação entre maiúsculas/minúsculas no contrato V0. Relaxar essa regra exigirá evidência e teste próprios.

A ordem de campos exibida pelas fontes é consistente, mas não foi documentada oficialmente. O reconhecedor candidato pode aceitar os rótulos conhecidos em outra ordem dentro do mesmo bloco, desde que não existam duplicidades, desconhecidos ou ambiguidade; isso é uma regra de robustez, não uma propriedade confirmada do exportador.

### 5.2 Website

| Rótulo observado | Cardinalidade candidata | Tratamento |
| --- | --- | --- |
| `Website name` | uma vez | Identificador estrutural; ausente, duplicado ou vazio bloqueia o registro. |
| `Website URL` | uma vez | Ausência bloqueia; valor vazio gera aviso e preservação do registro. |
| `Login name` | uma vez | Pode estar vazio. Não é sinônimo comprovado de `Login`. |
| `Login` | uma vez | Pode estar vazio; não deve ser preenchido a partir de outro campo. |
| `Password` | uma vez | Pode estar vazio; nunca deve aparecer em diagnóstico ou log. |
| `Comment` | uma vez | Pode estar vazio; após o rótulo, linhas de continuação são preservadas conforme a emenda 4.1. |

### 5.3 Aplicação

| Rótulo observado | Cardinalidade candidata | Tratamento |
| --- | --- | --- |
| `Application` | uma vez | Identificador estrutural; ausente, duplicado ou vazio bloqueia o registro. |
| `Login name` | uma vez | Pode estar vazio e deve ser preservado separadamente. |
| `Login` | uma vez | Pode estar vazio. |
| `Password` | uma vez | Pode estar vazio; nunca deve aparecer em diagnóstico ou log. |
| `Comment` | uma vez | Pode estar vazio; após o rótulo, linhas de continuação são preservadas conforme a emenda 4.1. |

### 5.4 Other Accounts

| Rótulo observado | Cardinalidade candidata | Tratamento |
| --- | --- | --- |
| `Account name` | uma vez | Identificador estrutural e origem de `title`; não confundir com `Login name`. |
| `Login name` | uma vez | Origem de `accountName`; vazio é permitido, valor não vazio permanece bloqueante no CSV. |
| `Login` | uma vez | Origem de `username`; vazio é preservado. |
| `Password` | uma vez | Pode estar vazio; nunca aparece em diagnóstico ou log. |
| `Comment` | uma vez | Origem de `notes`, incluindo continuação `\r\r\n` normalizada para uma quebra lógica. |

### 5.5 Notas — provisório e bloqueado

Apenas E5 indica uma seção `Notes` com `Name` e `Text`, incluindo continuação em linhas seguintes. Como as fontes não convergem sobre a fronteira das linhas de continuação, o contrato V0 deve reconhecer a presença da seção para diagnóstico, contabilizá-la como não suportada e bloquear uma conversão que pudesse perder seu conteúdo.

### 5.6 `Login name` não pode ser descartado

As evidências distinguem `Login name` de `Login`. O modelo normalizado atual do projeto possui `username`, mas não possui um campo inequívoco para o nome da conta de origem.

Antes de PARSE-001, deve ser tomada uma decisão rastreável entre:

1. acrescentar um campo de origem como `accountName` ao modelo normalizado; ou
2. preservar o valor em metadados de origem, sem concatená-lo silenciosamente a `notes`; ou
3. comprovar que o campo é sempre vazio/irrelevante no alvo homologado.

Descartar ou remapear automaticamente `Login name` não é permitido.

## 6. Delimitadores e preservação de valores

- O primeiro `:` separa rótulo e valor.
- Dois-pontos posteriores pertencem ao valor e devem ser preservados.
- No máximo um espaço ASCII imediatamente após o primeiro `:` é tratado como espaçamento sintático. Espaços adicionais pertencem ao valor.
- Vírgulas, aspas, ponto e vírgula e caracteres com significado futuro para CSV não possuem função especial no TXT e devem ser preservados literalmente.
- `---` isolado não é mais tratado automaticamente como delimitador depois que `Comment` foi aberto; pode ser conteúdo e deve ser preservado até que o contexto seguinte comprove uma fronteira adotada.
- Linha(s) em branco podem delimitar registros, **apenas** se o bloco anterior estiver estruturalmente completo e o próximo começar com um bloco completo reconhecido ou seção reconhecida.
- Não confundir a linha vazia após cabeçalho de seção com registro vazio; preservar um último registro completo mesmo quando o arquivo terminar sem newline.
- `---` dentro de uma linha de valor não é delimitador.
- Uma linha de continuação formada somente por `---` pode ser preservada como parte de `Comment`; quando precede um bloco completo reconhecido, a implementação funcional a interpreta como decoração de fronteira. O contraexemplo sintético continua demonstrando o risco dessa decisão contextual.
- Linhas vazias fora de valores multilinha são layout ou fronteira, conforme contexto; não criam registros vazios.
- As observações E8/E9 fundamentam o suporte funcional multiline nas três categorias, mas não comprovam ausência de ambiguidade geral.
- Registros repetidos não devem ser deduplicados, agrupados ou fundidos automaticamente.

A PARSE-COMMENT-001 passa a acumular linhas após `Comment` e só remove a decoração terminal quando identifica o próximo bloco/seção conforme a emenda 4.1. Esse comportamento prioriza os padrões usuais observados, mas não resolve a colisão em que conteúdo imita um registro completo. O risco residual continua rastreado na [Issue #6 — REQ-COMMENT-001](https://github.com/jotaCorsino/VaultSwitch/issues/6).

O parser futuro não deve aplicar `trim()` indiscriminado a segredos ou notas. Qualquer normalização de espaços precisa distinguir sintaxe do exportador de conteúdo do usuário.

## 7. Codificação e finais de linha

### 7.1 Política candidata de decodificação

1. Ler bytes, não texto presumido.
2. Detectar BOM antes de decodificar.
3. Aceitar e remover somente BOM UTF-8 (`EF BB BF`).
4. Rejeitar BOM UTF-16 LE/BE com `ENCODING_UNSUPPORTED` até existir evidência e teste homologados.
5. Sem BOM, tentar UTF-8 estrito; qualquer sequência inválida produz `INVALID_UTF8`.
6. Não substituir bytes inválidos por `U+FFFD` e não fazer fallback silencioso para Windows-1252.
7. Normalizar CRLF e LF para uma representação interna comum; aceitar também `\r\r\n` observado em continuações de Other Accounts como uma única quebra lógica; rejeitar qualquer outro CR isolado.

E7 demonstrou UTF-8 sem BOM e CRLF em **uma** exportação. E8/E9 registram UTF-8 com BOM, CRLF e `\r\r\n` nas estruturas indicadas. Aceitar LF continua regra de robustez, não afirmação universal.

### 7.2 Codificações ainda não suportadas

Windows-1252 é plausível em aplicações Windows antigas, mas não foi confirmado. UTF-16 também não foi confirmado. As fixtures correspondentes são sondas negativas: servem para demonstrar detecção/bloqueio, não compatibilidade.

## 8. Algoritmo de reconhecimento implementado

PARSE-001 e a emenda PARSE-COMMENT-001 seguem esta ordem:

1. **Pré-validação de bytes:** arquivo vazio, BOM e limite de tamanho.
2. **Decodificação estrita:** conforme a política da seção 7.
3. **Normalização de linhas:** CRLF/LF para LF; `\r\r\n` observado em `Other Accounts` para uma única quebra lógica; outros CR isolados são rejeitados.
4. **Detecção de idioma/variante:** procurar apenas cabeçalhos homologados; não traduzir por aproximação.
5. **Detecção de seção:** iniciar contexto somente em cabeçalho conhecido.
6. **Coleta de registro:** os rótulos conhecidos são lidos até `Comment`; depois dele, linhas livres, vazias e `---` são acumuladas até uma fronteira contextual com próximo registro/seção identificável ou EOF. Um novo registro estrutural incompleto após decoração de fronteira é separado e bloqueado, não incorporado à nota anterior.
7. **Leitura de campo:** separar somente no primeiro `:` e validar rótulo literal.
8. **Validação estrutural:** detectar rótulo ausente, duplicado, desconhecido ou fora de seção.
9. **Preservação:** manter ordem, campos vazios e metadados de origem; nunca deduplicar.
10. **Resultado:** registros suportados, registros bloqueados e avisos contabilizados separadamente.
11. **Gate de perda:** se existir seção, registro ou campo desconhecido, a conversão completa deve permanecer bloqueada até decisão explícita; nenhum conteúdo é descartado silenciosamente.

## 9. Erros e avisos

Os diagnósticos devem conter apenas código, seção, índice do registro e nome do campo quando seguro. Valores de `Password`, `Comment`, `Text`, `Login` e demais conteúdos não devem ir para UI de erro, console ou telemetria.

| Código proposto | Severidade | Efeito |
| --- | --- | --- |
| `EMPTY_FILE` | erro | Bloqueia o arquivo. |
| `ENCODING_UNSUPPORTED` | erro | Bloqueia o arquivo. |
| `INVALID_UTF8` | erro | Bloqueia o arquivo; sem substituição silenciosa. |
| `UNSUPPORTED_LOCALE` | erro | Bloqueia até existir contrato para os rótulos. |
| `UNKNOWN_SECTION` | erro | Contabiliza a seção e bloqueia perda potencial. |
| `UNKNOWN_FIELD` | erro | Preserva a ocorrência como não interpretada e bloqueia o registro. |
| `DUPLICATE_FIELD` | erro | Bloqueia o registro; não escolhe um valor arbitrariamente. |
| `MISSING_FIELD` | erro/aviso | Bloqueia quando o rótulo estrutural inexiste; campo conhecido presente e vazio gera aviso. |
| `AMBIGUOUS_MULTILINE` | erro | Bloqueia o registro. |
| `NO_SUPPORTED_RECORDS` | erro | Bloqueia a conversão. |
| `EMPTY_VALUE` | aviso | Mantém o registro e o valor vazio, quando estruturalmente permitido. |

## 10. Matriz de casos

| Caso | Evidência do formato | Fixture | Resultado esperado do contrato atual |
| --- | --- | --- | --- |
| Dois websites, LF, campos em inglês | Secundária convergente | `01-websites-lf.txt` | Reconhecer 2 registros. |
| Aplicações, CRLF | Secundária para estrutura; EOL não verificado | `02-applications-crlf.txt` | Reconhecer 2 registros após normalizar CRLF. |
| Notas multilinha | Secundária de uma única implementação | `03-notes-multiline-lf.txt` | Detectar `Notes`, contabilizar e bloquear como provisório. |
| Campos presentes e vazios | Secundária | `04-empty-fields-lf.txt` | Preservar vazios e emitir avisos; não descartar. |
| UTF-8 BOM e acentuação | BOM hipotético; UTF-8 secundário | `05-utf8-bom-accents-lf.txt` | Remover BOM e reconhecer 1 registro. |
| Dois-pontos, vírgulas, aspas e `---` no valor | Robustez proposta | `06-delimiter-in-values-lf.txt` | Preservar valores; somente linha `---` delimita. |
| Duas contas para o mesmo website | Modelo oficial; serialização hipotética | `07-multiple-accounts-hypothetical-lf.txt` | Manter 2 registros, sem deduplicar; cenário não comprova o exportador. |
| Rótulos PT-BR inventados | Não verificado | `08-ptbr-labels-hypothetical-lf.txt` | `UNSUPPORTED_LOCALE`; não traduzir automaticamente. |
| Seção/tipo desconhecido | Tipos adicionais oficiais; serialização desconhecida | `09-unknown-section-lf.txt` | `UNKNOWN_SECTION` e bloqueio. |
| Texto sem estrutura | Negativo | `10-invalid-lf.txt` | `NO_SUPPORTED_RECORDS`. |
| Windows-1252 com CRLF | Hipótese | `11-windows-1252-hypothetical-crlf.txt` | `INVALID_UTF8`/`ENCODING_UNSUPPORTED`; sem fallback. |
| UTF-16 LE com BOM | Hipótese | `12-utf16le-hypothetical.txt` | `ENCODING_UNSUPPORTED`. |
| Rótulo estrutural ausente em registro conhecido | Negativo inventado | `13-missing-required-field-negative-lf.txt` | `MISSING_FIELD`; bloquear o registro. Diferente de valor vazio. |
| Rótulo duplicado em registro conhecido | Negativo inventado | `14-duplicate-field-negative-lf.txt` | `DUPLICATE_FIELD`; bloquear sem escolher valor. |
| Rótulo desconhecido em registro conhecido | Negativo inventado | `15-unknown-field-negative-lf.txt` | `UNKNOWN_FIELD`; preservar a ocorrência como não interpretada e bloquear. |
| Website reconhecível seguido por seção desconhecida | Negativo inventado | `16-mixed-supported-unknown-negative-lf.txt` | `UNKNOWN_SECTION`; bloquear o resultado global, inclusive o website reconhecido, sem exportação parcial implícita. |
| `Comment` em múltiplas linhas | Fixture histórica inventada | `17-comment-multiline-hypothetical-negative-lf.txt` | Preservar a continuação do `Comment`; não bloquear. |
| Websites em blocos separados por linha em branco, CRLF, EOF sem newline | Estrutura observada localmente (E7), **valores fictícios inventados** | `18-websites-blank-separated-crlf.txt` | Reconhecer dois websites fictícios sem exigir `---` nem newline final. |
| Comentário que imita registro completo | Contraexemplo sintético, não observado | `19-comment-delimiter-ambiguous-hypothetical-lf.txt` | Preservar como risco documentado: a política contextual o interpreta como dois registros; não declarar gramática universal. |
| Três categorias, comentários multiline, BOM, CRLF/CRRLF e `---` interno/estrutural | Estruturas observadas E8/E9; **todos os valores inventados** | `20-three-categories-multiline-observed-structure-crlf.txt` | Reconhecer quatro registros, normalizar quebras lógicas e preservar exatamente cada `Comment` em `notes`. |
| Campo desconhecido em `Other Accounts` | Negativo inventado | `21-other-accounts-invalid-field-negative-lf.txt` | `UNKNOWN_FIELD`; bloquear globalmente e impedir CSV parcial. |

O inventário detalhado está em [`tests/fixtures/kaspersky/README.md`](../tests/fixtures/kaspersky/README.md).

## 11. Gates históricos e atuais

PARSE-001 foi iniciado após homologação humana deste contrato e das seguintes decisões históricas:

1. aceitar formalmente o escopo limitado a rótulos em inglês; `Websites` tinha observação local E7, enquanto `Applications` permanecia apoiado em evidência secundária; suportar ambos os separadores identificados;
2. decidir como preservar `Login name` no modelo normalizado;
3. decidir se a seção `Notes` fica bloqueada na primeira versão ou obter uma estrutura sanitizada/manual suficiente para homologá-la;
4. aceitar a política UTF-8 estrita ou adicionar evidência para outra codificação;
5. manter desconhecidos e perdas potenciais como bloqueio contabilizado;
6. usar apenas fixtures fictícias; nenhuma exportação real pode entrar no repositório, em logs ou em prompts.

**Decisão de planejamento de 23/10/2026:** autorizada a preparação de PARSE-001 com rótulos ingleses de `Websites`/`Applications`, as duas variantes de delimitador documentadas, `accountName` separado de `username`, UTF-8 estrito (BOM opcional), bloqueio de `Notes`/multiline e bloqueio global para dados desconhecidos. Nenhum dado sensível da amostra será integrado ao projeto. O contrato homologado é o ponto de partida dos testes, **não** certificação de migração completa de um cofre real.

**Decisão funcional de 24/10/2026:** E10 autoriza implementar comentários multilinha e `Other Accounts` segundo E8/E9, substituir os testes de bloqueio provisório por preservação funcional e manter os gates de segurança. O serializador continua bloqueando `accountName` não vazio; `Notes`, desconhecidos e erros estruturais continuam bloqueantes; as Issues #6, #12 e #17 permanecem abertas. Esta emenda em Draft não libera cofres reais, não encerra a ambiguidade teórica do delimitador e depende de homologação humana no PR.
