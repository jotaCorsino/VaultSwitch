# Valt Switch v0.1.0-beta.2

Corrige a leitura de arquivos TXT do Kaspersky que não trazem o cabeçalho de categoria no início do documento.

- Reconhece registros completos iniciados diretamente por `Website name:`, `Application:` ou `Account name:`.
- Preserva suporte a UTF-8 BOM, CRLF e separadores `---`.
- Não adivinha categorias a partir de campos isolados: exige uma sequência completa de campos reconhecidos.
- Mantém bloqueios de seções desconhecidas e arquivos malformados, sem CSV parcial.
- Adiciona cinco testes sintéticos de regressão. Nenhuma informação do TXT fornecido por usuários foi incluída no repositório.

**Como usar:** baixe `Valt-Switch-v0.1.0-beta.2.zip`, extraia e abra `Valt-Switch.html`.

**Limitações:** o arquivo completo pode conter outras categorias ainda não suportadas; a importação no KeePassXC ainda não foi validada ponta a ponta. Não compartilhe arquivos com credenciais reais. Esta é uma beta.
