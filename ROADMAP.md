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

**Estado:** ⚪ Planejado

**Tarefa de implementação:** [docs/tarefas/PARSE-001.md](docs/tarefas/PARSE-001.md)

### Objetivo
Ler o arquivo localmente, detectar o formato e transformar registros suportados em objetos normalizados em memória.

### Saída normalizada prevista
- tipo: website | application;
- título;
- username;
- password;
- url;
- notes;
- grupo de origem;
- avisos de parsing sem conteúdo sensível.

---

## CSV-001 — Gerador KeePassXC

**Estado:** ⚪ Planejado

### Objetivo
Serializar os registros normalizados em CSV robusto para o assistente de importação do KeePassXC.

### Requisitos
- escaping correto de aspas, vírgulas e quebras de linha;
- UTF-8;
- cabeçalho previsível;
- colunas mapeáveis para Group, Title, Username, Password, URL e Notes;
- nenhuma perda silenciosa de registro;
- relatório de registros convertidos, ignorados e com avisos.

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
