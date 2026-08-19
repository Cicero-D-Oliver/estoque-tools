# Relatório de cobertura de testes

Data da execução: 2026-08-05

## Resultado da suíte

- Testes executados: **24**
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
| Linhas | 607 | 660 | **91,97%** |
| Instruções | 2.895 | 3.241 | **89,32%** |
| Métodos | 147 | 163 | **90,18%** |
| Branches | 121 | 171 | **70,76%** |
| Complexidade | 186 | 249 | **74,70%** |

Código criado automaticamente pelo Lombok foi marcado como gerado e não entra
nas métricas. Assim, o relatório mede a lógica escrita no projeto em vez de
getters, setters, builders, `equals` e `hashCode` gerados automaticamente.

## Cobertura por camada

| Camada | Linhas | Cobertura de linhas | Métodos | Cobertura de métodos | Branches |
|---|---:|---:|---:|---:|---:|
| Configuração, hardening HTTP, dialect e baseline SQLite | 202/221 | **91,40%** | 38/39 | **97,44%** | 69/89 — **77,53%** |
| Controllers | 32/34 | **94,12%** | 29/31 | **93,55%** | sem branches |
| Services | 304/323 | **94,12%** | 53/58 | **91,38%** | 50/78 — **64,10%** |
| Exceções e handler global | 39/49 | **79,59%** | 16/23 | **69,57%** | 2/4 — **50,00%** |
| DTOs | 9/9 | **100,00%** | 5/5 | **100,00%** | sem branches |
| Enums | 19/19 | **100,00%** | 4/4 | **100,00%** | sem branches |
| Classe principal | 2/5 | **40,00%** | 2/3 | **66,67%** | sem branches |

Entidades baseadas em Lombok e interfaces de repository não possuem lógica
executável própria relevante para o JaCoCo e, por isso, não aparecem como
camadas separadas na tabela.

## Cenários automatizados

Os testes de aplicação usam `MockMvc` e atravessam controller, validação,
service, repository e persistência SQLite criada pelas migrações Flyway. Os
testes de baseline usam bancos temporários exclusivos e invocam Flyway
diretamente. O Hibernate valida o schema antes da suíte de aplicação; os casos
HTTP rodam em transação revertida ao final.

1. CRUD completo de usuário, incluindo atualização, consulta e inativação.
2. Validação uniforme, e-mail duplicado e recurso inexistente.
3. Entrada, saída, correção, estoque mínimo e histórico de itens.
4. Rejeição de saída sem saldo suficiente.
5. Retirada, devolução, responsável atual e histórico de ferramentas.
6. Manutenção, perda, correção de status e transições inválidas.
7. Sanitização de JSON/enum inválidos e correlação de requisições.
8. Rejeição de propriedades JSON desconhecidas e IDs inválidos.
9. CORS para origem permitida e origem desconhecida.
10. Bloqueio de movimentações com usuário, item ou ferramenta inativos.
11. Rejeição de quantidade zero sem criação de histórico.
12. Bloqueio de correção direta para o estado `EMPRESTADA`.
13. Healthcheck e contrato OpenAPI, incluindo tags, rotas e schema de erro.
14. Correspondência exata da fixture com a assinatura canônica aceita.
15. Baseline do legado conhecido, aplicação de V2 e preservação de hashes.
16. Rejeição de índice composto incompatível antes do histórico Flyway.
17. Rejeição de trigger adicional antes do histórico Flyway.
18. Rejeição de view adicional antes do histórico Flyway.
19. Rejeição de collation divergente antes do histórico Flyway.
20. Rejeição de ordem de coluna divergente antes do histórico Flyway.
21. Rejeição de tabela adicional `STRICT`.
22. Rejeição de tabela adicional `WITHOUT ROWID`.
23. Aplicação normal de V1 e V2 em banco SQLite novo e vazio.
24. Registro do callback de assinatura integral na configuração Flyway Spring.

## Principais lacunas restantes

- O método `main` não é chamado pela suíte; o contexto Spring é iniciado pela
  infraestrutura de testes.
- Alguns handlers pouco frequentes não são exercitados diretamente, como rota
  inexistente, método HTTP não permitido, conflito otimista e falha interna 500.
- Branches de conflitos de códigos/patrimônios e combinações opcionais menos
  comuns ainda não têm casos dedicados.
- Não há teste de concorrência para movimentações simultâneas.
- O perfil PostgreSQL e o Compose não participam da suíte; os testes usam
  SQLite isolado.
- Não foi imposta uma trava mínima de cobertura no build para evitar que uma
  política arbitrária fosse introduzida sem acordo da equipe.

## Artefatos gerados

- Relatório HTML navegável: `target/site/jacoco/index.html`
- Relatório XML: `target/site/jacoco/jacoco.xml`
- Relatório CSV: `target/site/jacoco/jacoco.csv`
- Resultado dos testes: `target/surefire-reports/`
