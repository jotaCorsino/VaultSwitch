# 01 — Produto e escopo

## Visão

VaultSwitch nasce para reduzir o risco e o trabalho manual durante migrações entre gerenciadores de senhas.

O primeiro caso de uso é específico:

> converter localmente uma exportação TXT do Kaspersky Password Manager para um CSV que possa ser importado pelo KeePassXC.

## Usuário inicial

Usuário técnico realizando sua própria migração de credenciais entre Windows/Kaspersky Password Manager e Linux Mint/KeePassXC.

## Requisitos funcionais iniciais

1. selecionar um arquivo TXT local;
2. identificar se o arquivo possui estrutura reconhecível;
3. extrair registros suportados de websites, aplicações e outras contas;
4. normalizar os dados;
5. informar contagens e avisos sem expor senhas por padrão;
6. gerar CSV;
7. permitir download local;
8. fornecer instruções curtas para importação no KeePassXC.

## Requisitos não funcionais

- funcionar offline;
- não exigir instalação;
- não exigir servidor local;
- não realizar chamadas de rede;
- não armazenar credenciais depois da sessão;
- ser legível e auditável;
- depender apenas de recursos nativos de navegador moderno;
- ter interface responsiva suficiente para desktop e notebook.

## Não objetivos do MVP

O MVP não tentará ser um gerenciador de senhas, editor de cofre ou substituto do KeePassXC.

Também não tentará gerar KDBX diretamente. O KeePassXC continuará responsável por criar e criptografar o banco final.
