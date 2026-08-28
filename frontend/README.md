# Estoque Tools — frontend

Fundação web em React, TypeScript e Vite, conectada ao backend Spring Boot do repositório.

## Requisitos

- Node.js 24 (ambiente validado: 24.18.0)
- npm 11 (ambiente validado: 11.16.0)
- backend em `http://127.0.0.1:8080`

No PowerShell desta máquina, use `npm.cmd` porque a execução de `npm.ps1` permanece bloqueada por política. Não é necessário instalar pacotes globais.

## Execução

```powershell
Copy-Item .env.example .env
npm.cmd ci
npm.cmd run dev
```

Com `VITE_API_BASE_URL` vazio, o Vite encaminha `/api` para o backend local. Para outra origem, preencha a variável apenas com a URL pública da API; variáveis `VITE_*` nunca devem conter segredos.

## Verificações

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

## Segurança da sessão

O access token permanece somente em memória. O refresh token é transportado em
cookie `HttpOnly`, não fica acessível ao JavaScript e permite restaurar a sessão
após recarregar a página. As chamadas enviam credenciais ao backend, que faz
rotação, detecção de reutilização e revogação da sessão. Nenhum JWT é gravado em
`localStorage` ou `sessionStorage`.

Em produção, o cookie deve usar `Secure`, HTTPS e `SameSite` compatível com a
topologia escolhida. As origens CORS precisam ser explícitas e coincidir com o
frontend publicado.

O `X-Organization-Id` seleciona a organização corrente nas chamadas de domínio. Ele não representa autorização: membership, perfil e isolamento continuam sendo validados no Spring Boot.
