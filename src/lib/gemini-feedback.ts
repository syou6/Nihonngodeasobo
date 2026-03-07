import { canCallApi, recordApiUsage, recordApiSuccess, recordApiError, showApiUsageWarning } from './api-limiter';
import { getNextJlptLevel, DEFAULT_JLPT_LEVEL, API } from './constants';
import type { JLPTLevel } from './constants';
import { callGeminiApi } from './gemini-api';

// Re-export for backward compatibility
export type { JLPTLevel } from './constants';

// Markdown形式のフィードバック
export interface JapaneseFeedback {
  jlptLevel: JLPTLevel;
  targetLevel: JLPTLevel;
  markdownContent: string;  // 全フィードバックをMarkdownで保存
}

/**
 * Generate Japanese feedback for diary entry using Gemini API (via Vercel API Route)
 */
export async function generateJapaneseFeedback(
  content: string,
  userJlptLevel: JLPTLevel = DEFAULT_JLPT_LEVEL
): Promise<JapaneseFeedback> {
  const targetLevel = getNextJlptLevel(userJlptLevel);

  const defaultFeedback: JapaneseFeedback = {
    jlptLevel: userJlptLevel,
    targetLevel: targetLevel,
    markdownContent: `## 📊 Feedback & Corrections
Your diary entry has been recorded. Keep practicing your Japanese every day!

## 💪 Encouragement
Great effort! Consistent daily practice is the key to improving your Japanese. Keep it up!`
  };

  const { allowed } = canCallApi();
  if (!allowed) {
    return defaultFeedback;
  }

  showApiUsageWarning();

  try {
    const data = await callGeminiApi({
      type: 'feedback', content, jlptLevel: userJlptLevel
    });

    const estimatedTokens = Math.ceil(content.length / API.TOKEN_ESTIMATION_DIVISOR) + API.TOKEN_BASE_FEEDBACK;
    recordApiUsage(estimatedTokens);
    recordApiSuccess();

    return {
      jlptLevel: (data.jlptLevel as JLPTLevel) || (data.cefrLevel as JLPTLevel) || userJlptLevel,
      targetLevel: (data.targetLevel as JLPTLevel) || targetLevel,
      markdownContent: data.markdownContent || defaultFeedback.markdownContent
    };

  } catch (error: any) {
    recordApiError();
    return defaultFeedback;
  }
}

/**
 * Generate feedback for Japanese speaking practice using Gemini API (via Vercel API Route)
 */
export async function generatePracticeFeedback(
  content: string,
  part: 'E' | 'F',
  userJlptLevel: JLPTLevel = DEFAULT_JLPT_LEVEL
): Promise<JapaneseFeedback> {
  const targetLevel = getNextJlptLevel(userJlptLevel);

  const defaultFeedback: JapaneseFeedback = {
    jlptLevel: userJlptLevel,
    targetLevel: targetLevel,
    markdownContent: `## 📊 Response Analysis\nYour response has been recorded. Keep practicing your Japanese speaking skills!\n\n## 💪 Encouragement\nGreat effort! Every speaking practice session brings you closer to fluency in Japanese. Keep going!`
  };

  const { allowed } = canCallApi();
  if (!allowed) {
    return defaultFeedback;
  }

  showApiUsageWarning();

  try {
    const data = await callGeminiApi({
      type: 'versant-feedback', content, part, jlptLevel: userJlptLevel
    });

    const estimatedTokens = Math.ceil(content.length / API.TOKEN_ESTIMATION_DIVISOR) + API.TOKEN_BASE_FEEDBACK;
    recordApiUsage(estimatedTokens);
    recordApiSuccess();

    return {
      jlptLevel: (data.jlptLevel as JLPTLevel) || (data.cefrLevel as JLPTLevel) || userJlptLevel,
      targetLevel: (data.targetLevel as JLPTLevel) || targetLevel,
      markdownContent: data.markdownContent || defaultFeedback.markdownContent
    };

  } catch (error: any) {
    recordApiError();
    return defaultFeedback;
  }
}

/**
 * Get JLPT level description in English (for foreign learners)
 */
export function getJlptDescription(level: JLPTLevel): string {
  const descriptions: Record<JLPTLevel, string> = {
    'N5': 'Beginner - Basic greetings, numbers, and simple everyday phrases',
    'N4': 'Elementary - Basic grammar and vocabulary for everyday conversations',
    'N3': 'Intermediate - Everyday situations and some understanding of written Japanese',
    'N2': 'Upper Intermediate - Wide range of topics and more complex Japanese',
    'N1': 'Advanced - Broad understanding of complex Japanese in any context',
  };
  return descriptions[level];
}

/**
 * Generate a sample answer for Japanese speaking practice using Gemini API (via Vercel API Route)
 */
export async function generatePracticeSampleAnswer(
  question: string,
  part: 'E' | 'F',
  userJlptLevel: JLPTLevel = DEFAULT_JLPT_LEVEL
): Promise<string> {
  const defaultAnswer = part === 'E'
    ? 'この文章は主なテーマについて説明しています。重要なポイントがいくつかあります。最後に、この内容はとても大切だと思います。'
    : '私はこのテーマについて、賛成だと思います。なぜなら、いくつかの理由があるからです。例えば、日常生活でよく見られます。また、多くの人にとって重要です。まとめると、このテーマはとても興味深いと思います。';

  const { allowed } = canCallApi();
  if (!allowed) {
    return defaultAnswer;
  }

  try {
    const data = await callGeminiApi({
      type: 'versant-sample', question, part, jlptLevel: userJlptLevel
    });

    const estimatedTokens = Math.ceil(question.length / API.TOKEN_ESTIMATION_DIVISOR) + API.TOKEN_BASE_SAMPLE;
    recordApiUsage(estimatedTokens);
    recordApiSuccess();

    return data.sampleAnswer || defaultAnswer;

  } catch (error: any) {
    recordApiError();
    return defaultAnswer;
  }
}

/**
 * Generate a Japanese practice question using Gemini API
 * Returns null if API is unavailable (caller should fall back to hardcoded questions)
 */
export async function generatePracticeQuestion(
  part: 'E' | 'F',
  userJlptLevel: JLPTLevel = DEFAULT_JLPT_LEVEL
): Promise<{ text: string; part: 'E' | 'F'; timeLimit: number } | null> {
  const { allowed } = canCallApi();
  if (!allowed) {
    return null;
  }

  try {
    const data = await callGeminiApi({
      type: 'versant-question', part, jlptLevel: userJlptLevel
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
    recordApiError();
    return null;
  }
}
