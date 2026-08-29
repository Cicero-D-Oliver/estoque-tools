# Estoque Tools — Android

Cliente React Native/Expo da mesma API usada pelo MVP web. Esta base reaproveita a estrutura do aplicativo mobile anterior e atualiza autenticação, organizações, cache e Dashboard para o contrato atual do backend.

## Escopo deste bloco

- Splash, login e restauração de sessão;
- refresh rotativo armazenado com `expo-secure-store`;
- logout com revogação no servidor;
- listagem, seleção e criação de ambientes;
- Dashboard operacional por organização e perfil;
- módulo Ferramentas com lista, busca, filtros e detalhe;
- retirada, devolução, transferência, manutenção, conclusão e perda;
- histórico operacional e ações administrativas conforme o perfil;
- Estoque com entrada, saída, correção e histórico;
- Movimentações unificadas com confirmação administrativa;
- Equipe com aprovação, perfis e remoção lógica de acesso;
- rotas protegidas de Início, Ferramentas, Estoque, Movimentações, Equipe e Perfil.

Equipe é exibida somente para ADMIN, conforme a autorização real do backend. Nenhum botão simulado é exibido.

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
- Lista, detalhe, histórico e Dashboard são invalidados por organização após operações.
- Logout revoga a sessão no backend e limpa o cofre e o cache local.
- O app pede apenas acesso à internet; câmera, localização, contatos, SMS, microfone e arquivos estão bloqueados neste bloco.
