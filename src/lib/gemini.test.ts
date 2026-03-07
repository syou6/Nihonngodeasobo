import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./gemini-api', () => ({
  analyzeWithGemini: vi.fn(),
  generateSummaryWithGemini: vi.fn(() => Promise.resolve('AI generated summary')),
}));

vi.mock('./free-analyzer', () => ({
  analyzeFree: vi.fn(() => ({ summary: 'free summary', keywords: ['free'] })),
  generateSummaryFree: vi.fn(() => 'free summary text'),
}));

import { analyzeText, generateSummary } from './gemini';
import { analyzeWithGemini } from './gemini-api';
import { analyzeFree, generateSummaryFree } from './free-analyzer';

const mockAnalyzeWithGemini = vi.mocked(analyzeWithGemini);
const mockAnalyzeFree = vi.mocked(analyzeFree);
const mockGenerateSummaryFree = vi.mocked(generateSummaryFree);

describe('analyzeText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyzeFree.mockReturnValue({ summary: 'free summary', keywords: ['free'] });
  });

  it('returns empty text for empty input', async () => {
    const result = await analyzeText('');
    expect(result).toEqual({ text: '' });
  });

  it('uses Gemini API when available', async () => {
    mockAnalyzeWithGemini.mockResolvedValue({
      summary: 'AI summary',
      keywords: ['ai', 'keyword'],
    });

    const result = await analyzeText('日本語のテスト');
    expect(result).toEqual({
      text: '日本語のテスト',
      summary: 'AI summary',
      keywords: ['ai', 'keyword'],
    });
  });

  it('falls back to free analyzer when Gemini fails', async () => {
    mockAnalyzeWithGemini.mockRejectedValue(new Error('API error'));

    const result = await analyzeText('テスト文');
    expect(result).toEqual({
      text: 'テスト文',
      summary: 'free summary',
      keywords: ['free'],
    });
    expect(mockAnalyzeFree).toHaveBeenCalledWith('テスト文');
  });
});

describe('generateSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateSummaryFree.mockReturnValue('free summary text');
  });

  it('returns Gemini summary when API succeeds', async () => {
    const result = await generateSummary('test content');
    expect(result).toBe('AI generated summary');
  });

  it('falls back to free summary when Gemini fails', async () => {
    // Make the dynamic import's function throw
    const { generateSummaryWithGemini } = await import('./gemini-api');
    vi.mocked(generateSummaryWithGemini).mockRejectedValue(new Error('API fail'));

    const result = await generateSummary('test content');
    expect(result).toBe('free summary text');
    expect(mockGenerateSummaryFree).toHaveBeenCalledWith('test content');
  });
});
