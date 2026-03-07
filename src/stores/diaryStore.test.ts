import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDiaryStore } from './diaryStore';

// ---- Mock external dependencies ----

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();
const mockFunctionsInvoke = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: (...args: unknown[]) => mockStorageFrom(...args),
    },
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  },
}));

vi.mock('../lib/gemini', () => ({
  analyzeText: vi.fn().mockResolvedValue({
    summary: 'AI summary',
    keywords: ['test'],
    emotion: 'neutral',
    language_score: 80,
    grammar_errors: 0,
    jlpt_estimated_level: 'N4',
    summary_en: 'AI summary EN',
  }),
  generateSummary: vi.fn().mockResolvedValue('Generated summary'),
}));

vi.mock('../lib/gemini-feedback', () => ({
  generateJapaneseFeedback: vi.fn().mockResolvedValue({
    jlptLevel: 'N4',
    targetLevel: 'N3',
    markdownContent: 'Feedback content',
    summary: 'Feedback summary',
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}));

// Helper to build chained query mock
function chainedQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(resolve(result)));
  return chain;
}

function resetStore() {
  useDiaryStore.setState({
    entries: [],
    loading: false,
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    currentAudio: null,
  });
}

describe('diaryStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Initial state ----

  describe('initial state', () => {
    it('has empty entries and loading false after reset', () => {
      const state = useDiaryStore.getState();
      expect(state.entries).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.isRecording).toBe(false);
      expect(state.mediaRecorder).toBeNull();
      expect(state.audioChunks).toEqual([]);
      expect(state.currentAudio).toBeNull();
    });
  });

  // ---- fetchEntries ----

  describe('fetchEntries', () => {
    it('sets entries to empty and loading false when no user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await useDiaryStore.getState().fetchEntries();

      const state = useDiaryStore.getState();
      expect(state.entries).toEqual([]);
      expect(state.loading).toBe(false);
    });

    it('fetches own diaries for a regular user', async () => {
      const fakeUser = { id: 'u1' };
      mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

      const diaries = [
        { id: 'd1', user_id: 'u1', content: 'Hello', created_at: '2026-01-01' },
      ];
      const relChain = chainedQuery({ data: [], error: null });
      const diaryChain = chainedQuery({ data: diaries, error: null });

      // First from('family_relationships'), then from('diaries')
      mockFrom.mockReturnValueOnce(relChain).mockReturnValueOnce(diaryChain);

      await useDiaryStore.getState().fetchEntries();

      const state = useDiaryStore.getState();
      expect(state.entries).toEqual(diaries);
      expect(state.loading).toBe(false);
    });

    it('fetches connected learner diaries for a teacher', async () => {
      const fakeUser = { id: 'teacher1' };
      mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

      const relationships = [
        { teacher_id: 'teacher1', learner_id: 'student1' },
      ];
      const diaries = [
        { id: 'd1', user_id: 'teacher1', content: 'Teacher diary' },
      ];
      const allDiaries = [
        { id: 'd1', user_id: 'teacher1', content: 'Teacher diary' },
        { id: 'd2', user_id: 'student1', content: 'Student diary' },
      ];

      const relChain = chainedQuery({ data: relationships, error: null });
      const ownDiaryChain = chainedQuery({ data: diaries, error: null });
      const allDiaryChain = chainedQuery({ data: allDiaries, error: null });

      mockFrom
        .mockReturnValueOnce(relChain)
        .mockReturnValueOnce(ownDiaryChain)
        .mockReturnValueOnce(allDiaryChain);

      await useDiaryStore.getState().fetchEntries();

      const state = useDiaryStore.getState();
      expect(state.entries).toEqual(allDiaries);
      expect(state.loading).toBe(false);
    });

    it('shows toast error when fetch fails', async () => {
      mockGetUser.mockRejectedValue(new Error('Network error'));
      const { toast } = await import('sonner');

      await useDiaryStore.getState().fetchEntries();

      expect(toast.error).toHaveBeenCalledWith('Failed to load diary. Please try again.');
      expect(useDiaryStore.getState().loading).toBe(false);
    });

    it('sets loading to true while fetching and false when done', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const promise = useDiaryStore.getState().fetchEntries();
      // loading is set synchronously at the start
      expect(useDiaryStore.getState().loading).toBe(true);

      await promise;
      expect(useDiaryStore.getState().loading).toBe(false);
    });
  });

  // ---- createEntry ----

  describe('createEntry', () => {
    it('throws when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      await expect(
        useDiaryStore.getState().createEntry('Hello')
      ).rejects.toThrow('ログインが必要です');
    });

    it('throws when auth returns error', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      });

      await expect(
        useDiaryStore.getState().createEntry('Hello')
      ).rejects.toThrow('認証エラー');
    });

    it('saves diary entry and returns inserted data', async () => {
      const fakeUser = { id: 'u1' };
      mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

      const insertedDiary = { id: 'diary1', user_id: 'u1', content: 'My diary' };
      const insertChain = chainedQuery({ data: insertedDiary, error: null });
      // For the main insert, then fetchEntries calls, then background AI calls
      mockFrom.mockReturnValue(insertChain);

      // Mock fetchEntries side-effect (getUser again)
      mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

      const result = await useDiaryStore.getState().createEntry('My diary');

      expect(result).toEqual(insertedDiary);
      expect(mockFrom).toHaveBeenCalledWith('diaries');
    });

    it('throws with detailed error when diary insert fails', async () => {
      const fakeUser = { id: 'u1' };
      mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

      const insertChain = chainedQuery({ data: null, error: { message: 'RLS violation' } });
      mockFrom.mockReturnValue(insertChain);

      await expect(
        useDiaryStore.getState().createEntry('Content')
      ).rejects.toThrow('日記の保存に失敗');
    });

    it('truncates title to 50 characters', async () => {
      const fakeUser = { id: 'u1' };
      mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

      const longContent = 'A'.repeat(100);
      const insertChain = chainedQuery({ data: { id: 'diary2' }, error: null });
      mockFrom.mockReturnValue(insertChain);

      await useDiaryStore.getState().createEntry(longContent);

      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'A'.repeat(50),
        })
      );
    });
  });

  // ---- deleteEntry ----

  describe('deleteEntry', () => {
    it('performs soft delete and removes entry from state', async () => {
      const entries = [
        { id: 'd1', user_id: 'u1', content: 'Entry 1', created_at: '2026-01-01', tags: [], visibility: 'shared' as const },
        { id: 'd2', user_id: 'u1', content: 'Entry 2', created_at: '2026-01-02', tags: [], visibility: 'shared' as const },
      ];
      useDiaryStore.setState({ entries });

      const updateChain = chainedQuery({ data: [{ id: 'd1' }], error: null });
      mockFrom.mockReturnValue(updateChain);

      await useDiaryStore.getState().deleteEntry('d1');

      expect(mockFrom).toHaveBeenCalledWith('diaries');
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
          delete_after: expect.any(String),
        })
      );

      const state = useDiaryStore.getState();
      expect(state.entries).toHaveLength(1);
      expect(state.entries[0].id).toBe('d2');
    });

    it('throws when supabase update fails', async () => {
      useDiaryStore.setState({
        entries: [{ id: 'd1', user_id: 'u1', content: 'X', created_at: '', tags: [], visibility: 'shared' as const }],
      });

      const updateChain = chainedQuery({ data: null, error: new Error('Permission denied') });
      // Make the chain resolve with error at the select step
      updateChain.select = vi.fn().mockResolvedValue({ data: null, error: new Error('Permission denied') });
      mockFrom.mockReturnValue(updateChain);

      await expect(
        useDiaryStore.getState().deleteEntry('d1')
      ).rejects.toThrow('Permission denied');
    });

    it('does not modify state when entry id does not exist in local state', async () => {
      const entries = [
        { id: 'd1', user_id: 'u1', content: 'Entry', created_at: '', tags: [], visibility: 'shared' as const },
      ];
      useDiaryStore.setState({ entries });

      const updateChain = chainedQuery({ data: [], error: null });
      mockFrom.mockReturnValue(updateChain);

      await useDiaryStore.getState().deleteEntry('nonexistent');

      // d1 should remain
      expect(useDiaryStore.getState().entries).toHaveLength(1);
    });
  });

  // ---- clearRecording ----

  describe('clearRecording', () => {
    it('resets recording state', () => {
      useDiaryStore.setState({
        currentAudio: new Blob(['audio']),
        audioChunks: [new Blob(['chunk'])],
        isRecording: true,
      });

      useDiaryStore.getState().clearRecording();

      const state = useDiaryStore.getState();
      expect(state.currentAudio).toBeNull();
      expect(state.audioChunks).toEqual([]);
      expect(state.isRecording).toBe(false);
      expect(state.mediaRecorder).toBeNull();
    });
  });

  // ---- notifyConnectedUsers ----

  describe('notifyConnectedUsers', () => {
    it('does nothing when no relationships exist', async () => {
      const relChain = chainedQuery({ data: [], error: null });
      mockFrom.mockReturnValue(relChain);

      await useDiaryStore.getState().notifyConnectedUsers('u1', 'Taro');

      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    });

    it('sends notification to connected users', async () => {
      const relationships = [
        { teacher_id: 'teacher1', learner_id: 'u1' },
      ];

      const relChain = chainedQuery({ data: relationships, error: null });
      mockFrom.mockReturnValue(relChain);
      mockFunctionsInvoke.mockResolvedValue({ data: null, error: null });

      await useDiaryStore.getState().notifyConnectedUsers('u1', 'Taro');

      expect(mockFunctionsInvoke).toHaveBeenCalledWith('send-push-notification', {
        body: expect.objectContaining({
          userId: 'teacher1',
          type: 'new_diary',
        }),
      });
    });

    it('does not throw when notification fails', async () => {
      const relationships = [{ teacher_id: 't1', learner_id: 'u1' }];
      const relChain = chainedQuery({ data: relationships, error: null });
      mockFrom.mockReturnValue(relChain);
      mockFunctionsInvoke.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(
        useDiaryStore.getState().notifyConnectedUsers('u1', 'Taro')
      ).resolves.toBeUndefined();
    });
  });
});
