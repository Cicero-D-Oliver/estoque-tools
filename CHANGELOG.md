# Changelog

Todas as alterações relevantes são documentadas neste arquivo.

## [Não lançado] — 2026-08-05 — Migrações Flyway

### Fluxo operacional de ferramentas — 2026-08-20

- Adicionado o registro explícito de transferência, separando o executor
  autenticado do responsável atual da ferramenta.
- Retirada, devolução, transferência, manutenção, perda e correção passam a
  registrar horário oficial do backend, observação, destino e contexto anterior.
- Criada revisão administrativa simples (`PENDENTE`/`CONFIRMADA`) que não
  reexecuta nem posterga o efeito operacional.
- Adicionados endpoints ADMIN para pendências, confirmação e resumo incremental
  por cursor, com contadores do estado atual da organização.
- Flyway V7 preserva o histórico V6, incorpora registros anteriores como já
  revisados e adiciona FKs compostas contra vínculos de outras organizações.
- Retiradas usam lock pessimista e versão otimista; testes simultâneos em SQLite
  e PostgreSQL comprovam uma única posse válida.
- A suíte atual cresce de 89 para 102 testes, incluindo o cenário de campo
  AUTOMAÇÃO, upgrade V6→V7 nos dois vendors e PostgreSQL 17.11/Testcontainers.

### CI e documentação da suíte atual

- Atualizada a documentação operacional para a suíte atual de 24 testes,
  preservando como históricos os registros das etapas que tinham 13 testes.
- Removida da CI a igualdade rígida com 13 testes. O workflow agora exige no
  mínimo o baseline atual de 24, permite crescimento da suíte e confirma as
  três classes esperadas, relatórios Surefire, zero falhas, zero erros e zero
  ignorados.
- Mantidas as etapas Java 17, `mvn clean verify`, JaCoCo, PMD, CPD, smoke test
  SQLite isolado e publicação apenas dos relatórios de qualidade como artefato.
- Nenhum deploy, publicação de aplicação ou secret foi adicionado.

### Correção da auditoria P1 do baseline SQLite

- Criada a branch `fix/sqlite-baseline-signature` a partir de
  `feature/flyway-migrations` limpa no commit
  `283f66960b687466570c6d60e044b846c98a4c6b`.
- Preservados, antes da alteração, um arquivo completo do projeto e uma cópia
  de `estoque.db`; os dois bancos tinham SHA-256
  `8C212EFB93F67878A16F4997D2EDED7EC31DFB50388EEDDB40D9B9C24F42A96B`.
- Corrigido o achado P1 segundo o qual a guarda SQL podia aceitar um schema
  parcialmente compatível, por exemplo com índice composto ou objetos extras.
- Adicionado `SQLiteLegacyBaselineCallback`, registrado somente quando o
  driver configurado é SQLite. Ele calcula uma assinatura integral e exige o
  SHA-256 canônico conhecido
  `f8d17cb13b640a8fc723887749da512a7ba681feebedf3afb7136c254c5365d6`
  antes de permitir a gravação da baseline V1.
- A assinatura abrange DDL e catálogo de tabelas, colunas inclusive geradas,
  tipos, nulabilidade, defaults, PKs, FKs, índices e suas colunas/collations,
  unicidade, parcialidade, triggers, views, `STRICT` e `WITHOUT ROWID`.
- A guarda SQL preexistente foi mantida sem relaxamento para validar conteúdo,
  duplicidades, enums, limites, órfãos e compatibilidade dos dados com V2.
- Criada uma fixture estrutural do legado conhecido e dez casos de teste do
  baseline. Foram rejeitados índice composto, trigger, view, collation, ordem
  de coluna, `STRICT` e `WITHOUT ROWID`; todos falharam sem criar o histórico.
- O caminho Spring do JAR também foi verificado: uma cópia com trigger extra
  encerrou com código 1 antes de `flyway_schema_history`, enquanto uma cópia
  fiel recebeu baseline V1, V2 e passou no Hibernate `validate`.
- A cópia fiel preservou as contagens 3/3/3/0/0 e os hashes canônicos de todas
  as linhas. O `estoque.db` original não foi escrito.
- `mvn clean verify` passou em Java 17 com 24 testes (os 13 anteriores e 11
  novos), zero falhas/erros/ignorados, além de JaCoCo, PMD e CPD.

### Segurança e reprodutibilidade do schema

- Criada a branch `feature/flyway-migrations` a partir do baseline Git limpo.
- Gerados e validados backups adicionais do projeto inteiro e de `estoque.db`
  antes de qualquer alteração.
- Adicionados `flyway-core` e o módulo PostgreSQL na versão 11.7.2 gerenciada
  pelo Spring Boot 3.5.16.
- Substituído `ddl-auto=update`/`create-drop` por `ddl-auto=validate` nos profiles
  SQLite, PostgreSQL e de testes.
- Desabilitados a inicialização automática por `data.sql`, o baseline automático
  e o `clean` do Flyway.
- Separadas migrações SQLite e PostgreSQL porque identidade, constraints,
  afinidade de tipos e evolução de tabelas não são portáveis entre os vendors.

### Migrações

- Criadas `V1__create_initial_schema.sql` e
  `V2__enforce_constraints_and_indexes.sql` para cada vendor.
- SQLite V2 reconstrói as tabelas transacionalmente, copia todas as colunas e
  preserva IDs para materializar FKs, `CHECK`, tamanhos, unicidades e índices.
- PostgreSQL V2 usa `ALTER TABLE`, constraints nomeadas e índices próprios;
  essa variante foi validada por inspeção e empacotamento, não por execução.
- Habilitado `PRAGMA foreign_keys=ON` em cada conexão SQLite.
- Criado um dialect SQLite mínimo que mantém o comportamento comunitário e
  corrige somente a equivalência `INTEGER`/`BIGINT` usada pelo Hibernate
  `validate` para chaves `IDENTITY Long`. IDs e schema PostgreSQL não mudaram.

### Baseline do banco existente

- O `estoque.db` original foi inspecionado em modo de leitura e não foi migrado.
- Criado `beforeBaseline__verify_legacy_schema.sql`, que valida estrutura,
  índices, unicidades, conteúdo, limites, enums, estados e órfãos antes de V1.
- A baseline permanece opt-in por `FLYWAY_BASELINE_ON_MIGRATE=true` e fixa V1
  como fronteira; uma incompatibilidade impede até a criação do histórico.
- Em cópia do legado, V1 foi registrada como `BASELINE`, V2 foi aplicada e as
  contagens 3/3/3/0/0 e os hashes canônicos de todas as linhas permaneceram
  idênticos. O banco original conservou o SHA-256
  `8C212EFB93F67878A16F4997D2EDED7EC31DFB50388EEDDB40D9B9C24F42A96B`.

### Seed, testes e documentação

- Removido o `data.sql` automático. Os nove dados de demonstração foram movidos
  para um callback idempotente habilitado somente com `sqlite,sqlite-seed`.
- Confirmado que produção/profile padrão não carrega dados fictícios.
- Na implementação inicial das migrações, `mvn clean verify` passou com os 13
  testes existentes naquela etapa, além de JaCoCo, PMD e CPD.
- O smoke final aplicou V1/V2, iniciou e reiniciou o JAR, manteve health `UP`,
  OpenAPI/Swagger 200, resposta válida 201, erro sanitizado 400 e zero
  duplicidades.
- Hibernate `validate` encerrou com código 1 diante de uma coluna deliberadamente
  incompatível em banco temporário.
- Atualizados README, Docker/ambiente, smoke test e criado
  `FLYWAY_MIGRATIONS.md` com comandos e limitações.
- Nenhuma regra de negócio, autenticação, paginação, frontend ou arquitetura foi
  alterada.

## [Não lançado] — 2026-08-05 — Confiança e reprodutibilidade

### Retificação histórica do smoke test

- Preservada uma cópia integral do estado anterior antes das alterações.
- Confirmado que o smoke test de 2026-08-04 era um comando PowerShell ad hoc, não um script versionado.
- Registrado o erro histórico: o comando definiu `DB_URL`, mas o profile SQLite espera `SQLITE_URL`.
- Confirmada a consequência: a alegação de banco isolado estava incorreta e `estoque.db` foi atualizado naquela execução anterior.
- A afirmação histórica não foi apagada; foi retificada no `HARDENING_REPORT.md`.

### Correção e nova evidência

- Criado `scripts/smoke-test.ps1`, que usa `SQLITE_URL` e um banco exclusivo em `target/smoke-test/<UUID>/smoke.db`.
- O script compara existência, tamanho, timestamp e SHA-256 de `estoque.db` antes e depois.
- Foram validados JAR, healthcheck `UP`, OpenAPI 3.1 HTTP 200, Swagger UI HTTP 200, requisição válida HTTP 201 e erro sanitizado HTTP 400.
- A aplicação foi encerrada, reiniciada sobre o mesmo banco e encerrada novamente.
- As quantidades permaneceram em 4 usuários, 3 itens e 3 ferramentas; nenhuma duplicidade foi encontrada.
- O banco temporário final foi `target/smoke-test/7c4a143bf2e24f16a78c7537ac7c4871/smoke.db`, teve SHA-256 `83321B4FFE61FE92A546B0ED1AEC8DF8776DD85F3FBF89835FC01B723491B521` e foi removido após o teste.
- `estoque.db` permaneceu com 77.824 bytes, mesmo timestamp e SHA-256 `8C212EFB93F67878A16F4997D2EDED7EC31DFB50388EEDDB40D9B9C24F42A96B`.

### Seed SQLite

- Um banco SQLite novo revelou que o dialect não materializava as constraints `UNIQUE` esperadas antes de `data.sql`.
- O seed falhava porque `ON CONFLICT (coluna)` exige uma constraint correspondente.
- Os mesmos nove dados iniciais foram preservados e a idempotência passou a usar `WHERE NOT EXISTS`.
- Nenhuma regra de negócio ou funcionalidade foi adicionada.

### Git e CI

- Ampliado `.gitignore` para certificados, chaves, diretórios de segredos e configurações locais.
- Adicionada pipeline GitHub Actions em `.github/workflows/ci.yml` com Java 17 e cache Maven.
- A versão inicial da pipeline executava `mvn clean verify` e exigia exatamente
  os 13 testes existentes naquele momento. Essa trava histórica foi substituída
  posteriormente pela validação expansível da suíte atual.
- PMD 3.28.0 passou a integrar a fase `verify`; CPD gera relatório sem transformar as duas duplicações pequenas já aceitas em falha.
- Não foram adicionados deploy, publicação ou secrets de produção.

## [Não lançado] — 2026-08-04 — Etapa 5: Hardening

### Segurança

- Removidas as credenciais PostgreSQL fixas de `application.properties`.
- Separadas configurações comuns, SQLite, PostgreSQL e testes.
- Tornadas configuráveis por ambiente as conexões, porta, CORS, logs, DDL e inicialização SQL.
- Tornada obrigatória a variável `DB_PASSWORD` no perfil PostgreSQL.
- Configurada rejeição de propriedades JSON desconhecidas.
- Configurado Spring/Tomcat para não devolver exceção, mensagem técnica, binding interno ou stacktrace.
- Criado CORS global restrito a `/api/**`, com origens explícitas e credenciais desabilitadas por padrão.
- Criado filtro de correlação com `X-Correlation-Id`, validação contra injeção em logs e geração de UUID seguro.
- Substituído o erro 500 com `ex.getMessage()` por mensagem fixa e referência de suporte.
- Adicionados handlers uniformes para validação, JSON malformado, enum/tipo inválido, parâmetro ausente, rota, método, integridade e concorrência.
- Mantida a decisão explícita de não adicionar autenticação/autorização nesta etapa.

### Validação e regras de negócio

- Adicionados limites de tamanho a todos os campos textuais de entrada.
- IDs de usuário e de rota agora devem ser positivos.
- Quantidades são limitadas e protegidas contra saldo acima do máximo aceito.
- Entrada e saída com quantidade zero são rejeitadas.
- E-mails são normalizados para minúsculas; strings cadastrais são aparadas.
- Movimentações com usuário, item ou ferramenta inativos são rejeitadas.
- Ferramentas emprestadas não podem ser inativadas antes da devolução.
- Correção para `EMPRESTADA` foi bloqueada; esse estado exige retirada e responsável atual.
- Operações repetidas de manutenção/perda e correções sem mudança são rejeitadas.

### Logging

- Padronizados logs com timestamp ISO, nível, correlação, logger e mensagem.
- Adicionados logs `INFO` para cadastros e movimentações usando apenas IDs e dados operacionais não sensíveis.
- Adicionados logs `WARN` para rejeições uniformes.
- Adicionado log `ERROR` sanitizado, sem stacktrace ou mensagem interna.
- Removidos `System.out.println` da inicialização.

### JPA, concorrência e banco

- Adicionadas transações somente leitura no nível dos services e transações explícitas nas escritas.
- Adicionado `@Version` em usuário, item e ferramenta para controle otimista.
- Conflitos concorrentes agora resultam em HTTP 409 uniforme.
- Removido `@Data` das entidades para não gerar `equals/hashCode/toString` sobre relações lazy.
- Movimentações foram marcadas como imutáveis e deixaram de expor setters.
- Adicionados checks de quantidades e coerência entre status e responsável da ferramenta.
- Nomeadas constraints `UNIQUE` de e-mail, código e patrimônio.
- Alinhados tamanhos das colunas às validações dos DTOs.
- Adicionados índices para ativos, categoria, status, responsável, FKs e datas de histórico.
- Adicionado `@EntityGraph` nas consultas que precisam de relações, removendo N+1.
- Históricos passaram a ter desempate determinístico por ID.

### Qualidade

- Removidos três métodos de repository sem uso.
- Reduzida duplicação de criação de movimentações com helpers privados.
- Mantidas duas conversões DTO duplicadas de 8 e 10 linhas; extrair exigiria nova camada e não justificava mudança arquitetural.
- Adicionado lint completo do compilador e nomes de parâmetros no bytecode.
- PMD executado sem violações; Maven não encontrou dependências duplicadas.
- Documentada a análise completa em `CODE_REVIEW_REPORT.md`.

### Dependências

- Spring Boot atualizado de 3.2.5 para 3.5.16, mantendo Java 17 e a arquitetura.
- SQLite JDBC atualizado de 3.45.3.0 para 3.53.1.0.
- Adicionados Spring Boot Actuator e Springdoc OpenAPI 2.8.17.

### OpenAPI e Swagger

- Adicionada configuração com título, versão, descrição, contato e cinco tags.
- Documentadas 21 rotas com descrições e status de sucesso.
- Adicionados schemas e exemplos em DTOs.
- Adicionadas respostas reutilizáveis para 400, 404, 409 e 500.
- Corrigida incompatibilidade de `additionalProperties` no schema do erro com um componente explícito.
- Validado OpenAPI 3.1 e Swagger UI em execução real.

### Docker

- Criado `Dockerfile` multi-stage com Maven, JRE 17, usuário não-root e healthcheck.
- Criado `docker-compose.yml` com backend e PostgreSQL 17.
- Adicionados volume persistente, rede dedicada, healthchecks e espera pelo banco saudável.
- Adicionados `.env.example` e `.dockerignore`.
- Senhas são exigidas por variável e não estão fixadas no Compose.
- O runtime Docker não foi testado nesta máquina porque Docker não está instalado; decisão registrada nos relatórios.

### Scripts

- Criados scripts Windows para executar, testar, limpar, buildar e gerar cobertura.
- Criados scripts POSIX equivalentes para Linux e macOS.
- Centralizada a lógica por plataforma para reduzir duplicação.
- Corrigida a passagem de um único argumento do PowerShell ao Maven.
- Na Etapa 5, o script Windows foi validado com os 13 testes então existentes;
  os scripts Unix foram validados com `sh -n`.

### Testes

- Adicionados 7 testes de integração de hardening aos 6 fluxos existentes.
- Cobertos erro sanitizado, correlação, JSON desconhecido, ID inválido, CORS, registros inativos, quantidade zero, correção inconsistente, healthcheck e OpenAPI.
- Total naquela etapa: 13 testes, sem falhas ou erros. O estado atual posterior
  possui 24 testes e está registrado nas seções mais recentes deste changelog.
- Atualizado `COVERAGE_REPORT.md` com os números finais.

### Documentação e Git

- README reescrito com arquitetura, requisitos, instalação, SQLite, PostgreSQL, Docker, execução, testes, cobertura, estrutura, tecnologias, screenshots e roadmap.
- Criados `HARDENING_REPORT.md` e `CODE_REVIEW_REPORT.md`.
- Atualizado o roteiro de testes manuais para os comportamentos corrigidos.
- Criados `.gitignore` e `.gitattributes`.
- Criado `LICENSE` conservador com todos os direitos reservados; nenhuma licença permissiva foi presumida sem decisão do titular.

### Decisões conservadoras

- A arquitetura em camadas e os contratos de resposta de sucesso foram preservados.
- Não foram criadas novas camadas nem feitas divisões grandes de services.
- Listagens não foram paginadas para não quebrar o formato atual; pendência documentada.
- Migrações Flyway/Liquibase não foram introduzidas sobre banco existente sem estratégia de baseline; pendência P1.
- Cache não foi adicionado sem métricas e estratégia segura de invalidação.
- A licença não foi escolhida em nome do titular.

## [Base executável e testes] — 2026-08-04

### Corrigido

- SQLite habilitado como perfil padrão para iniciar sem PostgreSQL local.
- Dependências SQLite e dialects habilitadas.
- PostgreSQL preservado como perfil alternativo.
- `data.sql` tornado idempotente com `ON CONFLICT ... DO NOTHING`.
- Reinicialização sobre o mesmo banco validada.

### Testes e documentação

- Criados os 6 testes de integração dos fluxos principais.
- Adicionado JaCoCo e relatório inicial de cobertura.
- Criado roteiro completo de testes manuais para usuários iniciantes.
