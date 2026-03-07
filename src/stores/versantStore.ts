import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { generatePracticeFeedback, generatePracticeSampleAnswer } from '../lib/gemini-feedback';
import { DEFAULT_JLPT_LEVEL, PRACTICE, API, DATA_LIMITS } from '../lib/constants';
import type { JLPTLevel } from '../lib/constants';
import type { VersantQuestion } from '../lib/versant-questions';

export interface VersantFeedback {
  jlptLevel: JLPTLevel;
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
        let userJlptLevel: JLPTLevel = DEFAULT_JLPT_LEVEL;
        try {
          // Get user's JLPT level
          if (user) {
            const { data: profile } = await supabase
              .from('users')
              .select('jlpt_level')
              .eq('id', user.id)
              .single();
            userJlptLevel = (profile?.jlpt_level as JLPTLevel) || DEFAULT_JLPT_LEVEL;
          }

          // Generate feedback based on the question type
          const feedbackPrompt = currentQuestion.part === 'E'
            ? `ユーザーは次の文章を要約するよう求められました:\n「${currentQuestion.text}」\n\nユーザーの要約:\n「${transcribedText}」`
            : `ユーザーは次の質問に答えるよう求められました: 「${currentQuestion.text}」\n\nユーザーの回答:\n「${transcribedText}」`;

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
            jlptLevel: userJlptLevel,
            targetLevel: userJlptLevel,
            markdownContent: '## 💪 励まし\nよく頑張りました！日本語スピーキングの練習を続けましょう。'
          };
          const defaultSampleAnswer = currentQuestion.part === 'E'
            ? 'この文章は主なテーマについて述べており、重要な情報が含まれています。話者はいくつかの重要なポイントを挙げています。'
            : 'この質問について、私はいくつかの観点から考えました。まず、メリットがあります。また、課題もあります。全体的には、状況によって異なると思います。';

          // Generate feedback and sample answer in parallel with timeout
          const [aiFeedback, sampleAnswer] = await Promise.all([
            withTimeout(generatePracticeFeedback(feedbackPrompt, currentQuestion.part, userJlptLevel), API.TIMEOUT_MS, defaultFeedback),
            withTimeout(generatePracticeSampleAnswer(currentQuestion.text, currentQuestion.part, userJlptLevel), API.TIMEOUT_MS, defaultSampleAnswer)
          ]);

          // Parse markdown content for feedback
          const encouragementMatch = aiFeedback.markdownContent.match(/## 💪 励まし\n([\s\S]*?)(?=##|$)/);
          const advice = encouragementMatch
            ? encouragementMatch[1].trim()
            : '練習を続けましょう！日本語が上達しています。';

          feedback = {
            jlptLevel: aiFeedback.jlptLevel as JLPTLevel,
            score: PRACTICE.DEFAULT_SCORE,
            advice,
            sampleAnswer,
            grammarNotes: [],
            vocabularyTips: []
          };
        } catch (feedbackError) {
          feedback = {
            jlptLevel: userJlptLevel,
            score: PRACTICE.DEFAULT_SCORE,
            advice: 'よく頑張りました！日本語スピーキングの練習を続けましょう。',
            sampleAnswer: currentQuestion.part === 'E'
              ? 'この文章は主なテーマについて述べており、重要な情報が含まれています。'
              : 'この質問は重要なテーマだと思います。いくつかの観点から考えることが大切です。',
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
        } catch { /* ignored */ }
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
        } catch { /* ignored */ }
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
        .limit(DATA_LIMITS.JLPT_HISTORY_FETCH);

      if (error) throw error;

      const answers: VersantAnswer[] = (data || []).map(row => ({
        id: row.id,
        questionId: row.question_id,
        part: row.part as 'E' | 'F',
        question: {
          id: row.question_id,
          part: row.part as 'E' | 'F',
          text: '',
          timeLimit: row.part === 'E' ? PRACTICE.PART_E.TIME_LIMIT : PRACTICE.PART_F.TIME_LIMIT
        },
        transcribedText: row.transcribed_text,
        audioUrl: row.audio_url,
        feedback: row.feedback as VersantFeedback | undefined,
        createdAt: row.created_at
      }));

      set({ answers, loading: false });
    } catch (error) {
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
