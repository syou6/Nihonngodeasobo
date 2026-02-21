import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CEFR_LEVEL,
  CEFR_LEVEL_PROGRESSION,
  getNextCefrLevel,
  VERSANT,
  API,
  SCORE_THRESHOLDS,
  getScoreColor,
  getCefrColor,
  STORAGE,
  DATA_LIMITS,
} from './constants';

describe('constants', () => {
  describe('CEFR Level', () => {
    it('DEFAULT_CEFR_LEVEL is B1', () => {
      expect(DEFAULT_CEFR_LEVEL).toBe('B1');
    });

    it('CEFR_LEVEL_PROGRESSION covers all levels', () => {
      const levels = ['A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C1+'];
      for (const level of levels) {
        expect(CEFR_LEVEL_PROGRESSION).toHaveProperty(level);
      }
    });

    it('getNextCefrLevel returns correct next level', () => {
      expect(getNextCefrLevel('A1')).toBe('A1+');
      expect(getNextCefrLevel('B1')).toBe('B1+');
      expect(getNextCefrLevel('C1+')).toBe('C1+');
    });

    it('getNextCefrLevel falls back for unknown level', () => {
      expect(getNextCefrLevel('X' as any)).toBe('B1+');
    });
  });

  describe('VERSANT config', () => {
    it('Part E has 30 second time limit', () => {
      expect(VERSANT.PART_E.TIME_LIMIT).toBe(30);
    });

    it('Part F has 40 second time limit', () => {
      expect(VERSANT.PART_F.TIME_LIMIT).toBe(40);
    });

    it('has default score', () => {
      expect(VERSANT.DEFAULT_SCORE).toBe(70);
    });

    it('has timer warning threshold', () => {
      expect(VERSANT.TIMER_WARNING_THRESHOLD).toBe(10);
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

  describe('getCefrColor', () => {
    it('returns correct color for each level', () => {
      expect(getCefrColor('A1')).toContain('gray');
      expect(getCefrColor('B1')).toContain('green');
      expect(getCefrColor('C1')).toContain('orange');
    });

    it('returns fallback for unknown level', () => {
      expect(getCefrColor('X')).toContain('gray');
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
