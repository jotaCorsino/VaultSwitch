# CHECKPOINT — Valt Switch — 26/10/2026

## 1. Marco atual

**Primeira publicação pública em fase de testes concluída.**

- **Nome do produto / interface:** Valt Switch (com espaço).
- **Repositório público:** https://github.com/jotaCorsino/VaultSwitch
- **Versão publicada:** `v0.1.0-beta.1` (**GitHub prerelease**, não versão estável).
- **Release:** https://github.com/jotaCorsino/VaultSwitch/releases/tag/v0.1.0-beta.1
- **ZIP oficial:** https://github.com/jotaCorsino/VaultSwitch/releases/download/v0.1.0-beta.1/Valt-Switch-v0.1.0-beta.1.zip
- **SHA-256 do ZIP:** `0d3d706873d894656842ccb8d23c78e0b8b2f701a6d98cc0085d8369d11d1d2c`.
- **Publicação:** 26/10/2026, GitHub Actions executado com sucesso: https://github.com/jotaCorsino/VaultSwitch/actions/runs/40307390389
- **Testes no workflow:** 134 aprovados, 0 falhas (suíte Node automatizada).
- **PR de publicação:** https://github.com/jotaCorsino/VaultSwitch/pull/20 — merged.
- **Commit da `main` que gerou a release:** `b444866c2a39a27f2454bd2fef848ba06b45465b`.

**Importante:** o arquivo de checkpoint é documentação posterior ao release; sua criação **não altera a tag nem o ZIP já publicado**.

## 2. Objetivo e escopo aprovados

Ferramenta **simples e local**, usada para converter TXT exportado pelo **Kaspersky Password Manager** em CSV para importação manual no **KeePassXC**.

Fluxo: **selecionar/arrastar TXT → clicar em converter → baixar CSV**.

Não envolve login, contas, conexão com Kaspersky/KeePassXC, backend, telemetria, assinatura ou instalação. **O produto distribuído é um único HTML com CSS e JavaScript embutidos**, que pode ser aberto diretamente com duplo clique. Não reiniciar o projeto, inventar integrações ou impor burocracia desnecessária.

## 3. Estado funcional distribuído

- Arquivo principal: `VaultSwitch.html`, incluído no ZIP como `Valt-Switch.html`.
- Layout visual **R3 aprovado pelo responsável**, com cabeçalho **Valt Switch** sem subtítulo, título **“Converter TXT do Kaspersky para CSV do KeePassXC.”**, símbolo de exportação de arquivo, ícone TXT e indicador de Wi-Fi desconectado em tom âmbar.
- Visual das revisões R1 → R2 → R3 registrado nas branches de preview; **módulo de revisão não está no HTML da release**.
- Entrada reconhecida: `Websites`, `Applications`, `Other Accounts`; formato TXT UTF-8 com rótulos esperados em inglês, comentários multilinha e casos com `---` no comentário.
- Saída: CSV com `Group,Title,Username,Password,URL,Notes`.
- `Login name` preenchido é incluído de maneira identificada em `Notes`, sem substituir `Username`; `Comment` é preservado.
- Limites implementados nesta versão: TXT **50 MiB**; CSV **100 MiB**.
- Arquivo CSV contém credenciais em texto claro: orientar testadores a não divulgá-lo.

## 4. Materiais de distribuição

Na `main`: `VaultSwitch.html`, `README.md`, `GUIA-TESTES-BETA.md`, `RELEASE-NOTES-v0.1.0-beta.1.md`, `LICENSE-ICONES-TABLER.txt`, teste `tests/release-standalone.test.js` e workflow `.github/workflows/publicar-beta.yml`.

O workflow valida com `node --test tests/*.test.js`, monta o ZIP de três arquivos (HTML, LEIA-ME e licença), calcula checksum e cria a prerelease no GitHub. A execução da primeira publicação concluiu com sucesso.

## 5. Limitações / pendências reais

1. **Ainda não foi concluída a validação manual ponta a ponta** do CSV resultante dentro da interface do KeePassXC: importar em banco descartável e comparar entradas e todos os valores fictícios. Testes de parser/CSV em JS não substituem esse teste.
2. Variações pouco comuns do TXT, sobretudo comentários que simulem completamente limites/novos registros, podem ser ambíguas. Issue #6: https://github.com/jotaCorsino/VaultSwitch/issues/6.
3. Verificar em ambientes reais `file://` (Chrome/Edge), Windows/Linux, arrastar arquivo, baixar CSV, funcionamento offline e importação no KeePassXC.
4. Coletar relatos de testadores em https://github.com/jotaCorsino/VaultSwitch/issues **sem arquivos/prints com credenciais reais**.
5. Revisar relatos, corrigir defeitos reproduzíveis e preparar `v0.1.0-beta.2` ou evolução posterior **somente quando houver alterações**. Não alterar, sobrescrever ou anunciar beta.1 como estável.

## 6. Decisões de fluxo

- **Prioridade:** facilidade de uso, conversão correta e visual profissional, não novos recursos sem necessidade.
- **Preview/revisão:** módulo Technolife apenas em branches/cópias de avaliação, excluído do pacote distribuído.
- **Publicação pública:** página GitHub Releases com ZIP de uso simples e orientações. A beta.1 já está **publicada**, não apenas planejada.
- **Testes iniciais:** usar arquivos e senhas fictícias; nunca coletar credenciais em GitHub Issues nem chat.
- **Checkpoint:** este documento registra o estado em 26/10/2026. Para retomar, verificar a release e o HEAD atual antes de desenvolver.

## 7. Retomada sugerida

**Próximo passo:** acompanhar os primeiros testes públicos e executar/homologar importação real **com dados fictícios** no KeePassXC. Quando surgir um problema, reproduzir, corrigir e publicar nova prerelease. Evitar reconstruir etapas já concluídas ou reabrir decisões de layout sem novo feedback.
