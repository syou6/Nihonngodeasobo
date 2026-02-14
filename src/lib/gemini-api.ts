import { canCallApi, recordApiUsage, getCachedAnalysis, cacheAnalysis, showApiUsageWarning, recordApiSuccess, recordApiError } from './api-limiter';

export interface AnalysisResult {
  summary: string;
  emotion: string;
  health_score: number;
  keywords: string[];
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

// Gemini 2.0 Flash を使用した分析（Vercel API Route経由）
export async function analyzeWithGemini(text: string): Promise<AnalysisResult> {
  // キャッシュをチェック
  const cachedResult = getCachedAnalysis(text);
  if (cachedResult) {
    return cachedResult;
  }

  // 総合的なAPI制限チェック（レート制限、サーキットブレーカー、使用量制限）
  const { allowed, reason } = canCallApi();
  if (!allowed) {
    console.warn('API制限:', reason);
    return {
      summary: text.substring(0, 100) + '...(API制限により簡易分析)',
      emotion: '普通',
      health_score: 75,
      keywords: []
    };
  }

  // 使用量警告を表示
  showApiUsageWarning();

  // リトライ設定（最大2回まで）
  const MAX_RETRIES = 2;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      const data = await callGeminiApi({ type: 'analyze', content: text });

      const result = {
        summary: data.summary || text.substring(0, 50),
        emotion: data.emotion || '普通',
        health_score: Math.min(100, Math.max(0, data.health_score || 75)),
        keywords: Array.isArray(data.keywords) ? data.keywords.slice(0, 3) : []
      };

      // API使用を記録
      const estimatedTokens = Math.ceil(text.length / 3) + 50;
      recordApiUsage(estimatedTokens);
      recordApiSuccess();

      // 結果をキャッシュに保存
      cacheAnalysis(text, result);

      return result;

    } catch (error: any) {
      retryCount++;
      console.error(`Gemini API エラー (試行 ${retryCount}/${MAX_RETRIES}):`, error.message);

      // ネットワークエラーまたはタイムアウトの場合のみリトライ
      if (retryCount < MAX_RETRIES &&
          (error.message?.includes('network') ||
           error.message?.includes('timeout') ||
           error.message?.includes('fetch'))) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // エラーを記録（サーキットブレーカー用）
      recordApiError();

      // エラー時は無料版の分析にフォールバック
      return {
        summary: text.substring(0, 100),
        emotion: '普通',
        health_score: 75,
        keywords: []
      };
    }
  }

  return {
    summary: text.substring(0, 100),
    emotion: '普通',
    health_score: 75,
    keywords: []
  };
}

// 家族向け要約を生成（Vercel API Route経由）
export async function generateFamilySummaryWithGemini(text: string): Promise<string> {
  try {
    const data = await callGeminiApi({ type: 'summary', content: text });
    return data.summary || text.substring(0, 100) + '...';

  } catch (error) {
    console.error('Gemini API エラー:', error);
    return text.substring(0, 100) + '...';
  }
}
