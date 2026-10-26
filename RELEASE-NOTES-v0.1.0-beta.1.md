# Valt Switch v0.1.0-beta.1

Primeira versão beta pública para testar a conversão offline **Kaspersky TXT → KeePassXC CSV**.

### Inclui
- Interface final baseada no layout R3 aprovado, sem o modo de revisão.
- HTML único, sem instalação, autenticação, conexão externa ou backend.
- Suporte a Websites, Applications, Other Accounts e comentários multilinha com separadores `---`.
- Preservação do campo adicional `Login name` identificado em `Notes`.
- Limites: TXT 50 MiB, CSV 100 MiB.

### Limitações
- A importação no aplicativo KeePassXC **ainda não foi comprovada ponta a ponta**.
- Estruturas desconhecidas, campos de outro idioma e comentários que imitem um registro completo podem não ser interpretados corretamente.
- A saída CSV contém dados em texto claro.

**Somente versão de testes:** use entradas fictícias, confira todos os campos importados e não compartilhe arquivos com credenciais.

**Download:** em Assets, baixe `Valt-Switch-v0.1.0-beta.1.zip`, extraia e abra `Valt-Switch.html`.
