# Testar Valt Switch v0.1.0-beta.2

1. Baixe o ZIP da página [Releases](https://github.com/jotaCorsino/VaultSwitch/releases).
2. Extraia os arquivos e abra `Valt-Switch.html` no Chrome ou Edge (Windows ou Linux).
3. Selecione um arquivo TXT de **teste com contas fictícias** estruturadas como a exportação do Kaspersky.
4. Clique **Converter para CSV** e confirme que o navegador baixou `Valt-Switch-convertido.csv`.
5. No KeePassXC, importe em um banco descartável, mapeando `Group`, `Title`, `Username`, `Password`, `URL` e `Notes`.
6. Compare a contagem de entradas, senhas fictícias, campos, comentários multiline e o campo adicional `Login name` preservado em Notes.

**Novo na beta.2:** teste arquivos TXT que comecem diretamente em `Website name:` sem a linha `Websites`, incluindo BOM, CRLF e separadores `---`.

Outros testes úteis: arrastar e soltar; comentários com linhas vazias e `---`; acentos; entradas Other Accounts; TXT vazio e TXT inválido.

**Não envie senhas reais ao GitHub ou a terceiros.** O CSV contém senhas sem criptografia. Esta é uma versão de teste, e a importação final no KeePassXC ainda está em avaliação.

## Relatar problemas

Use [GitHub Issues](https://github.com/jotaCorsino/VaultSwitch/issues) e informe versão, Windows/Linux, navegador, versão do KeePassXC e passos do problema. Se precisar anexar exemplo, crie somente entradas fictícias.
