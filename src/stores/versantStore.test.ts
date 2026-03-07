import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVersantStore } from './versantStore';
import type { VersantQuestion } from '../lib/versant-questions';

// ---- Mock dependencies ----

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: (...args: unknown[]) => mockStorageFrom(...args),
    },
  },
}));

vi.mock('../lib/gemini-feedback', () => ({
  generatePracticeFeedback: vi.fn().mockResolvedValue({
    jlptLevel: 'N4',
    targetLevel: 'N3',
    markdownContent: '## 💪 励まし\nよく頑張りました！',
  }),
  generatePracticeSampleAnswer: vi.fn().mockResolvedValue('Sample answer text'),
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
  return chain;
}

const sampleQuestionE: VersantQuestion = {
  id: 'q1',
  part: 'E',
  text: 'Summarize this passage about Japanese culture.',
  timeLimit: 30,
};

const sampleQuestionF: VersantQuestion = {
  id: 'q2',
  part: 'F',
  text: 'What do you think about learning Japanese?',
  timeLimit: 40,
};

function resetStore() {
  useVersantStore.setState({
    currentQuestion: null,
    isRecording: false,
    isPracticing: false,
    timeRemaining: 0,
    answers: [],
    loading: false,
  });
}

describe('versantStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ---- Initial state ----

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useVersantStore.getState();
      expect(state.currentQuestion).toBeNull();
      expect(state.isRecording).toBe(false);
      expect(state.isPracticing).toBe(false);
      expect(state.timeRemaining).toBe(0);
      expect(state.answers).toEqual([]);
      expect(state.loading).toBe(false);
    });
  });

  // ---- setCurrentQuestion ----

  describe('setCurrentQuestion', () => {
    it('sets the current question', () => {
      useVersantStore.getState().setCurrentQuestion(sampleQuestionE);
      expect(useVersantStore.getState().currentQuestion).toEqual(sampleQuestionE);
    });

    it('clears the current question with null', () => {
      useVersantStore.setState({ currentQuestion: sampleQuestionE });
      useVersantStore.getState().setCurrentQuestion(null);
      expect(useVersantStore.getState().currentQuestion).toBeNull();
    });
  });

  // ---- startPractice ----

  describe('startPractice', () => {
    it('sets practice state with question and time limit', () => {
      useVersantStore.getState().startPractice(sampleQuestionE);

      const state = useVersantStore.getState();
      expect(state.currentQuestion).toEqual(sampleQuestionE);
      expect(state.isPracticing).toBe(true);
      expect(state.isRecording).toBe(false);
      expect(state.timeRemaining).toBe(30);
    });

    it('uses question timeLimit for Part F', () => {
      useVersantStore.getState().startPractice(sampleQuestionF);
      expect(useVersantStore.getState().timeRemaining).toBe(40);
    });
  });

  // ---- stopPractice ----

  describe('stopPractice', () => {
    it('stops practice and recording', () => {
      useVersantStore.setState({ isPracticing: true, isRecording: true });
      useVersantStore.getState().stopPractice();

      const state = useVersantStore.getState();
      expect(state.isPracticing).toBe(false);
      expect(state.isRecording).toBe(false);
    });
  });

  // ---- setTimeRemaining ----

  describe('setTimeRemaining', () => {
    it('updates time remaining', () => {
      useVersantStore.getState().setTimeRemaining(15);
      expect(useVersantStore.getState().timeRemaining).toBe(15);
    });

    it('can set to 0', () => {
      useVersantStore.setState({ timeRemaining: 30 });
      useVersantStore.getState().setTimeRemaining(0);
      expect(useVersantStore.getState().timeRemaining).toBe(0);
    });
  });

  // ---- clearCurrentSession ----

  describe('clearCurrentSession', () => {
    it('resets session-related state', () => {
      useVersantStore.setState({
        currentQuestion: sampleQuestionE,
        isPracticing: true,
        isRecording: true,
        timeRemaining: 20,
      });

      useVersantStore.getState().clearCurrentSession();

      const state = useVersantStore.getState();
      expect(state.currentQuestion).toBeNull();
      expect(state.isPracticing).toBe(false);
      expect(state.isRecording).toBe(false);
      expect(state.timeRemaining).toBe(0);
    });

    it('does not clear answers', () => {
      const fakeAnswer = {
        id: 'a1',
        questionId: 'q1',
        part: 'E' as const,
        question: sampleQuestionE,
        transcribedText: 'Hello',
        createdAt: '2026-01-01',
      };
      useVersantStore.setState({ answers: [fakeAnswer] });

      useVersantStore.getState().clearCurrentSession();

      expect(useVersantStore.getState().answers).toHaveLength(1);
    });
  });

  // ---- saveAnswer ----

  describe('saveAnswer', () => {
    it('throws when no current question is set', async () => {
      useVersantStore.setState({ currentQuestion: null });

      await expect(
        useVersantStore.getState().saveAnswer('q1', 'My answer')
      ).rejects.toThrow('No current question');
    });

    it('saves answer for logged-in user and returns answer object', async () => {
      useVersantStore.setState({ currentQuestion: sampleQuestionE });

      const fakeUser = { id: 'u1' };
      mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

      // Profile query for JLPT level
      const profileChain = chainedQuery({ data: { cefr_level: 'N3' }, error: null });
      // Insert query for versant_answers
      const insertChain = chainedQuery({ data: null, error: null });

      mockFrom.mockReturnValueOnce(profileChain).mockReturnValueOnce(insertChain);

      const answer = await useVersantStore.getState().saveAnswer('q1', 'My summary');

      expect(answer.id).toBe('test-uuid-1234');
      expect(answer.questionId).toBe('q1');
      expect(answer.part).toBe('E');
      expect(answer.transcribedText).toBe('My summary');
      expect(answer.feedback).toBeDefined();
      expect(answer.feedback?.jlptLevel).toBe('N4');
      expect(answer.feedback?.sampleAnswer).toBe('Sample answer text');

      // Verify state update
      const state = useVersantStore.getState();
      expect(state.answers).toHaveLength(1);
      expect(state.loading).toBe(false);
      expect(state.isPracticing).toBe(false);
    });

    it('saves answer for guest user (no DB insert)', async () => {
      useVersantStore.setState({ currentQuestion: sampleQuestionF });

      mockGetUser.mockResolvedValue({ data: { user: null } });

      const answer = await useVersantStore.getState().saveAnswer('q2', 'My opinion');

      expect(answer.part).toBe('F');
      expect(answer.transcribedText).toBe('My opinion');

      // Should not try to insert to DB
      expect(mockFrom).not.toHaveBeenCalledWith('versant_answers');
    });

    it('handles empty transcribed text (no feedback generated)', async () => {
      useVersantStore.setState({ currentQuestion: sampleQuestionE });
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const answer = await useVersantStore.getState().saveAnswer('q1', '   ');

      expect(answer.feedback).toBeUndefined();
    });

    it('sets loading true during save and false after', async () => {
      useVersantStore.setState({ currentQuestion: sampleQuestionE });
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const promise = useVersantStore.getState().saveAnswer('q1', 'Test');

      // Loading should be true during the save
      expect(useVersantStore.getState().loading).toBe(true);

      await promise;

      expect(useVersantStore.getState().loading).toBe(false);
    });

    it('resets loading on error', async () => {
      useVersantStore.setState({ currentQuestion: sampleQuestionE });
      mockGetUser.mockRejectedValue(new Error('Auth error'));

      await expect(
        useVersantStore.getState().saveAnswer('q1', 'Test')
      ).rejects.toThrow('Auth error');

      expect(useVersantStore.getState().loading).toBe(false);
    });

    it('prepends new answer to the answers list', async () => {
      const existingAnswer = {
        id: 'old',
        questionId: 'q0',
        part: 'E' as const,
        question: sampleQuestionE,
        transcribedText: 'Old',
        createdAt: '2026-01-01',
      };
      useVersantStore.setState({
        currentQuestion: sampleQuestionE,
        answers: [existingAnswer],
      });

      mockGetUser.mockResolvedValue({ data: { user: null } });

      await useVersantStore.getState().saveAnswer('q1', 'New answer');

      const answers = useVersantStore.getState().answers;
      expect(answers).toHaveLength(2);
      expect(answers[0].transcribedText).toBe('New answer');
      expect(answers[1].transcribedText).toBe('Old');
    });
  });

  // ---- fetchHistory ----

  describe('fetchHistory', () => {
    it('sets empty answers when no user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await useVersantStore.getState().fetchHistory();

      const state = useVersantStore.getState();
      expect(state.answers).toEqual([]);
      expect(state.loading).toBe(false);
    });

    it('fetches and maps history data', async () => {
      const fakeUser = { id: 'u1' };
      mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

      const dbRows = [
        {
          id: 'a1',
          question_id: 'q1',
          part: 'E',
          transcribed_text: 'Summary text',
          audio_url: 'https://storage/audio.webm',
          feedback: { score: 70, advice: 'Good' },
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'a2',
          question_id: 'q2',
          part: 'F',
          transcribed_text: 'Opinion text',
          audio_url: null,
          feedback: null,
          created_at: '2026-01-02T00:00:00Z',
        },
      ];

      const queryChain = chainedQuery({ data: dbRows, error: null });
      mockFrom.mockReturnValue(queryChain);

      await useVersantStore.getState().fetchHistory();

      const state = useVersantStore.getState();
      expect(state.answers).toHaveLength(2);

      expect(state.answers[0].id).toBe('a1');
      expect(state.answers[0].part).toBe('E');
      expect(state.answers[0].transcribedText).toBe('Summary text');
      expect(state.answers[0].audioUrl).toBe('https://storage/audio.webm');
      expect(state.answers[0].question.timeLimit).toBe(30); // PRACTICE.PART_E.TIME_LIMIT

      expect(state.answers[1].id).toBe('a2');
      expect(state.answers[1].part).toBe('F');
      expect(state.answers[1].question.timeLimit).toBe(40); // PRACTICE.PART_F.TIME_LIMIT

      expect(state.loading).toBe(false);
    });

    it('handles DB error gracefully', async () => {
      const fakeUser = { id: 'u1' };
      mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

      const queryChain = chainedQuery({ data: null, error: null });
      queryChain.limit = vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') });
      mockFrom.mockReturnValue(queryChain);

      // Should not throw
      await useVersantStore.getState().fetchHistory();

      expect(useVersantStore.getState().loading).toBe(false);
    });

    it('sets loading true during fetch', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const promise = useVersantStore.getState().fetchHistory();
      expect(useVersantStore.getState().loading).toBe(true);

      await promise;
      expect(useVersantStore.getState().loading).toBe(false);
    });

    it('handles null data as empty array', async () => {
      const fakeUser = { id: 'u1' };
      mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

      const queryChain = chainedQuery({ data: null, error: null });
      mockFrom.mockReturnValue(queryChain);

      await useVersantStore.getState().fetchHistory();

      expect(useVersantStore.getState().answers).toEqual([]);
    });
  });
});
