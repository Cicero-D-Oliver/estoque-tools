# Relatório final de hardening

Data: 2026-08-04

Revisão da evidência de smoke test: 2026-08-05

## Resultado

O backend foi endurecido sem implementar autenticação e sem alterar a arquitetura em camadas. O projeto compila, inicia com SQLite, publica healthcheck/Swagger, executa 13 testes sem falhas e não apresenta avisos do compilador ou violações PMD.

## Segurança

### Credenciais e perfis

- Removidos usuário e senha PostgreSQL fixos do arquivo comum.
- Criados perfis separados `sqlite`, `postgresql` e `test`.
- `DB_PASSWORD` é obrigatória no perfil PostgreSQL.
- `.env` é ignorado pelo Git; `.env.example` contém apenas placeholder explícito.
- URLs, portas, CORS, logs e estratégia de schema aceitam variáveis de ambiente.

### CORS

- CORS global restrito a `/api/**`.
- Origens padrão limitadas a frontends locais conhecidos.
- Origens, métodos, headers, credenciais e cache de preflight são configuráveis.
- Credenciais CORS permanecem desabilitadas por padrão.
- Testes confirmam origem permitida e rejeição HTTP 403 da origem desconhecida.

### Erros e exposição interna

- Formato uniforme com timestamp, status, código, mensagem, caminho, referência e campos.
- JSON malformado, enum inválido, campo desconhecido, ID inválido, rota, método HTTP, integridade e concorrência têm handlers específicos.
- Erro 500 devolve mensagem fixa, sem causa, classe, SQL, stacktrace ou mensagem da exceção.
- Erros 500 são logados somente com tipo da exceção e referência; o stacktrace não é impresso.
- Respostas nativas do Spring também estão configuradas para não incluir exceção, mensagem ou stacktrace.

### Validação de entrada

- Limites de tamanho em nomes, e-mails, códigos, patrimônio, localização e observações.
- IDs de DTO e rota devem ser positivos.
- Quantidades têm faixa controlada.
- Entrada e saída exigem quantidade maior que zero.
- Propriedades JSON desconhecidas são rejeitadas.
- Strings cadastrais são normalizadas; e-mails são armazenados em minúsculas.

### Regras críticas reforçadas

- Usuário inativo não registra movimentações.
- Item/ferramenta inativos não são movimentados.
- Ferramenta emprestada não pode ser inativada.
- Correção não pode criar `EMPRESTADA` sem o fluxo de retirada.
- Manutenção/perda repetidas e correção sem mudança são rejeitadas.
- Soma de estoque não pode estourar o limite aceito.

## Logging

- Padrão único com data ISO, nível, correlação, logger e mensagem.
- `INFO`: criação, atualização, inativação e movimentações por IDs.
- `WARN`: requisições rejeitadas com código/status/método/caminho/referência.
- `ERROR`: falha inesperada com tipo e referência, sem stacktrace.
- Nenhum payload, senha, e-mail ou credencial é registrado.
- `System.out` foi removido da classe principal.
- `X-Correlation-Id` é validado para impedir injeção de linhas no log.

## JPA, banco e integridade

- `@Version` em usuário, item e ferramenta para concorrência otimista.
- HTTP 409 uniforme para atualização concorrente.
- Checks de quantidade não negativa e coerência estado/responsável.
- `UNIQUE` nomeados foram declarados nas entidades para e-mail, código e patrimônio. A etapa posterior de Flyway materializou e validou essas garantias no SQLite; a execução real da variante PostgreSQL continua pendente por ausência de servidor.
- FKs obrigatórias em movimentações.
- Tamanhos de coluna alinhados às validações.
- Índices adicionados para ativos, categorias, status, responsável, FKs e data dos históricos.
- Históricos marcados como Hibernate `@Immutable` e sem setters.
- `@Data` removido das entidades para evitar `equals/hashCode/toString` perigosos com lazy loading.

## Transações, rollback e concorrência

- Services usam transação somente leitura por padrão.
- Todas as escritas sobrescrevem com `@Transactional` normal.
- Alteração do saldo/status e criação do log pertencem à mesma transação; uma falha causa rollback integral.
- O tratamento HTTP 409 para conflitos de integridade existe, e as constraints materializadas pelo Flyway agora fecham no SQLite a janela residual entre `exists` e `insert`. A mesma garantia PostgreSQL está preparada no DDL, mas ainda requer execução real.
- Não há código assíncrono, threads manuais, streams paralelos ou coleções compartilhadas.

## Performance

- `@EntityGraph` carrega item/ferramenta/usuário necessários e remove o N+1 identificado.
- `open-in-view=false` impede queries lazy durante serialização.
- Históricos têm ordem determinística por data e ID.
- Índices suportam as consultas atuais.
- Cache não foi incluído sem métrica que justifique invalidação e complexidade.
- Listagens completas continuam sem paginação para preservar o contrato; estão registradas como pendência.

## OpenAPI e Swagger

- Springdoc compatível com Spring Boot 3.5.
- OpenAPI 3.1 validado em execução real.
- 21 caminhos e 5 tags funcionais.
- Descrições de operações e comportamentos.
- Schemas de todos os DTOs e do erro uniforme.
- Exemplos em campos e estados.
- Respostas reutilizáveis para 400, 404, 409 e 500.
- Status 200, 201 e 204 documentados por operação.
- Swagger UI retornou HTTP 200 em `swagger-ui.html`.

## Docker

Criados:

- `Dockerfile` multi-stage, runtime JRE 17 e usuário não-root;
- backend com limite de RAM proporcional e healthcheck;
- PostgreSQL 17 com `pg_isready`;
- volume `estoque_postgres_data`;
- rede bridge dedicada;
- dependência do backend no banco saudável;
- variáveis exclusivamente por ambiente;
- `.dockerignore` e `.env.example`.

Limitação de validação: Docker não está instalado na máquina de execução. O Compose não pôde ser iniciado aqui. A estrutura foi revisada estaticamente e está documentada; a validação `docker compose config` e o smoke test completo devem ser repetidos em uma máquina com Docker.

## Scripts

- Windows PowerShell: executar, testar, limpar, buildar e gerar cobertura.
- Linux/macOS POSIX shell: as mesmas cinco tarefas.
- Lógica centralizada por plataforma para evitar duplicação.
- Script Windows de testes executado com sucesso: 13/13.
- Smoke test PowerShell reproduzível usa `SQLITE_URL`, banco temporário exclusivo, duas inicializações e verificação do banco de desenvolvimento.
- Todos os scripts shell passaram em `sh -n`.
- A política PowerShell local bloqueia scripts sem opção; o README usa `-ExecutionPolicy Bypass` apenas na chamada, sem alteração permanente.

## Dependências e warnings

- Spring Boot atualizado de 3.2.5 para 3.5.16, mantendo Java 17 e a linha 3.x.
- SQLite JDBC atualizado de 3.45.3.0 para 3.53.1.0.
- Springdoc 2.8.17 e Actuator adicionados.
- Maven Compiler usa `-parameters` e lint completo.
- Maven PMD 3.28.0 foi fixado no build; `clean verify` executa PMD e gera o relatório CPD.
- Nenhum aviso `javac` após as correções.
- O aviso real de schema OpenAPI foi reproduzido e corrigido.
- Springdoc registra apenas o aviso informativo de que a documentação está habilitada, comportamento intencional desta entrega.

## Git e organização

- `.gitignore` cobre build, bancos, `.env`, IDEs, logs e temporários.
- `.gitattributes` padroniza finais de linha por plataforma.
- `.dockerignore` reduz contexto e impede inclusão de dados/segredos.
- `LICENSE` conservadora com todos os direitos reservados.
- Packages existentes foram preservados; novos componentes foram colocados em `config`.
- Métodos mortos de repositories foram removidos.

## Validações executadas

| Validação | Resultado |
|---|---|
| `mvn clean verify` | sucesso |
| Testes de integração | 13/13 |
| Cobertura JaCoCo (execução após Flyway) | 93,25% linhas; 90,14% instruções; 64,29% branches |
| Smoke test original de 2026-08-04 | JAR iniciou, mas o isolamento alegado era inválido: foi usada `DB_URL`, ignorada pelo profile SQLite, e `estoque.db` foi atualizado |
| Smoke test corrigido de 2026-08-05 | sucesso em banco exclusivo via `SQLITE_URL`, com duas inicializações e remoção após o teste |
| Banco isolado comprovado | `target/smoke-test/7c4a143bf2e24f16a78c7537ac7c4871/smoke.db`, SHA-256 `83321B4FFE61FE92A546B0ED1AEC8DF8776DD85F3FBF89835FC01B723491B521` |
| Banco de desenvolvimento | `estoque.db` permaneceu com 77.824 bytes, mesmo timestamp e SHA-256 `8C212EFB93F67878A16F4997D2EDED7EC31DFB50388EEDDB40D9B9C24F42A96B` |
| Reinicialização/seed | 4 usuários, 3 itens e 3 ferramentas antes e depois; nenhuma duplicidade |
| `/actuator/health` | HTTP 200 / UP, sem detalhes |
| `/v3/api-docs` | OpenAPI 3.1, 21 caminhos, 5 tags |
| `/swagger-ui.html` | HTTP 200 |
| CORS permitido | origem configurada devolvida |
| PMD | 0 violações |
| CPD | 2 duplicações pequenas aceitas |
| dependências duplicadas | 0 |
| script Windows `test` | sucesso |
| scripts Linux/macOS `sh -n` | sucesso |
| Docker runtime | não executado; Docker ausente |

### Retificação histórica do smoke test

A afirmação original de que o JAR havia sido iniciado em um SQLite isolado não foi apagada nem tratada como evidência válida. A auditoria posterior demonstrou que o comando ad hoc definiu `DB_URL`, variável usada somente pelo profile PostgreSQL. O profile SQLite esperava `SQLITE_URL`, utilizou o valor padrão `jdbc:sqlite:estoque.db` e alterou o banco de desenvolvimento.

O procedimento foi substituído por `scripts/smoke-test.ps1`. A nova execução:

1. definiu `SQLITE_URL` diretamente no ambiente do processo Java;
2. criou um banco exclusivo dentro de `target/smoke-test/<UUID>/smoke.db`;
3. iniciou o JAR, validou healthcheck, OpenAPI, Swagger, uma requisição 201 e uma rejeição 400 sanitizada;
4. encerrou a aplicação e a reiniciou sobre o mesmo arquivo;
5. comprovou persistência sem duplicação dos seeds ou do usuário de smoke;
6. encerrou a segunda execução e removeu o banco temporário;
7. comparou tamanho, timestamp e SHA-256 de `estoque.db` antes e depois.

Durante essa reprodução, um SQLite novo também revelou que `data.sql` dependia de `ON CONFLICT` sobre constraints que o dialect não materializou. O seed foi mantido com os mesmos dados e tornou-se idempotente por `WHERE NOT EXISTS`. Nenhuma regra de negócio foi alterada.

## Pendências priorizadas

### P1 — antes de produção

1. Implementar autenticação/autorização (fora do escopo solicitado).
2. Paginar listagens e históricos.
3. Executar migrações e testes PostgreSQL, incluindo concorrência, com Testcontainers.
4. Validar e executar o Compose em host com Docker.

### P2 — evolução recomendada

1. Armazenar snapshots de nomes nos logs de auditoria.
2. Criar fluxo auditável para saldo inicial.
3. Separar services somente se o domínio crescer.
4. Avaliar cache e observabilidade somente após medir carga real.

### P3 — decisão do titular

1. Escolher licença de distribuição, caso o código deva ser aberto ou compartilhado.
2. Criar frontend e screenshots.
