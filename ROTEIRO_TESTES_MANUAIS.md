# Roteiro de testes manuais para iniciantes

Este roteiro valida as funcionalidades mais importantes da API de estoque e
ferramentas sem usar o banco normal da aplicação. Não é necessário conhecer
Java ou programação, mas será preciso copiar endereços e blocos JSON no
Postman.

## 1. O que será validado

- Inicialização e reinicialização da aplicação.
- Cadastro, consulta, alteração e inativação de usuários.
- Cadastro e manutenção de itens de estoque.
- Entrada, saída e correção de quantidade.
- Consulta de itens abaixo do mínimo e históricos.
- Cadastro e manutenção de ferramentas.
- Retirada, devolução, manutenção, perda e correção de status.
- Consultas gerais de movimentações.
- Mensagens para dados inválidos, duplicados e recursos inexistentes.

> Importante: esta aplicação não possui tela gráfica nem login. Ela é uma API.
> Os testes serão feitos pelo Postman e pelo navegador.

## 2. Como saber se um teste passou

O Postman mostra um número de status junto da resposta:

| Status | Significado neste roteiro |
|---:|---|
| 200 | Consulta ou alteração concluída |
| 201 | Cadastro ou movimentação criada |
| 204 | Inativação concluída; a resposta fica sem conteúdo |
| 400 | O sistema recusou dados ou uma operação inválida |
| 404 | O registro solicitado não existe |
| 500 | Erro interno; registre como falha, salvo quando indicado como problema conhecido |

Um teste passa quando o status e os campos principais forem iguais aos
descritos. Os números de `id` podem variar e não precisam ser iguais aos
exemplos.

## 3. Preparar um banco seguro para o teste

O roteiro usa o arquivo `teste-manual.db`. Assim, o banco normal `estoque.db`
não será modificado.

1. Abra a pasta do projeto no Explorador de Arquivos.
2. Se já existir um arquivo chamado `teste-manual.db`, confirme que a aplicação
   está parada e renomeie-o para `teste-manual-anterior.db`.
3. Abra o PowerShell ou Terminal dentro da pasta do projeto.
4. Execute:

```powershell
java -jar target\estoque-1.0.0.jar --spring.datasource.url=jdbc:sqlite:teste-manual.db
```

5. Não feche essa janela durante os testes.
6. Aguarde uma mensagem semelhante a:

```text
Started EstoqueApplication
Tomcat started on port 8080
```

Se o arquivo `target\estoque-1.0.0.jar` não existir, gere-o primeiro com:

```powershell
mvn clean package
```

## 4. Teste rápido de funcionamento

Abra este endereço no navegador:

```text
http://localhost:8080/api/usuarios
```

Resultado esperado:

- O navegador mostra uma lista iniciada por `[` e terminada por `]`.
- Existem três usuários iniciais: Junão, Carlos e Ana.
- Se aparecer “Não é possível acessar este site”, a aplicação não está
  executando ou a porta 8080 está ocupada.

## 5. Preparar o Postman

Para cada teste:

1. Abra o Postman.
2. Crie uma nova requisição HTTP.
3. Escolha o método indicado: `GET`, `POST`, `PUT` ou `DELETE`.
4. Cole a URL indicada.
5. Quando houver JSON:
   - abra a aba **Body**;
   - selecione **raw**;
   - selecione **JSON** no menu à direita;
   - cole o bloco fornecido.
6. Clique em **Send**.
7. Confira o status e a resposta.

### Regra para os IDs

Quando um cadastro retornar algo como `"id": 4`, anote esse número.

Nos próximos passos, substitua textos como `{USUARIO_ID}`, `{ITEM_ID}` e
`{FERRAMENTA_ID}` pelo número anotado. Não envie as chaves `{` e `}`.

Exemplo: se o item recebeu ID 4, use `/api/itens/4`, e não
`/api/itens/{ITEM_ID}`.

---

# Parte A — Usuários

## A1. Listar usuários iniciais

- Método: `GET`
- URL: `http://localhost:8080/api/usuarios`
- Status esperado: `200`

Resultado esperado: três usuários iniciais, todos com `"ativo": true`.

## A2. Criar um usuário

- Método: `POST`
- URL: `http://localhost:8080/api/usuarios`
- Body:

```json
{
  "nome": "Maria Teste Manual",
  "email": "maria.manual@example.com",
  "perfil": "OPERADOR"
}
```

- Status esperado: `201`
- Confira `nome`, `email`, `perfil` e `"ativo": true`.
- Anote o `id` como `{USUARIO_ID}`.

## A3. Consultar o usuário criado

- Método: `GET`
- URL: `http://localhost:8080/api/usuarios/{USUARIO_ID}`
- Status esperado: `200`

Resultado esperado: os dados da Maria.

## A4. Atualizar o usuário

- Método: `PUT`
- URL: `http://localhost:8080/api/usuarios/{USUARIO_ID}`
- Body:

```json
{
  "nome": "Maria Teste Atualizada",
  "email": "maria.atualizada@example.com",
  "perfil": "ADMIN"
}
```

- Status esperado: `200`
- Confira o nome, o e-mail e o perfil atualizados.

## A5. Tentar cadastrar e-mail duplicado

- Método: `POST`
- URL: `http://localhost:8080/api/usuarios`
- Body:

```json
{
  "nome": "Usuário Duplicado",
  "email": "maria.atualizada@example.com",
  "perfil": "CONSULTA"
}
```

- Status esperado: `400`
- A mensagem deve informar que o e-mail já está cadastrado.

## A6. Testar validação de campos

- Método: `POST`
- URL: `http://localhost:8080/api/usuarios`
- Body:

```json
{
  "nome": "",
  "email": "email-invalido",
  "perfil": "OPERADOR"
}
```

- Status esperado: `400`
- A resposta deve conter `"erro": "Dados inválidos"` e detalhes para `nome` e
  `email` dentro de `campos`.

## A7. Inativar o usuário

- Método: `DELETE`
- URL: `http://localhost:8080/api/usuarios/{USUARIO_ID}`
- Status esperado: `204`
- É normal não haver JSON na resposta.

Faça novamente o `GET` do passo A3. O usuário ainda existe, mas deve mostrar:

```json
"ativo": false
```

---

# Parte B — Itens de estoque

Para registrar movimentações, os exemplos usam o usuário inicial de ID `1`.

## B1. Listar os itens iniciais

- Método: `GET`
- URL: `http://localhost:8080/api/itens`
- Status esperado: `200`

Resultado esperado: três itens iniciais.

## B2. Criar um item

- Método: `POST`
- URL: `http://localhost:8080/api/itens`
- Body:

```json
{
  "codigo": "ITEM-MANUAL-001",
  "nome": "Material de Teste Manual",
  "categoria": "Teste",
  "quantidadeAtual": 10,
  "quantidadeMinima": 5,
  "localizacao": "Prateleira de Testes"
}
```

- Status esperado: `201`
- Confira `quantidadeAtual: 10`, `quantidadeMinima: 5` e
  `abaixoMinimo: false`.
- Anote o `id` como `{ITEM_ID}`.

## B3. Consultar o item

- Método: `GET`
- URL: `http://localhost:8080/api/itens/{ITEM_ID}`
- Status esperado: `200`

## B4. Atualizar dados cadastrais

- Método: `PUT`
- URL: `http://localhost:8080/api/itens/{ITEM_ID}`
- Body:

```json
{
  "codigo": "ITEM-MANUAL-001",
  "nome": "Material Manual Atualizado",
  "categoria": "Teste Atualizado",
  "quantidadeAtual": 10,
  "quantidadeMinima": 6,
  "localizacao": "Prateleira B"
}
```

- Status esperado: `200`
- Confira o novo nome, mínimo 6 e localização.

## B5. Registrar entrada de 10 unidades

- Método: `POST`
- URL: `http://localhost:8080/api/itens/{ITEM_ID}/entrada`
- Body:

```json
{
  "usuarioId": 1,
  "quantidade": 10,
  "observacao": "Entrada do teste manual"
}
```

- Status esperado: `201`
- A movimentação deve ter `tipoMovimentacao: "ENTRADA"`.

Consulte o item novamente. A quantidade deve ser `20`.

## B6. Registrar saída de 6 unidades

- Método: `POST`
- URL: `http://localhost:8080/api/itens/{ITEM_ID}/saida`
- Body:

```json
{
  "usuarioId": 1,
  "quantidade": 6,
  "observacao": "Saída do teste manual"
}
```

- Status esperado: `201`
- Consulte o item. A quantidade deve ser `14`.

## B7. Tentar retirar mais do que existe

- Método: `POST`
- URL: `http://localhost:8080/api/itens/{ITEM_ID}/saida`
- Body:

```json
{
  "usuarioId": 1,
  "quantidade": 999,
  "observacao": "Teste de saldo insuficiente"
}
```

- Status esperado: `400`
- A mensagem deve conter “Quantidade insuficiente”.
- Consulte o item e confirme que a quantidade continua `14`.

## B8. Corrigir a quantidade para 3

- Método: `POST`
- URL: `http://localhost:8080/api/itens/{ITEM_ID}/correcao`
- Body:

```json
{
  "usuarioId": 1,
  "quantidade": 3,
  "observacao": "Contagem física do teste manual"
}
```

- Status esperado: `201`
- Consulte o item e confirme:
  - `quantidadeAtual: 3`;
  - `quantidadeMinima: 6`;
  - `abaixoMinimo: true`.

## B9. Listar itens abaixo do mínimo

- Método: `GET`
- URL: `http://localhost:8080/api/itens/abaixo-minimo`
- Status esperado: `200`

Resultado esperado: a lista contém `ITEM-MANUAL-001`. O item inicial
`ITEM-002` também deve aparecer.

## B10. Consultar histórico do item

- Método: `GET`
- URL: `http://localhost:8080/api/itens/{ITEM_ID}/historico`
- Status esperado: `200`

Resultado esperado: três registros válidos, na ordem do mais recente para o
mais antigo:

1. `CORRECAO`;
2. `SAIDA`;
3. `ENTRADA`.

A tentativa recusada de retirar 999 unidades não deve aparecer.

## B11. Consultar todas as movimentações de estoque

- Método: `GET`
- URL: `http://localhost:8080/api/movimentacoes-estoque`
- Status esperado: `200`

Procure visualmente as três movimentações do item de teste.

## B12. Inativar o item

- Método: `DELETE`
- URL: `http://localhost:8080/api/itens/{ITEM_ID}`
- Status esperado: `204`

Consulte o item novamente e confirme `"ativo": false`.

---

# Parte C — Ferramentas

## C1. Listar ferramentas iniciais

- Método: `GET`
- URL: `http://localhost:8080/api/ferramentas`
- Status esperado: `200`

Resultado esperado: três ferramentas iniciais.

## C2. Criar uma ferramenta

- Método: `POST`
- URL: `http://localhost:8080/api/ferramentas`
- Body:

```json
{
  "patrimonio": "PAT-MANUAL-001",
  "nome": "Ferramenta de Teste Manual",
  "categoria": "Teste",
  "localizacao": "Armário de Testes"
}
```

- Status esperado: `201`
- Confira `status: "DISPONIVEL"`, `ativo: true` e responsável vazio.
- Anote o `id` como `{FERRAMENTA_ID}`.

## C3. Atualizar a ferramenta

- Método: `PUT`
- URL: `http://localhost:8080/api/ferramentas/{FERRAMENTA_ID}`
- Body:

```json
{
  "patrimonio": "PAT-MANUAL-001",
  "nome": "Ferramenta Manual Atualizada",
  "categoria": "Teste Atualizado",
  "localizacao": "Armário B"
}
```

- Status esperado: `200`

## C4. Retirar a ferramenta

- Método: `POST`
- URL: `http://localhost:8080/api/ferramentas/{FERRAMENTA_ID}/retirada`
- Body:

```json
{
  "usuarioId": 1,
  "observacao": "Retirada do teste manual"
}
```

- Status esperado: `201`

Consulte a ferramenta com `GET /api/ferramentas/{FERRAMENTA_ID}` e confirme:

- `status: "EMPRESTADA"`;
- `responsavelAtualId: 1`.

## C5. Listar ferramentas emprestadas

- Método: `GET`
- URL: `http://localhost:8080/api/ferramentas/emprestadas`
- Status esperado: `200`

Resultado esperado: a ferramenta de teste aparece na lista.

## C6. Consultar o último responsável

- Método: `GET`
- URL: `http://localhost:8080/api/ferramentas/{FERRAMENTA_ID}/ultimo-responsavel`
- Status esperado: `200`
- Confira `usuarioId: 1` e `tipoMovimentacao: "RETIRADA"`.

## C7. Tentar retirar novamente

Repita exatamente o passo C4.

- Status esperado: `400`
- A mensagem deve informar que a ferramenta não está disponível.
- Nenhuma nova retirada deve ser criada no histórico.

## C8. Devolver a ferramenta

- Método: `POST`
- URL: `http://localhost:8080/api/ferramentas/{FERRAMENTA_ID}/devolucao`
- Body:

```json
{
  "usuarioId": 1,
  "observacao": "Devolução do teste manual"
}
```

- Status esperado: `201`

Consulte a ferramenta e confirme:

- `status: "DISPONIVEL"`;
- `responsavelAtualId: null`.

## C9. Tentar devolver novamente

Repita o passo C8.

- Status esperado: `400`
- A mensagem deve informar que a ferramenta não está emprestada.

## C10. Enviar para manutenção

- Método: `POST`
- URL: `http://localhost:8080/api/ferramentas/{FERRAMENTA_ID}/manutencao`
- Body:

```json
{
  "usuarioId": 1,
  "observacao": "Manutenção preventiva do teste manual"
}
```

- Status esperado: `201`
- Consulte a ferramenta e confirme `status: "MANUTENCAO"`.

Tente fazer uma retirada enquanto estiver em manutenção. O status esperado é
`400`.

## C11. Corrigir o status para disponível

- Método: `POST`
- URL: `http://localhost:8080/api/ferramentas/{FERRAMENTA_ID}/correcao`
- Body:

```json
{
  "usuarioId": 1,
  "novoStatus": "DISPONIVEL",
  "observacao": "Manutenção concluída"
}
```

- Status esperado: `201`
- Consulte a ferramenta e confirme `status: "DISPONIVEL"`.

## C12. Marcar como perdida

- Método: `POST`
- URL: `http://localhost:8080/api/ferramentas/{FERRAMENTA_ID}/perda`
- Body:

```json
{
  "usuarioId": 1,
  "observacao": "Simulação de perda no teste manual"
}
```

- Status esperado: `201`
- Consulte a ferramenta e confirme `status: "PERDIDA"`.

Tente enviar a ferramenta perdida para manutenção. O status esperado é `400`.

## C13. Restaurar a ferramenta por correção

Repita o passo C11 com a observação:

```text
Ferramenta localizada após o teste
```

- Status esperado: `201`
- Estado final esperado: `DISPONIVEL`.

## C14. Consultar histórico da ferramenta

- Método: `GET`
- URL: `http://localhost:8080/api/ferramentas/{FERRAMENTA_ID}/historico`
- Status esperado: `200`

O histórico deve conter, do mais recente para o mais antigo:

1. correção após a perda;
2. perda;
3. correção após a manutenção;
4. manutenção;
5. devolução;
6. retirada.

Operações recusadas não devem aparecer.

## C15. Consultar todas as movimentações de ferramentas

- Método: `GET`
- URL: `http://localhost:8080/api/movimentacoes-ferramenta`
- Status esperado: `200`

Procure visualmente as movimentações da ferramenta de teste.

## C16. Inativar a ferramenta

- Método: `DELETE`
- URL: `http://localhost:8080/api/ferramentas/{FERRAMENTA_ID}`
- Status esperado: `204`

Consulte a ferramenta novamente e confirme `"ativo": false`.

---

# Parte D — Erros e reinicialização

## D1. Consultar um ID inexistente

- Método: `GET`
- URL: `http://localhost:8080/api/usuarios/999999`
- Status esperado: `404`
- A resposta deve conter `"erro": "Recurso não encontrado"`.

## D2. Enviar um perfil inexistente

- Método: `POST`
- URL: `http://localhost:8080/api/usuarios`
- Body:

```json
{
  "nome": "Perfil Inválido",
  "email": "perfil.invalido@example.com",
  "perfil": "GERENTE"
}
```

Resultado esperado: `400`.

Confirme também:

- `codigo: "REQUISICAO_MALFORMADA"`;
- nenhuma propriedade `stackTrace` ou `exception`;
- presença de `referencia` e do cabeçalho `X-Correlation-Id`.

## D3. Confirmar a reinicialização segura

1. Volte à janela onde a aplicação está executando.
2. Pressione `Ctrl+C` uma vez.
3. Aguarde o terminal voltar a aceitar comandos.
4. Execute novamente:

```powershell
java -jar target\estoque-1.0.0.jar --spring.datasource.url=jdbc:sqlite:teste-manual.db
```

5. Aguarde `Started EstoqueApplication`.
6. Faça `GET http://localhost:8080/api/usuarios`.

Resultado esperado:

- A aplicação inicia normalmente, sem erro de e-mail duplicado.
- Os três usuários iniciais aparecem uma única vez cada.
- Os dados e históricos criados durante o roteiro continuam no banco.

## D4. Confirmar bloqueio de registros inativos

### Operação com registro inativo

1. Crie um novo item ativo.
2. Tente uma entrada usando o usuário que foi inativado em A7.
3. Confirme status `400` e mensagem `O usuário responsável está inativo`.
4. Agora use um usuário ativo e tente uma entrada no item inativado em B12.
5. Confirme status `400` e mensagem `O item de estoque está inativo`.

## D5. Impedir ferramenta emprestada sem responsável

Em uma ferramenta disponível, envie uma correção com
`"novoStatus": "EMPRESTADA"`.

Resultado esperado:

- status `400`;
- mensagem orientando a usar a retirada;
- ao consultar a ferramenta, o status anterior foi preservado;
- a ferramenta não ficou com `responsavelAtualId` nulo e status `EMPRESTADA`.

## D6. Rejeitar quantidade zero

Em um item ativo, envie uma entrada com:

```json
{
  "usuarioId": 1,
  "quantidade": 0,
  "observacao": "Teste de zero"
}
```

Resultado esperado: `400` e nenhuma nova linha no histórico do item.

## D7. Conferir healthcheck e Swagger

Abra no navegador:

1. `http://localhost:8080/actuator/health` — deve mostrar somente `{"status":"UP"}`.
2. `http://localhost:8080/swagger-ui.html` — deve abrir a documentação interativa.
3. Confirme as cinco seções: Usuários, Itens de estoque, Ferramentas e as duas auditorias.
4. Abra uma operação e confira descrição, exemplo, schema e respostas HTTP.

## D8. Conferir CORS configurável

No PowerShell, copie e execute:

```powershell
Invoke-WebRequest -UseBasicParsing -Method Options `
  -Uri 'http://localhost:8080/api/usuarios' `
  -Headers @{
    Origin='http://localhost:3000'
    'Access-Control-Request-Method'='GET'
  }
```

Resultado esperado: status `200` e cabeçalho
`Access-Control-Allow-Origin: http://localhost:3000`.

Repita com `Origin='https://site-nao-permitido.example'`. O esperado é `403` e
ausência do cabeçalho de permissão.

---

# Checklist final

Marque cada item depois de conferir o resultado:

- [ ] Aplicação iniciou com o banco de teste.
- [ ] Navegador mostrou os usuários iniciais.
- [ ] Usuário foi criado, consultado, atualizado e inativado.
- [ ] E-mail duplicado foi recusado.
- [ ] Nome vazio e e-mail inválido foram recusados.
- [ ] Item foi criado e atualizado.
- [ ] Entrada aumentou a quantidade.
- [ ] Saída reduziu a quantidade.
- [ ] Saída sem saldo foi recusada e não mudou o estoque.
- [ ] Correção definiu a quantidade absoluta esperada.
- [ ] Item apareceu na lista abaixo do mínimo.
- [ ] Histórico de estoque ficou na ordem correta.
- [ ] Ferramenta foi criada e atualizada.
- [ ] Retirada definiu status e responsável.
- [ ] Segunda retirada foi recusada.
- [ ] Devolução limpou o responsável.
- [ ] Segunda devolução foi recusada.
- [ ] Manutenção alterou o status.
- [ ] Correção restaurou a disponibilidade.
- [ ] Perda alterou o status.
- [ ] Manutenção de ferramenta perdida foi recusada.
- [ ] Histórico da ferramenta ficou na ordem correta.
- [ ] ID inexistente retornou 404.
- [ ] Perfil inexistente retornou 400 sem detalhes internos.
- [ ] Resposta de erro trouxe referência de correlação.
- [ ] Usuário, item e ferramenta inativos foram bloqueados nas movimentações.
- [ ] Quantidade zero foi recusada sem criar histórico.
- [ ] Correção para EMPRESTADA sem retirada foi recusada.
- [ ] Healthcheck mostrou apenas UP.
- [ ] Swagger abriu com cinco seções e exemplos.
- [ ] CORS aceitou a origem configurada e rejeitou a desconhecida.
- [ ] Aplicação reiniciou sobre o mesmo banco.
- [ ] Dados iniciais não foram duplicados.

## Modelo para registrar uma falha

Use este formato para cada resultado diferente do esperado:

```text
Teste: B7 - Saída com saldo insuficiente
Data e hora:
Resultado esperado: HTTP 400 e saldo sem alteração
Resultado obtido:
URL usada:
Body enviado:
Resposta recebida:
Captura de tela anexada: sim/não
Observações:
```

## Encerrar e preservar os resultados

1. Na janela da aplicação, pressione `Ctrl+C`.
2. Guarde o arquivo `teste-manual.db` se quiser preservar as evidências.
3. Para repetir tudo do zero, com a aplicação parada, renomeie o banco antigo e
   execute novamente o comando inicial. Um novo banco será criado.
