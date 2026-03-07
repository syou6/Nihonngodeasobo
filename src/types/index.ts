export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'learner' | 'teacher';
  avatar_url?: string;
  jlpt_level?: JLPTLevel;
  created_at: string;
}

// Markdown形式のフィードバック
export interface JapaneseFeedback {
  jlptLevel: JLPTLevel;
  targetLevel: JLPTLevel;
  markdownContent: string;
}

export interface AnalyzeResult {
  summary: string;
  summary_en: string;
  emotion: 'happy' | 'excited' | 'neutral' | 'tired' | 'sad' | 'anxious';
  language_score: number;
  grammar_errors: number;
  jlpt_estimated_level: string;
  keywords: string[];
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  voice_url?: string;
  duration?: number;
  emotion?: string;
  language_score?: number;
  grammar_errors?: number;
  jlpt_estimated_level?: string;
  weather?: string;
  tags: string[];
  visibility: 'private' | 'shared' | 'custom';
  ai_summary?: string;
  ai_summary_en?: string;
  ai_feedback?: JapaneseFeedback;
  created_at: string;
  user?: User;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  diary_id: string;
  user_id: string;
  content: string;
  voice_url?: string;
  created_at: string;
  user?: User;
}

