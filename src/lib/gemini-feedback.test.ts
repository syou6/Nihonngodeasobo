import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('./api-limiter', () => ({
  canCallApi: vi.fn(() => ({ allowed: true })),
  recordApiUsage: vi.fn(),
  recordApiSuccess: vi.fn(),
  recordApiError: vi.fn(),
  showApiUsageWarning: vi.fn(),
}));

vi.mock('./gemini-api', () => ({
  callGeminiApi: vi.fn(),
}));

import {
  generateJapaneseFeedback,
  generatePracticeFeedback,
  getJlptDescription,
  generatePracticeSampleAnswer,
  generatePracticeQuestion,
} from './gemini-feedback';
import { canCallApi, recordApiUsage, recordApiSuccess, recordApiError } from './api-limiter';
import { callGeminiApi } from './gemini-api';

const mockCanCallApi = vi.mocked(canCallApi);
const mockCallGeminiApi = vi.mocked(callGeminiApi);
const mockRecordApiUsage = vi.mocked(recordApiUsage);
const mockRecordApiSuccess = vi.mocked(recordApiSuccess);
const mockRecordApiError = vi.mocked(recordApiError);

describe('getJlptDescription', () => {
  it('returns correct description for N5', () => {
    expect(getJlptDescription('N5')).toContain('Beginner');
  });

  it('returns correct description for N4', () => {
    expect(getJlptDescription('N4')).toContain('Elementary');
  });

  it('returns correct description for N3', () => {
    expect(getJlptDescription('N3')).toContain('Intermediate');
  });

  it('returns correct description for N2', () => {
    expect(getJlptDescription('N2')).toContain('Upper Intermediate');
  });

  it('returns correct description for N1', () => {
    expect(getJlptDescription('N1')).toContain('Advanced');
  });
});

describe('generateJapaneseFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanCallApi.mockReturnValue({ allowed: true });
  });

  it('returns default feedback when API is not allowed', async () => {
    mockCanCallApi.mockReturnValue({ allowed: false, reason: 'limit' });

    const result = await generateJapaneseFeedback('今日は楽しかった');
    expect(result.jlptLevel).toBe('N4'); // DEFAULT_JLPT_LEVEL
    expect(result.markdownContent).toContain('Feedback');
    expect(mockCallGeminiApi).not.toHaveBeenCalled();
  });

  it('calls Gemini API with correct parameters', async () => {
    mockCallGeminiApi.mockResolvedValue({
      jlptLevel: 'N4',
      targetLevel: 'N3',
      markdownContent: '## Feedback\nGood job!',
    });

    const result = await generateJapaneseFeedback('今日は楽しかった', 'N4');
    expect(mockCallGeminiApi).toHaveBeenCalledWith({
      type: 'feedback',
      content: '今日は楽しかった',
      jlptLevel: 'N4',
    });
    expect(result.jlptLevel).toBe('N4');
    expect(result.markdownContent).toBe('## Feedback\nGood job!');
  });

  it('records API usage and success on successful call', async () => {
    mockCallGeminiApi.mockResolvedValue({
      markdownContent: 'feedback',
    });

    await generateJapaneseFeedback('test');
    expect(mockRecordApiUsage).toHaveBeenCalled();
    expect(mockRecordApiSuccess).toHaveBeenCalled();
  });

  it('returns default feedback and records error on API failure', async () => {
    mockCallGeminiApi.mockRejectedValue(new Error('API error'));

    const result = await generateJapaneseFeedback('test');
    expect(result.markdownContent).toContain('Feedback');
    expect(mockRecordApiError).toHaveBeenCalled();
  });

  it('uses default JLPT level N4 when not specified', async () => {
    mockCallGeminiApi.mockResolvedValue({ markdownContent: 'ok' });

    await generateJapaneseFeedback('test');
    expect(mockCallGeminiApi).toHaveBeenCalledWith(
      expect.objectContaining({ jlptLevel: 'N4' })
    );
  });

  it('falls back to user level when API response has no jlptLevel', async () => {
    mockCallGeminiApi.mockResolvedValue({ markdownContent: 'ok' });

    const result = await generateJapaneseFeedback('test', 'N3');
    expect(result.jlptLevel).toBe('N3');
  });
});

describe('generatePracticeFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanCallApi.mockReturnValue({ allowed: true });
  });

  it('returns default feedback when API is not allowed', async () => {
    mockCanCallApi.mockReturnValue({ allowed: false, reason: 'limit' });

    const result = await generatePracticeFeedback('response text', 'E');
    expect(result.markdownContent).toContain('Response Analysis');
    expect(mockCallGeminiApi).not.toHaveBeenCalled();
  });

  it('sends correct type for versant feedback', async () => {
    mockCallGeminiApi.mockResolvedValue({ markdownContent: 'feedback' });

    await generatePracticeFeedback('response', 'F', 'N3');
    expect(mockCallGeminiApi).toHaveBeenCalledWith({
      type: 'versant-feedback',
      content: 'response',
      part: 'F',
      jlptLevel: 'N3',
    });
  });

  it('records error on API failure', async () => {
    mockCallGeminiApi.mockRejectedValue(new Error('fail'));

    await generatePracticeFeedback('test', 'E');
    expect(mockRecordApiError).toHaveBeenCalled();
  });
});

describe('generatePracticeSampleAnswer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanCallApi.mockReturnValue({ allowed: true });
  });

  it('returns default part E answer when API not allowed', async () => {
    mockCanCallApi.mockReturnValue({ allowed: false, reason: 'limit' });

    const result = await generatePracticeSampleAnswer('question', 'E');
    expect(result).toContain('テーマ');
  });

  it('returns default part F answer when API not allowed', async () => {
    mockCanCallApi.mockReturnValue({ allowed: false, reason: 'limit' });

    const result = await generatePracticeSampleAnswer('question', 'F');
    expect(result).toContain('賛成');
  });

  it('returns API sample answer on success', async () => {
    mockCallGeminiApi.mockResolvedValue({ sampleAnswer: 'これは模範解答です。' });

    const result = await generatePracticeSampleAnswer('question', 'E');
    expect(result).toBe('これは模範解答です。');
    expect(mockRecordApiSuccess).toHaveBeenCalled();
  });

  it('returns default answer on API failure', async () => {
    mockCallGeminiApi.mockRejectedValue(new Error('fail'));

    const result = await generatePracticeSampleAnswer('question', 'E');
    expect(result).toContain('テーマ');
    expect(mockRecordApiError).toHaveBeenCalled();
  });
});

describe('generatePracticeQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanCallApi.mockReturnValue({ allowed: true });
  });

  it('returns null when API not allowed', async () => {
    mockCanCallApi.mockReturnValue({ allowed: false, reason: 'limit' });

    const result = await generatePracticeQuestion('E');
    expect(result).toBeNull();
  });

  it('returns question with correct structure', async () => {
    mockCallGeminiApi.mockResolvedValue({
      text: '日本の文化について説明してください。',
      part: 'E',
      timeLimit: 30,
    });

    const result = await generatePracticeQuestion('E', 'N3');
    expect(result).toEqual({
      text: '日本の文化について説明してください。',
      part: 'E',
      timeLimit: 30,
    });
  });

  it('uses default time limit for part E when not in response', async () => {
    mockCallGeminiApi.mockResolvedValue({ text: 'question' });

    const result = await generatePracticeQuestion('E');
    expect(result?.timeLimit).toBe(30);
  });

  it('uses default time limit for part F when not in response', async () => {
    mockCallGeminiApi.mockResolvedValue({ text: 'question' });

    const result = await generatePracticeQuestion('F');
    expect(result?.timeLimit).toBe(40);
  });

  it('returns null when API response has no text', async () => {
    mockCallGeminiApi.mockResolvedValue({});

    const result = await generatePracticeQuestion('E');
    expect(result).toBeNull();
  });

  it('returns null and records error on API failure', async () => {
    mockCallGeminiApi.mockRejectedValue(new Error('fail'));

    const result = await generatePracticeQuestion('E');
    expect(result).toBeNull();
    expect(mockRecordApiError).toHaveBeenCalled();
  });
});
