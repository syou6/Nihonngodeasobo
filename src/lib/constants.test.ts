import { describe, it, expect } from 'vitest';
import {
  DEFAULT_JLPT_LEVEL,
  JLPT_LEVEL_PROGRESSION,
  getNextJlptLevel,
  PRACTICE,
  API,
  SCORE_THRESHOLDS,
  getScoreColor,
  getJlptColor,
  STORAGE,
  DATA_LIMITS,
} from './constants';

describe('constants', () => {
  describe('JLPT Level', () => {
    it('DEFAULT_JLPT_LEVEL is N4', () => {
      expect(DEFAULT_JLPT_LEVEL).toBe('N4');
    });

    it('JLPT_LEVEL_PROGRESSION covers all levels', () => {
      const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
      for (const level of levels) {
        expect(JLPT_LEVEL_PROGRESSION).toHaveProperty(level);
      }
    });

    it('getNextJlptLevel returns correct next level', () => {
      expect(getNextJlptLevel('N5')).toBe('N4');
      expect(getNextJlptLevel('N4')).toBe('N3');
      expect(getNextJlptLevel('N1')).toBe('N1');
    });

    it('getNextJlptLevel falls back for unknown level', () => {
      expect(getNextJlptLevel('X' as any)).toBe('N3');
    });
  });

  describe('PRACTICE config', () => {
    it('Part E has 30 second time limit', () => {
      expect(PRACTICE.PART_E.TIME_LIMIT).toBe(30);
    });

    it('Part F has 40 second time limit', () => {
      expect(PRACTICE.PART_F.TIME_LIMIT).toBe(40);
    });

    it('has default score', () => {
      expect(PRACTICE.DEFAULT_SCORE).toBe(70);
    });

    it('has timer warning threshold', () => {
      expect(PRACTICE.TIMER_WARNING_THRESHOLD).toBe(10);
    });
  });

  describe('API config', () => {
    it('has timeout values', () => {
      expect(API.TIMEOUT_MS).toBeGreaterThan(0);
      expect(API.UPLOAD_TIMEOUT_MS).toBeGreaterThan(API.TIMEOUT_MS);
    });

    it('has token estimation values', () => {
      expect(API.TOKEN_ESTIMATION_DIVISOR).toBeGreaterThan(0);
      expect(API.TOKEN_BASE_FEEDBACK).toBeGreaterThan(0);
      expect(API.TOKEN_BASE_SAMPLE).toBeGreaterThan(0);
    });
  });

  describe('getScoreColor', () => {
    it('returns green for high scores', () => {
      expect(getScoreColor(80)).toContain('green');
      expect(getScoreColor(100)).toContain('green');
    });

    it('returns yellow for medium scores', () => {
      expect(getScoreColor(60)).toContain('yellow');
      expect(getScoreColor(79)).toContain('yellow');
    });

    it('returns red for low scores', () => {
      expect(getScoreColor(0)).toContain('red');
      expect(getScoreColor(59)).toContain('red');
    });
  });

  describe('getJlptColor', () => {
    it('returns correct color for each level', () => {
      expect(getJlptColor('N5')).toContain('gray');
      expect(getJlptColor('N4')).toContain('blue');
      expect(getJlptColor('N3')).toContain('green');
      expect(getJlptColor('N2')).toContain('yellow');
      expect(getJlptColor('N1')).toContain('purple');
    });

    it('returns fallback for unknown level', () => {
      expect(getJlptColor('X')).toContain('gray');
    });
  });

  describe('STORAGE config', () => {
    it('has reasonable file size limit', () => {
      expect(STORAGE.MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024);
    });

    it('has trash retention of 30 days', () => {
      expect(STORAGE.TRASH_RETENTION_MS).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });

  describe('DATA_LIMITS', () => {
    it('has fetch limits', () => {
      expect(DATA_LIMITS.INITIAL_DIARY_FETCH).toBeGreaterThan(0);
      expect(DATA_LIMITS.EXTENDED_DIARY_FETCH).toBeGreaterThan(DATA_LIMITS.INITIAL_DIARY_FETCH);
    });

    it('has default health score', () => {
      expect(DATA_LIMITS.DEFAULT_HEALTH_SCORE).toBe(75);
    });
  });
});
