# Grove

Um app de controle financeiro de código aberto, gratuito e sem fins lucrativos, pra quem tem renda irregular (freelas, bicos, estágio) e quer separar automaticamente o que entra — sem digitar cada gasto.

O motor: cada bolso (envelope) acumula saldo de verdade; sua renda é dividida entre eles seguindo regras que você define (fixos cobertos primeiro, o resto por porcentagem); a Pluggy puxa seu extrato do Nubank direto do banco.

**Modelo BYOB (Bring Your Own Backend):** não existe um servidor central do Grove. Cada pessoa cria seu próprio projeto Supabase (grátis) e sua própria conta Meu Pluggy (grátis), e roda a própria instância. Seus dados financeiros nunca passam pelas mãos de quem mantém este repositório.

## Rodando localmente (sem backend)

O app funciona 100% offline sem nenhuma configuração — registro manual, bolsos, metas, tudo local no seu celular.

```bash
npm install
npm start
```

Abra no [Expo Go](https://expo.dev/go) (Android) escaneando o QR code. Na primeira vez, o app te leva direto pro onboarding.

## Ativando sincronização + Nubank (opcional)

Isso liga backup na nuvem, sincronização entre aparelhos, e a puxada automática do Nubank. Nenhum passo aqui é obrigatório pra usar o app.

### 1. Crie seu projeto Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto (plano gratuito).
2. Instale a [Supabase CLI](https://supabase.com/docs/guides/cli) e faça login: `supabase login`.
3. Na raiz do repo, vincule o projeto: `npm run supabase:link` (ele vai pedir o project ref, que está na URL do painel).

### 2. Suba o schema do banco

```bash
npm run supabase:db:push
```

Isso cria as tabelas do ledger com Row Level Security já configurado (cada usuário só enxerga os próprios dados).

### 3. Crie sua conta Meu Pluggy

1. Vá em [meu.pluggy.ai](https://meu.pluggy.ai) e conecte seu Nubank (isso é gratuito e é o que autoriza o Open Finance).
2. Vá em [dashboard.pluggy.ai](https://dashboard.pluggy.ai) e crie uma "Development Application" — anote o `Client ID` e o `Client Secret`.
3. Copie `supabase/.env.example` para `supabase/.env` e preencha `PLUGGY_CLIENT_ID`/`PLUGGY_CLIENT_SECRET`.

⚠️ A Development Application tem um trial de 15 dias pra **criar novas conexões** — conecte suas contas Nubank (PJ e PF, se tiver as duas) dentro dessa janela. Dados de contas já conectadas continuam acessíveis depois.

### 4. Configure os secrets e publique as Edge Functions

```bash
npm run supabase:secrets
npm run supabase:functions:deploy
```

Ou tudo de uma vez (push do schema + secrets + functions): `npm run supabase:deploy`.

### 5. Configure o webhook no painel da Pluggy

No [dashboard.pluggy.ai](https://dashboard.pluggy.ai), configure a Webhook URL da sua aplicação apontando para:
```
https://<seu-projeto>.supabase.co/functions/v1/pluggy-webhook
```
Evento: `item/updated` (e `item/created`).

### 6. Conecte o app ao seu Supabase

No app, vá em **Ajustes → Conta e sincronização**, cole a **URL do projeto** e a **anon key** (ambas em Project Settings → API no painel do Supabase), entre com seu email (login por código), e sincronize.

Depois disso, ainda em Ajustes, use **Conectar Nubank PJ** / **Conectar Nubank PF** pra abrir o Pluggy Connect e autorizar cada conta.

## Estrutura do repositório

```
app/                  rotas (expo-router) — cada arquivo é uma tela
src/
  db/                 schema local (SQLite/Drizzle), migrations, seed
  theme/              tokens de cor/tipografia/espaçamento
  components/         UI reutilizável
  features/           lógica por domínio (bolsos, ledger, onboarding, revisão...)
  sync/               sincronização device ↔ Supabase (last-write-wins)
  shared/engine/      o motor de alocação — lógica pura, com testes
supabase/
  schema/             mirror Postgres do schema local + RLS
  migrations/         SQL gerado a partir do schema
  functions/           Edge Functions (Pluggy connect/refresh/webhook/link-item)
```

## Rodando os testes

```bash
npm test
```

Cobre o motor de alocação (`src/shared/engine`) — cascata de fixos, arredondamento de porcentagem, fontes de renda esporádicas vs. confiáveis, pagamento de fatura de cartão.

## Gerando um APK

```bash
npx eas build --profile preview --platform android
```

Requer uma conta Expo/EAS (gratuita) — veja [expo.dev/eas](https://expo.dev/eas). O APK gerado pode ser instalado direto no celular (sideload) ou publicado em GitHub Releases.

## Limites conhecidos / decisões conscientes

- **Sync é last-write-wins**, não CRDT — adequado pra uso pessoal em poucos aparelhos, não pra edição concorrente pesada.
- **O app nunca move dinheiro** entre contas/Caixinhas — ele te lembra de mover manualmente no app do banco e confirma pela leitura.
- **A frequência de atualização do Nubank depende do Open Finance** (ciclo de horas), não é um feed em tempo real.
- **`supabase/functions/_shared/engine.ts` é um espelho manual** de `src/shared/engine` — Deno (runtime das Edge Functions) não resolve de forma confiável imports relativos pra fora de `supabase/functions`. Se mexer na lógica de alocação, mexa nos dois lugares.

## Licença

[AGPL-3.0](LICENSE) — livre pra usar, estudar e modificar; se você distribuir uma versão modificada (inclusive rodando como serviço), o código dela também precisa ser aberto.
