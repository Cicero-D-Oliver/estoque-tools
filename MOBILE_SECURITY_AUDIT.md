# Auditoria de dependências Android

Data da validação: 2026-11-04.

## Ambiente e comandos

- Expo SDK real: `expo@57.0.31`.
- `npx expo install --fix`: dependências do SDK 57 alinhadas, sem migração major.
- `npx expo-doctor`: 21/21 verificações aprovadas depois de declarar
  `expo-font@57.0.4` e seu config plugin.
- Antes do alinhamento por patches do SDK 57, `npm audit --json` registrava 37
  ocorrências (7 low, 28 moderate, 2 high, 0 critical) e
  `npm audit --omit=dev --json` registrava 20 (2 low, 16 moderate, 2 high,
  0 critical).
- Na validação final, `npm audit --json` registrou 22 ocorrências (10 low,
  10 moderate, 2 high, 0 critical).
- Na validação final, `npm audit --omit=dev --json` registrou 13 ocorrências
  (2 low, 9 moderate, 2 high, 0 critical).

Os JSON completos da execução local ficam em `target/audits/` e não são
versionados, pois são artefatos reproduzíveis. A CI refaz as duas auditorias.

## Ocorrências HIGH

| Pacote | Advisory/caminho | Classificação | Correção indicada pelo npm |
|---|---|---|---|
| `zod@3.25.76` | `GHSA-mrhx-c7xc-m3w5`; `expo@57.0.31 > @expo/cli@57.0.32 > zod` | toolchain Node do Expo CLI | `expo@58.0.23` (major) |
| `@expo/cli@57.0.32` | ocorrência agregada causada pelo `zod` acima | toolchain Node do Expo CLI | `expo@58.0.23` (major) |

O advisory permite exaustão de memória ao validar coleções restritas muito
grandes. O código do aplicativo não importa nem chama `zod`; o caminho pertence
ao CLI usado para instalar, diagnosticar e gerar bundles. O `npm audit
--omit=dev` ainda o classifica porque `expo` é dependência direta de runtime,
mas isso não significa que o CLI Node seja embarcado no APK.

O export Android/Hermes foi gerado com sucesso (1.207 módulos, HBC de 3,1 MB) e
não contém marcadores de `@expo/cli`, do advisory ou do módulo `node_modules/zod`.
Com base nessa inspeção e na árvore de dependências, a ocorrência não é
explorável por entradas remotas do aplicativo Android; ela permanece relevante
para a máquina de build e deve ser reavaliada antes da futura migração de SDK.

## Decisão e guard da CI

Não foi usado `npm audit fix --force` e o projeto não migrou para Expo 58. A CI
aceita exclusivamente as duas ocorrências HIGH transitivas acima, falha para
qualquer CRITICAL e para qualquer HIGH novo, direto ou fora desse caminho. As
ocorrências low/moderate continuam registradas no JSON e devem ser reduzidas por
patches compatíveis do SDK 57 ou pela migração major planejada e testada.

Nenhum APK foi gerado nesta etapa: ainda faltam endpoint de produção real,
configuração SMTP real e validação do onboarding no ambiente de implantação.
