# Evidências — PARSE-COMMENT-001

**Tarefa:** correção funcional de comentários multilinha e terceira categoria do Kaspersky Password Manager<br>
**Data da execução:** 24/10/2026<br>
**Branch:** `feat/PARSE-COMMENT-001-funcional`<br>
**Base sincronizada:** `origin/main` em `4bf11d8876928227bda54ba8e552bfbc110062ae`<br>
**Commit funcional:** `ad9ff365d2fd6db67f2058c168470689ea913ee2`<br>
**Decisão técnica:** [Issue #6, comentário 6387967860](https://github.com/jotaCorsino/VaultSwitch/issues/6#issuecomment-6387967860)<br>
**Pull Request:** [Draft PR #18](https://github.com/jotaCorsino/VaultSwitch/pull/18)

## 1. Escopo executado

- implementação funcional de `Comment` multilinha no parser existente;
- distinção contextual entre linhas `---` internas ao comentário e decoração de fronteira;
- suporte à seção observada `Other Accounts` no parser e no serializador;
- aceitação de UTF-8 com BOM opcional, LF/CRLF e da sequência observada `\r\r\n`, normalizada como uma quebra lógica;
- atualização dos testes que antes exigiam bloqueio provisório de multiline;
- fixtures inteiramente fictícias cobrindo as três categorias e casos negativos;
- preservação dos gates de desconhecidos, `accountName`, integridade de contagens e exportação global;
- nenhuma alteração de layout, interface, rede, persistência ou fluxo de download.

Não foram usados nem versionados dados, credenciais ou arquivos de cofre reais.

## 2. Comportamento implementado

### 2.1 Parser

Depois do rótulo `Comment`, o parser acumula linhas livres, espaços, linhas vazias e linhas isoladas `---`. A continuação é gravada em `notes` com quebras lógicas `\n`.

Uma fronteira é reconhecida contextualmente quando o conteúdo seguinte identifica:

- um novo registro completo iniciado pelo rótulo estrutural da categoria atual;
- um novo registro iniciado após decoração de fronteira, mesmo se depois for bloqueado por campos ausentes;
- uma seção reconhecida com fronteira ou bloco completo;
- uma seção desconhecida/sem suporte estruturalmente identificável após fronteira.

Somente a decoração terminal usada pela fronteira é retirada do comentário. Ocorrências internas permanecem. Um cabeçalho reconhecido isolado, sem fronteira comprovada, continua produzindo `AMBIGUOUS_MULTILINE` para impedir truncamento silencioso.

O reconhecimento continua aproximadamente O(n): os índices de lookahead são pré-calculados e as novas verificações de início completo percorrem apenas o conjunto fixo de campos da categoria.

### 2.2 Other Accounts

| Origem Kaspersky | Modelo normalizado | CSV KeePassXC |
| --- | --- | --- |
| seção `Other Accounts` | `type: "other"` | `Group: Other Accounts` |
| `Account name` | `title` | `Title` |
| `Login name` | `accountName` | sem destino; bloqueia se não vazio |
| `Login` | `username` | `Username` |
| `Password` | `password` | `Password` |
| `Comment` | `notes` | `Notes` |
| sem URL na origem | `url: ""` | `URL` vazio |

O serializador aceita `type: "other"` somente com `group: "Other Accounts"`, inclui `otherAccounts` na validação das contagens e preserva o bloqueio `ACCOUNT_NAME_UNMAPPED` para qualquer `accountName` não vazio.

### 2.3 Finais de linha

- LF e CRLF são normalizados para `\n`;
- `\r\r\n`, observado nas continuações de `Other Accounts`, representa uma única quebra lógica;
- qualquer CR que não pertença a CRLF ou CRRLF permanece inválido e retorna `INVALID_LINE_ENDING`.

## 3. Fixtures e regressões

### Fixtures acrescentadas

| Fixture | Objetivo | Resultado |
| --- | --- | --- |
| `20-three-categories-multiline-observed-structure-crlf.txt` | BOM, Websites, Applications, Other Accounts, CRLF/CRRLF, `---` interno com/sem vazios e delimitadores reais | 4 registros; comentários e campos preservados; exportação CSV permitida porque `accountName` é vazio |
| `21-other-accounts-invalid-field-negative-lf.txt` | campo desconhecido em Other Accounts | `UNKNOWN_FIELD`, `blocked=true`, nenhum CSV |

A fixture `20` usa exclusivamente nomes, URLs `.invalid`, logins, senhas e comentários inventados. Seu arquivo físico contém BOM UTF-8, CRLF e duas ocorrências intencionais de CRRLF.

### Expectativas antigas atualizadas

- fixture `17`: a continuação do `Comment` agora é preservada e o bloqueio provisório foi removido;
- casos C01/C02: comentários com continuação e parágrafos vazios são aceitos;
- C05: linhas semelhantes a campos, sem fronteira estrutural, permanecem no comentário;
- C07/C09: multiline em EOF e em Applications é preservado;
- o contraexemplo sintético da fixture `19` continua documentado como risco residual, sem novo experimento requerido.

### Regressões de segurança

- registro incompleto após decoração de fronteira não é incorporado ao comentário anterior: o primeiro comentário é preservado e o segundo registro recebe `MISSING_FIELD`;
- próximo registro completo pelo rótulo estrutural e próxima seção completa pelo cabeçalho são reconhecidos mesmo sem delimitador explícito;
- campo desconhecido antes de `Comment` continua bloqueando;
- seção desconhecida antes, entre ou depois de registros reconhecidos continua bloqueando globalmente;
- `accountName` não vazio continua bloqueando toda a saída CSV;
- CR isolado, UTF-8 inválido, codificações não suportadas e contagens incoerentes continuam bloqueando;
- diagnósticos continuam restritos a códigos e coordenadas estruturais seguras.

## 4. Execução automatizada

Runtime: Node.js `v24.22.1`.

Comando da suíte completa com cobertura:

```powershell
node --test --experimental-test-coverage tests/*.test.js
```

Resultado:

```text
tests:     93
pass:      93
fail:      0
linhas:    96,27%
branches:  95,51%
funções:   100,00%
```

Cobertura por módulo:

| Módulo | Linhas | Branches | Funções |
| --- | ---: | ---: | ---: |
| `assets/js/kaspersky-parser.js` | 95,12% | 94,50% | 100,00% |
| `assets/js/keepassxc-csv.js` | 98,80% | 97,41% | 100,00% |

Também foram aprovados `node --check` nos módulos/testes modificados, `git diff --check`, as buscas estáticas de rede/persistência/log e a verificação de integridade da fixture binária. Antes do commit funcional, a branch e `origin/main` estavam no mesmo commit base; não houve rebase destrutivo nem sobrescrita de mudanças locais.

## 5. Preservação ponta a ponta

O teste da fixture `20` compara literalmente os registros normalizados e as linhas CSV das três categorias. Ele verifica:

- ordem dos quatro registros;
- `title`, `accountName`, `username`, `password`, `url`, `notes`, `group` e `type`;
- linhas vazias e `---` internas em `notes`;
- URL vazia e grupo `Other Accounts` no terceiro tipo;
- aspas CSV e CRLF de saída sem alterar o conteúdo lógico dos comentários;
- contagens `websites`, `applications`, `otherAccounts` e `records` coerentes.

## 6. Limitações e riscos residuais

1. A política de fronteira é contextual e cobre os padrões observados; não constitui gramática oficial ou universal do Kaspersky.
2. A subsequência `linha vazia + --- + linha vazia` foi observada tanto dentro de `Comment` quanto entre registros. Conteúdo que imite um registro completo ainda pode colidir com a heurística; esse risco teórico permanece na Issue #6.
3. `Notes`, rótulos localizados, outras categorias, Windows-1252, UTF-16 e estruturas desconhecidas continuam sem suporte.
4. `accountName` não vazio não tem destino homologado no CSV e continua bloqueante.
5. A importação final no KeePassXC não foi executada; QA-001 não foi iniciada.
6. Testes com fixtures fictícias não autorizam uso com cofres reais.

## 7. Gate

A implementação deve permanecer em Draft até homologação humana. Não houve merge. As Issues #6, #12 e #17 permanecem abertas, e o VaultSwitch continua explicitamente não autorizado para cofres reais.
