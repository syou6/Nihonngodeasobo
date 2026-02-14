import type { VercelRequest, VercelResponse } from '@vercel/node'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

interface GeminiRequest {
  type: 'analyze' | 'summary' | 'feedback' | 'versant-sample'
  content?: string
  cefrLevel?: string
  question?: string
  part?: 'E' | 'F'
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
  return `以下の日記を分析して、JSON形式で結果を返してください。

日記内容：
${content}

以下の形式で返してください（JSONのみ、説明文は不要）：
{
  "summary": "50文字以内の要約",
  "emotion": "喜び/楽しい/悲しみ/不安/疲れ/普通のいずれか",
  "health_score": 0-100の数値（健康状態スコア）,
  "keywords": ["キーワード1", "キーワード2", "キーワード3"]（最大3個）
}`
}

function buildSummaryPrompt(content: string): string {
  return `以下の日記を家族が読みやすいように100文字以内で要約してください。
健康状態や気分、主な出来事を含めてください。

日記内容：
${content}

要約（100文字以内）：`
}

function buildFeedbackPrompt(content: string, cefrLevel: string): string {
  const levelProgression: Record<string, string> = {
    'A1': 'A1+', 'A1+': 'A2', 'A2': 'A2+', 'A2+': 'B1',
    'B1': 'B1+', 'B1+': 'B2', 'B2': 'B2+', 'B2+': 'C1',
    'C1': 'C1+', 'C1+': 'C1+'
  }
  const targetLevel = levelProgression[cefrLevel] || 'B1+'

  return `# Role
You are an expert English language coach designed to help users improve their English skills through their diary entries.

# Inputs provided by the system
1. **User Level:** ${cefrLevel} (CEFR)
2. **Diary Transcript:**
${content}

# Your Task
Analyze the diary transcript and provide output in two main sections.

## Section 1: Feedback & Level Up
Analyze the English based on the user's level.
- **Tone:** Encouraging, empathetic, and professional.
- **Language:** Explain the feedback in **Japanese** so the user clearly understands, but show English examples.
- **Constraint:** The advice must be aimed at **one level slightly higher** than the User Level (i+1 = ${targetLevel}).

**Analysis points:**
1. **Grammar & Phrasing:** Correct unnatural phrasing. If the user uses simple grammar, suggest a more sophisticated structure appropriate for the next level.
2. **Vocabulary:** Identify basic words used and suggest more precise or academic synonyms.
3. **Pronunciation Advice:** Identify 2-3 words in the user's text that are typically difficult to pronounce. Provide phonetics or tips.

## Section 2: Topic Extension (Reading Material)
Based on the content of the diary:
1. **Identify the Main Topic:** Extract the core theme.
2. **Generate an Article:** Write an engaging article (approx. 150-200 words) about this topic.
   - **Difficulty:** The English level must be **slightly higher (i+1 = ${targetLevel})** than the User Level.
   - **Content:** Include enough rich vocabulary to support the extraction of 10 key items.
3. **Vocabulary List:** Extract **10 key words or phrases** from this generated article that are valuable for the user to learn.

# Output Format (Markdown)

## 📊 Feedback & Corrections
(Provide corrections, grammar explanations in Japanese, and better vocabulary suggestions here)

## 🗣️ Pronunciation Tips
(List tricky words from the user's text and tips on how to say them)

## 📖 Recommended Reading: [Insert Topic Name]
(Insert the generated English article here)

## 🇯🇵 Summary
(Brief summary of the article in Japanese)

## 🗝️ Key Vocabulary & Phrases
(List **10** important words/phrases from the "Recommended Reading" article above. Use the format below:)
- **[Word/Phrase]** \`[IPA Pronunciation]\` : [Japanese Meaning]

## 💪 Encouragement
(Write a personalized encouraging message in Japanese, praising specific good points and suggesting next steps)`
}

function buildVersantSamplePrompt(question: string, part: 'E' | 'F', cefrLevel: string): string {
  const levelProgression: Record<string, string> = {
    'A1': 'A1+', 'A1+': 'A2', 'A2': 'A2+', 'A2+': 'B1',
    'B1': 'B1+', 'B1+': 'B2', 'B2': 'B2+', 'B2+': 'C1',
    'C1': 'C1+', 'C1+': 'C1+'
  }
  const targetLevel = levelProgression[cefrLevel] || 'B1+'
  const timeLimit = part === 'E' ? 30 : 40
  const wordCount = part === 'E' ? '60-80' : '80-100'

  if (part === 'E') {
    return `You are an English speaking test sample answer generator.

**Task:** Generate a model summary answer for this passage:
"${question}"

**Requirements:**
- CEFR Level: ${targetLevel} (target level for the learner)
- Length: ${wordCount} words (speakable within ${timeLimit} seconds)
- Include: Main idea, key supporting points, conclusion
- Tone: Clear, organized, natural spoken English
- Use appropriate transition words (First, Additionally, In conclusion, etc.)

**Output:** Only the sample answer text, no explanations or labels.`
  }

  return `You are an English speaking test sample answer generator.

**Task:** Generate a model opinion answer for this question:
"${question}"

**Requirements:**
- CEFR Level: ${targetLevel} (target level for the learner)
- Length: ${wordCount} words (speakable within ${timeLimit} seconds)
- Structure: State opinion → Give 2-3 reasons with examples → Conclude
- Tone: Natural spoken English, conversational but organized
- Use appropriate phrases: "In my opinion", "I believe that", "For example", "Furthermore", "To sum up"

**Output:** Only the sample answer text, no explanations or labels.`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' })
  }

  try {
    const body: GeminiRequest = req.body
    const { type } = body

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
          throw new Error('JSON形式の応答が得られませんでした')
        }
        const analysis = JSON.parse(jsonMatch[0])
        result = {
          summary: analysis.summary || body.content.substring(0, 50),
          emotion: analysis.emotion || '普通',
          health_score: Math.min(100, Math.max(0, analysis.health_score || 75)),
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
        const cefrLevel = body.cefrLevel || 'B1'
        const prompt = buildFeedbackPrompt(body.content, cefrLevel)
        const responseText = await callGemini(apiKey, prompt)

        const levelProgression: Record<string, string> = {
          'A1': 'A1+', 'A1+': 'A2', 'A2': 'A2+', 'A2+': 'B1',
          'B1': 'B1+', 'B1+': 'B2', 'B2': 'B2+', 'B2+': 'C1',
          'C1': 'C1+', 'C1+': 'C1+'
        }
        result = {
          cefrLevel,
          targetLevel: levelProgression[cefrLevel] || 'B1+',
          markdownContent: responseText
        }
        break
      }

      case 'versant-sample': {
        if (!body.question || !body.part) {
          throw new Error('question and part are required for versant-sample')
        }
        const cefrLevel = body.cefrLevel || 'B1'
        const prompt = buildVersantSamplePrompt(body.question, body.part, cefrLevel)
        const responseText = await callGemini(apiKey, prompt)
        result = { sampleAnswer: responseText.trim() }
        break
      }

      default:
        throw new Error(`Unknown type: ${type}`)
    }

    return res.status(200).json(result)

  } catch (error: any) {
    console.error('Error in gemini-ai:', error)
    return res.status(400).json({ error: error.message })
  }
}
