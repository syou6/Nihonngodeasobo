# 日本語であそぼ — Japanese Pitch-Accent Trainer

A web app for practising **Japanese pitch accent (高低アクセント)**. Record a word,
see your own pitch contour drawn against a native speaker's, and get honest
drop-detection scoring and coaching — so you can hear and fix where your pitch
rises and falls.

A secondary **AI voice diary** tab remains for free-form speaking practice with
AI text feedback.

## Key features

- **Pitch trainer (the core):** listen to a native reference, record a word, and
  compare your live pitch contour to the real native F0 curve. Honest
  drop-detection scoring + coaching, not just a pass/fail.
- **66-word curriculum** with adaptive review and mastery tracking; progress syncs
  to the cloud once signed in.
- **Session summaries** and a shareable result card.
- **Guest mode:** try the trainer straight from the landing page with no signup
  (the "Score My Pitch" flow).
- **Free tier with daily limits:** 30 of 66 words and 5 voice scorings/day.
  **Premium** unlocks the full curriculum and unlimited scoring at **$8.99/month**
  or **$59/year**.
- **Voice diary (secondary):** record a spoken diary entry and receive AI text
  feedback via a Supabase Edge Function (NVIDIA NIM / Gemini-style LLM).
- PWA support with optional push notifications.

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS (Framer Motion for
  animation)
- **State:** Zustand
- **Pitch analysis:** [`pitchy`](https://www.npmjs.com/package/pitchy) +
  [`hatsuon`](https://www.npmjs.com/package/hatsuon), run client-side / on-device
- **Backend:** Supabase (Auth, Postgres, Storage, Edge Functions)
- **AI feedback (diary):** Supabase Edge Function (`gemini-ai`) backed by NVIDIA NIM
- **Payments:** Stripe
- **Notifications:** Firebase Cloud Messaging / Web Push (optional)
- **Testing:** Vitest (unit) + Playwright (E2E)

## Local development

```bash
npm install
cp .env.example .env   # fill in Supabase (and optionally Stripe) values
npm run dev            # start the dev server
npm test               # run unit tests (vitest)
npm run build          # production build
npm run test:e2e       # run Playwright E2E tests
```

Minimum to run locally: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The
NVIDIA NIM key for diary feedback lives on the server side (Supabase Edge
Function), not in the client:

```bash
supabase secrets set NVIDIA_API_KEY=your_key
# model override is optional (default: qwen/qwen2.5-72b-instruct)
supabase secrets set NVIDIA_MODEL=qwen/qwen2.5-72b-instruct
```

See [`.env.example`](./.env.example) for the full list of environment variables.

## Documentation

- [`docs/PLAN.md`](./docs/PLAN.md) — implementation plan / roadmap (post pitch-accent pivot).
- [`docs/REVENUE.md`](./docs/REVENUE.md) — revenue model and conversion funnel.
- [`docs/APPLY_MIGRATIONS.md`](./docs/APPLY_MIGRATIONS.md) — applying Supabase migrations (incl. pitch progress / cloud sync).
- [`docs/architecture.md`](./docs/architecture.md) — system architecture diagram.
- [`docs/setup/`](./docs/setup/) — deployment & integration guides (Supabase, Stripe, Vercel env, Google OAuth, Firebase/FCM, push notifications).
