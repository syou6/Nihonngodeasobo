import { describe, it, expect } from 'vitest';
import {
  partEQuestions,
  partFQuestions,
  getRandomQuestion,
  getQuestionsByPart,
  getQuestionById,
} from './versant-questions';
import { VERSANT } from './constants';

describe('versant-questions', () => {
  describe('partEQuestions', () => {
    it('has questions', () => {
      expect(partEQuestions.length).toBeGreaterThan(0);
    });

    it('all questions have part E', () => {
      for (const q of partEQuestions) {
        expect(q.part).toBe('E');
      }
    });

    it('all questions have correct time limit', () => {
      for (const q of partEQuestions) {
        expect(q.timeLimit).toBe(VERSANT.PART_E.TIME_LIMIT);
      }
    });

    it('all questions have a CEFR level', () => {
      for (const q of partEQuestions) {
        expect(q.cefrLevel).toBeDefined();
      }
    });

    it('all questions have unique IDs', () => {
      const ids = partEQuestions.map(q => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all questions have non-empty text', () => {
      for (const q of partEQuestions) {
        expect(q.text.length).toBeGreaterThan(0);
      }
    });
  });

  describe('partFQuestions', () => {
    it('has questions', () => {
      expect(partFQuestions.length).toBeGreaterThan(0);
    });

    it('all questions have part F', () => {
      for (const q of partFQuestions) {
        expect(q.part).toBe('F');
      }
    });

    it('all questions have correct time limit', () => {
      for (const q of partFQuestions) {
        expect(q.timeLimit).toBe(VERSANT.PART_F.TIME_LIMIT);
      }
    });

    it('all questions have unique IDs', () => {
      const ids = partFQuestions.map(q => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getRandomQuestion', () => {
    it('returns Part E question', () => {
      const q = getRandomQuestion('E');
      expect(q.part).toBe('E');
    });

    it('returns Part F question', () => {
      const q = getRandomQuestion('F');
      expect(q.part).toBe('F');
    });

    it('filters by CEFR level for Part E', () => {
      const q = getRandomQuestion('E', 'A1');
      expect(q.part).toBe('E');
      // A1 level should get A1 questions
      expect(q.cefrLevel).toBe('A1');
    });

    it('excludes specified question ID', () => {
      const first = getRandomQuestion('F');
      // Run multiple times to verify exclusion works
      let gotDifferent = false;
      for (let i = 0; i < 20; i++) {
        const next = getRandomQuestion('F', undefined, first.id);
        if (next.id !== first.id) {
          gotDifferent = true;
          break;
        }
      }
      expect(gotDifferent).toBe(true);
    });
  });

  describe('getQuestionsByPart', () => {
    it('returns Part E questions', () => {
      const questions = getQuestionsByPart('E');
      expect(questions).toBe(partEQuestions);
    });

    it('returns Part F questions', () => {
      const questions = getQuestionsByPart('F');
      expect(questions).toBe(partFQuestions);
    });
  });

  describe('getQuestionById', () => {
    it('finds existing question', () => {
      const q = getQuestionById('f1');
      expect(q).toBeDefined();
      expect(q?.id).toBe('f1');
    });

    it('returns undefined for non-existent ID', () => {
      const q = getQuestionById('nonexistent');
      expect(q).toBeUndefined();
    });
  });
});
