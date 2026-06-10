# Revenue model — path to ¥100,000/month

Goal: **¥100,000/month recurring**. At $8.99/mo (≈¥1,350) that is **~75 active
monthly subscribers**, or fewer with annual ($59/yr ≈ ¥8,850) in the mix:

| Mix | Subscribers needed |
|-----|--------------------|
| All monthly ($8.99) | ~75 |
| All annual ($59/yr) | ~135 (paid upfront; ≈¥100k MRR-equivalent) |
| Realistic 80/20 monthly/annual | ~80 payers |

## The funnel (now fully built in code)

```
LP visit ──► "Score My Pitch" (guest, no signup) ──► Pitch Trainer = the aha
   │                                                      │
   │ lp_view, cta_click (A/B: lp_variant)                 │ listen → record → score
   ▼                                                      ▼
returning badge                          value-peak signup prompt (A/B trigger)
                                                          │  pitch_guest_signup_prompt
                                                          ▼
                                              free account (progress saved to cloud)
                                                          │
                              free tier limits: 30 words · 5 scorings/day
                                                          │  pitch_paywall_hit
                                                          ▼
                                     PaywallModal ──► Pricing (monthly/annual) ──► Stripe
                                       pitch_upgrade_click        begin_checkout
```

Every step emits a GA4 event, so each conversion rate is measurable and the two
A/B tests (`lp_variant`, `ab_signup_prompt_trigger`) can be read off directly.

## What converts (implemented)

1. **Aha without friction** — guests land straight in the trainer; live + real
   native pitch contour; honest drop-detection scoring.
2. **Reasons to sign up** — save progress (loss aversion), sync across devices,
   unlock 20→full curriculum. Prompted at the value peak, once per session.
3. **Reasons to pay** — free is genuinely capped (5 scorings/day, 30 of 66 words);
   the paywall appears at the moment of demonstrated value, not before it.
4. **Annual upsell** — Monthly/Annual toggle, −45% framing, $59/yr.

## Unit economics

- Price: $8.99/mo or $59/yr. Stripe fee ≈2.9%+30¢ → net ≈$8.40 / ~$57.
- Marginal cost per user ≈ $0 (static audio/contours; pitch scoring is on-device;
  no server AI call in the pitch path). Gross margin ~97%.
- So revenue ≈ payers × price. The lever is **payers**, i.e. traffic ×
  signup-rate × paid-rate.

### Worked example to the goal
Assume LP→trainer 60%, trainer→signup 8%, signup→paid 6% (achievable with the
gating now in place):

```
payers = visitors × 0.60 × 0.08 × 0.06 = visitors × 0.00288
75 payers  ⇒  ~26,000 LP visitors / month  (~870/day)
```

Improving any rate compounds. Halving the funnel leak (e.g. signup 8%→12%,
paid 6%→9%) cuts the traffic needed to ~12,000/mo. **The code now makes those
rates improvable and measurable; traffic is the remaining input.**

## ⚠️ Blocking owner actions (revenue cannot flow without these)

1. **Rotate the leaked Stripe keys** (were in git history) — then they're safe.
2. **Set `VITE_STRIPE_ANNUAL_PRICE_ID`** in Vercel (create the $59/yr Price in
   Stripe). Without it the Annual card can't check out.
3. **Confirm `VITE_STRIPE_PREMIUM_PRICE_ID`** ($8.99/mo Price) is set in Vercel.
4. **Apply migration 014** (`docs/APPLY_MIGRATIONS.md`) so cloud sync / "save your
   progress" works across devices.
5. **Verify the Stripe webhook** writes to `subscriptions` so `isPremium` flips
   after payment (the whole gate keys off it).

## Next levers (highest expected return, in order)

1. Drive traffic (SEO guides already exist at `/learn/*`; expand + share loop via
   the session share-card).
2. Read the A/B results after ~1–2 weeks; ship the winning LP hero + prompt
   trigger; start the next test (paywall copy, free scoring cap 5 vs 3 vs 7).
3. Add annual-first framing on the first paywall (higher cash upfront, lower churn).
4. Re-engagement: email/push on streak break (push infra already in repo).
