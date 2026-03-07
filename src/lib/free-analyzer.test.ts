import { describe, it, expect } from 'vitest';
import { analyzeFree, generateSummaryFree } from './free-analyzer';

describe('analyzeFree', () => {
  it('returns empty summary and no keywords for empty string', () => {
    const result = analyzeFree('');
    expect(result).toEqual({ summary: '', keywords: [] });
  });

  it('returns empty summary and no keywords for falsy input', () => {
    // @ts-expect-error testing falsy input
    expect(analyzeFree(null)).toEqual({ summary: '', keywords: [] });
    // @ts-expect-error testing falsy input
    expect(analyzeFree(undefined)).toEqual({ summary: '', keywords: [] });
  });

  it('returns the full text as summary if text is 50 chars or less', () => {
    const shortText = 'これは短いテスト文です';
    const result = analyzeFree(shortText);
    expect(result.summary).toBe(shortText);
  });

  it('returns first two sentences as summary for longer text', () => {
    // Must be >50 chars to trigger sentence splitting
    const text = '今日は日本語を勉強しました。とても楽しかったです。明日も頑張ります。来週もやりましょう。これは長いテキストです。';
    const result = analyzeFree(text);
    expect(result.summary).toBe('今日は日本語を勉強しました。とても楽しかったです。');
  });

  it('falls back to substring if no sentence delimiters found in long text', () => {
    // 60 chars with no delimiters, but split produces a single element
    // which still gets sliced and joined with 。
    const text = 'あ'.repeat(60);
    const result = analyzeFree(text);
    // split(/[。！？]/) with no match returns ['ああ...'] (1 element)
    // slice(0,2) returns ['ああ...'], join('。') + '。' = 'ああ...。'
    expect(result.summary).toBe('あ'.repeat(60) + '。');
  });

  it('extracts keywords that are present in text', () => {
    const text = '今日は日本語を勉強する。漢字を読むのが楽しい。';
    const result = analyzeFree(text);
    expect(result.keywords).toContain('日本語');
    expect(result.keywords).toContain('漢字');
    expect(result.keywords).toContain('楽しい');
    expect(result.keywords).toContain('勉強する');
    expect(result.keywords).toContain('読む');
  });

  it('returns at most 5 keywords', () => {
    const text = '日本語を勉強する。漢字を読むのが楽しい。文法も覚える。先生と会話する。';
    const result = analyzeFree(text);
    expect(result.keywords.length).toBeLessThanOrEqual(5);
  });

  it('returns empty keywords array when no candidates found', () => {
    const text = 'abcdefgh something in English with no Japanese keywords';
    const result = analyzeFree(text);
    expect(result.keywords).toEqual([]);
  });

  it('handles text with exclamation and question mark delimiters', () => {
    // Must be >50 chars to trigger splitting
    const text = '日本語の文法は本当にとても面白いと思います！あなたは日本語が好きですか？三番目の文です。四番目の文章です。';
    const result = analyzeFree(text);
    // split(/[。！？]/) removes delimiters, first 2 segments joined with '。' + '。'
    expect(result.summary).toBe('日本語の文法は本当にとても面白いと思います。あなたは日本語が好きですか。');
  });
});

describe('generateSummaryFree', () => {
  it('appends keyword info when keywords found', () => {
    const text = '今日は日本語を勉強する。とても楽しいです。';
    const result = generateSummaryFree(text);
    expect(result).toContain('について書かれています');
  });

  it('returns base summary only when no keywords found', () => {
    const text = 'hello world test';
    const result = generateSummaryFree(text);
    expect(result).not.toContain('について書かれています');
    expect(result).toBe(text); // short text returned as-is
  });

  it('includes at most 3 keywords in the suffix', () => {
    const text = '日本語を勉強する。漢字を読むのが楽しい。文法も覚える。先生と会話。';
    const result = generateSummaryFree(text);
    // Count keyword separators (should be at most 2 separators for 3 keywords)
    const keywordSection = result.split('（')[1]?.split('について')[0] || '';
    const keywordCount = keywordSection.split('・').length;
    expect(keywordCount).toBeLessThanOrEqual(3);
  });
});
