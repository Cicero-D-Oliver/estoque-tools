# Relatório de Code Review

Data: 2026-08-04
Escopo: todo o código-fonte, configurações, testes, scripts e documentação do projeto.

Atualização de evidência: 2026-08-05, após Flyway e assinatura integral do
baseline SQLite.

## Resumo executivo

O projeto mantém uma arquitetura em camadas pequena e compreensível. Na revisão
original, os 13 testes então existentes passaram. Na revalidação atual, os 24
testes passam, o build compila sem avisos do `javac` e o PMD não encontra
violações no conjunto padrão. Não foram identificadas dependências circulares,
TODOs esquecidos ou imports mortos.

Os dois services de domínio continuam sendo as maiores classes. Essa concentração é conhecida e coerente com a arquitetura original, mas deve ser reavaliada se os fluxos crescerem. Não foi feita divisão de services nem criação de nova camada de mapeamento para respeitar a restrição de não alterar a arquitetura.

## Método e evidências

- A revisão original abrangeu 43 arquivos Java de produção e 2 classes de
  teste. O estado atual possui 3 classes de teste e foi revalidado integralmente
  pelo build.
- Build com Java 17, `-parameters` e `-Xlint:all,-processing`.
- PMD 7.17.0 via Maven PMD Plugin 3.28.0.
- CPD para duplicação.
- Maven Dependency Plugin 3.11.0 para dependências declaradas e duplicadas.
- Busca por `TODO`, `FIXME`, `HACK`, `XXX`, `System.out`, stacktrace e segredos.
- Inicialização real com uma cópia do banco SQLite existente.

Resultados objetivos:

| Verificação | Resultado |
|---|---|
| Testes na revisão original | 13 executados, 0 falhas, 0 erros |
| Testes na revalidação atual | 24 executados, 0 falhas, 0 erros, 0 ignorados |
| PMD | 0 violações |
| Dependências duplicadas no POM | 0 |
| Duplicações CPD | 2 blocos pequenos de mapeamento DTO |
| Avisos do compilador | 0 |
| TODO/FIXME/HACK/XXX | 0 |
| Dependências circulares entre services | 0 |

Maiores classes por linhas físicas:

| Classe | Linhas | Avaliação |
|---|---:|---|
| `FerramentaService` | 283 | grande, porém métodos curtos e domínio coeso |
| `ItemEstoqueService` | 225 | grande, porém métodos curtos e domínio coeso |
| `GlobalExceptionHandler` | 186 | repetição estrutural controlada por helpers |
| `FerramentaController` | 172 | tamanho causado principalmente pela documentação OpenAPI |
| `ItemEstoqueController` | 131 | tamanho causado principalmente pela documentação OpenAPI |

## Achados por prioridade

### P0 — Críticos

Nenhum problema crítico permanece conhecido após o hardening.

Problemas críticos corrigidos:

- credencial PostgreSQL fixa no arquivo comum;
- mensagem técnica devolvida no erro 500;
- correção capaz de deixar ferramenta `EMPRESTADA` sem responsável;
- movimentações aceitas para usuário, item ou ferramenta inativos;
- atualização concorrente sem detecção em entidades mutáveis.

### P1 — Altos

#### Migrações de banco ainda não são versionadas — pendente

O projeto usa `ddl-auto=update` em desenvolvimento e Docker. Isso facilita a execução atual, mas não oferece revisão, rollback ou implantação determinística de alterações de schema.

Recomendação: adotar Flyway ou Liquibase antes de produção, criar uma baseline e mudar produção para `JPA_DDL_AUTO=validate`. Não foi implementado porque introduzir migrações sobre um banco existente exige uma decisão de implantação e seria uma mudança maior que o hardening conservador.

#### Listagens e históricos não são paginados — pendente

Os endpoints gerais retornam listas completas. Com grande volume, isso aumenta memória, tempo de consulta e tamanho da resposta.

Recomendação: adicionar paginação com contrato compatível/versionado. Não foi alterado para evitar mudança no formato de resposta atual.

#### Ausência de autenticação/autorização — pendente por escopo

A API continua pública para quem alcançar a porta do backend. Os perfis cadastrados não controlam acesso. O usuário solicitou explicitamente não implementar autenticação nesta etapa.

Mitigação operacional: não publicar a API diretamente na internet; restringir por rede/reverse proxy até a futura implementação com Spring Security.

### P2 — Médios

#### Services de domínio acumulam CRUD e movimentações — aceito

`FerramentaService` e `ItemEstoqueService` têm duas responsabilidades próximas. A separação poderia reduzir tamanho, mas alteraria a organização arquitetural já documentada e aumentaria o número de dependências.

Decisão: manter e usar helpers privados para reduzir repetição. Reavaliar quando houver novos fluxos.

#### Duas duplicações de mapeamento DTO — aceito

O CPD encontrou:

- 10 linhas entre `FerramentaService` e `MovimentacaoFerramentaService`;
- 8 linhas entre `ItemEstoqueService` e `MovimentacaoEstoqueService`.

São conversões explícitas, sem regra de negócio. Extrair exigiria novo mapper compartilhado e acoplamento adicional. A duplicação foi documentada e mantida por ser pequena e segura.

#### Auditoria usa nomes atuais, não snapshots — pendente

As respostas de histórico leem o nome atual do item/ferramenta/usuário. Se o cadastro mudar, a visualização histórica muda, embora a movimentação continue imutável.

Recomendação: em uma migração futura, armazenar snapshots dos campos relevantes no momento da operação.

#### Saldo inicial não gera movimentação — pendente

Um item pode ser criado com quantidade inicial, mas não existe usuário responsável no contrato de criação para gerar um log. Alterar isso mudaria a API.

Recomendação: criar endpoint/fluxo de abertura de saldo em uma futura versão do contrato.

#### Testes PostgreSQL e concorrência real — pendente

A suíte usa SQLite. O versionamento otimista está configurado e conflitos viram HTTP 409, mas ainda falta um teste com transações paralelas e PostgreSQL real.

Recomendação: Testcontainers no pipeline.

### P3 — Baixos

#### Avisos informativos do Springdoc

O Springdoc registra no startup que Swagger e OpenAPI estão habilitados. É um aviso informativo esperado, pois esses recursos foram solicitados. Não há aviso de compilação nem falha de schema. Em ambiente público, podem ser desligados por variável.

#### Licença conservadora

Foi criado `LICENSE` com todos os direitos reservados. Uma licença permissiva não foi presumida porque isso requer decisão do titular.

## Revisão por categoria

### Duplicação

Dois blocos pequenos, descritos em P2. A duplicação de criação de movimentações dentro dos services foi reduzida por helpers privados.

### Complexidade ciclomática e cognitiva

O PMD não reportou métodos acima dos limites padrão de complexidade. As condições mais relevantes estão nos fluxos de ferramenta e no handler de erros, sem aninhamento profundo. Não foi identificada necessidade de refatoração estrutural.

### Classes e métodos grandes

As classes maiores estão na tabela inicial. Seus métodos permanecem curtos e orientados a uma operação. Controllers ficaram maiores por anotações de documentação, não por lógica.

### Nomes

Os nomes em português são consistentes com o domínio. Foram padronizados termos de erro (`codigo`, `erro`, `mensagem`, `referencia`) e mantidos nomes públicos existentes para não quebrar a API.

### Responsabilidade única

Controllers estão finos; repositories apenas persistem; configuração e erros estão isolados. Os dois services centrais são a única ressalva, aceita por preservação arquitetural.

### Dependências circulares

Não existem ciclos. `ItemEstoqueService` e `FerramentaService` dependem de `UsuarioService`; o sentido inverso não existe.

### Código morto e imports mortos

Foram removidos os métodos de repository nunca usados:

- `UsuarioRepository.findByEmail`;
- `ItemEstoqueRepository.findByCodigo`;
- `FerramentaRepository.findByPatrimonio`.

PMD não encontrou imports, campos, métodos privados ou variáveis locais inúteis.

### Warnings

- `javac -Xlint`: nenhum aviso após a correção do filtro MDC.
- PMD: nenhuma violação.
- OpenAPI: o aviso real de `additionalProperties` foi corrigido com schema explícito.
- Maven Dependency Plugin: sinalizou starters como “não usados” e APIs transitivas como “não declaradas”, uma limitação conhecida da análise bytecode com starters. Adicionar todas as transitivas diretamente pioraria o gerenciamento pelo BOM; nenhuma mudança foi feita.

### TODOs esquecidos

Nenhum `TODO`, `FIXME`, `HACK` ou `XXX` foi encontrado.

## JPA, transações e concorrência

- Escritas e movimentações estão em transações com rollback atômico.
- Consultas usam transações somente leitura e `open-in-view=false`.
- `@EntityGraph` elimina N+1 nos históricos e nos responsáveis de ferramentas.
- `@Version` detecta sobrescrita concorrente em usuário, item e ferramenta.
- Movimentações usam `@Immutable` e não expõem setters nem endpoints mutáveis.
- Entidades não usam mais `@Data`; assim, `equals`, `hashCode` e `toString` não percorrem associações lazy.
- `responsavelAtual` é nullable apenas quando o estado não é `EMPRESTADA`, protegido por regra e check de banco.
- Não existem coleções JPA mutáveis no modelo atual.
- `Optional` é usado somente para resultados possivelmente ausentes, nunca como campo de entidade ou DTO.
- Streams são simples e não paralelos; não há estado compartilhado ou risco de concorrência nos mapeamentos.

## Performance

Melhorias aplicadas:

- relações necessárias carregadas em uma consulta com `@EntityGraph`;
- consultas de histórico com ordenação determinística por data e ID;
- índices para FKs, status, ativo e histórico;
- `open-in-view=false` evita consultas tardias acidentais;
- nenhuma criação desnecessária relevante foi encontrada nos fluxos críticos.

Cache não foi adicionado: os dados mudam com frequência, a invalidação seria sensível e não há medição que justifique a complexidade. Paginação é a otimização prioritária futura.

## Conclusão

O código está adequado para desenvolvimento e homologação controlada, com execução local e Docker documentados. Para produção, os bloqueios principais são autenticação/autorização, migrações versionadas, paginação e testes PostgreSQL/concorrência no pipeline.
