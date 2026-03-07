import { describe, it, expect } from 'vitest';
import { colors, getFeatureColor, buttonStyles } from './colorPalette';

describe('colors', () => {
  it('has home colors with all variants', () => {
    expect(colors.home.light).toBeDefined();
    expect(colors.home.base).toBeDefined();
    expect(colors.home.dark).toBeDefined();
    expect(colors.home.darker).toBeDefined();
  });

  it('has record colors with all variants', () => {
    expect(colors.record.light).toBeDefined();
    expect(colors.record.base).toBeDefined();
    expect(colors.record.dark).toBeDefined();
    expect(colors.record.darker).toBeDefined();
  });

  it('has play colors with all variants', () => {
    expect(colors.play.light).toBeDefined();
    expect(colors.play.base).toBeDefined();
    expect(colors.play.dark).toBeDefined();
    expect(colors.play.darker).toBeDefined();
  });

  it('has ui colors', () => {
    expect(colors.ui.success).toBeDefined();
    expect(colors.ui.warning).toBeDefined();
    expect(colors.ui.danger).toBeDefined();
    expect(colors.ui.info).toBeDefined();
    expect(colors.ui.neutral).toBeDefined();
  });

  it('has text colors', () => {
    expect(colors.text.primary).toBe('#000000');
    expect(colors.text.onDark).toBe('#ffffff');
  });

  it('has background colors', () => {
    expect(colors.background.primary).toBe('#ffffff');
    expect(colors.background.secondary).toBeDefined();
    expect(colors.background.tertiary).toBeDefined();
  });

  it('all color values are valid hex colors', () => {
    const hexPattern = /^#[0-9a-f]{6}$/i;
    const allColors = [
      ...Object.values(colors.home),
      ...Object.values(colors.record),
      ...Object.values(colors.play),
      ...Object.values(colors.ui),
      ...Object.values(colors.text),
      ...Object.values(colors.background),
    ];
    for (const color of allColors) {
      expect(color).toMatch(hexPattern);
    }
  });
});

describe('getFeatureColor', () => {
  it('returns base variant by default', () => {
    expect(getFeatureColor('home')).toBe(colors.home.base);
    expect(getFeatureColor('record')).toBe(colors.record.base);
    expect(getFeatureColor('play')).toBe(colors.play.base);
  });

  it('returns specified variant', () => {
    expect(getFeatureColor('home', 'light')).toBe(colors.home.light);
    expect(getFeatureColor('record', 'dark')).toBe(colors.record.dark);
    expect(getFeatureColor('play', 'darker')).toBe(colors.play.darker);
  });
});

describe('buttonStyles', () => {
  it('has active and inactive states for all features', () => {
    for (const feature of ['home', 'record', 'play'] as const) {
      expect(buttonStyles[feature].active).toBeDefined();
      expect(buttonStyles[feature].inactive).toBeDefined();
      expect(buttonStyles[feature].active.backgroundColor).toBeDefined();
      expect(buttonStyles[feature].active.borderColor).toBeDefined();
      expect(buttonStyles[feature].active.color).toBeDefined();
      expect(buttonStyles[feature].inactive.backgroundColor).toBeDefined();
      expect(buttonStyles[feature].inactive.borderColor).toBeDefined();
      expect(buttonStyles[feature].inactive.color).toBeDefined();
    }
  });

  it('active buttons use dark variant colors', () => {
    expect(buttonStyles.home.active.backgroundColor).toBe(colors.home.dark);
    expect(buttonStyles.record.active.backgroundColor).toBe(colors.record.dark);
    expect(buttonStyles.play.active.backgroundColor).toBe(colors.play.dark);
  });

  it('inactive buttons use light variant colors', () => {
    expect(buttonStyles.home.inactive.backgroundColor).toBe(colors.home.light);
    expect(buttonStyles.record.inactive.backgroundColor).toBe(colors.record.light);
    expect(buttonStyles.play.inactive.backgroundColor).toBe(colors.play.light);
  });

  it('active buttons have white text', () => {
    expect(buttonStyles.home.active.color).toBe(colors.text.onDark);
    expect(buttonStyles.record.active.color).toBe(colors.text.onDark);
    expect(buttonStyles.play.active.color).toBe(colors.text.onDark);
  });
});
