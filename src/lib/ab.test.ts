import { describe, it, expect, beforeEach } from 'vitest';
import { getVariant } from './ab';

describe('getVariant', () => {
  beforeEach(() => localStorage.clear());

  it('assigns one of the given variants and persists it', () => {
    const v = getVariant('exp1', ['a', 'b'] as const);
    expect(['a', 'b']).toContain(v);
    expect(localStorage.getItem('ab:exp1')).toBe(v);
  });

  it('returns the same variant on subsequent calls', () => {
    const first = getVariant('exp1', ['a', 'b'] as const);
    for (let i = 0; i < 10; i++) {
      expect(getVariant('exp1', ['a', 'b'] as const)).toBe(first);
    }
  });

  it('re-assigns when the stored value is no longer a valid variant', () => {
    localStorage.setItem('ab:exp1', 'stale');
    const v = getVariant('exp1', ['a', 'b'] as const);
    expect(['a', 'b']).toContain(v);
  });

  it('keeps experiments independent', () => {
    localStorage.setItem('ab:exp1', 'a');
    localStorage.setItem('ab:exp2', 'b');
    expect(getVariant('exp1', ['a', 'b'] as const)).toBe('a');
    expect(getVariant('exp2', ['a', 'b'] as const)).toBe('b');
  });
});
