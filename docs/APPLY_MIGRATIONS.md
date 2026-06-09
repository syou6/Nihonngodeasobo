# Applying Supabase migrations

Migrations live in `supabase/migrations/*.sql` and are **not** auto-applied by the
app. Apply them to the production database with any one of the methods below.
All migrations are written to be idempotent (`IF NOT EXISTS`, `DROP POLICY IF
EXISTS …`), so re-running them is safe.

## ⚠️ Pending: `014_create_pitch_progress.sql`

The cross-device pitch-mastery sync (PitchPractice → cloud) is **inert until this
table exists**. Without it, `fetchRemoteProgress`/`upsertRemoteProgress` fail
silently and the trainer falls back to localStorage only. Apply 014 to turn on
cloud sync.

What it creates: `public.pitch_progress` (PK `(user_id, word)`, columns `best`,
`attempts`, `updated_at`) with RLS so each user can only read/write their own rows.

## Method 1 — Supabase SQL Editor (no tooling)

1. Open the project dashboard → **SQL Editor → New query**.
2. Paste the full contents of `supabase/migrations/014_create_pitch_progress.sql`.
3. **Run**. Re-running is safe (idempotent).

## Method 2 — Supabase CLI

```bash
# one-time: link the local repo to the remote project
supabase link --project-ref <PROJECT_REF>

# apply every not-yet-applied migration in supabase/migrations
supabase db push
```

## Method 3 — psql with the connection string

```bash
# connection string: dashboard → Settings → Database → Connection string (URI)
psql "$SUPABASE_DB_URL" -f supabase/migrations/014_create_pitch_progress.sql
```

## Verify

```sql
-- table exists
select to_regclass('public.pitch_progress');           -- → pitch_progress

-- RLS is on and policies are present
select relrowsecurity from pg_class where relname = 'pitch_progress';  -- → t
select polname from pg_policy
  where polrelid = 'public.pitch_progress'::regclass;   -- → 3 policies
```

After applying, log in on two devices: mastering a word on one should show the
higher `✓ n/66` count on the other after a reload.
