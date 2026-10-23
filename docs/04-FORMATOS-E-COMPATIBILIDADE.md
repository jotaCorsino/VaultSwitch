# 04 — Formatos e compatibilidade

## Origem — Kaspersky Password Manager

A documentação do Kaspersky Password Manager informa que credenciais e notas podem ser exportadas para arquivo TXT não protegido.

Referência oficial:
- https://support.kaspersky.com/help/KPM/Win25.0/en-US/130515.htm

Uma implementação pública independente, usada apenas como referência de investigação do formato, documenta exportações contendo seções de websites e aplicações e campos equivalentes a:

- Website name;
- Website URL;
- Login;
- Password;
- Application;
- Comment.

Referência:
- https://github.com/Draggie306/kaspersky-to-csv

O VaultSwitch não reutilizará o código dessa implementação. O contrato será reimplementado e validado com fixtures próprias.

Contrato FMT-001 homologado para escopo restrito (não é declaração de compatibilidade universal): [Contrato do TXT do Kaspersky Password Manager](06-CONTRATO-TXT-KASPERSKY.md).

## Compatibilidade ainda não comprovada

O formato TXT pode variar por versão, idioma e conteúdo. A FMT-001 e a PARSE-001 homologaram somente um subconjunto e permanecem lacunas quanto a:

- rótulos reais da versão usada;
- idioma dos rótulos;
- separadores entre registros;
- representação de notas multilinha;
- codificação;
- campos vazios;
- caracteres especiais.

Nenhum suporte será declarado apenas por inferência.

## Destino — KeePassXC

O KeePassXC oferece importação de arquivos CSV e permite mapear colunas durante o assistente de importação.

Referências oficiais:
- https://keepassxc.org/docs/KeePassXC_UserGuide
- https://keepassxc.org/docs/KeePassXC_GettingStarted

A saída **inicial e experimental** da CSV-001 seguirá seis colunas mapeáveis, a serem validadas pelo assistente do KeePassXC em QA-001:

```csv
Group,Title,Username,Password,URL,Notes
```

O campo `Login name` do Kaspersky foi preservado em `accountName` no parser, mas **não tem mapeamento comprovado** nas seis colunas acima. Na CSV-001, se houver `accountName` não vazio, o serializador V0 deverá **bloquear** a geração e reportar `ACCOUNT_NAME_UNMAPPED`, até uma estratégia de destino sem perda ser homologada. Não incluir coluna extra supondo que o KeePassXC a importará.

O campo `Comment` mapeia diretamente para `Notes`. O serializador deve preservar inclusive texto com múltiplas linhas **quando já fornecido em um registro normalizado fictício**; isso não significa que o parser saiba reconhecer esses comentários no TXT real.

A [Issue #6 — REQ-COMMENT-001](https://github.com/jotaCorsino/VaultSwitch/issues/6) é requisito bloqueante antes de qualquer uso real: a linha `---` pode ser um delimitador ou texto livre de `Comment`. A compatibilidade será considerada homologada somente após resolução dessa lacuna, tratamento do `accountName` não vazio e teste de importação ponta a ponta com dados fictícios.

## Limitação importante

CSV não é um formato criptografado. O arquivo de origem do Kaspersky e o CSV produzido pelo VaultSwitch devem ser tratados como dados altamente sensíveis e temporários.
