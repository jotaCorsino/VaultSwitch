# Fixtures fictícias do TXT do Kaspersky

Todos os arquivos desta pasta foram escritos do zero. As fixtures `18` e `20` reproduzem somente características **estruturais não sensíveis** documentadas; nenhum dado, domínio, identificador ou segredo dos arquivos examinados foi copiado. Elas não derivam de cofres, pessoas, contas ou serviços existentes.

Convenções de segurança:

- domínios usam o TLD reservado `.invalid`;
- segredos usam o marcador visível `FICTITIOUS`;
- nomes e aplicativos são deliberadamente genéricos;
- fixtures hipotéticas trazem `hypothetical` no nome;
- nenhum arquivo representa confirmação de suporte.

## Inventário

| Arquivo | Codificação/EOL | Classificação do formato | Cenário | Expectativa futura |
| --- | --- | --- | --- | --- |
| `01-websites-lf.txt` | UTF-8, LF | Evidência secundária | Dois websites; campos completos/vazios; vírgulas, aspas e dois-pontos | 2 registros reconhecidos |
| `02-applications-crlf.txt` | UTF-8, CRLF | Estrutura secundária; EOL hipotético | Duas aplicações | 2 registros reconhecidos após normalização |
| `03-notes-multiline-lf.txt` | UTF-8, LF | Evidência secundária de menor confiança | Seção de notas e texto multilinha | Detectar e bloquear como provisório |
| `04-empty-fields-lf.txt` | UTF-8, LF | Evidência secundária | Rótulos presentes com valores vazios | Preservar e avisar, sem descartar |
| `05-utf8-bom-accents-lf.txt` | UTF-8 com BOM, LF | BOM hipotético | Acentuação e BOM | Remover BOM e reconhecer |
| `06-delimiter-in-values-lf.txt` | UTF-8, LF | Robustez proposta | `---`, dois-pontos, vírgulas e aspas dentro de valores | Não dividir valores |
| `07-multiple-accounts-hypothetical-lf.txt` | UTF-8, LF | Hipótese de serialização | Mesmo website repetido com duas contas | Preservar dois registros, sem deduplicar |
| `08-ptbr-labels-hypothetical-lf.txt` | UTF-8, LF | Hipótese não verificada | Rótulos PT-BR inventados para teste negativo | Rejeitar como locale não suportado |
| `09-unknown-section-lf.txt` | UTF-8, LF | Negativo | Seção e campos não contratados | Contabilizar e bloquear |
| `10-invalid-lf.txt` | UTF-8, LF | Negativo | Texto sem estrutura | Rejeitar sem registros suportados |
| `11-windows-1252-hypothetical-crlf.txt` | Windows-1252, CRLF | Hipótese não verificada | Codificação alternativa | Rejeitar sem fallback silencioso |
| `12-utf16le-hypothetical.txt` | UTF-16 LE com BOM, CRLF | Hipótese não verificada | BOM/codificação alternativa | Rejeitar como codificação não suportada |
| `13-missing-required-field-negative-lf.txt` | UTF-8, LF | Negativo inventado | Registro conhecido sem o rótulo estrutural `Website name` | `MISSING_FIELD`; bloquear o registro |
| `14-duplicate-field-negative-lf.txt` | UTF-8, LF | Negativo inventado | Registro conhecido com dois rótulos `Login` | `DUPLICATE_FIELD`; bloquear sem escolher valor |
| `15-unknown-field-negative-lf.txt` | UTF-8, LF | Negativo inventado | Registro conhecido com `Invented field` | `UNKNOWN_FIELD`; preservar a ocorrência e bloquear |
| `16-mixed-supported-unknown-negative-lf.txt` | UTF-8, LF | Negativo inventado | Website reconhecível seguido por seção/registro desconhecido | `UNKNOWN_SECTION`; bloquear o resultado global sem exportação parcial |
| `17-comment-multiline-hypothetical-negative-lf.txt` | UTF-8, LF | Fixture histórica inventada; nome legado preservado | `Comment` seguido por linha sem rótulo | Preservar a continuação do `Comment`; não bloquear |
| `18-websites-blank-separated-crlf.txt` | UTF-8 sem BOM, CRLF, sem newline final | Separação por linha em branco observada em um exemplo local; **todos os valores fictícios** | Dois websites, linhas em branco entre os blocos, URL fictícia com porta, `Login name` vazio e comentários opcionais | Reconhecer dois registros sem delimitador `---` |
| `19-comment-delimiter-ambiguous-hypothetical-lf.txt` | UTF-8, LF | Hipótese negativa inventada para COMMENT-INV-001; **não observada em exportação KPM** | O mesmo TXT pode representar dois websites ou um website cujo `Comment` contém `---` e linhas semelhantes a campos | Documentar que a política contextual interpreta dois registros; manter explícito o risco residual |
| `20-three-categories-multiline-observed-structure-crlf.txt` | UTF-8 com BOM; CRLF; `\r\r\n` somente nas continuações de `Other Accounts` | Fixture inventada modelada pela estrutura observada em 24/10/2026; não copia valores de exportação | Websites, Applications e Other Accounts; multiline; `---` interno com/sem linhas vazias; delimitadores verdadeiros e final | Reconhecer 4 registros, normalizar cada quebra lógica para `\n` e preservar `Comment` em `notes` |
| `21-other-accounts-invalid-field-negative-lf.txt` | UTF-8, LF | Negativo inventado | `Other Accounts` com campo desconhecido antes de `Comment` | `UNKNOWN_FIELD`; bloquear globalmente e não exportar CSV parcial |

## Observação sobre expectativas

As expectativas são oráculos documentais exercitados pelo parser e pelo serializador atuais. Todos os valores são inventados; os itens classificados como negativos foram desenhados para provocar bloqueio, não para representar saídas observadas do KPM.

A fixture `19` foi acrescentada posteriormente pela investigação COMMENT-INV-001. Ela é um contraexemplo sintético: reproduz uma ambiguidade do contrato/parser, mas não é evidência de que o exportador KPM produza essa sequência. Seu teste observacional fica separado em `tests/comment-investigation.test.js` para manter explícito o risco residual.

As fixtures `20` e `21` foram acrescentadas pela implementação PARSE-COMMENT-001. A estrutura da `20` reproduz somente características não sensíveis registradas nas Issues #6, #15 e #17; nomes, URLs, logins, senhas e comentários foram escritos do zero. O suporte funcional aos padrões observados não elimina a ambiguidade teórica da fixture `19` nem autoriza uso com cofres reais.
