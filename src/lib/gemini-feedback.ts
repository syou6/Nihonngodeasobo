import { canCallApi, recordApiUsage, recordApiSuccess, recordApiError, showApiUsageWarning } from './api-limiter';

export type CEFRLevel = 'A1' | 'A1+' | 'A2' | 'A2+' | 'B1' | 'B1+' | 'B2' | 'B2+' | 'C1' | 'C1+';

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
  userCefrLevel: CEFRLevel = 'B1'
): Promise<EnglishFeedback> {
  // Target level is i+1 (one level higher than current)
  const levelProgression: Record<CEFRLevel, CEFRLevel> = {
    'A1': 'A1+', 'A1+': 'A2', 'A2': 'A2+', 'A2+': 'B1',
    'B1': 'B1+', 'B1+': 'B2', 'B2': 'B2+', 'B2+': 'C1',
    'C1': 'C1+', 'C1+': 'C1+'
  };
  const targetLevel = levelProgression[userCefrLevel];

  // Default fallback response
  const defaultFeedback: EnglishFeedback = {
    cefrLevel: userCefrLevel,
    targetLevel: targetLevel,
    markdownContent: `## 📊 Feedback & Corrections
Your diary entry has been recorded. Keep practicing your English every day!

## 💪 Encouragement
頑張って英語の練習を続けてください！毎日少しずつ上達しています。`
  };

  // Check API limits
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

    // Record API usage
    const estimatedTokens = Math.ceil(content.length / 3) + 200;
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
  userCefrLevel: CEFRLevel = 'B1'
): Promise<string> {
  // Default fallback
  const defaultAnswer = part === 'E'
    ? 'The passage discusses the main topic and key points. It mentions important details that support the central idea. In conclusion, this information is valuable for understanding the subject.'
    : 'In my opinion, this is an important topic to consider. I believe that there are several factors we need to think about. First, we should consider the main aspects. Additionally, there are benefits and challenges to consider. Overall, I think this is something that affects many people in different ways.';

  // Check API limits
  const { allowed } = canCallApi();
  if (!allowed) {
    return defaultAnswer;
  }

  try {
    const data = await callGeminiApi({
      type: 'versant-sample', question, part, cefrLevel: userCefrLevel
    });

    // Record API usage
    const estimatedTokens = Math.ceil(question.length / 3) + 100;
    recordApiUsage(estimatedTokens);
    recordApiSuccess();

    return data.sampleAnswer || defaultAnswer;

  } catch (error: any) {
    console.error('Gemini sample answer error:', error.message);
    recordApiError();
    return defaultAnswer;
  }
}
