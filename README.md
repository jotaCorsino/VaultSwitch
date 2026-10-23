# VaultSwitch

O **VaultSwitch** é um utilitário local/offline para converter exportações de gerenciadores de senhas entre formatos compatíveis. O primeiro fluxo do projeto será a migração de dados do **Kaspersky Password Manager** para um **CSV importável pelo KeePassXC**, executando todo o processamento no navegador, sem backend e sem envio de credenciais para a internet.

## Acompanhamento do desenvolvimento

**Fase atual:** FMT-001 — ⚪ Planejado

| Ordem | ID | Etapa | Status |
| --- | --- | --- | --- |
| 0 | INIT-001 | Fundação documental | 🟢 Concluído (homologado) |
| 1 | BOOT-001 | Bootstrap local | 🟢 Concluído (homologado) |
| 2 | FMT-001 | Contrato do formato Kaspersky / fixtures sanitizadas | ⚪ Planejado |
| 3 | PARSE-001 | Parser local do TXT do Kaspersky | ⚪ Planejado |
| 4 | CSV-001 | Geração de CSV compatível com KeePassXC | ⚪ Planejado |
| 5 | UI-001 | Interface moderna e fluxo de conversão | ⚪ Planejado |
| 6 | QA-001 | Validação ponta a ponta no KeePassXC | ⚪ Planejado |
| 7 | REL-001 | Empacotamento e documentação de uso | ⚪ Planejado |

**Legenda:** ⚪ Planejado · 🟡 Em implementação · 🔵 Em validação / aguardando homologação · 🟢 Concluído (homologado) · 🟠 Pausado.

**Detalhamento:** [ROADMAP.md](ROADMAP.md) · [Próxima tarefa FMT-001](docs/tarefas/FMT-001.md)

## Problema / contexto

O Kaspersky Password Manager exporta credenciais e notas para um arquivo TXT em formato legível, enquanto o KeePassXC oferece importação por CSV com mapeamento de colunas. Fazer a migração manualmente é trabalhoso e aumenta o risco de perda, alteração ou exposição de credenciais.

## Objetivo

Criar uma ferramenta simples, auditável e portátil que:

- leia localmente o TXT exportado pelo Kaspersky Password Manager;
- reconheça e normalize os registros suportados;
- apresente uma validação segura da conversão sem revelar senhas por padrão;
- gere um CSV adequado à importação pelo KeePassXC;
- funcione offline em navegador moderno no Linux Mint;
- não dependa de servidor, banco de dados, API, framework, CDN ou serviço externo.

## Escopo inicial

### Incluído

- Kaspersky Password Manager TXT como formato de origem;
- websites e aplicações com título/nome, login, senha, URL quando aplicável e comentário/notas;
- geração de CSV para importação no KeePassXC;
- interface em HTML, CSS e JavaScript puro;
- execução local/offline;
- validações de estrutura e contagem de registros;
- tratamento seguro de dados sensíveis durante a sessão.

### Fora do escopo inicial

- criação direta de arquivos KDBX;
- sincronização com nuvem;
- backend ou conta de usuário;
- armazenamento persistente de credenciais;
- envio de telemetria;
- outros gerenciadores de senhas antes da homologação do primeiro fluxo;
- processamento de documentos/arquivos anexos do cofre.

## Solução

Fluxo previsto:

```text
Arquivo TXT do Kaspersky
        ↓
Leitura local no navegador
        ↓
Detecção / validação do formato
        ↓
Parser e normalização em memória
        ↓
Resumo seguro da conversão
        ↓
Serialização CSV
        ↓
Download local
        ↓
Importação pelo KeePassXC
```

## Arquitetura / tecnologias

- HTML5;
- CSS3;
- JavaScript puro (Vanilla JS);
- APIs nativas do navegador: File API / FileReader ou ArrayBuffer, TextDecoder, Blob e URL.createObjectURL;
- sem dependências de runtime;
- sem chamadas de rede necessárias ao funcionamento.

Detalhes: [docs/02-ARQUITETURA.md](docs/02-ARQUITETURA.md)

## Segurança e restrições

O projeto manipula senhas em texto claro durante a conversão e, por isso, é tratado como software de alta sensibilidade de dados.

Regras iniciais:

- nenhum dado do arquivo deve ser enviado para rede;
- nenhum conteúdo sensível deve ir para GitHub, logs, analytics, LocalStorage, SessionStorage ou IndexedDB;
- senhas não devem aparecer na interface por padrão;
- arquivos reais de exportação nunca devem ser versionados;
- testes no repositório devem usar somente dados fictícios/sanitizados;
- o CSV gerado também é texto claro e deve ser tratado como temporário;
- a aplicação deve funcionar sem CDN, fontes remotas ou bibliotecas externas.

Detalhes: [docs/03-SEGURANCA-E-PRIVACIDADE.md](docs/03-SEGURANCA-E-PRIVACIDADE.md)

## Documentação

- [Roadmap](ROADMAP.md)
- [Produto e escopo](docs/01-PRODUTO-E-ESCOPO.md)
- [Arquitetura](docs/02-ARQUITETURA.md)
- [Segurança e privacidade](docs/03-SEGURANCA-E-PRIVACIDADE.md)
- [Formatos e compatibilidade](docs/04-FORMATOS-E-COMPATIBILIDADE.md)
- [Critérios de homologação](docs/05-HOMOLOGACAO.md)

## Método ÓRBITA

Este projeto utiliza o **Método ÓRBITA — Desenvolvimento de Software Assistido por IA com Governança Humana**.

Princípio operacional:

**Planejar → Executar → Evidenciar → Homologar**

A implementação funcional só começa após a fundação documental e o bootstrap local serem validados.
