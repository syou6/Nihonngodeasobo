import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_FEEDBACK_CHAT_ID') ?? ''

interface FeedbackBody {
  rating?: number
  comment?: string
  context?: string
  appVersion?: string
}

// Resolve the caller from the bearer JWT (null for guests).
async function resolveUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !SUPABASE_URL) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SERVICE_ROLE_KEY },
    })
    if (!res.ok) return null
    const user = await res.json()
    return user?.id ?? null
  } catch {
    return null
  }
}

async function notifyTelegram(text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    })
  } catch {
    // Notification is best-effort; never fail the request because of it.
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: FeedbackBody = await req.json()
    const rating = typeof body.rating === 'number' ? Math.min(5, Math.max(1, Math.round(body.rating))) : null
    const comment = (body.comment ?? '').toString().slice(0, 2000).trim() || null
    const context = (body.context ?? '').toString().slice(0, 100) || null

    if (rating === null && !comment) {
      return new Response(
        JSON.stringify({ error: 'A rating or a comment is required.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const userId = await resolveUserId(req.headers.get('authorization'))
    const userAgent = req.headers.get('user-agent')?.slice(0, 300) ?? null

    const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        rating,
        comment,
        context,
        app_version: body.appVersion ?? null,
        user_agent: userAgent,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Insert failed (${res.status}): ${errText}`)
    }

    const stars = rating ? '⭐️'.repeat(rating) : '—'
    await notifyTelegram(
      `🗣 <b>New NihonGo feedback</b>\nRating: ${stars}\nUser: ${userId ? userId.slice(0, 8) : 'guest'}\nContext: ${context ?? '-'}\n\n${comment ?? '(no comment)'}`
    )

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
