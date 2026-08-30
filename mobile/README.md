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

Builds com `EXPO_PUBLIC_APP_ENV=development` permitem HTTP para laboratório/LAN. Builds com `production` bloqueiam tráfego sem TLS e exigem HTTPS.

`EXPO_PUBLIC_API_URL` é incorporada ao bundle durante o build. Portanto, gere um novo APK ao trocar o servidor. O endereço não é secret, mas ficará legível no aplicativo; nenhuma chave do backend deve ser incluída no app.

### Endereços usuais

- Emulador Android com backend no mesmo PC: `http://10.0.2.2:8080`.
- Celular e PC-servidor na mesma rede: `http://<IP-LAN-DO-PC>:8080`.
- Servidor futuro em nuvem: URL pública HTTPS, por exemplo `https://api.seudominio.com`.

O backend deve escutar em uma interface acessível pela rede e seu firewall deve liberar somente a porta necessária. Nunca publique o secret JWT do backend no aplicativo.

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

## APK interno

Os profiles `internal` e `preview-lan` de `eas.json` produzem APKs instaláveis, sem configurar publicação na Play Store:

- `internal` usa o ambiente EAS `preview` e mantém as regras de produção: a API precisa usar HTTPS;
- `preview-lan` usa o ambiente EAS `development` e permite HTTP somente para uma demonstração controlada na rede local.

A URL da API é lida do ambiente EAS no momento do build e nunca fica gravada no repositório.

Primeiro vincule este diretório a um projeto da conta Expo e cadastre a URL pública de conexão:

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value "https://api.seudominio.com" --environment preview --visibility plaintext
```

Depois gere o APK:

```powershell
npx eas-cli@latest build --platform android --profile internal
```

Para uma demonstração LAN, descubra o IPv4 atual da máquina, cadastre a URL apenas no ambiente `development` do EAS e use o profile dedicado:

```powershell
ipconfig
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value "http://<IP-LAN-ATUAL>:8080" --environment development --visibility plaintext
npx eas-cli@latest build --platform android --profile preview-lan
```

O endereço LAN é configuração de build e deve ser atualizado quando a rede mudar; ele não deve ser hardcoded no código nem no `eas.json`.

O EAS fornece um link para baixar o APK assinado. No aparelho, baixe o arquivo, autorize a instalação dessa origem quando o Android solicitar e conclua a instalação. Em uma máquina com Android SDK, também é possível usar `adb install caminho\estoque-tools.apk`.

Antes de cada nova distribuição, atualize `version` e aumente `android.versionCode` em `app.config.ts`. Nunca versione `.env`, keystore, senha, token Expo ou credencial de assinatura.

Os assets oficiais ficam em `assets/`. O arquivo mestre vetorial reutilizável é `assets/brand/estoque-tools-icon-master.svg`; os PNGs de 1024 × 1024 são derivados do mesmo símbolo geométrico usado pelo frontend web. Ícone adaptativo, ícone monocromático e splash não contêm texto e respeitam a área segura do Android.

## Segurança

- Access token permanece apenas em memória.
- Refresh token rotativo fica no cofre seguro do Android por `expo-secure-store`.
- Cache de servidor é isolado pela organização ativa.
- Lista, detalhe, histórico e Dashboard são invalidados por organização após operações.
- Logout revoga a sessão no backend e limpa o cofre e o cache local.
- Backup de dados do aplicativo está desabilitado no Android.
- O app pede apenas acesso à internet; câmera, localização, contatos, SMS, telefone, microfone, notificações, mídia, arquivos, acessibilidade e overlay estão explicitamente bloqueados.
