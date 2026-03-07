import { analyzeFree, generateSummaryFree } from './free-analyzer';
import { analyzeWithGemini } from './gemini-api';

export interface TranscriptionResult {
  text: string;
  summary?: string;
  keywords?: string[];
}

/**
 * テキストを分析する
 * API Route経由でGemini 2.5 Flashを使用、失敗時は無料分析にフォールバック
 */
export async function analyzeText(text: string): Promise<TranscriptionResult> {
  if (!text) {
    return { text: '' };
  }

  try {
    const result = await analyzeWithGemini(text);
    return {
      text,
      summary: result.summary,
      keywords: result.keywords
    };
  } catch (error) {
    // 無料分析にフォールバック
  }

  const result = analyzeFree(text);
  return {
    text,
    summary: result.summary,
    keywords: result.keywords
  };
}

/**
 * 日記を要約
 * API Route経由でGemini 2.5 Flashを使用、失敗時は無料分析にフォールバック
 */
export async function generateSummary(content: string): Promise<string> {
  try {
    const { generateSummaryWithGemini } = await import('./gemini-api');
    return await generateSummaryWithGemini(content);
  } catch (error) {
    // 無料版にフォールバック
  }

  return generateSummaryFree(content);
}
