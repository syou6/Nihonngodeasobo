import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Google Cloud Text-to-Speech: native Japanese voices read kanji correctly with
// no conversion step. Free tier covers ~1M Neural2 chars/month.
const GOOGLE_TTS_API_KEY = Deno.env.get('GOOGLE_TTS_API_KEY') ?? ''
const VOICE_NAME = Deno.env.get('GOOGLE_TTS_VOICE') || 'ja-JP-Neural2-B'
const LANGUAGE_CODE = 'ja-JP'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const MAX_CHARS = 800
const rateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW = 60_000

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Not configured → tell the client so it can fall back to the browser voice.
  if (!GOOGLE_TTS_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'TTS not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 501 }
    )
  }

  // Require an authenticated user — protects the quota from anon abuse.
  const userId = await resolveUserId(req.headers.get('authorization'))
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    )
  }

  const now = Date.now()
  const entry = rateLimit.get(userId)
  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }
    entry.count++
  } else {
    rateLimit.set(userId, { count: 1, resetAt: now + RATE_WINDOW })
  }

  try {
    const { text, voice } = await req.json()
    const clean = (text ?? '').toString().trim().slice(0, MAX_CHARS)
    if (!clean) {
      return new Response(
        JSON.stringify({ error: 'text is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Only allow a safe voice-name override (letters/digits/hyphen).
    const voiceName = (typeof voice === 'string' && /^[A-Za-z0-9-]{1,40}$/.test(voice))
      ? voice
      : VOICE_NAME

    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: clean },
          voice: { languageCode: LANGUAGE_CODE, name: voiceName },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Google TTS error (${res.status}): ${errText}`)
    }

    const data = await res.json()
    if (!data?.audioContent) {
      throw new Error('No audio returned from Google TTS')
    }

    // Google already returns base64-encoded MP3.
    return new Response(
      JSON.stringify({ audio: data.audioContent, mime: 'audio/mpeg' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
