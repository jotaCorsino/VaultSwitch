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

Resultado da investigação FMT-001, ainda aguardando homologação: [Contrato do TXT do Kaspersky Password Manager](06-CONTRATO-TXT-KASPERSKY.md).

## Ponto ainda não homologado

O formato TXT é voltado a impressão e pode variar por versão, idioma e conteúdo. Portanto, FMT-001 deve validar:

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

A saída planejada usará colunas simples e explícitas:

```csv
Group,Title,Username,Password,URL,Notes
```

A compatibilidade será considerada homologada somente depois de um teste de importação ponta a ponta.

## Limitação importante

CSV não é um formato criptografado. O arquivo de origem do Kaspersky e o CSV produzido pelo VaultSwitch devem ser tratados como dados altamente sensíveis e temporários.
