# PARSE-001 — Parser local do TXT do Kaspersky

## Identidade / base

- **Projeto:** VaultSwitch
- **Repositório:** https://github.com/jotaCorsino/VaultSwitch
- **Base esperada:** `main` com FMT-001 homologada, commit `7383bda959980d0daaf371cb670c15732b89ce6d`
- **Método:** ÓRBITA — Planejar → Executar → Evidenciar → Homologar
- **Estado:** planejado; implementação não iniciada

## Objetivo

Implementar e testar um parser JavaScript **puro, local e independente da UI** que leia bytes de exportações TXT do Kaspersky Password Manager e produza registros normalizados, diagnósticos e uma decisão segura de bloqueio; **sem exportar CSV ou construir interface nesta etapa**.

## Contexto

O contrato homologado está em `docs/06-CONTRATO-TXT-KASPERSKY.md`. A FMT-001 documentou duas variantes de separação de registros:

1. **observação direta em exemplo local:** registros `Websites` separados por linha em branco, UTF-8 sem BOM, CRLF, último registro terminado em EOF sem newline;
2. **evidência secundária:** registros separados por linha isolada `---`, além da estrutura de `Applications`.

A fixture fictícia `18-websites-blank-separated-crlf.txt` reproduz **somente a estrutura** da primeira variante, sem nenhum dado original. Os exemplos do usuário e eventuais arquivos reais não integram a working copy do projeto.

## Escopo incluído

1. Implementar parser isolado, desacoplado do DOM, da rede e de exportadores CSV.
2. Aceitar bytes (`ArrayBuffer` ou `Uint8Array`) e decodificar como UTF-8 **estrito**, removendo apenas BOM UTF-8 quando presente. Rejeitar outros BOMs, Windows-1252 inválido e sequências UTF-8 inválidas, sem substituir bytes ou fazer fallback silencioso.
3. Reconhecer seções/rótulos ingleses homologados de `Websites` e `Applications`, respeitando a classificação de confiança do contrato.
4. Suportar **ambas** as fronteiras de registro: linha `---` isolada e linha(s) em branco entre blocos completos seguidos por novo identificador estrutural; aceitar EOF sem newline final.
5. Reconhecer campos e separá-los apenas no primeiro `:` significativo; preservar valores, espaços relevantes, acentuação, aspas, vírgulas, dois-pontos e ordem de aparição. Não deduplicar registros ou contas.
6. Produzir modelo normalizado em memória contendo `type`, `title`, `accountName` (origem `Login name`), `username` (origem `Login`), `password`, `url`, `notes`, `group` e diagnósticos estruturados.
7. Tratar campos vazios conforme o contrato; distinguir rótulo ausente de valor vazio, duplicado e desconhecido.
8. Bloquear **globalmente** resultado com estruturas não suportadas, seções desconhecidas, `Notes`, comentários/textos multiline ambíguos, registro incompleto ou decodificação inválida. Não gerar resultados parcialmente exportáveis sem indicação inequívoca de bloqueio.
9. Retornar apenas códigos e coordenadas estruturais seguras nos diagnósticos (ex.: `code`, `section`, `recordIndex`, `field`), **nunca valores sensíveis**.
10. Criar testes automatizados com dependências de desenvolvimento mínimas/nativas, cobrindo as **18 fixtures fictícias** e seus resultados esperados.

## Fora do escopo

- Gerar CSV, KDBX, arquivos temporários ou downloads.
- Construir interface HTML/CSS ou integrar com tela de upload.
- Ler automaticamente diretórios, clipboard, LocalStorage, SessionStorage, IndexedDB ou rede.
- Pedir, abrir, imprimir, copiar ou versionar TXT real do usuário; não executar testes com dados reais nesta fase.
- Suportar rótulos PT-BR, múltiplas linhas e codificações não homologadas por aproximação.
- Fazer merge ou iniciar CSV-001 sem revisão/homologação.

## Segurança e dados

Este componente processará senhas **em memória**, classificadas como informação altamente sensível. O parser não deverá:

- chamar `fetch`, XHR, WebSocket, `sendBeacon` ou serviços externos;
- registrar valores ou buffers sensíveis no console, stack trace, exceções ou relatórios;
- apresentar valores do TXT via `innerHTML`/DOM;
- persistir registros, criar cache ou arquivos;
- escapar erros incluindo valores originais;
- ignorar registros desconhecidos ou produzir exportação parcial silenciosa.

A API retornada deve permitir que a futura UI identifique claramente `blocked=true` e o número de registros/ocorrências por categoria, sem precisar revelar senhas. Não prometer limpeza criptográfica da memória em JavaScript.

## Requisitos de teste / oráculos

### Positivos

- `01`, `02`: websites/apps com `---`, LF/CRLF;
- `04`: campos presentes vazios mantidos com aviso;
- `05`: UTF-8 BOM, acentuação;
- `06`: preservar caracteres especiais e `---` dentro de valores;
- `07`: preservar contas repetidas sem deduplicação, reconhecendo que a serialização é hipotética;
- `18`: **dois websites separados por linha em branco CRLF, sem `---`, sem newline final**.

### Negativos (bloqueio obrigatório)

- `03`: seção Notes/multiline não suportado;
- `08`: rótulos PT-BR não homologados;
- `09`: seção desconhecida;
- `10`: TXT sem estrutura válida;
- `11`, `12`: codificação incompatível;
- `13`: `MISSING_FIELD`;
- `14`: `DUPLICATE_FIELD`;
- `15`: `UNKNOWN_FIELD`;
- `16`: website válido seguido de desconhecido deve bloquear **todo** o resultado;
- `17`: `AMBIGUOUS_MULTILINE`.

Adicionar testes de arquivo vazio, apenas cabeçalho, BOMs malformados, linha CR isolada, início de seção inválido, conteúdo sem rótulo, duplicidade, tamanho máximo configurado/explicado, e resiliência a entradas malformadas. Não montar um cofre real.

## Critérios de aceite

- [ ] Leitura de bytes e UTF-8 estrito com tratamento de BOM/CRLF/LF e EOF sem newline.
- [ ] Suporte aos dois estilos de fronteira, **com regressão específica para a fixture 18**.
- [ ] Preservação exata dos campos normalizados incluindo `accountName`, valores vazios e caracteres especiais.
- [ ] Diagnósticos determinísticos sem exposição de valores sensíveis.
- [ ] Invariantes de bloqueio global verificadas, inclusive arquivo misto suportado+desconhecido.
- [ ] Expectativas das 18 fixtures verificadas; indicar explicitamente testes negativos.
- [ ] Nenhum backend, dependência de runtime, telemetria, persistência, interface ou CSV.
- [ ] `git diff --check`, revisão de segredos e testes técnicos concluídos; não afirmar compatibilidade com exportações reais não testadas.
- [ ] Documentação e evidências atualizadas; PR Draft revisável sem merge.

## Evidências esperadas

- caminho dos arquivos criados/alterados;
- modo de execução de testes e resultados por categoria/fixture;
- relatório em `docs/evidencias/PARSE-001.md`;
- branch, commit, PR Draft e estado Git;
- riscos residuais, principalmente ambiguidades de `Comment`/notas e variantes não observadas;
- confirmação de **nenhum uso de credenciais reais** e de nenhuma exportação/telemetria.

## Handoff ao Codex

1. Validar working copy `C:\\Dev\\VaultSwitch` e `origin`; atualizar `main` com segurança (fast-forward quando possível).
2. Ler integralmente o contrato, fixtures e esta tarefa.
3. Criar branch `feat/PARSE-001-parser` a partir da base sincronizada.
4. Implementar **somente** a tarefa PARSE-001 com código enxuto, auditável e testes fictícios.
5. Produzir evidências, abrir PR **Draft** e parar no gate. Não fazer merge nem iniciar CSV-001.
