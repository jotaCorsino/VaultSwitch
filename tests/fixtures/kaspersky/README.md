# Fixtures fictícias do TXT do Kaspersky

Todos os arquivos desta pasta foram escritos do zero para a FMT-001. Eles não derivam de cofres, exportações reais, pessoas, contas ou serviços existentes.

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

## Observação sobre expectativas

Não existe parser nesta tarefa. As expectativas acima são oráculos documentais para PARSE-001 depois que o contrato for homologado. Os testes da FMT-001 verificam apenas propriedades físicas dos arquivos, ausência de dados reais conhecidos e coerência com este inventário.
