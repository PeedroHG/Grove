# Grove — Handoff / contexto de desenvolvimento

Documento pra retomar o desenvolvimento em outra máquina ou numa sessão nova do
Claude Code. Resume o que é o app, o que já foi feito, as decisões tomadas e o
que está pendente. (O README.md tem o guia de instalação/deploy; este arquivo é
o "estado do projeto" pra quem vai continuar.)

## O que é o Grove

App de controle financeiro pessoal (React Native/Expo, **Android**), open-source
(**AGPL-3.0**), sem fins lucrativos, pra jovens com renda irregular.

Conceito central: **orçamento por envelopes ("bolsos")** estilo YNAB, com
**alocação automática por fonte de renda**. Quando entra dinheiro, o app divide
entre os bolsos seguindo regras: **custos fixos são cobertos primeiro** (cascata
de segurança), o que sobra vai por **porcentagem** pras metas e gastos livres.

Duas verdades de produto que guiam tudo:
1. **Atrito de digitação mata o app** → automação via Nubank (Pluggy) é o core.
2. **O usuário precisa ser ensinado** → o app tem uma "voz" (coach no onboarding).

Modelo **BYOB (Bring Your Own Backend)**: cada usuário roda a própria instância
com o próprio Supabase (grátis) + Meu Pluggy (grátis). Ninguém hospeda dados de
ninguém.

## Stack

- **Expo + TypeScript + expo-router** (navegação por arquivos em `app/`)
- **expo-sqlite + Drizzle ORM** — banco local (ledger)
- **Drizzle live queries** (`useLiveQuery`) — reatividade, sem Redux
- **react-native-reanimated + react-native-svg** — animações (ícones Lucide desenhados)
- **Onest** (`@expo-google-fonts/onest`) — fonte
- **Supabase** (Postgres + Auth + Edge Functions) — backend opcional (Fase 1/2)
- **Pluggy** ("Meu Pluggy" grátis) — Open Finance / Nubank (Fase 2)
- **Vitest** — testes do motor de alocação
- Identidade visual: **all-black minimalista** (fundo `#000`, cards `#09090b`,
  bordas `#27272a`), **mono** (cor só nas categorias), glow branco sutil, botão
  primário invertido (branco/preto).

## Estrutura do repo

```
app/                      rotas expo-router (cada arquivo = tela)
  (tabs)/                 Início, Metas, Relatórios, Ajustes
  onboarding.tsx          coach de 6 passos
  nova-transacao.tsx, bolso/[id].tsx, revisao.tsx, conectar-banco.tsx
src/
  db/                     schema SQLite (Drizzle), migrations, seed, DbProvider
  shared/engine/          MOTOR de alocação — TS puro, com testes Vitest
  features/               lógica por domínio (buckets, ledger, incomeSources,
                          review, reports, notifications, accounts, dev)
  components/ui/          UI (MoneyInput, AnimatedLucideIcon, ProgressRing, etc.)
  sync/                   sincronização device <-> Supabase (last-write-wins)
  lib/                    money (centavos), id, date, supabaseClient, etc.
  theme/tokens.ts         cores/tipografia/espaçamento/glow
supabase/
  schema/schema.ts        mirror Postgres do schema local + RLS
  migrations/             SQL gerado
  functions/              Edge Functions Pluggy (connect-token, refresh,
                          link-item, webhook) + _shared
```

## Decisões de arquitetura (não reabrir sem motivo)

- **Ledger**: bolso NÃO guarda saldo em coluna; saldo = soma de `ledger_entries`.
  Evita drift; recategorizar/reprocessar/reconciliar saem de graça.
- **Dinheiro sempre em centavos (integer)**, nunca float. Conversão só via
  `src/lib/money.ts` e pelo componente `MoneyInput`.
- **Backend autoritativo + celular como espelho**: o motor roda no backend
  (Edge Function) na ingestão do Pluggy; o celular é cache de leitura + entrada
  manual (dinheiro vivo). Funciona offline, mostra "desatualizado".
- **Sync = last-write-wins por `updatedAt` + tombstone** (`deletedAt`). Sem CRDT.
- **Manual = só dinheiro vivo** (banco vem só do Pluggy → sem dedup/fusão).
- **O app nunca move dinheiro** — só lembra o usuário e confere pela leitura.
- **`supabase/functions/_shared/engine.ts` é um espelho manual** de
  `src/shared/engine` (Deno não resolve import pra fora de `functions/`). Se
  mexer na lógica de alocação, mexa nos DOIS lugares. Os testes de referência
  ficam em `src/shared/engine`.

## Estado atual (Fases 0–4 implementadas)

- **Fase 0** — motor + telas locais: motor com testes, schema ledger, onboarding
  coach, dashboard, metas, nova transação, detalhe de bolso, ajustes. ✅
- **Fase 1** — backend/sync: schema Postgres + RLS, sync device↔Supabase, tela de
  setup (config em runtime), biometria na abertura. ✅ (código pronto; exige o
  usuário criar o projeto Supabase pra ativar)
- **Fase 2** — Nubank/Pluggy: Edge Functions (connect-token/refresh/link-item/
  webhook) rodando o motor na ingestão, categorização por `merchant_rules`, fila
  de revisão, push, tela de conexão via WebView. ✅ (código pronto; exige contas
  Pluggy + Supabase; NÃO testado contra sandbox real ainda)
- **Fase 3** — self-host: README, scripts `supabase:deploy`, `.env.example`,
  licença AGPL. ✅
- **Fase 4** — relatórios (gasto por bolso no mês) + tela de reconexão de
  consentimento. ✅

## Como rodar (dev)

```bash
npm install --legacy-peer-deps    # expo-router puxa radix/react-dom em conflito; legacy resolve
npx expo start                    # abrir no Expo Go (Android) via QR
```

Verificação sem device: `npm test` (motor) e `npx expo export --platform android`
(pega erros de bundle/resolução).

### Gotchas de dev importantes
- **Sempre `--legacy-peer-deps`** ao instalar pacotes (conflito peer do expo-router).
- **Reload completo** (tecla `r` no Expo, não só Fast Refresh) quando: rodar
  migração nova de banco, ou testar animações disparadas na montagem.
- **Migrações**: ao mudar `src/db/schema.ts`, rodar `npm run db:generate`. As
  migrations viram JS via `babel-plugin-inline-import` (`.sql` na config do babel).
- **Pluggy Connect SDK** é nativo → precisa de dev build (EAS). Por isso usamos o
  widget web da Pluggy dentro de `react-native-webview` (roda no Expo Go).
- **Botão "Recomeçar do zero"** em Ajustes → Zona de teste: apaga tudo local e
  volta ao onboarding. Útil pra testar (`src/features/dev/reset.ts`).

## Pendências / próximos passos

1. **Verificar animação da tab bar no device** — os ícones Lucide da tab bar
   (`AnimatedLucideTabIcon` em `src/components/ui/AnimatedLucideIcon.tsx`) devem
   se redesenhar + dar pop ao trocar de aba. Última correção foi juntar o
   "esconder + desenhar" num `withSequence` (evita animar 0→0). Confirmar no
   celular; se não animar, trocar o gatilho de `focused` prop para `useIsFocused()`.
2. **Dados de teste duplicados** — onboardings repetidos acumularam bolsos. Usar
   "Recomeçar do zero" pra um estado limpo.
3. **Tela de gerenciar fontes de renda nos Ajustes** — prometida, ainda não feita.
   Onboarding só cria fontes "reliable"; a esporádica (freela) com regras próprias
   + `matchHint` (reconhecer pagador do Pix) deve ser gerenciável ali.
4. **Peso/prioridade por meta** — hoje o "futuro" é dividido igualmente entre as
   metas. Decidir se vira peso por meta ou ordem de prioridade (ex: encher a
   reserva de emergência antes do iPhone).
5. **Verificações da Fase 2 no sandbox Pluggy** (só com conta real):
   - Refresh silencioso do Nubank exige MFA a cada sync? (afeta "puxar ao abrir")
   - Granularidade de saldo por Caixinha (pode vir só agregado)
   - Formato exato da resposta do `/connect_token` e versão do `pluggy-connect.js`
     no CDN (conferir em https://docs.pluggy.ai)
6. **Confirmar ToS do Pluggy** — a interpretação "cada um usa o próprio Meu Pluggy
   grátis = não-comercial" precisa de confirmação direta com o Pluggy antes de
   divulgar em massa.

## Fase 2 — setup (o usuário faz; veja README para o passo a passo)

Criar projeto Supabase → `supabase link` → `npm run supabase:db:push` → criar
Development Application no Meu Pluggy → preencher `supabase/.env` (a partir do
`.env.example`) → `npm run supabase:deploy` → configurar webhook URL no painel
Pluggy → no app (Ajustes) colar URL + anon key e conectar Nubank PJ/PF.

## Coisas que NÃO estão no git (recriar por máquina)

- `supabase/.env` — segredos do Pluggy (ignorado; usar `.env.example`)
- Banco SQLite local — fica no device
- `supabase/.temp/` — estado da CLI do Supabase (ignorado)
