# 02 — Arquitetura

## Princípio

O VaultSwitch deve funcionar como uma aplicação estática local.

```text
index.html
   ├── style.css
   └── JavaScript
        ├── leitura/decodificação
        ├── detecção de formato
        ├── parser
        ├── normalização
        ├── validação
        └── serialização CSV
```

Nenhum componente de backend é necessário.

## Fluxo de dados

```text
File selecionado
   ↓
ArrayBuffer
   ↓
detecção/decodificação de texto
   ↓
linhas normalizadas
   ↓
parser
   ↓
objetos em memória
   ↓
validação
   ↓
CSV em memória
   ↓
Blob
   ↓
download local
```

## Estrutura sugerida para implementação

A estrutura final pode ser ajustada pelo agente de implementação, mantendo simplicidade:

```text
/
├── index.html
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       ├── kaspersky-parser.js
│       └── keepassxc-csv.js
├── tests/
│   └── fixtures/
└── docs/
```

Arquivos JavaScript devem ser carregados localmente. Evitar uma arquitetura que exija servidor HTTP apenas para contornar módulos ES em `file://`.

## Modelo normalizado

Cada entrada deve convergir para uma estrutura equivalente a:

```text
type
title
accountName  # Login name (não confundir com username)
username
password
url
notes
group
warnings[]
```

O modelo normalizado separa o parser do formato de saída e permitirá ampliar o VaultSwitch futuramente sem acoplar Kaspersky e KeePassXC diretamente.

## Estratégia de parsing

O parser deve ser tolerante apenas onde isso for seguro:

- normalizar `CRLF` e `LF`;
- reconhecer BOM/codificação quando possível;
- identificar seções e **ambas** as variantes de separação do contrato: `---` isolado e linhas em branco entre registros completos, com EOF sem newline final;
- dividir rótulo e valor somente na primeira ocorrência relevante;
- preservar dois-pontos e caracteres especiais dentro de senhas e notas;
- **bloquear** linhas de continuação de notas ou comentários enquanto a sintaxe multiline não estiver homologada;
- nunca descartar silenciosamente uma entrada parcialmente reconhecida.

Quando o arquivo não corresponder ao contrato conhecido, a aplicação deve interromper a conversão ou produzir aviso claro, sem tentar “adivinhar” campos sensíveis.

## CSV

A saída inicial será preparada para o importador CSV do KeePassXC, com colunas mapeáveis para:

```text
Group,Title,Username,Password,URL,Notes
```

O mapeamento final será validado na fase QA-001 contra a versão atual do KeePassXC utilizada no ambiente de destino.
