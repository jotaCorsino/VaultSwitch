# Evidências — COMMENT-INV-001

**Tarefa:** `docs/tarefas/COMMENT-INV-001.md`<br>
**Issue bloqueante:** [#6 — REQ-COMMENT-001](https://github.com/jotaCorsino/VaultSwitch/issues/6)<br>
**Branch:** `investigation/COMMENT-INV-001`<br>
**Base:** `main@c84692b6d8ccb832f48584e1577eed92c20861a9`<br>
**Data da investigação:** 24/10/2026<br>
**Estado:** aguardando observação controlada do exportador e homologação humana; nenhuma mudança de parser autorizada

## 1. Resultado executivo

A investigação reproduziu com dados integralmente fictícios a ambiguidade registrada na Issue #6. O mesmo TXT sintético é aceito pelo parser V0 com `blocked=false` e dois websites, embora a mesma sequência de bytes possa ser descrita como um website cujo `Comment` contém uma linha isolada `---` e linhas seguintes semelhantes a campos.

Isso comprova uma limitação do contrato/parser atual, mas **não comprova que o Kaspersky Password Manager (KPM) emita essa sequência**. A documentação oficial consultada confirma a exportação de credenciais e notas para TXT, porém não especifica rótulos, delimitadores, escaping, codificação, quebras de linha ou representação de comentários multiline.

Não foi disponibilizada ao agente uma exportação produzida por um cofre KPM de testes isolado e integralmente fictício. Portanto, os casos C01–C10 permanecem não verificáveis quanto ao comportamento do exportador. O roteiro controlado necessário está documentado na seção 8; a ausência dessa observação não impediu a reprodução sintética, a análise de identificabilidade nem a proposta arquitetural.

**Decisão proposta:** não alterar o parser e não liberar uso real. Se o experimento controlado não encontrar uma informação estrutural inequívoca, o TXT isolado não poderá sustentar uma conversão geral e sem perda de comentários multiline. Nesse caso será necessária outra fonte estruturada ou um fluxo adicional que torne a interpretação demonstravelmente verificável.

## 2. Escopo e controles de segurança

- foram lidos integralmente a tarefa COMMENT-INV-001, o contrato FMT-001 e o parser vigente;
- foram consultadas as regras de fluxo, governança, Git/GitHub e segurança do Método ÓRBITA;
- a branch foi criada da `main` remota sincronizada, com a árvore previamente limpa;
- não foram usados arquivos reais, credenciais reais, anexos, screenshots ou trechos de cofre do usuário;
- os valores versionados foram escritos do zero, usam domínios `.invalid` e marcadores `FICTITIOUS`;
- nenhum diagnóstico de teste contém valores de senha, domínio ou login da fixture;
- `assets/js/kaspersky-parser.js`, `assets/js/keepassxc-csv.js` e os arquivos da UI-001 não foram modificados;
- nenhuma migração, CSV, interface, chamada de rede de runtime ou persistência foi implementada.

## 3. Fontes e confiança

| ID | Fonte consultada | Classe | O que sustenta | Limite |
| --- | --- | --- | --- | --- |
| I1 | [KPM 25.0 — Import and export data](https://support.kaspersky.com/kpm-for-windows/25.0/130515), revisão oficial de 29/05/2025, consultada em 24/10/2026 | **Confirmado** | O KPM copia credenciais e notas para TXT e o arquivo exportado não é protegido. | Não publica a gramática do TXT nem descreve `Comment` multiline. |
| I2 | [KPM 25.0 — Data types protected](https://support.kaspersky.com/kpm-for-windows/25.0/156239), revisão oficial de 29/05/2025, consultada em 24/10/2026 | **Confirmado** | Websites e aplicações possuem contas; notas são texto livre. | Não descreve a serialização exportada nem distingue delimitadores de conteúdo. |
| I3 | `docs/06-CONTRATO-TXT-KASPERSKY.md` e evidências FMT/PARSE-001 | **Contrato homologado V0 e evidência local limitada** | Duas variantes atualmente reconhecidas: `---` por evidência secundária e linha em branco em uma amostra local; EOF sem newline nessa amostra. | Não comprova multiline e não autoriza generalização para versões/idiomas. |
| I4 | [Issue #6 e comentários](https://github.com/jotaCorsino/VaultSwitch/issues/6) | **Evidência sintética rastreável** | Define o requisito sem perda e fornece o contraexemplo lógico a reproduzir. | Não é saída observada do KPM. |
| I5 | [`Draggie306/kaspersky-to-csv` em commit fixado](https://github.com/Draggie306/kaspersky-to-csv/blob/77faeabbdd142841fa9389b7b4c165756f686ac4/converter.js) | **Evidência secundária** | Uma implementação independente divide registros quando encontra `---` e lê `Comment` apenas na linha rotulada. | A heurística usa buscas permissivas e não demonstra ausência de `---` dentro do comentário. |
| I6 | [`MrSuicideParrot/Kaspersky-Password-Manager-to-CSV` em commit fixado](https://github.com/MrSuicideParrot/Kaspersky-Password-Manager-to-CSV/blob/131fd49425ba1f634b7b8864191440b1152090ff/KPM_to_CSV.py) | **Evidência secundária de menor confiança** | Outra implementação lê a continuação de `Comment` até linha vazia. | A versão KPM não é identificada e o código não é especificação do exportador. |
| I7 | `tests/fixtures/kaspersky/19-comment-delimiter-ambiguous-hypothetical-lf.txt` | **Hipótese sintética** | Reproduz a ambiguidade observável no parser com LF e, no teste, CRLF. | Não comprova que qualquer versão KPM produza esses bytes. |

As fontes I5 e I6 adotam fronteiras incompatíveis entre si. Essa divergência reforça a necessidade de observação controlada; não permite escolher uma das heurísticas como verdade do formato.

## 4. Reprodução do contraexemplo da Issue #6

### Artefato

- fixture: `tests/fixtures/kaspersky/19-comment-delimiter-ambiguous-hypothetical-lf.txt`;
- teste: `tests/comment-investigation.test.js`;
- conteúdo integralmente inventado, UTF-8/LF; o teste também gera em memória a variante CRLF sem mudar os caracteres.

### Resultado observado no parser `main`

Para LF e CRLF:

```text
blocked: false
records.length: 2
counts.websites: 2
diagnostics: EMPTY_VALUE, EMPTY_VALUE
```

Os dois avisos se referem aos dois `Login name` vazios e não bloqueiam. O texto depois de `---` é classificado como segundo website. Nenhum valor da fixture aparece nos diagnósticos.

### Duas interpretações para os mesmos bytes

1. **Interpretação estrutural V0:** dois websites completos separados por `---`.
2. **Interpretação de texto livre:** um website; depois de `Comment:` existem uma linha narrativa, `---` e linhas que o usuário escreveu imitando rótulos.

O parser recebe somente bytes, não a intenção do usuário. Se o exportador oficial escrever comentários multiline sem escape, comprimento, indentação ou outro marcador fora do domínio do texto livre, ambas as interpretações produzem a mesma entrada para o algoritmo.

Formalmente, nessa condição a serialização não é injetiva: existem estados conceituais distintos `V1 != V2` tais que `exportar(V1) = exportar(V2)`. Nenhum parser determinístico do TXT isolado consegue recuperar com certeza qual estado foi a origem. A fixture demonstra a colisão no **contrato hipotético**; somente o experimento com o KPM pode confirmar ou refutar a condição sobre o exportador.

## 5. Matriz de casos

“Resultado sintético” descreve apenas o parser V0 e os arquivos construídos manualmente. “Conclusão KPM” exige exportação oficial de um cofre fictício e não é inferida do teste.

| Caso | Ensaio sintético / cobertura atual | Resultado sintético | Conclusão KPM |
| --- | --- | --- | --- |
| C01 — 2+ linhas simples | fixture 17: continuação sem rótulo | **bloqueado corretamente** com `AMBIGUOUS_MULTILINE` | **não verificável** sem exportação controlada |
| C02 — parágrafos com linhas vazias | duas linhas vazias antes de continuação sem rótulo | **bloqueado corretamente** com `AMBIGUOUS_MULTILINE` | **não verificável**; linha vazia também é fronteira V0 |
| C03 — linha exata `---` | fixture 19, LF e CRLF | **aceito com risco de interpretação** como dois registros | **não verificável**; caso crítico de identificabilidade |
| C04 — `---` com espaços | fixture 19 transformada em memória para `  ---  ` | **aceito com risco de interpretação** porque o V0 aplica `trim()` à fronteira | **não verificável** |
| C05 — texto semelhante a campos | continuação com rótulos repetidos, sem fronteira | **bloqueado corretamente** com `DUPLICATE_FIELD` | **não verificável**; combinado com `---` pode imitar registro válido |
| C06 — `Websites`/`Applications` isolado | cabeçalho com registro ativo e sem fronteira | **bloqueado corretamente** com `AMBIGUOUS_MULTILINE` | **não verificável** |
| C07 — vazio/multiline no último registro e EOF | vazio em EOF sem newline; continuação sem rótulo em EOF | vazio **aceito sem perda** no escopo V0; multiline **bloqueado corretamente** | **não verificável** para serialização multiline/EOF do KPM |
| C08 — website multiline seguido de website normal | fixture 19 representa também esse par mínimo | **aceito com risco de interpretação** quando a continuação imita um registro completo | **não verificável** |
| C09 — aplicação multiline | continuação sem rótulo em `Applications` | **bloqueado corretamente** com `AMBIGUOUS_MULTILINE` | **não verificável** e `Applications` segue sem observação local direta |
| C10 — especiais e `---` inline | valor rotulado com acentos, aspas, URL, dois-pontos e `---` não isolado | **aceito sem perda** no ensaio de uma linha | **não verificável** para multiline e normalizações do exportador |

O bloqueio correto nos casos sintéticos não equivale a suporte multiline. Em particular, bloquear apenas padrões “suspeitos” não resolve C03/C08: um comentário pode produzir uma sequência que parece perfeitamente válida segundo a gramática V0.

## 6. Fronteiras analisadas

| Fronteira | Evidência disponível | Risco residual |
| --- | --- | --- |
| Linha isolada `---` | evidência secundária e parser V0 | pode ser conteúdo livre; o parser encerra registro sem diagnóstico |
| Linha `---` com espaços | regra de robustez do parser (`trim`) | amplia a classe de conteúdo confundido com fronteira; comportamento do KPM desconhecido |
| Linha(s) em branco | uma observação local de comentários vazios/linha única | uma linha vazia pode pertencer a parágrafo; não há escaping comprovado |
| `Websites`/`Applications` | mitigação V0 bloqueia cabeçalho sem fronteira comprovada | seguro para o caso detectado, mas a gramática real do exportador segue desconhecida |
| Rótulos repetidos | V0 bloqueia duplicidade/estrutura inválida | após um separador ambíguo, um conjunto completo de rótulos pode ser aceito como novo registro |
| EOF sem newline | observado localmente para registro simples e coberto pela fixture 18 | não prova como multiline no último registro é serializado |
| Seção `Notes` | evidência secundária; bloqueada no V0 | não confundir `Notes` com o campo de conta `Comment` |

## 7. Conclusão de identificabilidade e proposta de arquitetura

### Se o experimento encontrar escaping ou marcador inequívoco

Documentar a gramática exata por versão, origem da exportação e locale. Uma tarefa posterior poderá implementar um lexer/parser estrito que:

- preserve caracteres e quebras de linha exatamente após a normalização de EOL homologada;
- reconheça somente a variante comprovada;
- bloqueie globalmente versões/variantes desconhecidas;
- mantenha diagnósticos apenas estruturais;
- prove contagem e preservação ponta a ponta com fixtures produzidas por cofre fictício.

### Se o experimento não encontrar diferenciação observável

Não existe mitigação local no parser capaz de distinguir todas as ocorrências. Em especial, proibir `---` como conteúdo ou bloquear “quando parecer comentário” falha porque o mesmo bloco também pode ser um arquivo legítimo de dois registros.

A recomendação é declarar o TXT insuficiente para migração geral e sem perda de comentários multiline, mantendo a exportação bloqueada para uso real. A decisão de produto deverá então escolher uma fonte que carregue fronteiras inequívocas, por exemplo um formato estruturado oficialmente disponível e investigado separadamente. Uma conferência externa de contagem pode detectar alguns casos, mas não reconstrói por si só o conteúdo original e não é prova suficiente.

### Decisão nesta tarefa

- manter o parser V0 inalterado;
- manter a Issue #6 aberta e bloqueante;
- manter a Issue #12 aberta como bloqueio independente;
- não iniciar QA-001;
- não autorizar uso com cofres reais.

## 8. Experimento KPM controlado ainda necessário

O responsável humano pode executar o experimento sem compartilhar nenhum cofre real:

1. criar um cofre novo e descartável contendo **somente** entradas inventadas, sem reutilizar nomes, URLs, logins ou senhas pessoais;
2. registrar versão/build exatos do KPM, versão do Windows, locale da interface e origem da exportação (aplicativo Windows ou My Kaspersky);
3. executar C01–C10 primeiro em arquivos isolados e depois em um conjunto combinado; incluir um segundo registro normal após cada caso de fronteira;
4. para C03/C05/C08, criar dois cofres conceitualmente diferentes: um com um comentário contendo delimitador/rótulos e outro com dois registros reais que tentem produzir a mesma estrutura;
5. exportar pela função oficial para TXT sem abrir/salvar em editor que normalize bytes;
6. antes de compartilhar qualquer fixture, reconferir no KPM que o cofre contém apenas dados fictícios;
7. registrar tamanho, SHA-256, BOM/codificação, bytes de EOL, espaços, aspas, indentação, escapes, delimitadores, EOF/newline final e contagem de registros; comparar o texto do campo na interface caractere a caractere com o TXT;
8. repetir C03/C08 para `Websites` e, se disponível, C09 em `Applications`; não substituir falta de suporte por suposição;
9. remover com segurança os TXT exportados após a inspeção, pois a documentação oficial informa que eles não são protegidos;
10. versionar somente as exportações 100% fictícias que passarem por revisão humana de sanitização, identificando-as como “observada em exportação KPM” e vinculando versão/build.

Para cada caso, a coleta deve preencher:

| Campo | Valor a registrar |
| --- | --- |
| KPM / sistema / locale | versão, build, Windows e idioma |
| Origem | aplicativo local ou My Kaspersky |
| Entrada criada | identificador C01–C10, sem segredo real |
| Bytes | tamanho, SHA-256, BOM, codificação, EOL e EOF |
| Fronteira | marcador/escape/indentação/aspas observados literalmente |
| Contagem | registros criados no cofre e blocos presentes no TXT |
| Preservação | comparação caractere a caractere do `Comment` |
| Classificação | observação direta de exportação fictícia, não generalizada |

## 9. Plano posterior separado

1. **COMMENT-OBS-001:** executar e revisar a coleta C01–C10 em uma versão identificada do KPM.
2. **FMT-COMMENT-001:** atualizar o contrato com a gramática observada ou registrar formalmente a impossibilidade/alternativa; obter decisão humana.
3. **PARSE-COMMENT-001:** somente se autorizado pelo contrato, implementar suporte estrito ou novo bloqueio demonstravelmente seguro, com regressões e desempenho O(n).
4. **CSV/QA posteriores:** verificar `Comment → notes → Notes` caractere a caractere e importação KeePassXC usando apenas base fictícia, depois da resolução independente da Issue #12.

Nenhuma dessas etapas foi iniciada por COMMENT-INV-001.

## 10. Testes e verificações

Runtime: Node.js `v24.22.1`.

| Verificação | Resultado |
| --- | --- |
| `node --test tests/comment-investigation.test.js` | 7/7 aprovados |
| `node --test tests/kaspersky-parser.test.js tests/keepassxc-csv.test.js` | 77/77 aprovados após atualizar o inventário para 19 fixtures |
| `node --test --experimental-test-coverage` nas três suítes | 84/84 aprovados; linhas 99,21%, branches 98,25%, funções 100,00% |
| cobertura de `kaspersky-parser.js` | linhas 99,47%, branches 98,85%, funções 100,00% |
| cobertura de `keepassxc-csv.js` | linhas 98,77%, branches 97,30%, funções 100,00% |
| `node --check` nos dois JavaScripts alterados | aprovado |
| `git diff --check` | aprovado |
| busca por APIs de rede/persistência/console nos arquivos alterados | nenhuma ocorrência |
| busca por padrões de chave privada, AWS access key, token GitHub e chave `sk-` | nenhuma ocorrência |

Os testes demonstram o comportamento do código com entradas artificiais. Eles não validam o exportador KPM e não provam ausência de vulnerabilidades.

## 11. Arquivos alterados

- `docs/evidencias/COMMENT-INV-001.md` — relatório, fontes, matriz, análise e roteiro controlado;
- `tests/fixtures/kaspersky/19-comment-delimiter-ambiguous-hypothetical-lf.txt` — contraexemplo 100% inventado;
- `tests/fixtures/kaspersky/README.md` — inventário e classificação explícita da fixture;
- `tests/comment-investigation.test.js` — reprodução e matriz sintética C01–C10;
- `tests/kaspersky-parser.test.js` — contagem do inventário atualizada de 18 para 19, sem mudar expectativas do parser.

## 12. Limitações e gate

1. Nenhuma versão/build do KPM foi observada diretamente nesta execução.
2. Nenhuma fixture desta tarefa é saída oficial do KPM.
3. O comportamento do exportador para multiline, linhas vazias, `---`, rótulos, seções e EOF permanece não verificado.
4. O parser atual ainda pode aceitar com sucesso uma interpretação estrutural errada no contraexemplo C03/C08.
5. A Issue #6 não pode ser encerrada por esta investigação documental; a Issue #12 também permanece aberta.
6. O Draft PR deve parar no gate de revisão. Não há merge, QA-001 ou autorização para dados reais.
