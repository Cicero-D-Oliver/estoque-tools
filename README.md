# API de Estoque e Ferramentas

Backend REST para controlar usuários internos, itens consumíveis, ferramentas patrimoniais e seus históricos de movimentação. O projeto inicia localmente com SQLite e também oferece um ambiente Docker completo com PostgreSQL.

> Esta versão não implementa autenticação ou autorização de usuários finais. Os perfis `ADMIN`, `OPERADOR` e `CONSULTA` são apenas dados cadastrais para uma etapa futura.

## Funcionalidades

- CRUD com inativação lógica de usuários, itens e ferramentas.
- Entrada, saída e correção auditável do saldo de itens.
- Retirada, devolução, manutenção, perda e correção de ferramentas.
- Consulta de ferramentas emprestadas, último responsável e itens abaixo do mínimo.
- Históricos imutáveis para auditoria.
- Validação de entrada, tratamento uniforme de erros e correlação de logs.
- Swagger UI, OpenAPI 3.1 e healthcheck operacional.
- Perfis separados para SQLite e PostgreSQL.
- Schema versionado por Flyway e validado pelo Hibernate.

## Arquitetura

O projeto preserva a arquitetura em camadas original:

```mermaid
flowchart LR
    C["Cliente HTTP / Swagger"] --> F["CORS e correlação"]
    F --> CT["Controllers"]
    CT --> S["Services transacionais"]
    S --> R["Repositories Spring Data JPA"]
    R --> DB[("SQLite ou PostgreSQL")]
    S --> E["Tratamento uniforme de erros"]
```

- `controller`: contrato HTTP, status e validação dos parâmetros de rota.
- `dto`: entradas e respostas da API; entidades JPA nunca são serializadas diretamente.
- `service`: regras de negócio, transações, logging e conversão para DTO.
- `repository`: persistência e planos de carga com `@EntityGraph`.
- `entity`: mapeamento JPA, constraints, índices e controle otimista de concorrência.
- `config`: CORS, OpenAPI e correlação das requisições.
- `exception`: formato e tradução uniforme de erros.

## Tecnologias

| Tecnologia | Versão/linha |
|---|---|
| Java | 17 LTS |
| Spring Boot | 3.5.16 |
| Spring Web / Validation / Data JPA / Actuator | gerenciadas pelo Spring Boot |
| Hibernate ORM | 6.6.x |
| Springdoc OpenAPI | 2.8.17 |
| PostgreSQL JDBC | gerenciado pelo Spring Boot |
| SQLite JDBC | 3.53.1.0 |
| Flyway | 11.7.2, gerenciado pelo Spring Boot |
| JaCoCo | 0.8.12 |
| Maven | 3.9 ou superior |

## Requisitos

Para execução local:

- JDK 17;
- Maven 3.9+;
- porta 8080 livre, ou `SERVER_PORT` com outra porta.

Para execução em contêineres:

- Docker Engine com Docker Compose v2.

Confira as instalações:

```bash
java -version
mvn -version
docker compose version
```

## Instalação e execução rápida com SQLite

O perfil padrão é `sqlite`; não é necessário instalar servidor de banco. Em um
clone novo, no qual `estoque.db` ainda não existe, Flyway cria integralmente o
schema e o Hibernate o valida:

```bash
mvn clean spring-boot:run
```

Na primeira inicialização, o arquivo `estoque.db` é criado sem dados fictícios.
Para carregar opcionalmente os nove registros de demonstração, ative os profiles
`sqlite,sqlite-seed`; o callback é idempotente e executa depois das migrações.

```powershell
$env:SPRING_PROFILES_ACTIVE='sqlite,sqlite-seed'
mvn spring-boot:run
```

Se o arquivo já existia antes da adoção do Flyway, a inicialização padrão falha
por segurança. Faça backup e siga a baseline verificada descrita em
[FLYWAY_MIGRATIONS.md](FLYWAY_MIGRATIONS.md); não habilite baseline às cegas.

Endereços:

- API: `http://localhost:8080/api/usuarios`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`
- Healthcheck: `http://localhost:8080/actuator/health`

Para usar outro arquivo SQLite:

Windows PowerShell:

```powershell
$env:SQLITE_URL='jdbc:sqlite:C:/dados/estoque.db'
mvn spring-boot:run
```

Linux/macOS:

```bash
export SQLITE_URL='jdbc:sqlite:/dados/estoque.db'
mvn spring-boot:run
```

## PostgreSQL local

Crie um banco e forneça as credenciais por variáveis de ambiente. `DB_PASSWORD` é obrigatória e não possui valor padrão.

Windows PowerShell:

```powershell
$env:SPRING_PROFILES_ACTIVE='postgresql'
$env:DB_URL='jdbc:postgresql://localhost:5432/estoque_db'
$env:DB_USERNAME='estoque'
$env:DB_PASSWORD='sua-senha-local'
mvn spring-boot:run
```

Linux/macOS:

```bash
export SPRING_PROFILES_ACTIVE=postgresql
export DB_URL='jdbc:postgresql://localhost:5432/estoque_db'
export DB_USERNAME='estoque'
export DB_PASSWORD='sua-senha-local'
mvn spring-boot:run
```

Flyway aplica as migrações PostgreSQL próprias e o Hibernate usa `validate`.
Um PostgreSQL existente exige comparação real com V1 antes de qualquer baseline;
a baseline automática fica desabilitada.

## Docker com PostgreSQL

O Compose cria backend, PostgreSQL 17, volume persistente, rede privada e healthchecks dos dois serviços.

1. Crie o arquivo local de ambiente:

   Windows:

   ```powershell
   Copy-Item .env.example .env
   ```

   Linux/macOS:

   ```bash
   cp .env.example .env
   ```

2. Abra `.env` e substitua obrigatoriamente `POSTGRES_PASSWORD`.

3. Construa e inicie:

   ```bash
   docker compose up --build -d
   ```

4. Verifique:

   ```bash
   docker compose ps
   docker compose logs -f backend
   ```

5. Encerre sem apagar os dados:

   ```bash
   docker compose down
   ```

O banco fica no volume `estoque_postgres_data`. `docker compose down -v` também apaga esse volume e deve ser usado somente quando a perda dos dados for intencional.

## Variáveis de ambiente

| Variável | Padrão | Finalidade |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | perfil padrão `sqlite` | ativa `sqlite` ou `postgresql` |
| `SERVER_PORT` | `8080` | porta HTTP |
| `SQLITE_URL` | `jdbc:sqlite:estoque.db` | arquivo SQLite |
| `DB_URL` | `jdbc:postgresql://localhost:5432/estoque_db` | conexão PostgreSQL |
| `DB_USERNAME` | `estoque` | usuário PostgreSQL |
| `DB_PASSWORD` | sem padrão | senha PostgreSQL obrigatória |
| `FLYWAY_BASELINE_ON_MIGRATE` | `false` | opt-in exclusivo para incorporar SQLite legado já verificado |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | origens web permitidas, separadas por vírgula |
| `CORS_ALLOWED_METHODS` | `GET,POST,PUT,DELETE,OPTIONS` | métodos CORS |
| `CORS_ALLOWED_HEADERS` | `Content-Type,Accept,X-Correlation-Id` | cabeçalhos CORS |
| `CORS_ALLOW_CREDENTIALS` | `false` | envio de credenciais pelo navegador |
| `CORS_MAX_AGE` | `3600` | cache do preflight em segundos |
| `LOG_LEVEL_ROOT` | `INFO` | nível global de logs |
| `LOG_LEVEL_APP` | `INFO` | nível do código da aplicação |
| `SPRINGDOC_API_DOCS_ENABLED` | `true` | habilita `/v3/api-docs` |
| `SPRINGDOC_SWAGGER_UI_ENABLED` | `true` | habilita Swagger UI |

Nunca versione `.env`, bancos locais ou arquivos de log. O `.gitignore` já cobre esses arquivos.

## Scripts

### Windows

Como algumas máquinas bloqueiam scripts por política local, use execução pontual sem alterar a política permanente:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\run.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\clean.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\build.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\coverage.ps1
```

### Linux e macOS

```bash
chmod +x scripts/linux-macos/*.sh
./scripts/linux-macos/run.sh
./scripts/linux-macos/test.sh
./scripts/linux-macos/clean.sh
./scripts/linux-macos/build.sh
./scripts/linux-macos/coverage.sh
```

| Script | Ação |
|---|---|
| `run` | inicia pelo plugin Spring Boot |
| `test` | executa a suíte |
| `clean` | remove artefatos Maven em `target` |
| `build` | empacota sem repetir testes |
| `coverage` | executa `clean verify` e gera JaCoCo |

## Testes e cobertura

```bash
mvn clean verify
```

A suíte contém 13 testes de integração que atravessam HTTP, validação, services, repositories e SQLite. Ela cobre os fluxos principais e cenários de hardening, incluindo CORS, JSON inválido, dados desconhecidos, registros inativos e documentação OpenAPI.

Relatórios gerados:

- HTML: `target/site/jacoco/index.html`
- XML: `target/site/jacoco/jacoco.xml`
- CSV: `target/site/jacoco/jacoco.csv`
- resultados: `target/surefire-reports/`

Os números da última execução estão em [COVERAGE_REPORT.md](COVERAGE_REPORT.md).

### Smoke test SQLite isolado

Depois de gerar o JAR com `mvn clean verify`, execute:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1
```

O script usa `SQLITE_URL` para criar um banco exclusivo em `target/smoke-test/<UUID>/smoke.db`. Ele aplica Flyway, inicia o JAR duas vezes sobre o mesmo arquivo, valida healthcheck, OpenAPI, Swagger, requisições válida/inválida e ausência de duplicidades. O banco temporário é removido no final, e o teste falha se tamanho, timestamp ou SHA-256 de `estoque.db` mudarem.

Use `-KeepArtifacts` somente para diagnóstico local; o comportamento padrão é remover o banco isolado.

### Integração contínua

A pipeline `.github/workflows/ci.yml` usa Java 17 e cache Maven. Em pushes e pull requests ela executa `mvn clean verify`, exige exatamente 13 testes, verifica os relatórios JaCoCo/PMD/CPD, roda o smoke test isolado e preserva os relatórios como artefato da execução. Não há publicação, deploy ou secrets de produção.

## Contrato HTTP e erros

Status principais:

- `200`: consulta/alteração concluída;
- `201`: recurso ou movimentação criada;
- `204`: inativação concluída;
- `400`: validação ou regra de negócio;
- `404`: recurso/rota inexistente;
- `405`: método HTTP não aceito;
- `409`: integridade ou atualização concorrente;
- `500`: falha inesperada, sem detalhe interno.

Exemplo sanitizado:

```json
{
  "timestamp": "2026-08-04T10:15:30",
  "status": 400,
  "codigo": "DADOS_INVALIDOS",
  "erro": "Dados inválidos",
  "mensagem": "Um ou mais campos estão inválidos. Veja o detalhe em 'campos'.",
  "caminho": "/api/usuarios",
  "referencia": "a7662424-1c18-41e5-9c77-fb691a56af12",
  "campos": {
    "email": "E-mail é obrigatório"
  }
}
```

O cabeçalho `X-Correlation-Id` é devolvido na resposta e aparece nos logs. Valores recebidos nesse cabeçalho são aceitos somente no formato seguro de até 64 caracteres.

## Banco e integridade

- E-mail, código do item e patrimônio possuem unicidade materializada pelas migrações e validação na aplicação.
- FKs de movimentações são obrigatórias.
- Quantidades e campos essenciais usam `NOT NULL` e checks de não negatividade.
- O estado `EMPRESTADA` exige responsável atual; outros estados exigem responsável nulo.
- Entidades mutáveis usam `@Version` contra sobrescrita concorrente.
- Índices cobrem status, ativos, responsáveis e históricos por recurso/data.
- Históricos são entidades Hibernate imutáveis e não possuem endpoints de alteração/exclusão.

## Estrutura de pastas

```text
.
├── src/main/java/com/equipe/estoque
│   ├── config
│   ├── controller
│   ├── dto
│   ├── entity
│   ├── enums
│   ├── exception
│   ├── repository
│   └── service
├── src/main/resources
│   ├── application.properties
│   ├── application-sqlite.properties
│   ├── application-sqlite-seed.properties
│   ├── application-postgresql.properties
│   ├── db/migration/sqlite
│   ├── db/migration/postgresql
│   └── db/seed/sqlite
├── src/test
├── scripts/windows
├── scripts/linux-macos
├── Dockerfile
├── docker-compose.yml
└── pom.xml
```

## Screenshots

Não há screenshots no repositório. Esta entrega contém somente o backend e a interface técnica Swagger UI; uma interface gráfica de usuário ainda não existe.

## Segurança e limites atuais

- Credenciais foram retiradas do código e dos arquivos versionáveis.
- CORS é restritivo e configurável.
- Stacktraces, causas e mensagens técnicas não são devolvidos ao cliente.
- Logs não registram payload, e-mail, senha ou stacktrace; usam IDs e referência.
- Não há autenticação/autorização, por decisão de escopo desta etapa.
- Swagger pode ser desligado em um ambiente público pelas variáveis indicadas acima.

## Roadmap

1. Adicionar autenticação e autorização por perfil com Spring Security.
2. Executar as migrações PostgreSQL em instância real e adicionar Testcontainers.
3. Paginar listagens e históricos potencialmente grandes.
4. Tornar os dados de auditoria independentes de alterações cadastrais posteriores.
5. Criar frontend e screenshots dos fluxos de usuário.
6. Adicionar métricas, tracing e alertas; avaliar cache somente após medir a carga.

## Relatórios e roteiro

- [HARDENING_REPORT.md](HARDENING_REPORT.md)
- [FLYWAY_MIGRATIONS.md](FLYWAY_MIGRATIONS.md)
- [CODE_REVIEW_REPORT.md](CODE_REVIEW_REPORT.md)
- [COVERAGE_REPORT.md](COVERAGE_REPORT.md)
- [ROTEIRO_TESTES_MANUAIS.md](ROTEIRO_TESTES_MANUAIS.md)
- [CHANGELOG.md](CHANGELOG.md)

## Licença

O arquivo [LICENSE](LICENSE) reserva todos os direitos. Nenhuma licença permissiva foi presumida sem decisão explícita do titular do projeto.
