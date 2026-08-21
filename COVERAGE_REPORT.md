# Relatório de cobertura de testes

Data da execução: 2026-08-21

## Resultado da suíte

- Testes executados: **102**
- Suítes executadas: **12**
- Falhas: **0**
- Erros: **0**
- Ignorados: **0**
- Resultado do build: **sucesso**
- Java utilizado: **17.0.9**
- Ferramenta de cobertura: **JaCoCo 0.8.12**

Comando utilizado:

```bash
mvn clean verify
```

## Cobertura global

| Métrica | Coberto | Total | Cobertura |
|---|---:|---:|---:|
| Linhas | 1.357 | 1.583 | **85,72%** |
| Instruções | 6.217 | 7.413 | **83,87%** |
| Métodos | 315 | 391 | **80,56%** |
| Branches | 295 | 431 | **68,45%** |
| Classes | 65 | 65 | **100,00%** |
| Complexidade | 410 | 607 | **67,55%** |

Código criado automaticamente pelo Lombok é marcado como gerado e não entra
nas métricas. O relatório mede a lógica escrita no projeto.

## Escopo automatizado atual

A suíte usa bancos SQLite isolados e PostgreSQL 17.11 real via Testcontainers.
Flyway cria bancos novos até V7 e também é exercitado nas evoluções V5→V6 e
V6→V7, com preservação dos dados. O Hibernate inicia com `ddl-auto=validate`
nos dois vendors.

Além dos fluxos de estoque, ferramentas, organizações e autorização já
existentes, a execução cobre:

- login, JWT válido, adulterado e expirado;
- conta inativa e membership removida;
- emissão de refresh opaco com persistência exclusiva do SHA-256;
- rotação obrigatória e detecção de reutilização da família;
- refresh expirado ou revogado;
- logout individual e global;
- invalidação dos JWTs antigos por `token_version`;
- troca de senha com política, BCrypt e revogação de sessões;
- bloqueio persistente após tentativas repetidas e desbloqueio temporal;
- comportamento genérico para conta inexistente;
- infraestrutura interna de recuperação: hash, expiração, uso único e revogação;
- schema e rotação de refresh no PostgreSQL real;
- baseline SQLite integral e rejeição de schemas incompatíveis;
- retirada, devolução e transferência com responsável e destino atuais;
- confirmação administrativa separada, resumo paginado e histórico auditável;
- correção compensatória sem edição dos eventos anteriores;
- autorização por perfil e isolamento cross-tenant no fluxo operacional;
- disputa simultânea de retirada no SQLite e no PostgreSQL, com apenas uma
  transação vencedora;
- cenário integrado de campo com quatro operadores e cinco movimentações.

## Principais lacunas restantes

- Não existe adaptador externo para entrega do token de recuperação; por isso
  não há endpoint público de recuperação.
- Ainda não há teste de concorrência simultânea sobre rotação de refresh ou
  atualização quantitativa de estoque; a concorrência de retirada de ferramenta
  está coberta nos dois bancos.
- Caminhos raros de erro interno e algumas combinações opcionais permanecem sem
  cobertura, refletindo principalmente os **68,45%** de branches.
- A rotação de `APP_JWT_SECRET` é operacional e invalida sessões; não há suporte
  a múltiplas chaves simultâneas ou `kid`.
- O build gera o relatório JaCoCo, mas ainda não impõe um limiar mínimo de
  cobertura.

## Qualidade e artefatos

- PMD: aprovado, sem violações.
- CPD: relatório gerado com duas duplicações informativas: uma entre serviços
  de movimentação de estoque e outra no guard administrativo compartilhado em
  conceito pelas movimentações de ferramenta e pelos membros da organização.
  O projeto ainda não configura essas ocorrências para falhar o build.
- Relatório HTML: `target/site/jacoco/index.html`
- Relatório XML: `target/site/jacoco/jacoco.xml`
- Relatório CSV: `target/site/jacoco/jacoco.csv`
- Resultados: `target/surefire-reports/`
