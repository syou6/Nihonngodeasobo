// Waitlist capture: POST { email } → INSERT into Supabase `waitlist` table.
// Uses the same Supabase project env vars the site already has on Vercel.
// The table is insert-only for anon (no select policy), so addresses are not
// readable with the public key — see the setup SQL in the repo docs.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method' });
  }
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, error: 'invalid_email' });
  }
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ ok: false, error: 'not_configured' });

  try {
    const r = await fetch(`${url}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal,resolution=ignore-duplicates',
      },
      body: JSON.stringify({ email }),
    });
    if (r.status === 201 || r.status === 409) return res.status(200).json({ ok: true });
    const detail = await r.text().catch(() => '');
    console.error('waitlist insert failed', r.status, detail.slice(0, 200));
    return res.status(500).json({ ok: false, error: 'store_failed' });
  } catch (err) {
    console.error('waitlist error', err);
    return res.status(500).json({ ok: false, error: 'network' });
  }
}
