# 05 — Critérios de homologação

## INIT-001 — Fundação

Homologar somente quando o responsável humano confirmar que:

- objetivo representa a necessidade real;
- escopo inicial está correto;
- arquitetura local/offline está aprovada;
- roadmap está proporcional ao projeto;
- regras de segurança estão adequadas.

## FMT-001 — Formato de entrada

Homologar somente quando:

- fixtures sanitizadas cobrem o formato observado;
- registros suportados e não suportados estão explícitos;
- caracteres especiais e notas foram testados;
- não há dependência de dados reais no repositório.

## PARSE-001 / CSV-001

Homologar somente quando:

- contagem de entradas é preservada nos cenários suportados;
- nenhum campo obrigatório sofre perda silenciosa;
- escaping CSV está correto;
- erros e avisos não vazam segredos;
- parser e gerador passam pelos testes definidos.

## UI-001

Homologar somente quando:

- fluxo de seleção → validação → conversão → download é claro;
- senhas não aparecem por padrão;
- interface não depende de internet;
- nenhuma requisição externa é necessária;
- erros são compreensíveis sem revelar conteúdo sensível.

## QA-001 — Migração ponta a ponta

Homologar somente quando:

1. um arquivo de teste válido é convertido;
2. o CSV é aceito pelo assistente de importação do KeePassXC;
3. campos são mapeados corretamente;
4. contagem de entradas corresponde;
5. uma amostra manual confirma título, username, password, URL e notes;
6. aplicações sem URL têm comportamento definido;
7. o usuário confirma o resultado esperado.

## Regra de encerramento

Teste técnico aprovado não é homologação. A mudança só recebe estado 🟢 Concluído após aprovação humana explícita.
