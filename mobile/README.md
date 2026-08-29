# Estoque Tools — Android

Cliente React Native/Expo da mesma API usada pelo MVP web. Esta base reaproveita a estrutura do aplicativo mobile anterior e atualiza autenticação, organizações, cache e Dashboard para o contrato atual do backend.

## Escopo deste bloco

- Splash, login e restauração de sessão;
- refresh rotativo armazenado com `expo-secure-store`;
- logout com revogação no servidor;
- listagem, seleção e criação de ambientes;
- Dashboard operacional por organização e perfil;
- rotas protegidas de Início e Perfil.

Ferramentas, Estoque, Movimentações e Equipe serão implementados nos próximos blocos. Nenhum botão simulado é exibido enquanto essas telas não estiverem prontas.

## Configuração

Copie `.env.example` para `.env.local` e ajuste somente a URL pública:

```properties
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
```

- Emulador Android: `10.0.2.2` aponta para a máquina de desenvolvimento.
- Aparelho físico: use o endereço LAN do backend.
- Produção: `EXPO_PUBLIC_APP_ENV=production` exige uma URL HTTPS.

Nenhuma chave do backend deve ser incluída no app.

## Comandos

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run test
npm.cmd run export:android
npm.cmd audit
```

Para desenvolvimento interativo:

```powershell
npm.cmd run start
```

## Segurança

- Access token permanece apenas em memória.
- Refresh token rotativo fica no cofre seguro do Android por `expo-secure-store`.
- Cache de servidor é isolado pela organização ativa.
- Logout revoga a sessão no backend e limpa o cofre e o cache local.
- O app pede apenas acesso à internet; câmera, localização, contatos, SMS, microfone e arquivos estão bloqueados neste bloco.
