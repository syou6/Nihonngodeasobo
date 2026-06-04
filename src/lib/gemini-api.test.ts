import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callGeminiApi, analyzeWithGemini, generateSummaryWithGemini } from './gemini-api';

// Mock supabase
vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock api-limiter
vi.mock('./api-limiter', () => ({
  canCallApi: vi.fn(() => ({ allowed: true })),
  recordApiUsage: vi.fn(),
  getCachedAnalysis: vi.fn(() => null),
  cacheAnalysis: vi.fn(),
  showApiUsageWarning: vi.fn(),
  recordApiSuccess: vi.fn(),
  recordApiError: vi.fn(),
}));

import { supabase } from './supabase';
import {
  canCallApi,
  getCachedAnalysis,
  cacheAnalysis,
  recordApiUsage,
  recordApiSuccess,
  recordApiError,
} from './api-limiter';

const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
const mockCanCallApi = canCallApi as ReturnType<typeof vi.fn>;
const mockGetCachedAnalysis = getCachedAnalysis as ReturnType<typeof vi.fn>;

describe('callGeminiApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes supabase edge function and returns data', async () => {
    mockInvoke.mockResolvedValue({ data: { summary: 'test' }, error: null });

    const result = await callGeminiApi({ type: 'analyze', content: 'hello' });
    expect(result).toEqual({ summary: 'test' });
    expect(mockInvoke).toHaveBeenCalledWith('gemini-ai', {
      body: { type: 'analyze', content: 'hello' },
    });
  });

  it('throws on supabase error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Server error' } });

    await expect(callGeminiApi({ type: 'analyze' })).rejects.toThrow('Server error');
  });

  it('throws generic message when error has no message', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: {} });

    await expect(callGeminiApi({ type: 'analyze' })).rejects.toThrow('Gemini API error');
  });
});

describe('analyzeWithGemini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanCallApi.mockReturnValue({ allowed: true });
    mockGetCachedAnalysis.mockReturnValue(null);
  });

  it('returns cached result when available', async () => {
    const cached = { summary: 'cached summary', keywords: ['a'] };
    mockGetCachedAnalysis.mockReturnValue(cached);

    const result = await analyzeWithGemini('test');
    expect(result).toEqual(cached);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('returns fallback when API not allowed', async () => {
    mockCanCallApi.mockReturnValue({ allowed: false, reason: 'limit' });

    const result = await analyzeWithGemini('test text');
    expect(result.summary).toContain('AI limit reached');
    expect(result.keywords).toEqual([]);
  });

  it('calls API and returns result on success', async () => {
    mockInvoke.mockResolvedValue({
      data: { summary: 'AI summary', keywords: ['k1', 'k2'] },
      error: null,
    });

    const result = await analyzeWithGemini('some diary text');
    expect(result.summary).toBe('AI summary');
    expect(result.keywords).toEqual(['k1', 'k2']);
    expect(recordApiUsage).toHaveBeenCalled();
    expect(recordApiSuccess).toHaveBeenCalled();
    expect(cacheAnalysis).toHaveBeenCalled();
  });

  it('uses text substring when API returns no summary', async () => {
    mockInvoke.mockResolvedValue({
      data: { summary: '', keywords: [] },
      error: null,
    });

    const text = 'short text';
    const result = await analyzeWithGemini(text);
    expect(result.summary).toBe(text.substring(0, 50));
  });

  it('limits keywords to 5', async () => {
    mockInvoke.mockResolvedValue({
      data: { summary: 'ok', keywords: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] },
      error: null,
    });

    const result = await analyzeWithGemini('text');
    expect(result.keywords).toHaveLength(5);
  });

  it('handles non-array keywords gracefully', async () => {
    mockInvoke.mockResolvedValue({
      data: { summary: 'ok', keywords: 'not an array' },
      error: null,
    });

    const result = await analyzeWithGemini('text');
    expect(result.keywords).toEqual([]);
  });

  it('returns fallback on non-retryable error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'auth error' } });

    const text = 'a'.repeat(200);
    const result = await analyzeWithGemini(text);
    expect(result.summary).toBe(text.substring(0, 100));
    expect(result.keywords).toEqual([]);
    expect(recordApiError).toHaveBeenCalled();
  });

  it('retries on network error then falls back', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'network error' } });

    const result = await analyzeWithGemini('text');
    // Should have retried (called invoke twice due to MAX_RETRIES=2)
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(result.keywords).toEqual([]);
  });
});

describe('generateSummaryWithGemini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns summary from API', async () => {
    mockInvoke.mockResolvedValue({
      data: { summary: 'Generated summary' },
      error: null,
    });

    const result = await generateSummaryWithGemini('some text');
    expect(result).toBe('Generated summary');
  });

  it('returns fallback when API returns empty summary', async () => {
    mockInvoke.mockResolvedValue({
      data: { summary: '' },
      error: null,
    });

    const text = 'a'.repeat(200);
    const result = await generateSummaryWithGemini(text);
    expect(result).toBe(text.substring(0, 100) + '...');
  });

  it('returns fallback on error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'fail' } });

    const text = 'test text here';
    const result = await generateSummaryWithGemini(text);
    expect(result).toBe(text.substring(0, 100) + '...');
  });
});
