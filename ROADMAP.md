# ROADMAP — VaultSwitch

## Estados

- ⚪ Planejado
- 🟡 Em implementação
- 🔵 Em validação
- 🔵 Aguardando homologação
- 🟢 Concluído (homologado)
- 🟠 Pausado

## INIT-001 — Fundação documental

**Estado:** 🟢 Concluído (homologado)

### Objetivo
Registrar problema, escopo, arquitetura inicial, riscos, critérios de homologação e plano incremental antes da implementação.

### Critérios de aceite
- README apresenta objetivo e estado real do projeto;
- escopo inicial está delimitado;
- arquitetura não depende de backend;
- segurança de credenciais está tratada como requisito transversal;
- formatos de entrada e saída possuem hipóteses e pendências explícitas;
- roadmap define gates sem avanço automático.

### Evidências esperadas
- documentação persistida na branch de fundação;
- Draft PR revisável;
- nenhuma funcionalidade implementada.

---

## BOOT-001 — Bootstrap local

**Estado:** 🟢 Concluído (homologado)

**Homologação humana:** 23/10/2026, após relatório do Codex em C:\\Dev\\VaultSwitch. Origin correto, HEAD `1ae772b88627b76504ffa388e733fddaaa89ead5`, `main` sem divergência, `git fsck` sem erros reportados, working tree limpa. Evidências locais fornecidas pelo agente de implementação; revisão remota confirmou o HEAD.


### Objetivo
Vincular a pasta local do projeto ao repositório remoto e confirmar branch, remoto, HEAD e árvore de trabalho.

### Restrição
Nenhuma funcionalidade deve ser implementada nessa tarefa.

---

## FMT-001 — Contrato do formato Kaspersky

**Estado:** 🟢 Concluído (homologado)

**Homologação humana:** 23/10/2026 — após revisão técnica e entrega de exemplo local de exportação, o responsável autorizou a continuidade. Homologação limitada ao contrato documentado, incluindo a variante observada com blocos separados por linhas em branco. **Não** significa compatibilidade total com todas as versões, idiomas, notas ou aplicações.

**Tarefa detalhada:** [docs/tarefas/FMT-001.md](docs/tarefas/FMT-001.md)

**Entrega para revisão:** [contrato técnico](docs/06-CONTRATO-TXT-KASPERSKY.md) · [fixtures fictícias](tests/fixtures/kaspersky/README.md) · [evidências](docs/evidencias/FMT-001.md)

### Objetivo
Definir e testar o contrato de parsing do TXT exportado pelo Kaspersky Password Manager antes de implementar a conversão completa.

### Incluído
- criar fixtures totalmente fictícias;
- validar seções e campos observados;
- avaliar CRLF/LF, BOM e codificações relevantes;
- avaliar rótulos em inglês e português quando encontrados;
- testar valores com dois-pontos, aspas, vírgulas e linhas vazias;
- definir comportamento para campos ausentes e registros desconhecidos.

### Gate
O arquivo real do usuário não deve ser enviado ao GitHub nem usado como fixture pública.

---

## PARSE-001 — Parser Kaspersky

**Estado:** 🟢 Concluído (homologado V0)

**Homologação humana:** 23/10/2026. Revisão do HEAD `fa94e656beaa23014cf70384f5b10e3433473626`, 41/41 testes reportados pelo Codex e validações independentes com dados fictícios; [PR #5](https://github.com/jotaCorsino/VaultSwitch/pull/5) integrado por squash ao `main` no commit `81adacb3322f2f2878d0e0b1cc516792ec083c6c`. Escopo limitado; **a Issue #6 impede uso real antes de investigação e solução de `Comment` multilinha**.

**Tarefa de implementação:** [docs/tarefas/PARSE-001.md](docs/tarefas/PARSE-001.md)

**Entrega para revisão:** [parser](assets/js/kaspersky-parser.js) · [testes](tests/kaspersky-parser.test.js) · [evidências](docs/evidencias/PARSE-001.md)

### Objetivo
Ler o arquivo localmente, detectar o formato e transformar registros suportados em objetos normalizados em memória.

### Saída normalizada prevista
- tipo: website | application;
- título;
- `accountName` (Login name), distinto de `username`;
- username;
- password;
- url;
- notes;
- grupo de origem;
- avisos de parsing sem conteúdo sensível.

---

## CSV-001 — Gerador KeePassXC

**Estado:** 🔵 Aguardando homologação

**Tarefa detalhada:** [docs/tarefas/CSV-001.md](docs/tarefas/CSV-001.md)

**Entrega para revisão:** [serializador](assets/js/keepassxc-csv.js) · [testes](tests/keepassxc-csv.test.js) · [evidências](docs/evidencias/CSV-001.md) · [Draft PR #8](https://github.com/jotaCorsino/VaultSwitch/pull/8)

### Objetivo
Serializar os registros normalizados em CSV robusto para o assistente de importação do KeePassXC.

### Requisitos
- escaping correto de aspas, vírgulas e quebras de linha;
- UTF-8;
- cabeçalho previsível;
- colunas mapeáveis para Group, Title, Username, Password, URL e Notes;
- nenhuma perda silenciosa de registro;
- relatório seguro de registros convertidos e avisos; nada de logs contendo valores;
- **bloqueio integral se `parseResult.blocked=true`**, mesmo havendo registros reconhecidos;
- **bloqueio integral se `accountName` não vazio não tiver destino validado no KeePassXC**; a implementação CSV-001 V0 não deve descartar nem mesclar esse valor silenciosamente.

**Gate:** a saída da CSV-001 ainda é experimental, gerada apenas com dados fictícios. Não implica compatibilidade ponta a ponta nem autoriza migrar dados reais.

---

## UI-001 — Interface local

**Estado:** ⚪ Planejado

### Objetivo
Criar uma interface moderna, simples e segura para selecionar, validar, converter e baixar o arquivo.

### Fluxo
1. selecionar/arrastar TXT;
2. validar formato;
3. mostrar apenas metadados seguros por padrão;
4. converter;
5. baixar CSV;
6. orientar importação e descarte seguro do CSV.

### Restrições
- sem framework;
- sem CDN;
- sem fontes externas;
- sem analytics;
- sem chamadas de rede;
- sem persistência de credenciais.

---

## QA-001 — Validação ponta a ponta

**Estado:** ⚪ Planejado

### Objetivo
Demonstrar que a conversão preserva os campos relevantes e que o arquivo resultante é importável pelo KeePassXC.

### Cenários mínimos
- website completo;
- aplicação sem URL;
- senha contendo dois-pontos, vírgulas e aspas;
- notas com múltiplas linhas;
- campos opcionais vazios;
- entrada desconhecida;
- arquivo inválido;
- arquivo vazio;
- CSV importado no KeePassXC com conferência de contagem e amostra.

---

## REL-001 — Entrega utilizável

**Estado:** ⚪ Planejado

### Objetivo
Preparar uma versão estável do utilitário com instruções de uso e migração.

### Entrega prevista
- aplicação estática;
- guia Kaspersky → VaultSwitch → KeePassXC;
- checklist de segurança;
- registro de limitações conhecidas.

---

## REQ-COMMENT-001 — `Comment` multilinha (Issue #6)

**Estado:** 🔴 Requisito bloqueante para uso real — [Issue #6](https://github.com/jotaCorsino/VaultSwitch/issues/6) aberta.

A gramática da exportação do Kaspersky para comentários multiline e linhas isoladas `---` ainda não está comprovada. O parser V0 pode interpretar `---` como fronteira mesmo que a linha pertença ao comentário. O suporte **integral e sem perda** a `Comment` → `Notes` deverá ser investigado, implementado e homologado em tarefa separada antes de qualquer uso com cofre real, independentemente de CSV-001/UI-001 estarem prontas.

A compatibilidade de `Login name` não vazio com o importador do KeePassXC também precisa de solução validada antes de afirmar migração integral.
