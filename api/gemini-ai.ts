import type { VercelRequest, VercelResponse } from '@vercel/node'

const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const DEFAULT_CEFR_LEVEL = 'B1'

const CEFR_LEVEL_PROGRESSION: Record<string, string> = {
  'A1': 'A1+', 'A1+': 'A2', 'A2': 'A2+', 'A2+': 'B1',
  'B1': 'B1+', 'B1+': 'B2', 'B2': 'B2+', 'B2+': 'C1',
  'C1': 'C1+', 'C1+': 'C1+'
}

function getNextCefrLevel(level: string): string {
  return CEFR_LEVEL_PROGRESSION[level] || 'B1+'
}

const VERSANT_CONFIG = {
  PART_E: { TIME_LIMIT: 30, WORD_COUNT: '60-80' },
  PART_F: { TIME_LIMIT: 40, WORD_COUNT: '80-100' },
  DEFAULT_HEALTH_SCORE: 75,
  MAX_KEYWORDS: 3,
} as const

interface GeminiRequest {
  type: 'analyze' | 'summary' | 'feedback' | 'versant-feedback' | 'versant-sample' | 'versant-question'
  content?: string
  cefrLevel?: string
  question?: string
  part?: 'E' | 'F'
  category?: string
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
  const targetLevel = getNextCefrLevel(cefrLevel)

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

function buildVersantFeedbackPrompt(content: string, cefrLevel: string, part: 'E' | 'F'): string {
  const targetLevel = getNextCefrLevel(cefrLevel)

  const taskDescription = part === 'E'
    ? 'summarizing a passage (Versant Part E: Story Retelling)'
    : 'giving an opinion on a question (Versant Part F: Open Questions)'

  const scoringFocus = part === 'E'
    ? `- **Content Coverage:** Did the user cover the main points of the passage?
- **Organization:** Is the summary logically structured (beginning, middle, end)?
- **Paraphrasing:** Did the user use their own words instead of memorizing the original?`
    : `- **Opinion Clarity:** Did the user clearly state their opinion?
- **Reasoning & Examples:** Did the user support their opinion with reasons and examples?
- **Structure:** Did the answer follow a clear structure (opinion → reasons → conclusion)?`

  return `# Role
You are an expert English speaking test coach. Your job is to help users improve their spoken English responses for the Versant Speaking Test.

# Important
- This is a SPEAKING TEST practice, NOT a diary.
- Focus ONLY on how to improve the quality of the spoken response.
- Do NOT mention diaries, diary writing, or journaling.

# Inputs
1. **User Level:** ${cefrLevel} (CEFR)
2. **Task Type:** ${taskDescription}
3. **User's Response Transcript:**
${content}

# Your Task
Analyze the user's spoken response and provide actionable feedback to improve their score.

## Section 1: Response Quality Analysis
Evaluate the response based on Versant scoring criteria:
${scoringFocus}
- **Fluency:** Was the speech natural and smooth?
- **Grammar Accuracy:** Were there grammar errors that affect comprehension?
- **Vocabulary Range:** Was the vocabulary appropriate for the level?

## Section 2: Specific Improvements
- **Tone:** Encouraging but focused on concrete improvements.
- **Language:** Explain feedback in **Japanese** so the user clearly understands, but show English examples.
- **Constraint:** Suggestions must target **one level higher** than User Level (i+1 = ${targetLevel}).

**Analysis points:**
1. **Grammar & Sentence Structure:** Correct unnatural phrasing. Suggest more sophisticated structures appropriate for ${targetLevel}.
2. **Vocabulary Enhancement:** Identify basic words and suggest more precise alternatives that would score higher.
3. **Pronunciation Tips:** Identify 2-3 words that are typically difficult to pronounce. Provide phonetics or tips.

# Output Format (Markdown)

## 📊 Response Analysis
(Evaluate the response quality: what was good, what needs improvement based on the scoring criteria above)

## ✍️ Grammar & Vocabulary Improvements
(Specific corrections and better alternatives, explained in Japanese with English examples)

## 🗣️ Pronunciation Tips
(List tricky words from the user's response and tips on how to say them)

## 💪 Encouragement
(Write a personalized encouraging message in Japanese. Focus on praising specific good points in their RESPONSE and suggest concrete next steps to improve their SPEAKING score. Do NOT mention diaries or diary writing.)`
}

const QUESTION_CATEGORIES = [
  'Daily Life', 'Work', 'Education', 'Technology', 'Health',
  'Environment', 'Travel', 'Food', 'Entertainment', 'Relationships',
  'Shopping', 'Sports', 'Culture', 'Finance', 'Science'
]

function buildVersantQuestionPrompt(part: 'E' | 'F', cefrLevel: string, category?: string): string {
  const chosenCategory = category || QUESTION_CATEGORIES[Math.floor(Math.random() * QUESTION_CATEGORIES.length)]

  if (part === 'E') {
    return `You are a Versant speaking test question generator.

**Task:** Generate a short passage for a Story Retelling exercise.

**Requirements:**
- CEFR Level: ${cefrLevel}
- Category: ${chosenCategory}
- Length: 3-5 sentences (appropriate for a 30-second summary response)
- The passage should tell a short story or describe a situation with clear main points
- Use vocabulary and grammar appropriate for ${cefrLevel} level
- Make it interesting and relatable
- Do NOT include any instructions, labels, or metadata

**Output:** Only the passage text, nothing else.`
  }

  return `You are a Versant speaking test question generator.

**Task:** Generate an opinion question for a speaking test.

**Requirements:**
- Category: ${chosenCategory}
- The question should ask for the user's opinion on a topic
- It should be open-ended, allowing for multiple perspectives
- Keep it to 1-2 sentences
- Use clear, natural English
- Do NOT include any instructions, labels, or metadata

**Output:** Only the question text, nothing else.`
}

function buildVersantSamplePrompt(question: string, part: 'E' | 'F', cefrLevel: string): string {
  const targetLevel = getNextCefrLevel(cefrLevel)
  const config = part === 'E' ? VERSANT_CONFIG.PART_E : VERSANT_CONFIG.PART_F
  const timeLimit = config.TIME_LIMIT
  const wordCount = config.WORD_COUNT

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
          health_score: Math.min(100, Math.max(0, analysis.health_score || VERSANT_CONFIG.DEFAULT_HEALTH_SCORE)),
          keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, VERSANT_CONFIG.MAX_KEYWORDS) : []
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
        const cefrLevel = body.cefrLevel || DEFAULT_CEFR_LEVEL
        const prompt = buildFeedbackPrompt(body.content, cefrLevel)
        const responseText = await callGemini(apiKey, prompt)

        result = {
          cefrLevel,
          targetLevel: getNextCefrLevel(cefrLevel),
          markdownContent: responseText
        }
        break
      }

      case 'versant-feedback': {
        if (!body.content || !body.part) {
          throw new Error('content and part are required for versant-feedback')
        }
        const cefrLevel = body.cefrLevel || DEFAULT_CEFR_LEVEL
        const prompt = buildVersantFeedbackPrompt(body.content, cefrLevel, body.part)
        const responseText = await callGemini(apiKey, prompt)

        result = {
          cefrLevel,
          targetLevel: getNextCefrLevel(cefrLevel),
          markdownContent: responseText
        }
        break
      }

      case 'versant-question': {
        if (!body.part) {
          throw new Error('part is required for versant-question')
        }
        const cefrLevel = body.cefrLevel || DEFAULT_CEFR_LEVEL
        const prompt = buildVersantQuestionPrompt(body.part, cefrLevel, body.category)
        const responseText = await callGemini(apiKey, prompt)
        const config = body.part === 'E' ? VERSANT_CONFIG.PART_E : VERSANT_CONFIG.PART_F
        result = {
          text: responseText.trim(),
          part: body.part,
          timeLimit: config.TIME_LIMIT
        }
        break
      }

      case 'versant-sample': {
        if (!body.question || !body.part) {
          throw new Error('question and part are required for versant-sample')
        }
        const cefrLevel = body.cefrLevel || DEFAULT_CEFR_LEVEL
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
