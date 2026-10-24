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

## Compatibilidade funcional em Draft

O parser funcional reconhece, nas estruturas documentadas e cobertas por fixtures fictícias:

- `Websites`, `Applications` e `Other Accounts` com os rótulos ingleses contratados;
- `Comment` multilinha, inclusive linhas vazias e linhas isoladas `---`, com fronteiras contextuais;
- UTF-8 estrito, BOM UTF-8 opcional, LF, CRLF e a sequência observada `\r\r\n` normalizada como uma quebra lógica;
- campos vazios e caracteres especiais preservados;
- bloqueio global diante de campos, seções, codificações ou estruturas desconhecidas identificáveis.

Esse suporte permanece em Draft. O formato TXT pode variar por versão, idioma e conteúdo; rótulos localizados, outras categorias, outras codificações e colisões estruturais não estão homologados. Nenhum suporte universal será declarado por inferência e o uso com cofres reais continua proibido.

## Destino — KeePassXC

O KeePassXC oferece importação de arquivos CSV e permite mapear colunas durante o assistente de importação.

Referências oficiais:
- https://keepassxc.org/docs/KeePassXC_UserGuide
- https://keepassxc.org/docs/KeePassXC_GettingStarted

A CSV-001 **implementada e homologada apenas como V0 experimental** produz seis colunas, cuja importação e mapeamento no KeePassXC seguem sem validação ponta a ponta (QA-001):

```csv
Group,Title,Username,Password,URL,Notes
```

O campo `Login name` do Kaspersky foi preservado em `accountName` no parser, mas **não tem mapeamento comprovado** nas seis colunas acima. Na CSV-001, se houver `accountName` não vazio, o serializador V0 deverá **bloquear** a geração e reportar `ACCOUNT_NAME_UNMAPPED`, até uma estratégia de destino sem perda ser homologada. Não incluir coluna extra supondo que o KeePassXC a importará.

O campo `Comment` mapeia diretamente para `Notes`. O serializador preserva texto multilinha recebido do parser, e os testes ponta a ponta com fixtures fictícias verificam esse conteúdo nas três categorias suportadas.

A [Issue #6 — REQ-COMMENT-001](https://github.com/jotaCorsino/VaultSwitch/issues/6) permanece aberta e bloqueante para uso real: a mesma sequência de linhas vazias e `---` foi observada como delimitador e como texto livre de `Comment`. A implementação adota uma decisão contextual para os padrões comuns observados, sem alegar que a gramática seja universal. Também continuam pendentes o destino de `accountName` não vazio e a validação de importação no KeePassXC em QA-001.

## Limitação importante

CSV não é um formato criptografado. O arquivo de origem do Kaspersky e o CSV produzido pelo VaultSwitch devem ser tratados como dados altamente sensíveis e temporários.
