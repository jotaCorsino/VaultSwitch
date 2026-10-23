# 03 — Segurança e privacidade

## Classificação

O VaultSwitch processa credenciais completas, inclusive senhas em texto claro. Mesmo sendo um utilitário local, o impacto potencial de exposição é alto.

## Modelo de confiança

Confiamos apenas em:

- navegador executado localmente;
- arquivos estáticos do próprio repositório/release;
- arquivo selecionado explicitamente pelo usuário;
- KeePassXC local como destino posterior.

Não existe necessidade funcional de confiar em rede, servidor remoto ou serviço de terceiros.

## Requisitos obrigatórios

### Rede
- não usar `fetch`, XHR, WebSocket ou beacon;
- não carregar scripts, CSS, imagens ou fontes remotas;
- não usar analytics ou telemetria;
- a aplicação deve continuar funcional sem internet.

### Persistência
- não gravar credenciais em LocalStorage;
- não gravar credenciais em SessionStorage;
- não usar IndexedDB para conteúdo importado;
- não criar caches persistentes de dados;
- manter registros apenas em memória pelo tempo necessário à conversão.

### Interface
- não exibir senhas por padrão;
- não incluir senhas em mensagens de erro;
- não registrar valores sensíveis no console;
- mostrar contagens, tipos e avisos por índice/registro, não por segredo;
- qualquer futura função de revelar senha deverá exigir ação explícita e ser avaliada separadamente.

### Repositório
- nunca versionar exportações reais;
- usar apenas fixtures fictícias;
- revisar staged/diff antes de commits;
- impedir diretórios locais de dados sensíveis via `.gitignore`.

### Arquivo gerado
O CSV de saída contém segredos em texto claro. A interface e a documentação devem avisar que ele é temporário e deve ser apagado com segurança após a importação e conferência no KeePassXC.

## Testes de segurança mínimos

- confirmar funcionamento com rede desconectada;
- confirmar ausência de requisições externas nas ferramentas do navegador;
- buscar no código usos de APIs de rede e persistência;
- verificar que erros não contêm password/notes;
- verificar que fixtures não contêm dados reais;
- testar arquivo malformado sem executar conteúdo como HTML;
- renderizar valores do arquivo com APIs seguras de texto, nunca como HTML interpretável.

## Dados reais durante desenvolvimento

O arquivo real de exportação não deve ser enviado para ChatGPT, GitHub, issues, PRs ou logs.

Quando for necessário validar o formato real, o ideal é executar o VaultSwitch localmente. Caso seja necessário compartilhar estrutura para diagnóstico, deve ser criada uma amostra sanitizada com credenciais completamente fictícias.

## Gate de liberação para uso real

Mesmo com PARSE-001 homologada para o escopo V0, o processamento de cofres reais **não está autorizado como fluxo seguro** enquanto a [Issue #6 — `Comment` multiline](https://github.com/jotaCorsino/VaultSwitch/issues/6) permanecer em aberto. A linha isolada `---` pode ser confundida com texto de comentário e gerar truncamento sem diagnóstico. Nenhuma fase posterior deve afirmar ausência de perda silenciosa até essa lacuna ser investigada, corrigida e homologada.

Na CSV-001, a ausência de destino homologado para `accountName` não vazio também deve bloquear exportação, e registros reconhecidos em resultados com `blocked=true` **não podem** ser serializados. Nenhum exemplo real do usuário deve ser utilizado em testes, relatório, fixture, prompt ou GitHub.
