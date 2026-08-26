# Contrato de API usado pelo frontend

Este documento registra somente os contratos efetivamente inspecionados no backend Spring Boot. A API é a autoridade para autenticação, autorização e isolamento entre organizações.

## Sessão

| Operação | Método e rota | Corpo/resposta relevante |
|---|---|---|
| Cadastro | `POST /api/auth/register` | Envia `{ nome, email, senha }`; retorna a conta criada. |
| Login | `POST /api/auth/login` | Envia `{ email, senha }`; retorna `accessToken`, expiração, `refreshToken` rotativo e sua expiração. |
| Conta atual | `GET /api/auth/me` | Retorna `{ id, nome, email, ativo, senhaAlteradaEm, ultimoLoginEm }`. |
| Renovação | `POST /api/auth/refresh` | Envia `{ refreshToken }`; retorna um novo par rotativo. |
| Logout | `POST /api/auth/logout` | Bearer obrigatório; envia `{ refreshToken }`; retorna `204`. |
| Logout global | `POST /api/auth/logout-all` | Bearer obrigatório; retorna `204`. |

O access token e o refresh token são mantidos **somente em memória**. Eles não são gravados em `localStorage`, `sessionStorage`, banco do navegador ou logs. Como o backend entrega o refresh token ao JavaScript, a evolução recomendada é usar cookie `HttpOnly`, `Secure` e `SameSite`; até lá, recarregar a página exige novo login.

## Organizações

| Operação | Método e rota | Contrato |
|---|---|---|
| Listar vínculos | `GET /api/organizacoes` | Retorna organizações com `id`, `nome`, `ativa`, `criadaEm`, `perfil` e `status`. |
| Criar | `POST /api/organizacoes` | Envia `{ nome }`; o backend cria vínculo `ADMIN/ATIVO`. |

Operações de domínio recebem `X-Organization-Id`. Esse header apenas seleciona o contexto; o backend valida membership e perfil em todas as rotas protegidas.

## Dashboard inicial

- `GET /api/ferramentas`: ferramentas da organização e seus estados `DISPONIVEL`, `EMPRESTADA`, `MANUTENCAO` ou `PERDIDA`.
- `GET /api/movimentacoes-ferramenta`: histórico recente disponível a todos os perfis ativos.
- `GET /api/movimentacoes-ferramenta/resumo?aposId=0&limite=6`: resumo e pendências exclusivo de `ADMIN`.

O dashboard calcula total, disponíveis e em uso a partir da lista real. Usuários não administradores veem a pendência como restrita, sem uma chamada que produziria `403`.

## Erros

O backend retorna erro sanitizado com `status`, `codigo`, `mensagem`, `referencia` e, em validação, `campos`. O frontend nunca mostra stacktrace ou detalhes técnicos. `401` pode disparar uma única renovação; `403` vira mensagem de permissão; `404` não revela se um recurso existe em outra organização.
