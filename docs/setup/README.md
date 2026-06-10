# Setup guides

Deployment and integration guides for 日本語であそぼ (pitch-accent trainer).
Most of these are optional — the app runs locally with only Supabase configured.

| Guide | What it covers |
|-------|----------------|
| [supabase.md](./supabase.md) | Supabase project setup: secrets, Edge Functions deploy, billing-related tables and RLS policies. |
| [edge-functions.md](./edge-functions.md) | Deploying Supabase Edge Functions (checkout, Stripe webhook) via CLI or dashboard. |
| [stripe.md](./stripe.md) | Stripe billing end-to-end: API keys, $8.99/mo & $59/yr prices, webhook events, env vars, test cards, Stripe CLI. Merges the old `STRIPE_*.md` files. |
| [vercel-env.md](./vercel-env.md) | Setting `VITE_*` environment variables in Vercel and redeploying. |
| [google-auth.md](./google-auth.md) | Fixing Google OAuth redirect URLs in Supabase Auth and Google Cloud Console. |
| [firebase-fcm.md](./firebase-fcm.md) | Firebase Cloud Messaging / VAPID Web Push key setup. Merges the old Firebase/FCM guides. |
| [push-notifications.md](./push-notifications.md) | Push notification system design: tables, Edge Functions, triggers, platform notes (used by the secondary diary feature). |

See also, one level up in [`docs/`](../):

- [PLAN.md](../PLAN.md) — implementation plan / roadmap (post pitch-accent pivot).
- [REVENUE.md](../REVENUE.md) — revenue model and conversion funnel.
- [APPLY_MIGRATIONS.md](../APPLY_MIGRATIONS.md) — how to apply Supabase migrations (incl. pitch progress).
- [architecture.md](../architecture.md) — system architecture diagram.
- [zenn-article.md](../zenn-article.md) — blog post draft.
