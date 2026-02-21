import { describe, it, expect } from 'vitest';
import { EN } from './en';

describe('i18n/en', () => {
  it('has app name', () => {
    expect(EN.app.name).toBe('English AI Diary');
  });

  it('has all navigation items', () => {
    expect(EN.nav.home).toBeDefined();
    expect(EN.nav.record).toBeDefined();
    expect(EN.nav.diary).toBeDefined();
    expect(EN.nav.practice).toBeDefined();
    expect(EN.nav.settings).toBeDefined();
  });

  it('has all CEFR level labels', () => {
    const levels = ['A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C1+'];
    for (const level of levels) {
      expect(EN.cefr).toHaveProperty(level);
    }
  });

  it('has versant section with Part E and Part F', () => {
    expect(EN.versant.partE.title).toBeDefined();
    expect(EN.versant.partE.description).toBeDefined();
    expect(EN.versant.partE.instructions).toBeDefined();
    expect(EN.versant.partF.title).toBeDefined();
    expect(EN.versant.partF.description).toBeDefined();
    expect(EN.versant.partF.instructions).toBeDefined();
  });

  it('has versant UI strings', () => {
    expect(EN.versant.result).toBeDefined();
    expect(EN.versant.yourResponse).toBeDefined();
    expect(EN.versant.sampleAnswer).toBeDefined();
    expect(EN.versant.grammarNotes).toBeDefined();
    expect(EN.versant.vocabularyTips).toBeDefined();
    expect(EN.versant.tryAnother).toBeDefined();
    expect(EN.versant.stopRecording).toBeDefined();
    expect(EN.versant.analyzing).toBeDefined();
  });

  it('has versant tips as array', () => {
    expect(Array.isArray(EN.versant.tips)).toBe(true);
    expect(EN.versant.tips.length).toBeGreaterThan(0);
  });

  it('has recording strings', () => {
    expect(EN.recording.title).toBeDefined();
    expect(EN.recording.startButton).toBeDefined();
    expect(EN.recording.stopButton).toBeDefined();
    expect(EN.recording.save).toBeDefined();
  });

  it('has common strings', () => {
    expect(EN.common.loading).toBeDefined();
    expect(EN.common.error).toBeDefined();
    expect(EN.common.cancel).toBeDefined();
    expect(EN.common.save).toBeDefined();
  });

  it('has error strings', () => {
    expect(EN.errors.generic).toBeDefined();
    expect(EN.errors.network).toBeDefined();
  });

  it('has no empty string values in top-level keys', () => {
    for (const [key, value] of Object.entries(EN)) {
      if (typeof value === 'string') {
        expect(value.length, `EN.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });
});
