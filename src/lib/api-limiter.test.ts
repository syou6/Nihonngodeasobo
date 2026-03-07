import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordApiUsage,
  getCurrentUsageStats,
  resetUsage,
  getCachedAnalysis,
  cacheAnalysis,
  showApiUsageWarning,
  recordApiError,
  recordApiSuccess,
  canCallApi,
} from './api-limiter';

function clearLocalStorage() {
  localStorage.removeItem('gemini_api_usage');
  localStorage.removeItem('gemini_api_cache');
  localStorage.removeItem('gemini_circuit_breaker');
  localStorage.removeItem('gemini_rate_limit');
}

describe('api-limiter', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  describe('recordApiUsage / getCurrentUsageStats', () => {
    it('starts with zero usage', () => {
      const stats = getCurrentUsageStats();
      expect(stats.dailyUsed).toBe(0);
      expect(stats.remainingRequests).toBe(20);
      expect(stats.tokensUsed).toBe(0);
    });

    it('records usage and increments count', () => {
      recordApiUsage(100);
      const stats = getCurrentUsageStats();
      expect(stats.dailyUsed).toBe(1);
      expect(stats.tokensUsed).toBe(100);
      expect(stats.remainingRequests).toBe(19);
    });

    it('accumulates multiple usages', () => {
      recordApiUsage(100);
      recordApiUsage(200);
      recordApiUsage(300);
      const stats = getCurrentUsageStats();
      expect(stats.dailyUsed).toBe(3);
      expect(stats.tokensUsed).toBe(600);
      expect(stats.remainingRequests).toBe(17);
    });

    it('uses default token estimate of 200 when not specified', () => {
      recordApiUsage();
      const stats = getCurrentUsageStats();
      expect(stats.tokensUsed).toBe(200);
    });

    it('resets on new day', () => {
      recordApiUsage(500);

      // Simulate yesterday's usage
      const usage = JSON.parse(localStorage.getItem('gemini_api_usage')!);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      usage.lastReset = yesterday.toISOString();
      localStorage.setItem('gemini_api_usage', JSON.stringify(usage));

      const stats = getCurrentUsageStats();
      expect(stats.dailyUsed).toBe(0);
      expect(stats.remainingRequests).toBe(20);
    });
  });

  describe('resetUsage', () => {
    it('resets all counters to zero', () => {
      recordApiUsage(500);
      recordApiUsage(500);
      resetUsage();
      const stats = getCurrentUsageStats();
      expect(stats.dailyUsed).toBe(0);
      expect(stats.tokensUsed).toBe(0);
    });
  });

  describe('canCallApi', () => {
    it('allows calls when under limit', () => {
      const result = canCallApi();
      expect(result.allowed).toBe(true);
    });

    it('blocks calls when daily limit reached', () => {
      // Set usage to daily limit
      const usage = {
        count: 20,
        lastReset: new Date().toISOString(),
        totalTokens: 1000,
      };
      localStorage.setItem('gemini_api_usage', JSON.stringify(usage));

      // Need to also handle rate limit - clear it
      localStorage.removeItem('gemini_rate_limit');

      const result = canCallApi();
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('API使用上限');
    });

    it('blocks calls when token limit reached', () => {
      const usage = {
        count: 5,
        lastReset: new Date().toISOString(),
        totalTokens: 10000,
      };
      localStorage.setItem('gemini_api_usage', JSON.stringify(usage));
      localStorage.removeItem('gemini_rate_limit');

      const result = canCallApi();
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('トークン上限');
    });

    it('blocks when circuit breaker is open', () => {
      const state = {
        errorCount: 5,
        lastError: Date.now(),
        isOpen: true,
        nextRetry: Date.now() + 600000,
      };
      localStorage.setItem('gemini_circuit_breaker', JSON.stringify(state));

      const result = canCallApi();
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('一時的に停止');
    });

    it('resets circuit breaker after retry time expires', () => {
      const state = {
        errorCount: 5,
        lastError: Date.now() - 700000,
        isOpen: true,
        nextRetry: Date.now() - 100000, // already past
      };
      localStorage.setItem('gemini_circuit_breaker', JSON.stringify(state));

      const result = canCallApi();
      expect(result.allowed).toBe(true);
    });

    it('blocks when rate limited (too many requests per minute)', () => {
      // Fill up rate limit
      const now = Date.now();
      const info = {
        requests: [now - 1000, now - 500, now - 100],
        lastReset: now - 5000,
      };
      localStorage.setItem('gemini_rate_limit', JSON.stringify(info));

      const result = canCallApi();
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('短時間に多すぎる');
    });
  });

  describe('cacheAnalysis / getCachedAnalysis', () => {
    it('returns null for uncached text', () => {
      expect(getCachedAnalysis('some text')).toBeNull();
    });

    it('caches and retrieves analysis', () => {
      const result = { summary: 'test summary', keywords: ['a', 'b'] };
      cacheAnalysis('hello world', result);
      const cached = getCachedAnalysis('hello world');
      expect(cached).toEqual(result);
    });

    it('returns null for expired cache entries', () => {
      const result = { summary: 'old', keywords: [] };
      cacheAnalysis('expired text', result);

      // Modify timestamp to be 25 hours ago
      const cached = JSON.parse(localStorage.getItem('gemini_api_cache')!);
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25);
      cached[0].timestamp = oldDate.toISOString();
      localStorage.setItem('gemini_api_cache', JSON.stringify(cached));

      expect(getCachedAnalysis('expired text')).toBeNull();
    });

    it('limits cache to 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        cacheAnalysis(`text-${i}`, { summary: `summary-${i}`, keywords: [] });
      }
      const cached = JSON.parse(localStorage.getItem('gemini_api_cache')!);
      expect(cached.length).toBe(20);
    });

    it('overwrites existing cache entry for same text', () => {
      cacheAnalysis('same text', { summary: 'first', keywords: [] });
      cacheAnalysis('same text', { summary: 'second', keywords: [] });
      const cached = getCachedAnalysis('same text');
      expect(cached.summary).toBe('second');
    });

    it('handles corrupted cache gracefully', () => {
      localStorage.setItem('gemini_api_cache', 'not valid json');
      expect(getCachedAnalysis('anything')).toBeNull();
    });
  });

  describe('recordApiError / recordApiSuccess', () => {
    it('opens circuit breaker after threshold errors', () => {
      for (let i = 0; i < 5; i++) {
        recordApiError();
      }
      const state = JSON.parse(localStorage.getItem('gemini_circuit_breaker')!);
      expect(state.isOpen).toBe(true);
      expect(state.errorCount).toBe(5);
    });

    it('resets error count on success', () => {
      recordApiError();
      recordApiError();
      recordApiSuccess();
      const state = JSON.parse(localStorage.getItem('gemini_circuit_breaker')!);
      expect(state.errorCount).toBe(0);
      expect(state.isOpen).toBe(false);
    });
  });

  describe('showApiUsageWarning', () => {
    it('does not throw when called', () => {
      expect(() => showApiUsageWarning()).not.toThrow();
    });

    it('does not throw when usage is high', () => {
      const usage = {
        count: 18,
        lastReset: new Date().toISOString(),
        totalTokens: 5000,
      };
      localStorage.setItem('gemini_api_usage', JSON.stringify(usage));
      expect(() => showApiUsageWarning()).not.toThrow();
    });
  });
});
