/**
 * Application-wide constants
 * Centralized configuration to avoid hardcoded values throughout the codebase.
 */

// --- CEFR Level ---

export type CEFRLevel = 'A1' | 'A1+' | 'A2' | 'A2+' | 'B1' | 'B1+' | 'B2' | 'B2+' | 'C1' | 'C1+';

export const DEFAULT_CEFR_LEVEL: CEFRLevel = 'B1';

export const CEFR_LEVEL_PROGRESSION: Record<CEFRLevel, CEFRLevel> = {
  'A1': 'A1+',
  'A1+': 'A2',
  'A2': 'A2+',
  'A2+': 'B1',
  'B1': 'B1+',
  'B1+': 'B2',
  'B2': 'B2+',
  'B2+': 'C1',
  'C1': 'C1+',
  'C1+': 'C1+'
};

export function getNextCefrLevel(level: CEFRLevel): CEFRLevel {
  return CEFR_LEVEL_PROGRESSION[level] || 'B1+';
}

// --- Versant Practice ---

export const VERSANT = {
  PART_E: {
    TIME_LIMIT: 30,
    TTS_RATE: 0.85,
    WORD_COUNT: '60-80',
    RECORDING_DELAY_MS: 1000,
  },
  PART_F: {
    TIME_LIMIT: 40,
    TTS_RATE: 0.9,
    WORD_COUNT: '80-100',
    RECORDING_DELAY_MS: 500,
  },
  DEFAULT_SCORE: 70,
  TIMER_WARNING_THRESHOLD: 10,
} as const;

// --- API ---

export const API = {
  TIMEOUT_MS: 30000,
  UPLOAD_TIMEOUT_MS: 90000,
  TOKEN_ESTIMATION_DIVISOR: 3,
  TOKEN_BASE_FEEDBACK: 200,
  TOKEN_BASE_SAMPLE: 100,
  TOKEN_BASE_ANALYSIS: 50,
} as const;

// --- Score Thresholds ---

export const SCORE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60,
} as const;

export const CEFR_COLORS: Record<string, string> = {
  'A1': 'bg-gray-100 text-gray-700',
  'A1+': 'bg-gray-200 text-gray-800',
  'A2': 'bg-blue-100 text-blue-700',
  'A2+': 'bg-blue-200 text-blue-800',
  'B1': 'bg-green-100 text-green-700',
  'B1+': 'bg-green-200 text-green-800',
  'B2': 'bg-yellow-100 text-yellow-700',
  'B2+': 'bg-yellow-200 text-yellow-800',
  'C1': 'bg-orange-100 text-orange-700',
  'C1+': 'bg-purple-100 text-purple-700',
};

export function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return 'text-green-600 bg-green-100';
  if (score >= SCORE_THRESHOLDS.MEDIUM) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

export function getCefrColor(level: string): string {
  return CEFR_COLORS[level] || 'bg-gray-100 text-gray-700';
}

// --- Storage ---

export const STORAGE = {
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  TRASH_RETENTION_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  GUEST_DIARY_EXPIRY_MS: 30 * 60 * 1000, // 30 minutes
  CLIPBOARD_FEEDBACK_MS: 2000,
} as const;

// --- Data Limits ---

export const DATA_LIMITS = {
  INITIAL_DIARY_FETCH: 10,
  EXTENDED_DIARY_FETCH: 50,
  VERSANT_HISTORY_FETCH: 50,
  MAX_KEYWORDS: 3,
  DEFAULT_HEALTH_SCORE: 75,
} as const;
