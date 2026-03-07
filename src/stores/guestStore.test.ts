import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the gemini module (used by createGuestDiary when AI is available)
vi.mock('../lib/gemini', () => ({
  analyzeText: vi.fn().mockResolvedValue({
    summary: 'Test summary',
    keywords: ['test'],
    emotion: 'neutral',
    language_score: 70,
    grammar_errors: 0,
    jlpt_estimated_level: 'N4',
    summary_en: 'Test summary EN',
  }),
  generateSummary: vi.fn().mockResolvedValue('AI generated summary'),
}));

// Provide a proper localStorage polyfill for zustand/persist
const localStorageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => localStorageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { localStorageMap.set(key, value); },
  removeItem: (key: string) => { localStorageMap.delete(key); },
  clear: () => { localStorageMap.clear(); },
  get length() { return localStorageMap.size; },
  key: (index: number) => Array.from(localStorageMap.keys())[index] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Import AFTER localStorage is set up
const { useGuestStore } = await import('./guestStore');

function resetStore() {
  useGuestStore.setState({
    diaries: [],
    usageCount: 0,
    maxDiaries: 3,
    isGuestMode: false,
    aiUsageCount: 0,
  });
}

describe('guestStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
    localStorageMap.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Initial state ----

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useGuestStore.getState();
      expect(state.diaries).toEqual([]);
      expect(state.usageCount).toBe(0);
      expect(state.maxDiaries).toBe(3);
      expect(state.isGuestMode).toBe(false);
      expect(state.aiUsageCount).toBe(0);
    });
  });

  // ---- setGuestMode ----

  describe('setGuestMode', () => {
    it('enables guest mode', () => {
      useGuestStore.getState().setGuestMode(true);
      expect(useGuestStore.getState().isGuestMode).toBe(true);
    });

    it('disables guest mode', () => {
      useGuestStore.setState({ isGuestMode: true });
      useGuestStore.getState().setGuestMode(false);
      expect(useGuestStore.getState().isGuestMode).toBe(false);
    });
  });

  // ---- getRemainingTries ----

  describe('getRemainingTries', () => {
    it('returns maxDiaries when no diaries created', () => {
      expect(useGuestStore.getState().getRemainingTries()).toBe(3);
    });

    it('returns correct remaining count after usage', () => {
      useGuestStore.setState({ usageCount: 2 });
      expect(useGuestStore.getState().getRemainingTries()).toBe(1);
    });

    it('returns 0 when all tries used', () => {
      useGuestStore.setState({ usageCount: 3 });
      expect(useGuestStore.getState().getRemainingTries()).toBe(0);
    });

    it('never returns negative', () => {
      useGuestStore.setState({ usageCount: 5 });
      expect(useGuestStore.getState().getRemainingTries()).toBe(0);
    });
  });

  // ---- canCreateMore ----

  describe('canCreateMore', () => {
    it('returns true when under limit', () => {
      expect(useGuestStore.getState().canCreateMore()).toBe(true);
    });

    it('returns false when at limit', () => {
      useGuestStore.setState({ usageCount: 3 });
      expect(useGuestStore.getState().canCreateMore()).toBe(false);
    });

    it('returns false when over limit', () => {
      useGuestStore.setState({ usageCount: 10 });
      expect(useGuestStore.getState().canCreateMore()).toBe(false);
    });
  });

  // ---- canUseAI ----

  describe('canUseAI', () => {
    it('returns true when AI has not been used', () => {
      expect(useGuestStore.getState().canUseAI()).toBe(true);
    });

    it('returns false after one AI usage', () => {
      useGuestStore.setState({ aiUsageCount: 1 });
      expect(useGuestStore.getState().canUseAI()).toBe(false);
    });

    it('returns false when AI usage exceeds limit', () => {
      useGuestStore.setState({ aiUsageCount: 5 });
      expect(useGuestStore.getState().canUseAI()).toBe(false);
    });
  });

  // ---- createGuestDiary ----

  describe('createGuestDiary', () => {
    it('creates a diary entry with correct fields', async () => {
      await useGuestStore.getState().createGuestDiary('Today I studied kanji');

      const state = useGuestStore.getState();
      expect(state.diaries).toHaveLength(1);
      expect(state.usageCount).toBe(1);

      const diary = state.diaries[0];
      expect(diary.content).toBe('Today I studied kanji');
      expect(diary.title).toBe('Today I studied kanji');
      expect(diary.emotion).toBe('neutral');
      expect(diary.language_score).toBe(50);
      expect(diary.id).toMatch(/^guest-/);
      expect(diary.created_at).toBeDefined();
      expect(diary.expires_at).toBeDefined();
    });

    it('truncates title to 50 characters', async () => {
      const longContent = 'A'.repeat(100);
      await useGuestStore.getState().createGuestDiary(longContent);

      const diary = useGuestStore.getState().diaries[0];
      expect(diary.title).toHaveLength(50);
    });

    it('throws when usage limit is reached', async () => {
      useGuestStore.setState({ usageCount: 3 });

      await expect(
        useGuestStore.getState().createGuestDiary('New diary')
      ).rejects.toThrow('ゲスト利用の上限に達しました');
    });

    it('sets expiration to 30 minutes after creation', async () => {
      await useGuestStore.getState().createGuestDiary('Test');

      const diary = useGuestStore.getState().diaries[0];
      const expiresAt = new Date(diary.expires_at).getTime();
      const createdAt = new Date(diary.created_at).getTime();

      const diff = expiresAt - createdAt;
      // Should be 30 minutes (1800000 ms)
      expect(diff).toBe(30 * 60 * 1000);
    });

    it('increments aiUsageCount on first diary with AI', async () => {
      await useGuestStore.getState().createGuestDiary('Test content');

      expect(useGuestStore.getState().aiUsageCount).toBe(1);
    });

    it('uses fallback summary when AI limit exceeded', async () => {
      useGuestStore.setState({ aiUsageCount: 1 });

      await useGuestStore.getState().createGuestDiary('Another diary');

      const diary = useGuestStore.getState().diaries[0];
      expect(diary.ai_summary).toBe('AI分析はゲストモードで1回まで利用可能です。');
    });

    it('prepends new diary to the list', async () => {
      await useGuestStore.getState().createGuestDiary('First');
      await useGuestStore.getState().createGuestDiary('Second');

      const diaries = useGuestStore.getState().diaries;
      expect(diaries).toHaveLength(2);
      expect(diaries[0].content).toBe('Second');
      expect(diaries[1].content).toBe('First');
    });

    it('throws when audio blob exceeds 300KB limit', async () => {
      const largeBlob = new Blob([new ArrayBuffer(400000)]);

      await expect(
        useGuestStore.getState().createGuestDiary('With audio', largeBlob)
      ).rejects.toThrow('ゲストモードでは30秒までの録音が可能です');
    });
  });

  // ---- deleteGuestDiary ----

  describe('deleteGuestDiary', () => {
    it('removes diary and decrements usageCount', async () => {
      await useGuestStore.getState().createGuestDiary('To delete');

      const diaryId = useGuestStore.getState().diaries[0].id;
      useGuestStore.getState().deleteGuestDiary(diaryId);

      const state = useGuestStore.getState();
      expect(state.diaries).toHaveLength(0);
      expect(state.usageCount).toBe(0);
    });

    it('does not reduce usageCount below 0', () => {
      useGuestStore.setState({
        diaries: [{ id: 'g1', content: 'x', title: 'x', emotion: 'neutral', language_score: 50, ai_summary: '', created_at: '', expires_at: '' }],
        usageCount: 0,
      });

      useGuestStore.getState().deleteGuestDiary('g1');
      expect(useGuestStore.getState().usageCount).toBe(0);
    });

    it('only removes the targeted diary', () => {
      const futureExpiry = new Date(Date.now() + 60000).toISOString();
      const now = new Date().toISOString();

      useGuestStore.setState({
        diaries: [
          { id: 'g-delete', content: 'Delete', title: 'Delete', emotion: 'neutral', language_score: 50, ai_summary: '', created_at: now, expires_at: futureExpiry },
          { id: 'g-keep', content: 'Keep', title: 'Keep', emotion: 'neutral', language_score: 50, ai_summary: '', created_at: now, expires_at: futureExpiry },
        ],
        usageCount: 2,
      });

      useGuestStore.getState().deleteGuestDiary('g-delete');

      const state = useGuestStore.getState();
      expect(state.diaries).toHaveLength(1);
      expect(state.diaries[0].content).toBe('Keep');
      expect(state.usageCount).toBe(1);
    });
  });

  // ---- getGuestDiaries ----

  describe('getGuestDiaries', () => {
    it('returns the diaries array', async () => {
      await useGuestStore.getState().createGuestDiary('Test');

      const diaries = useGuestStore.getState().getGuestDiaries();
      expect(diaries).toHaveLength(1);
      expect(diaries[0].content).toBe('Test');
    });

    it('returns empty array when no diaries', () => {
      expect(useGuestStore.getState().getGuestDiaries()).toEqual([]);
    });
  });

  // ---- clearGuestData ----

  describe('clearGuestData', () => {
    it('resets all state to defaults', async () => {
      await useGuestStore.getState().createGuestDiary('Test');
      useGuestStore.getState().setGuestMode(true);

      useGuestStore.getState().clearGuestData();

      const state = useGuestStore.getState();
      expect(state.diaries).toEqual([]);
      expect(state.usageCount).toBe(0);
      expect(state.isGuestMode).toBe(false);
      expect(state.aiUsageCount).toBe(0);
    });
  });

  // ---- cleanExpiredDiaries ----

  describe('cleanExpiredDiaries', () => {
    it('removes expired diaries', () => {
      const pastExpiry = new Date(Date.now() - 60000).toISOString();
      const futureExpiry = new Date(Date.now() + 60000).toISOString();

      useGuestStore.setState({
        diaries: [
          { id: 'g1', content: 'expired', title: 'x', emotion: 'neutral', language_score: 50, ai_summary: '', created_at: '', expires_at: pastExpiry },
          { id: 'g2', content: 'valid', title: 'x', emotion: 'neutral', language_score: 50, ai_summary: '', created_at: '', expires_at: futureExpiry },
        ],
        usageCount: 2,
      });

      useGuestStore.getState().cleanExpiredDiaries();

      const state = useGuestStore.getState();
      expect(state.diaries).toHaveLength(1);
      expect(state.diaries[0].id).toBe('g2');
      expect(state.usageCount).toBe(1);
    });

    it('keeps all diaries when none are expired', () => {
      const futureExpiry = new Date(Date.now() + 60000).toISOString();

      useGuestStore.setState({
        diaries: [
          { id: 'g1', content: 'a', title: 'x', emotion: 'neutral', language_score: 50, ai_summary: '', created_at: '', expires_at: futureExpiry },
          { id: 'g2', content: 'b', title: 'x', emotion: 'neutral', language_score: 50, ai_summary: '', created_at: '', expires_at: futureExpiry },
        ],
        usageCount: 2,
      });

      useGuestStore.getState().cleanExpiredDiaries();

      expect(useGuestStore.getState().diaries).toHaveLength(2);
      expect(useGuestStore.getState().usageCount).toBe(2);
    });

    it('removes all diaries when all are expired', () => {
      const pastExpiry = new Date(Date.now() - 60000).toISOString();

      useGuestStore.setState({
        diaries: [
          { id: 'g1', content: 'a', title: 'x', emotion: 'neutral', language_score: 50, ai_summary: '', created_at: '', expires_at: pastExpiry },
          { id: 'g2', content: 'b', title: 'x', emotion: 'neutral', language_score: 50, ai_summary: '', created_at: '', expires_at: pastExpiry },
        ],
        usageCount: 2,
      });

      useGuestStore.getState().cleanExpiredDiaries();

      expect(useGuestStore.getState().diaries).toHaveLength(0);
      expect(useGuestStore.getState().usageCount).toBe(0);
    });

    it('does not reduce usageCount below 0', () => {
      const pastExpiry = new Date(Date.now() - 60000).toISOString();

      useGuestStore.setState({
        diaries: [
          { id: 'g1', content: 'a', title: 'x', emotion: 'neutral', language_score: 50, ai_summary: '', created_at: '', expires_at: pastExpiry },
        ],
        usageCount: 0,
      });

      useGuestStore.getState().cleanExpiredDiaries();

      expect(useGuestStore.getState().usageCount).toBe(0);
    });

    it('handles empty diary list', () => {
      useGuestStore.getState().cleanExpiredDiaries();
      expect(useGuestStore.getState().diaries).toEqual([]);
      expect(useGuestStore.getState().usageCount).toBe(0);
    });
  });

  // ---- localStorage persistence ----

  describe('persistence', () => {
    it('persists state to localStorage under correct key', async () => {
      await useGuestStore.getState().createGuestDiary('Persist test');

      const stored = localStorageMap.get('guest-diary-storage');
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.diaries).toHaveLength(1);
      expect(parsed.state.usageCount).toBe(1);
      expect(parsed.state.isGuestMode).toBeDefined();
      expect(parsed.state.aiUsageCount).toBeDefined();
      // maxDiaries should NOT be persisted (not in partialize)
      expect(parsed.state.maxDiaries).toBeUndefined();
    });
  });
});
