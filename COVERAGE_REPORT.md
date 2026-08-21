# Relatório de cobertura de testes

Data da execução: 2026-08-20

## Resultado da suíte

- Testes executados: **89**
- Suítes executadas: **10**
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
| Linhas | 1.185 | 1.422 | **83,33%** |
| Instruções | 5.483 | 6.699 | **81,85%** |
| Métodos | 287 | 365 | **78,63%** |
| Branches | 253 | 375 | **67,47%** |
| Classes | 61 | 63 | **96,83%** |
| Complexidade | 367 | 553 | **66,37%** |

Código criado automaticamente pelo Lombok é marcado como gerado e não entra
nas métricas. O relatório mede a lógica escrita no projeto.

## Escopo automatizado atual

A suíte usa bancos SQLite isolados e PostgreSQL 17.11 real via Testcontainers.
Flyway cria bancos novos até V6 e também é exercitado na evolução V5→V6, com
preservação dos dados. O Hibernate inicia com `ddl-auto=validate` nos dois
vendors.

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
- baseline SQLite integral e rejeição de schemas incompatíveis.

## Principais lacunas restantes

- Não existe adaptador externo para entrega do token de recuperação; por isso
  não há endpoint público de recuperação.
- Ainda não há teste de concorrência simultânea sobre rotação de refresh ou
  atualização de estoque.
- Caminhos raros de erro interno e algumas combinações opcionais permanecem sem
  cobertura, refletindo principalmente os **67,47%** de branches.
- A rotação de `APP_JWT_SECRET` é operacional e invalida sessões; não há suporte
  a múltiplas chaves simultâneas ou `kid`.
- O build gera o relatório JaCoCo, mas ainda não impõe um limiar mínimo de
  cobertura.

## Qualidade e artefatos

- PMD: aprovado, sem violações.
- CPD: relatório gerado; permanecem duas duplicações preexistentes entre os
  mapeadores de movimentações de item/ferramenta, fora do escopo desta etapa.
- Relatório HTML: `target/site/jacoco/index.html`
- Relatório XML: `target/site/jacoco/jacoco.xml`
- Relatório CSV: `target/site/jacoco/jacoco.csv`
- Resultados: `target/surefire-reports/`
