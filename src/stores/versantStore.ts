import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { generateVersantFeedback, generateVersantSampleAnswer } from '../lib/gemini-feedback';
import { DEFAULT_CEFR_LEVEL, VERSANT, API, DATA_LIMITS } from '../lib/constants';
import type { CEFRLevel } from '../lib/constants';
import type { VersantQuestion } from '../lib/versant-questions';

export interface VersantFeedback {
  cefrLevel: CEFRLevel;
  score: number;
  advice: string;
  sampleAnswer: string;
  grammarNotes: string[];
  vocabularyTips: string[];
}

export interface VersantAnswer {
  id: string;
  questionId: string;
  part: 'E' | 'F';
  question: VersantQuestion;
  transcribedText: string;
  audioUrl?: string;
  feedback?: VersantFeedback;
  createdAt: string;
}

interface VersantStore {
  // State
  currentQuestion: VersantQuestion | null;
  isRecording: boolean;
  isPracticing: boolean;
  timeRemaining: number;
  answers: VersantAnswer[];
  loading: boolean;

  // Actions
  setCurrentQuestion: (question: VersantQuestion | null) => void;
  startPractice: (question: VersantQuestion) => void;
  stopPractice: () => void;
  setTimeRemaining: (time: number) => void;
  saveAnswer: (questionId: string, transcribedText: string, audioBlob?: Blob) => Promise<VersantAnswer>;
  fetchHistory: () => Promise<void>;
  clearCurrentSession: () => void;
}

export const useVersantStore = create<VersantStore>((set, get) => ({
  currentQuestion: null,
  isRecording: false,
  isPracticing: false,
  timeRemaining: 0,
  answers: [],
  loading: false,

  setCurrentQuestion: (question) => {
    set({ currentQuestion: question });
  },

  startPractice: (question) => {
    set({
      currentQuestion: question,
      isPracticing: true,
      isRecording: false,
      timeRemaining: question.timeLimit
    });
  },

  stopPractice: () => {
    set({
      isPracticing: false,
      isRecording: false
    });
  },

  setTimeRemaining: (time) => {
    set({ timeRemaining: time });
  },

  saveAnswer: async (questionId: string, transcribedText: string, audioBlob?: Blob) => {
    const { currentQuestion } = get();
    if (!currentQuestion) {
      throw new Error('No current question');
    }

    set({ loading: true });

    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();

      // Generate feedback using Gemini
      let feedback: VersantFeedback | undefined;

      if (transcribedText.trim()) {
        let userCefrLevel: CEFRLevel = DEFAULT_CEFR_LEVEL;
        try {
          // Get user's CEFR level
          if (user) {
            const { data: profile } = await supabase
              .from('users')
              .select('cefr_level')
              .eq('id', user.id)
              .single();
            userCefrLevel = profile?.cefr_level || DEFAULT_CEFR_LEVEL;
          }

          // Generate feedback based on the question type
          const feedbackPrompt = currentQuestion.part === 'E'
            ? `The user was asked to summarize the following passage:\n"${currentQuestion.text}"\n\nTheir summary was:\n"${transcribedText}"`
            : `The user was asked: "${currentQuestion.text}"\n\nTheir response was:\n"${transcribedText}"`;

          // Timeout wrapper for API calls
          const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
            return Promise.race([
              promise,
              new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error('API timeout')), timeoutMs)
              )
            ]).catch(() => fallback);
          };

          // Default fallback values
          const defaultFeedback = {
            cefrLevel: userCefrLevel,
            targetLevel: userCefrLevel,
            markdownContent: '## 💪 Encouragement\nGreat effort! Keep practicing your English speaking skills.'
          };
          const defaultSampleAnswer = currentQuestion.part === 'E'
            ? 'The passage discusses the main topic and provides key information. The speaker mentions several important points that support the central idea.'
            : 'In my opinion, this is an important topic. I believe we should consider multiple perspectives. First, there are benefits to consider. Additionally, there may be challenges. Overall, it depends on individual circumstances.';

          // Generate feedback and sample answer in parallel with timeout
          const [aiFeedback, sampleAnswer] = await Promise.all([
            withTimeout(generateVersantFeedback(feedbackPrompt, currentQuestion.part, userCefrLevel), API.TIMEOUT_MS, defaultFeedback),
            withTimeout(generateVersantSampleAnswer(currentQuestion.text, currentQuestion.part, userCefrLevel), API.TIMEOUT_MS, defaultSampleAnswer)
          ]);

          // Parse markdown content for Versant-specific feedback
          const encouragementMatch = aiFeedback.markdownContent.match(/## 💪 Encouragement\n([\s\S]*?)(?=##|$)/);
          const advice = encouragementMatch
            ? encouragementMatch[1].trim()
            : 'Keep practicing! Your English is improving.';

          feedback = {
            cefrLevel: aiFeedback.cefrLevel,
            score: VERSANT.DEFAULT_SCORE,
            advice,
            sampleAnswer,
            grammarNotes: [],
            vocabularyTips: []
          };
        } catch (feedbackError) {
          console.error('Failed to generate feedback:', feedbackError);
          feedback = {
            cefrLevel: userCefrLevel,
            score: VERSANT.DEFAULT_SCORE,
            advice: 'Great effort! Keep practicing your English speaking skills.',
            sampleAnswer: currentQuestion.part === 'E'
              ? 'The passage discusses the main topic and provides key information.'
              : 'In my opinion, this is an important topic to consider.',
            grammarNotes: [],
            vocabularyTips: []
          };
        }
      }

      // Upload audio if provided
      let audioUrl: string | undefined;
      if (audioBlob && user) {
        try {
          const fileName = `${user.id}/versant_${Date.now()}.webm`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('voice-recordings')
            .upload(fileName, audioBlob, {
              contentType: 'audio/webm'
            });

          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('voice-recordings')
              .getPublicUrl(fileName);
            audioUrl = publicUrl;
          }
        } catch (uploadError) {
          console.error('Failed to upload audio:', uploadError);
        }
      }

      // Create answer object
      const answer: VersantAnswer = {
        id: crypto.randomUUID(),
        questionId,
        part: currentQuestion.part,
        question: currentQuestion,
        transcribedText,
        audioUrl,
        feedback,
        createdAt: new Date().toISOString()
      };

      // Save to database if user is logged in
      if (user) {
        try {
          await supabase
            .from('versant_answers')
            .insert({
              id: answer.id,
              user_id: user.id,
              question_id: questionId,
              part: currentQuestion.part,
              transcribed_text: transcribedText,
              audio_url: audioUrl,
              feedback: feedback,
              created_at: answer.createdAt
            });
        } catch (dbError) {
          console.error('Failed to save to database:', dbError);
        }
      }

      // Update local state
      set(state => ({
        answers: [answer, ...state.answers],
        loading: false,
        isPracticing: false
      }));

      return answer;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  fetchHistory: async () => {
    set({ loading: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ answers: [], loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('versant_answers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(DATA_LIMITS.VERSANT_HISTORY_FETCH);

      if (error) throw error;

      const answers: VersantAnswer[] = (data || []).map(row => ({
        id: row.id,
        questionId: row.question_id,
        part: row.part as 'E' | 'F',
        question: {
          id: row.question_id,
          part: row.part as 'E' | 'F',
          text: '',
          timeLimit: row.part === 'E' ? VERSANT.PART_E.TIME_LIMIT : VERSANT.PART_F.TIME_LIMIT
        },
        transcribedText: row.transcribed_text,
        audioUrl: row.audio_url,
        feedback: row.feedback as VersantFeedback | undefined,
        createdAt: row.created_at
      }));

      set({ answers, loading: false });
    } catch (error) {
      console.error('Failed to fetch history:', error);
      set({ loading: false });
    }
  },

  clearCurrentSession: () => {
    set({
      currentQuestion: null,
      isPracticing: false,
      isRecording: false,
      timeRemaining: 0
    });
  }
}));
