# Segurança de autenticação e sessões

## Modelo adotado

A API usa access tokens JWT HS256 de curta duração e refresh tokens opacos de
256 bits. O valor do refresh token é entregue somente ao cliente; o banco guarda
apenas seu SHA-256. Cada uso faz rotação obrigatória. A reutilização de um token
já rotacionado invalida toda a família daquela sessão.

Os access tokens carregam a versão de credencial da conta. Troca ou recuperação
de senha e `logout-all` incrementam essa versão, revogam todos os refresh tokens
ativos e tornam os JWTs anteriores inválidos na próxima requisição. O logout de
uma sessão revoga seu refresh token; o access token correspondente permanece
válido somente até sua expiração curta.

Endpoints:

- `POST /api/auth/login`: emite access e refresh token;
- `POST /api/auth/refresh`: rotaciona o refresh e emite novo par;
- `POST /api/auth/logout`: revoga a sessão indicada, de forma idempotente;
- `POST /api/auth/logout-all`: revoga todas as sessões da conta;
- `PUT /api/auth/password`: exige senha atual e revoga as sessões anteriores.

Tokens, senhas e hashes não são registrados em logs. Respostas de erro de login
e sessão são genéricas e não informam se uma conta existe.

## Política de senha e força bruta

Novas senhas devem ter entre 12 e 72 caracteres e caber no limite de 72 bytes do
BCrypt. O hash BCrypt usa o encoder configurado pela aplicação. Após cinco
falhas consecutivas, por padrão, a conta fica bloqueada por 15 minutos. Contador,
instante da última falha e bloqueio são persistidos no banco, evitando estruturas
em memória sem limite e mantendo o comportamento consistente entre instâncias.

Os valores são configuráveis por ambiente:

| Variável | Padrão | Finalidade |
|---|---:|---|
| `APP_ACCESS_TOKEN_TTL` | `15m` | duração do JWT |
| `APP_REFRESH_TOKEN_TTL` | `30d` | duração máxima da sessão renovável |
| `APP_PASSWORD_RESET_TOKEN_TTL` | `30m` | validade do token de recuperação |
| `APP_MAX_FAILED_LOGIN_ATTEMPTS` | `5` | falhas antes do bloqueio |
| `APP_LOGIN_LOCK_DURATION` | `15m` | duração do bloqueio temporário |

## Recuperação de senha

A infraestrutura interna gera token opaco, persiste somente o hash, impõe
expiração e uso único e revoga sessões após a redefinição. Não existe endpoint
público de recuperação nesta versão: falta integrar um canal confiável de
entrega, como provedor de e-mail transacional. O token em texto puro nunca deve
ser retornado por uma API de produção nem gravado em log. O serviço interno foi
deliberadamente mantido separado para futura integração com esse provedor.

## APP_JWT_SECRET

`APP_JWT_SECRET` não possui valor padrão e deve conter Base64 de pelo menos 32
bytes aleatórios. Gere uma chave diferente por ambiente.

PowerShell:

```powershell
$bytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Linux e macOS:

```bash
openssl rand -base64 32
```

Armazene o valor em um gerenciador de secrets ou variável protegida do ambiente,
nunca em `.env` versionado, Dockerfile, log ou comando salvo no histórico.

### Rotação operacional

1. Agende uma janela curta e impeça novos logins.
2. Faça backup do banco.
3. Invalide todas as sessões, incrementando `usuarios.token_version` e revogando
   refresh tokens ativos em uma única transação administrativa controlada.
4. Substitua `APP_JWT_SECRET` no gerenciador de secrets de cada instância.
5. Reinicie todas as instâncias e valide healthcheck e login.
6. Confirme que JWTs e refresh tokens anteriores foram rejeitados.

Não misture duas chaves ativas sem implementar explicitamente identificação de
chave (`kid`) e janela de transição. A estratégia atual prefere uma rotação
simples, com invalidação global e nova autenticação.

## Produção

No profile `prod`, OpenAPI e Swagger UI ficam desabilitados. CORS deve listar
origens conhecidas, sem wildcard quando credenciais forem permitidas. O
healthcheck expõe somente o estado necessário e endpoints de negócio exigem
autenticação e membership ativa na organização selecionada.
