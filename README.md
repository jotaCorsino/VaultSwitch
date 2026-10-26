# Valt Switch

Conversor local de arquivos TXT exportados pelo **Kaspersky Password Manager** para CSV importável pelo **KeePassXC**. Um único arquivo HTML, sem instalação, conta, servidor ou internet.

## Baixar versão beta

Acesse **[GitHub Releases](https://github.com/jotaCorsino/VaultSwitch/releases)** e baixe o ZIP `Valt-Switch-v0.1.0-beta.1.zip`. Extraia e abra `Valt-Switch.html` com dois cliques no Chrome ou Edge.

Você também pode baixar diretamente [o HTML](VaultSwitch.html) usando **Download raw file** no GitHub.

## Como usar

1. Selecione ou arraste o TXT exportado pelo Kaspersky.
2. Clique em **Converter para CSV**. O navegador baixa `Valt-Switch-convertido.csv`.
3. Abra KeePassXC, escolha importar CSV e confira a correspondência das colunas `Group,Title,Username,Password,URL,Notes`.

O campo adicional **Login name** do Kaspersky, quando preenchido, é preservado com identificação em `Notes`.

**Suporte beta:** `Websites`, `Applications` e `Other Accounts`, TXT UTF-8 com campos ingleses, comentários multiline. Limite de entrada: **50 MiB**; saída: **100 MiB**.

## Atenção: fase de testes

A importação completa no KeePassXC ainda não foi homologada e comentários que imitem a estrutura de outros registros podem ser ambíguos. **Use preferencialmente dados fictícios e cofres descartáveis até a validação final.** TXT e CSV contêm senhas em texto claro.

Para relatar erros, [abra uma Issue](https://github.com/jotaCorsino/VaultSwitch/issues). Nunca anexe exportações reais, arquivos de senhas nem screenshots que revelem credenciais.

[Guia dos testes](GUIA-TESTES-BETA.md) · [Notas da beta](RELEASE-NOTES-v0.1.0-beta.1.md) · [Documentação técnica](docs/)
