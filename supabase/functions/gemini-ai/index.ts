import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const jlptProgression: Record<string, string> = {
  'N5': 'N4', 'N4': 'N3', 'N3': 'N2', 'N2': 'N1', 'N1': 'N1'
}

interface GeminiRequest {
  type: 'analyze' | 'summary' | 'feedback' | 'versant-feedback' | 'versant-sample' | 'versant-question' | 'pitch-accent'
  content?: string
  jlptLevel?: string
  cefrLevel?: string  // kept for backwards compatibility
  question?: string
  part?: 'E' | 'F'
  audioBase64?: string
  mimeType?: string
  transcribedText?: string
  targetWord?: string
  expectedPattern?: number[]
}

async function callGeminiWithAudio(
  apiKey: string,
  audioBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { data: audioBase64, mimeType } },
          { text: prompt }
        ]
      }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('No text in Gemini response')
  }
  return text
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('No text in Gemini response')
  }
  return text
}

function buildAnalyzePrompt(content: string): string {
  return `Analyze the following Japanese diary entry written by a foreign language learner. Return results in JSON format only.

Diary content:
${content}

Return ONLY the following JSON (no explanations, no markdown code blocks):
{
  "summary": "50文字以内の日本語要約",
  "summary_en": "English translation of the summary (under 100 characters)",
  "emotion": "one of: happy, excited, neutral, tired, sad, anxious",
  "language_score": <integer 0-100 based on grammar accuracy, vocabulary range, and naturalness>,
  "grammar_errors": <integer count of grammar errors found>,
  "jlpt_estimated_level": "estimated JLPT level of the writing: N5, N4, N3, N2, or N1",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`
}

function buildSummaryPrompt(content: string): string {
  return `Summarize the following Japanese diary entry written by a language learner. Provide both a Japanese summary and an English translation.

Focus on: what the learner practiced, key language patterns used, and main events described.

Diary content:
${content}

Japanese summary (100 characters or less):
English translation of the summary:`
}

function buildFeedbackPrompt(content: string, jlptLevel: string): string {
  const targetLevel = jlptProgression[jlptLevel] || 'N3'

  return `# Role
You are a warm, encouraging Japanese language tutor for foreign learners. Your goal is to help learners improve through their diary entries.

# Context
- Learner's current JLPT level: ${jlptLevel}
- Next target level: ${targetLevel}
- Diary entry:
${content}

# Instructions
Provide feedback ENTIRELY IN ENGLISH (except for Japanese examples). The learner may not be able to read complex Japanese explanations yet.

# Required Output Format (Markdown)

## Score: [X]/100
(Rate the overall quality: grammar accuracy, vocabulary range, naturalness, and effort)

## Corrections
For each error found, format as:
- ❌ "[original text]" → ✅ "[corrected text]"
  - Why: [brief explanation in English]

If no errors found, praise the accuracy.

## Vocabulary Builder
List 5 useful words/phrases related to the diary topic that the learner should know at ${targetLevel} level:
| Japanese | Reading | English | Example Sentence |
|----------|---------|---------|-----------------|

## Grammar Point
Pick ONE grammar pattern from the diary (or suggest one the learner should learn next at ${targetLevel} level):
- Pattern: [grammar pattern]
- Meaning: [English explanation]
- Example: [example sentence]
- Tip: [when/how to use it]

## What You Did Well
(Specific praise about what was good in this entry - be genuine and specific, not generic)

## Challenge for Next Time
(One small, specific challenge for the next diary entry to push them toward ${targetLevel})`
}

function buildVersantSamplePrompt(question: string, part: 'E' | 'F', jlptLevel: string): string {
  const targetLevel = jlptProgression[jlptLevel] || 'N3'
  const timeLimit = part === 'E' ? 30 : 40

  if (part === 'E') {
    return `You are a Japanese speaking practice sample answer generator.

**Task:** Generate a model summary answer in Japanese for this passage:
"${question}"

**Requirements:**
- JLPT Level: ${targetLevel} (target level for the learner)
- Length: Speakable within ${timeLimit} seconds
- Include: Main idea, key supporting points, conclusion
- Write in natural spoken Japanese appropriate for ${targetLevel} level
- Use appropriate transition expressions (まず、次に、最後に etc.)

**Output:** Only the sample answer text in Japanese, no explanations or labels.`
  }

  return `You are a Japanese speaking practice sample answer generator.

**Task:** Generate a model opinion answer in Japanese for this question:
"${question}"

**Requirements:**
- JLPT Level: ${targetLevel} (target level for the learner)
- Length: Speakable within ${timeLimit} seconds
- Structure: State opinion → Give 2-3 reasons with examples → Conclude
- Write in natural spoken Japanese appropriate for ${targetLevel} level
- Use appropriate expressions (私は〜と思います、なぜなら、例えば、まとめると etc.)

**Output:** Only the sample answer text in Japanese, no explanations or labels.`
}

// Simple in-memory rate limiter (resets on cold start, which is fine for Edge Functions)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // requests per window
const RATE_WINDOW = 60_000; // 1 minute

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp);
  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }
    entry.count++;
  } else {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_WINDOW });
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  try {
    const body: GeminiRequest = await req.json()
    const { type } = body

    // Accept both jlptLevel and cefrLevel for backwards compatibility
    const jlptLevel = body.jlptLevel || body.cefrLevel || 'N4'

    let result: unknown

    switch (type) {
      case 'analyze': {
        if (!body.content) {
          throw new Error('content is required for analyze')
        }
        const prompt = buildAnalyzePrompt(body.content)
        const responseText = await callGemini(apiKey, prompt)

        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON found in Gemini response')
        }
        const analysis = JSON.parse(jsonMatch[0])
        result = {
          summary: analysis.summary || body.content.substring(0, 50),
          summary_en: analysis.summary_en || '',
          emotion: analysis.emotion || 'neutral',
          language_score: Math.min(100, Math.max(0, analysis.language_score || 50)),
          grammar_errors: analysis.grammar_errors || 0,
          jlpt_estimated_level: analysis.jlpt_estimated_level || 'N5',
          keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, 3) : []
        }
        break
      }

      case 'summary': {
        if (!body.content) {
          throw new Error('content is required for summary')
        }
        const prompt = buildSummaryPrompt(body.content)
        const responseText = await callGemini(apiKey, prompt)
        result = { summary: responseText.trim() }
        break
      }

      case 'feedback': {
        if (!body.content) {
          throw new Error('content is required for feedback')
        }
        const prompt = buildFeedbackPrompt(body.content, jlptLevel)
        const responseText = await callGemini(apiKey, prompt)

        result = {
          jlptLevel,
          targetLevel: jlptProgression[jlptLevel] || 'N3',
          markdownContent: responseText
        }
        break
      }

      case 'versant-feedback': {
        if (!body.content || !body.part) {
          throw new Error('content and part are required for versant-feedback')
        }
        const targetLevel = jlptProgression[jlptLevel] || 'N3'
        const prompt = `# Role
You are a Japanese language speaking coach for foreign learners.

# Inputs
- **User JLPT Level:** ${jlptLevel}
- **Practice Type:** Part ${body.part} (${body.part === 'E' ? 'Summary' : 'Opinion'})
- **User's Response:**
${body.content}

# Task
Analyze the user's Japanese speaking response and provide feedback ENTIRELY IN ENGLISH (except for Japanese examples).

## Output Format (Markdown)

## Fluency Analysis
(Assess sentence structure, flow, and coherence of the response)

## Accuracy Check
(Grammar and vocabulary corrections - for each error: ❌ original → ✅ corrected, with brief explanation)

## Expression Upgrade
(Suggest more natural or advanced alternatives for phrases used, appropriate for ${targetLevel} level)

## Score: [X]/100
(Overall speaking readiness assessment based on accuracy, fluency, and vocabulary range)`

        const responseText = await callGemini(apiKey, prompt)
        result = {
          jlptLevel,
          targetLevel,
          markdownContent: responseText
        }
        break
      }

      case 'versant-sample': {
        if (!body.question || !body.part) {
          throw new Error('question and part are required for versant-sample')
        }
        const prompt = buildVersantSamplePrompt(body.question, body.part, jlptLevel)
        const responseText = await callGemini(apiKey, prompt)
        result = { sampleAnswer: responseText.trim() }
        break
      }

      case 'versant-question': {
        if (!body.part) {
          throw new Error('part is required for versant-question')
        }
        const timeLimit = body.part === 'E' ? 30 : 40

        const prompt = body.part === 'E'
          ? `Generate a Japanese reading passage for JLPT ${jlptLevel} level learners to practice summarizing.
The passage should be 3-5 sentences about an interesting topic (daily life, culture, technology, nature).
Write ONLY in Japanese. Output ONLY the passage text, no labels or instructions.`
          : `Generate a Japanese discussion question for JLPT ${jlptLevel} level learners to practice expressing opinions.
The question should be about an everyday topic that's easy to have an opinion on.
Write ONLY in Japanese. Output ONLY the question text, no labels or instructions.`

        const responseText = await callGemini(apiKey, prompt)
        result = {
          text: responseText.trim(),
          part: body.part,
          timeLimit
        }
        break
      }

      case 'pitch-accent': {
        if (!body.audioBase64 || !body.mimeType || !body.transcribedText) {
          throw new Error('audioBase64, mimeType, and transcribedText are required for pitch-accent')
        }

        const targetWordSection = body.targetWord
          ? `\n- Target word being practiced: "${body.targetWord}"`
          : ''
        const expectedPatternSection = body.expectedPattern && body.expectedPattern.length > 0
          ? `\n- Expected pitch pattern (0=low, 1=high): [${body.expectedPattern.join(', ')}]`
          : ''

        const prompt = `You are a Japanese pitch accent expert and pronunciation coach for foreign learners.

Listen to the audio recording and evaluate the speaker's Japanese pitch accent.

Context:
- Transcribed speech: "${body.transcribedText}"${targetWordSection}${expectedPatternSection}

Analyze the pitch accent in the audio and return ONLY the following JSON (no explanations, no markdown code blocks):
{
  "naturalness": <integer 0-100, how natural the pitch accent sounds to a native Japanese speaker>,
  "pitchAccuracyScore": <integer 0-100, accuracy vs standard Tokyo pitch accent>,
  "patternDetected": <string describing the detected pattern, e.g. "平板型 (flat)", "頭高型 (initial high)", "中高型 (middle high)", "尾高型 (final high)">,
  "issues": [<array of specific pitch accent issues detected, in English, empty array if none>],
  "feedback": <string, 1-2 sentences of encouraging feedback in English explaining the main pitch accent point>,
  "nextStep": <string, one specific actionable practice tip in English>
}`

        const responseText = await callGeminiWithAudio(
          apiKey,
          body.audioBase64,
          body.mimeType,
          prompt
        )

        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON found in Gemini pitch-accent response')
        }
        const parsed = JSON.parse(jsonMatch[0])
        result = {
          naturalness: Math.min(100, Math.max(0, parsed.naturalness ?? 50)),
          pitchAccuracyScore: Math.min(100, Math.max(0, parsed.pitchAccuracyScore ?? 50)),
          patternDetected: parsed.patternDetected || 'Unknown',
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
          feedback: parsed.feedback || '',
          nextStep: parsed.nextStep || ''
        }
        break
      }

      default:
        throw new Error(`Unknown type: ${type}`)
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in gemini-ai:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
