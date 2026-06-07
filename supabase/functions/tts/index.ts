import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY') ?? ''
// Default to a PREMADE voice (Sarah) — free-tier API works with premade/stock
// voices but rejects community "library" voices. Override via ELEVENLABS_VOICE_ID.
const VOICE_ID = Deno.env.get('ELEVENLABS_VOICE_ID') || 'EXAVITQu4vr4xnSDxMaL'
const MODEL_ID = Deno.env.get('ELEVENLABS_MODEL_ID') || 'eleven_multilingual_v2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Free tier is small, so cap text length and burst rate to avoid draining it.
const MAX_CHARS = 500
const rateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
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
  if (!ELEVENLABS_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'TTS not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 501 }
    )
  }

  // Require an authenticated user — protects the small free quota from anon abuse.
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
    const { text, voiceId } = await req.json()
    const clean = (text ?? '').toString().trim().slice(0, MAX_CHARS)
    if (!clean) {
      return new Response(
        JSON.stringify({ error: 'text is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate the voice id before interpolating it into the upstream URL —
    // ElevenLabs ids are short alphanumerics; anything else is rejected to prevent
    // path injection / SSRF into other endpoints. Fall back to the default voice.
    const safeVoiceId = (typeof voiceId === 'string' && /^[A-Za-z0-9]{16,32}$/.test(voiceId))
      ? voiceId
      : VOICE_ID

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${safeVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: clean,
          model_id: MODEL_ID,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`ElevenLabs error (${res.status}): ${errText}`)
    }

    // Return the audio as a base64 string the browser can play directly.
    const buf = new Uint8Array(await res.arrayBuffer())
    let binary = ''
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i])
    const base64 = btoa(binary)

    return new Response(
      JSON.stringify({ audio: base64, mime: 'audio/mpeg' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
