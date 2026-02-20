import { canCallApi, recordApiUsage, recordApiSuccess, recordApiError, showApiUsageWarning } from './api-limiter';
import { getNextCefrLevel, DEFAULT_CEFR_LEVEL, API } from './constants';
import type { CEFRLevel } from './constants';

// Re-export for backward compatibility
export type { CEFRLevel } from './constants';

// Markdown形式のフィードバック
export interface EnglishFeedback {
  cefrLevel: CEFRLevel;
  targetLevel: CEFRLevel;
  markdownContent: string;  // 全フィードバックをMarkdownで保存
}

async function callGeminiApi(body: Record<string, unknown>): Promise<any> {
  const response = await fetch('/api/gemini-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Generate English feedback for diary entry using Gemini API (via Vercel API Route)
 */
export async function generateEnglishFeedback(
  content: string,
  userCefrLevel: CEFRLevel = DEFAULT_CEFR_LEVEL
): Promise<EnglishFeedback> {
  const targetLevel = getNextCefrLevel(userCefrLevel);

  const defaultFeedback: EnglishFeedback = {
    cefrLevel: userCefrLevel,
    targetLevel: targetLevel,
    markdownContent: `## 📊 Feedback & Corrections
Your diary entry has been recorded. Keep practicing your English every day!

## 💪 Encouragement
頑張って英語の練習を続けてください！毎日少しずつ上達しています。`
  };

  const { allowed, reason } = canCallApi();
  if (!allowed) {
    console.warn('API limit reached:', reason);
    return defaultFeedback;
  }

  showApiUsageWarning();

  try {
    const data = await callGeminiApi({
      type: 'feedback', content, cefrLevel: userCefrLevel
    });

    const estimatedTokens = Math.ceil(content.length / API.TOKEN_ESTIMATION_DIVISOR) + API.TOKEN_BASE_FEEDBACK;
    recordApiUsage(estimatedTokens);
    recordApiSuccess();

    return {
      cefrLevel: (data.cefrLevel as CEFRLevel) || userCefrLevel,
      targetLevel: (data.targetLevel as CEFRLevel) || targetLevel,
      markdownContent: data.markdownContent || defaultFeedback.markdownContent
    };

  } catch (error: any) {
    console.error('Gemini feedback error:', error.message);
    recordApiError();
    return defaultFeedback;
  }
}

/**
 * Generate feedback for Versant practice using Gemini API (via Vercel API Route)
 */
export async function generateVersantFeedback(
  content: string,
  part: 'E' | 'F',
  userCefrLevel: CEFRLevel = DEFAULT_CEFR_LEVEL
): Promise<EnglishFeedback> {
  const targetLevel = getNextCefrLevel(userCefrLevel);

  const defaultFeedback: EnglishFeedback = {
    cefrLevel: userCefrLevel,
    targetLevel: targetLevel,
    markdownContent: `## 📊 Response Analysis\nYour response has been recorded. Keep practicing your speaking skills!\n\n## 💪 Encouragement\n頑張って英語のスピーキング練習を続けてください！`
  };

  const { allowed, reason } = canCallApi();
  if (!allowed) {
    console.warn('API limit reached:', reason);
    return defaultFeedback;
  }

  showApiUsageWarning();

  try {
    const data = await callGeminiApi({
      type: 'versant-feedback', content, part, cefrLevel: userCefrLevel
    });

    const estimatedTokens = Math.ceil(content.length / API.TOKEN_ESTIMATION_DIVISOR) + API.TOKEN_BASE_FEEDBACK;
    recordApiUsage(estimatedTokens);
    recordApiSuccess();

    return {
      cefrLevel: (data.cefrLevel as CEFRLevel) || userCefrLevel,
      targetLevel: (data.targetLevel as CEFRLevel) || targetLevel,
      markdownContent: data.markdownContent || defaultFeedback.markdownContent
    };

  } catch (error: any) {
    console.error('Gemini versant feedback error:', error.message);
    recordApiError();
    return defaultFeedback;
  }
}

/**
 * Get CEFR level description
 */
export function getCefrDescription(level: CEFRLevel): string {
  const descriptions: Record<CEFRLevel, string> = {
    'A1': 'Beginner - Basic phrases and simple expressions',
    'A1+': 'Beginner High - Simple interactions and basic needs',
    'A2': 'Elementary - Routine tasks and simple conversations',
    'A2+': 'Elementary High - Familiar situations and simple exchanges',
    'B1': 'Intermediate - Main points in clear standard speech',
    'B1+': 'Intermediate High - Extended conversation on familiar topics',
    'B2': 'Upper Intermediate - Complex texts and fluent conversation',
    'B2+': 'Upper Intermediate High - Nuanced discussion and debate',
    'C1': 'Advanced - Complex texts and spontaneous expression',
    'C1+': 'Proficient - Near-native fluency and precision'
  };
  return descriptions[level];
}

/**
 * Generate a sample answer for Versant practice using Gemini API (via Vercel API Route)
 */
export async function generateVersantSampleAnswer(
  question: string,
  part: 'E' | 'F',
  userCefrLevel: CEFRLevel = DEFAULT_CEFR_LEVEL
): Promise<string> {
  const defaultAnswer = part === 'E'
    ? 'The passage discusses the main topic and key points. It mentions important details that support the central idea. In conclusion, this information is valuable for understanding the subject.'
    : 'In my opinion, this is an important topic to consider. I believe that there are several factors we need to think about. First, we should consider the main aspects. Additionally, there are benefits and challenges to consider. Overall, I think this is something that affects many people in different ways.';

  const { allowed } = canCallApi();
  if (!allowed) {
    return defaultAnswer;
  }

  try {
    const data = await callGeminiApi({
      type: 'versant-sample', question, part, cefrLevel: userCefrLevel
    });

    const estimatedTokens = Math.ceil(question.length / API.TOKEN_ESTIMATION_DIVISOR) + API.TOKEN_BASE_SAMPLE;
    recordApiUsage(estimatedTokens);
    recordApiSuccess();

    return data.sampleAnswer || defaultAnswer;

  } catch (error: any) {
    console.error('Gemini sample answer error:', error.message);
    recordApiError();
    return defaultAnswer;
  }
}

/**
 * Generate a Versant practice question using Gemini API
 * Returns null if API is unavailable (caller should fall back to hardcoded questions)
 */
export async function generateVersantQuestion(
  part: 'E' | 'F',
  userCefrLevel: CEFRLevel = DEFAULT_CEFR_LEVEL
): Promise<{ text: string; part: 'E' | 'F'; timeLimit: number } | null> {
  const { allowed } = canCallApi();
  if (!allowed) {
    return null;
  }

  try {
    const data = await callGeminiApi({
      type: 'versant-question', part, cefrLevel: userCefrLevel
    });

    const estimatedTokens = API.TOKEN_BASE_SAMPLE;
    recordApiUsage(estimatedTokens);
    recordApiSuccess();

    if (!data.text) {
      return null;
    }

    return {
      text: data.text,
      part: data.part || part,
      timeLimit: data.timeLimit || (part === 'E' ? 30 : 40)
    };

  } catch (error: any) {
    console.error('Gemini question generation error:', error.message);
    recordApiError();
    return null;
  }
}
