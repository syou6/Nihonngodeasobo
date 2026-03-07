import { canCallApi, recordApiUsage, getCachedAnalysis, cacheAnalysis, showApiUsageWarning, recordApiSuccess, recordApiError } from './api-limiter';
import { supabase } from './supabase';

export interface AnalysisResult {
  summary: string;
  keywords: string[];
}

export async function callGeminiApi(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('gemini-ai', {
    body
  });

  if (error) {
    throw new Error(error.message || 'Gemini API error');
  }

  return data;
}

// Gemini 2.5 Flash を使用した分析（Supabase Edge Function経由）
export async function analyzeWithGemini(text: string): Promise<AnalysisResult> {
  const cachedResult = getCachedAnalysis(text);
  if (cachedResult) {
    return cachedResult;
  }

  const { allowed, reason } = canCallApi();
  if (!allowed) {
    return {
      summary: text.substring(0, 100) + '...(API制限により簡易分析)',
      keywords: []
    };
  }

  showApiUsageWarning();

  const MAX_RETRIES = 2;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      const data = await callGeminiApi({ type: 'analyze', content: text });

      const result = {
        summary: data.summary || text.substring(0, 50),
        keywords: Array.isArray(data.keywords) ? data.keywords.slice(0, 5) : []
      };

      const estimatedTokens = Math.ceil(text.length / 3) + 50;
      recordApiUsage(estimatedTokens);
      recordApiSuccess();

      cacheAnalysis(text, result);

      return result;

    } catch (error: any) {
      retryCount++;

      if (retryCount < MAX_RETRIES &&
          (error.message?.includes('network') ||
           error.message?.includes('timeout') ||
           error.message?.includes('fetch'))) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      recordApiError();

      return {
        summary: text.substring(0, 100),
        keywords: []
      };
    }
  }

  return {
    summary: text.substring(0, 100),
    keywords: []
  };
}

// 要約を生成（Supabase Edge Function経由）
export async function generateSummaryWithGemini(text: string): Promise<string> {
  try {
    const data = await callGeminiApi({ type: 'summary', content: text });
    return data.summary || text.substring(0, 100) + '...';

  } catch (error) {
    return text.substring(0, 100) + '...';
  }
}
