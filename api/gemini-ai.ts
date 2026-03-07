import type { VercelRequest, VercelResponse } from '@vercel/node'

const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const DEFAULT_JLPT_LEVEL = 'N4'

const JLPT_LEVEL_PROGRESSION: Record<string, string> = {
  'N5': 'N4',
  'N4': 'N3',
  'N3': 'N2',
  'N2': 'N1',
  'N1': 'N1',
}

function getNextJlptLevel(level: string): string {
  return JLPT_LEVEL_PROGRESSION[level] || 'N3'
}

const PRACTICE_CONFIG = {
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

function buildFeedbackPrompt(content: string, jlptLevel: string): string {
  const targetLevel = getNextJlptLevel(jlptLevel)

  return `# Role
You are an expert Japanese language teacher helping foreign learners improve their Japanese skills through their diary entries.

# Inputs provided by the system
1. **User Level:** ${jlptLevel} (JLPT)
2. **Diary Transcript:**
${content}

# Your Task
Analyze the diary transcript and provide output in two main sections. All explanations must be written in **English** so the learner can clearly understand.

## Section 1: Feedback & Level Up
Analyze the Japanese based on the user's level.
- **Tone:** Encouraging, empathetic, and professional.
- **Language:** Explain all feedback in **English**, but show Japanese examples alongside.
- **Constraint:** The advice must be aimed at **one level higher** than the User Level (i+1 = ${targetLevel}).

**Analysis points:**
1. **Grammar (文法):** Identify grammatical errors or unnatural phrasing. If the user uses simple grammar, suggest a more sophisticated structure appropriate for the next level.
2. **Vocabulary (語彙):** Identify basic words used and suggest more precise or level-appropriate alternatives with readings and English meanings.
3. **Pronunciation / Reading (発音・読み方):** Identify 2-3 words or kanji in the user's text that are typically difficult to read or pronounce. Provide furigana and pronunciation tips.

## Section 2: Topic Extension (Reading Material)
Based on the content of the diary:
1. **Identify the Main Topic:** Extract the core theme.
2. **Generate a Reading Passage:** Write an engaging Japanese passage (approx. 150-200 characters) about this topic.
   - **Difficulty:** The Japanese level must be **slightly higher (i+1 = ${targetLevel})** than the User Level.
   - **Content:** Include rich vocabulary to support the extraction of 10 key vocabulary items.
3. **Vocabulary List:** Extract **10 key words or phrases** from this generated passage that are valuable for the user to learn.

# Output Format (Markdown)

## 📊 Feedback & Corrections
(Provide corrections and grammar explanations in **English**, with Japanese examples and better vocabulary suggestions)

## 🗣️ Pronunciation / Reading Tips
(List tricky words or kanji from the user's text with furigana and tips on how to read/pronounce them)

## 📖 Recommended Reading: [Insert Topic Name]
(Insert the generated Japanese passage here)

## 🌐 English Summary
(Brief summary of the passage in English so the learner can verify comprehension)

## 🗝️ Key Vocabulary & Phrases
(List **10** important words/phrases from the "Recommended Reading" passage above. Use the format below:)
- **[Word/Phrase]** \`[Reading (furigana)]\` : [English Meaning]

## 💪 Encouragement
(Write a personalized encouraging message in **English**, praising specific good points and suggesting next steps)`
}

function buildPracticeFeedbackPrompt(content: string, jlptLevel: string, part: 'E' | 'F'): string {
  const targetLevel = getNextJlptLevel(jlptLevel)

  const taskDescription = part === 'E'
    ? 'summarizing a Japanese passage (JLPT Speaking Practice Part E: Passage Retelling)'
    : 'giving an opinion on a question in Japanese (JLPT Speaking Practice Part F: Open Questions)'

  const scoringFocus = part === 'E'
    ? `- **Content Coverage:** Did the user cover the main points of the passage in Japanese?
- **Organization:** Is the summary logically structured (beginning, middle, end)?
- **Paraphrasing:** Did the user use natural Japanese instead of simply memorizing the original?`
    : `- **Opinion Clarity:** Did the user clearly state their opinion in Japanese?
- **Reasoning & Examples:** Did the user support their opinion with reasons and examples?
- **Structure:** Did the answer follow a clear structure (opinion → reasons → conclusion)?`

  return `# Role
You are an expert Japanese speaking test coach. Your job is to help foreign learners improve their spoken Japanese responses.

# Important
- This is a JAPANESE SPEAKING PRACTICE session, NOT an English exercise.
- Focus ONLY on how to improve the quality of the Japanese spoken response.
- All feedback must be written in **English** so the learner can clearly understand.

# Inputs
1. **User Level:** ${jlptLevel} (JLPT)
2. **Task Type:** ${taskDescription}
3. **User's Response Transcript:**
${content}

# Your Task
Analyze the user's spoken Japanese response and provide actionable feedback to improve their performance.

## Section 1: Response Quality Analysis
Evaluate the response based on Japanese speaking criteria:
${scoringFocus}
- **Fluency (流暢さ):** Was the speech natural and smooth?
- **Grammar Accuracy (文法):** Were there grammar errors that affect comprehension?
- **Vocabulary Range (語彙):** Was the vocabulary appropriate for the JLPT level?

## Section 2: Specific Improvements
- **Tone:** Encouraging but focused on concrete improvements.
- **Language:** Explain all feedback in **English**, but show Japanese examples.
- **Constraint:** Suggestions must target **one level higher** than User Level (i+1 = ${targetLevel}).

**Analysis points:**
1. **Grammar & Sentence Structure (文法・文構造):** Correct unnatural phrasing. Suggest more sophisticated structures appropriate for ${targetLevel}.
2. **Vocabulary Enhancement (語彙強化):** Identify basic words and suggest more precise alternatives with readings and English meanings.
3. **Pronunciation / Reading Tips (発音・読み方):** Identify 2-3 words or kanji that are typically difficult to pronounce. Provide furigana and tips.

# Output Format (Markdown)

## 📊 Response Analysis
(Evaluate the response quality in **English**: what was good, what needs improvement)

## ✍️ Grammar & Vocabulary Improvements
(Specific corrections and better Japanese alternatives, explained in **English** with Japanese examples)

## 🗣️ Pronunciation / Reading Tips
(List tricky words or kanji from the user's response with furigana and pronunciation tips)

## 💪 Encouragement
(Write a personalized encouraging message in **English**. Praise specific good points in their response and suggest concrete next steps to improve their Japanese speaking.)`
}

const QUESTION_CATEGORIES = [
  'Daily Life (日常生活)', 'Work (仕事)', 'Shopping (買い物)', 'Travel (旅行)',
  'Japanese Culture (日本文化)', 'Food (食べ物)', 'Hobbies (趣味)', 'Seasons & Weather (季節・天気)',
  'Family (家族)', 'School (学校)', 'Health (健康)', 'Technology (テクノロジー)',
  'Nature (自然)', 'Festivals (祭り)', 'Transportation (交通)',
]

function buildPracticeQuestionPrompt(part: 'E' | 'F', jlptLevel: string, category?: string): string {
  const chosenCategory = category || QUESTION_CATEGORIES[Math.floor(Math.random() * QUESTION_CATEGORIES.length)]

  if (part === 'E') {
    return `You are a Japanese language practice passage generator for foreign learners.

**Task:** Generate a short Japanese passage for a Passage Retelling exercise.

**Requirements:**
- JLPT Level: ${jlptLevel}
- Category: ${chosenCategory}
- Length: 3-5 sentences (appropriate for a 30-second summary response)
- The passage should tell a short story or describe a situation with clear main points
- Use vocabulary and grammar appropriate for ${jlptLevel} level
- Include furigana only for kanji beyond ${jlptLevel} level
- Make it interesting and relatable for foreign learners of Japanese
- Do NOT include any instructions, labels, or metadata

**Output:** Only the Japanese passage text, nothing else.`
  }

  return `You are a Japanese language speaking practice question generator for foreign learners.

**Task:** Generate a Japanese opinion question for a speaking practice session.

**Requirements:**
- JLPT Level: ${jlptLevel}
- Category: ${chosenCategory}
- The question should ask for the user's opinion on a topic in Japanese
- It should be open-ended, allowing for multiple perspectives
- Keep it to 1-2 sentences
- Use clear, natural Japanese appropriate for ${jlptLevel} level
- Do NOT include any instructions, labels, or metadata

**Output:** Only the Japanese question text, nothing else.`
}

function buildPracticeSamplePrompt(question: string, part: 'E' | 'F', jlptLevel: string): string {
  const targetLevel = getNextJlptLevel(jlptLevel)
  const config = part === 'E' ? PRACTICE_CONFIG.PART_E : PRACTICE_CONFIG.PART_F
  const timeLimit = config.TIME_LIMIT
  const wordCount = config.WORD_COUNT

  if (part === 'E') {
    return `You are a Japanese speaking practice sample answer generator for foreign learners.

**Task:** Generate a model Japanese summary answer for this passage:
"${question}"

**Requirements:**
- JLPT Level: ${targetLevel} (target level for the learner)
- Length: approximately ${wordCount} characters (speakable within ${timeLimit} seconds)
- Include: Main idea, key supporting points, conclusion
- Tone: Clear, organized, natural spoken Japanese
- Use appropriate transition expressions (まず、それから、最後に、など)
- Avoid kanji beyond ${targetLevel} level, or add furigana where needed

**Output:** Only the Japanese sample answer text, no explanations or labels.`
  }

  return `You are a Japanese speaking practice sample answer generator for foreign learners.

**Task:** Generate a model Japanese opinion answer for this question:
"${question}"

**Requirements:**
- JLPT Level: ${targetLevel} (target level for the learner)
- Length: approximately ${wordCount} characters (speakable within ${timeLimit} seconds)
- Structure: State opinion → Give 2-3 reasons with examples → Conclude
- Tone: Natural spoken Japanese, conversational but organized
- Use appropriate phrases: 「私は〜と思います」「なぜなら〜」「例えば〜」「また〜」「まとめると〜」
- Avoid kanji beyond ${targetLevel} level, or add furigana where needed

**Output:** Only the Japanese sample answer text, no explanations or labels.`
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
          health_score: Math.min(100, Math.max(0, analysis.health_score || PRACTICE_CONFIG.DEFAULT_HEALTH_SCORE)),
          keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, PRACTICE_CONFIG.MAX_KEYWORDS) : []
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
        const jlptLevel = body.cefrLevel || DEFAULT_JLPT_LEVEL
        const prompt = buildFeedbackPrompt(body.content, jlptLevel)
        const responseText = await callGemini(apiKey, prompt)

        result = {
          cefrLevel: jlptLevel,
          targetLevel: getNextJlptLevel(jlptLevel),
          markdownContent: responseText
        }
        break
      }

      case 'versant-feedback': {
        if (!body.content || !body.part) {
          throw new Error('content and part are required for versant-feedback')
        }
        const jlptLevel = body.cefrLevel || DEFAULT_JLPT_LEVEL
        const prompt = buildPracticeFeedbackPrompt(body.content, jlptLevel, body.part)
        const responseText = await callGemini(apiKey, prompt)

        result = {
          cefrLevel: jlptLevel,
          targetLevel: getNextJlptLevel(jlptLevel),
          markdownContent: responseText
        }
        break
      }

      case 'versant-question': {
        if (!body.part) {
          throw new Error('part is required for versant-question')
        }
        const jlptLevel = body.cefrLevel || DEFAULT_JLPT_LEVEL
        const prompt = buildPracticeQuestionPrompt(body.part, jlptLevel, body.category)
        const responseText = await callGemini(apiKey, prompt)
        const config = body.part === 'E' ? PRACTICE_CONFIG.PART_E : PRACTICE_CONFIG.PART_F
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
        const jlptLevel = body.cefrLevel || DEFAULT_JLPT_LEVEL
        const prompt = buildPracticeSamplePrompt(body.question, body.part, jlptLevel)
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
