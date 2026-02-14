import { analyzeFree, generateFamilySummaryFree } from './free-analyzer';
import { analyzeWithGemini } from './gemini-api';

export interface TranscriptionResult {
  text: string;
  summary?: string;
  keywords?: string[];
  emotion?: string;
}

/**
 * テキストを分析する（音声文字起こしは行わない）
 * API Route経由でGemini 2.0 Flashを使用、失敗時は無料分析にフォールバック
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
      keywords: result.keywords,
      emotion: result.emotion
    };
  } catch (error) {
    console.error('Gemini API失敗、無料版にフォールバック:', error);
  }

  // 無料分析を使用（エラー時）
  const result = analyzeFree(text);
  return {
    text,
    summary: result.summary,
    keywords: result.keywords,
    emotion: result.emotion
  };
}

/**
 * 音声ファイルの文字起こし（現在は未実装）
 * 注: Web Speech APIは録音済み音声の文字起こしには適していないため、
 * 将来的にはWhisper APIなどの利用を検討
 */
export function transcribeAudioFile(audioBlob: Blob): Promise<string> {
  return Promise.resolve('');
}

/**
 * 長い日記を家族向けに要約
 * API Route経由でGemini 2.0 Flashを使用、失敗時は無料分析にフォールバック
 */
export async function generateFamilySummary(content: string): Promise<string> {
  try {
    const { generateFamilySummaryWithGemini } = await import('./gemini-api');
    return await generateFamilySummaryWithGemini(content);
  } catch (error) {
    console.error('Gemini API失敗、無料版にフォールバック:', error);
  }

  return generateFamilySummaryFree(content);
}

/**
 * 健康状態をスコアリング
 * API Route経由でGemini 2.0 Flashを使用、失敗時は無料分析にフォールバック
 */
export async function analyzeHealthScore(content: string, voiceData?: any): Promise<number> {
  try {
    const result = await analyzeWithGemini(content);
    return result.health_score;
  } catch (error) {
    console.error('Gemini API失敗、無料版にフォールバック:', error);
  }

  const result = analyzeFree(content);
  return result.health_score;
}
