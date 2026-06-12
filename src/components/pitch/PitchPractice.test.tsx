import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PitchPractice } from './PitchPractice';

// Fixed accent data so the component has a word + expected pattern to score against.
vi.mock('../../hooks/usePitchAccent', () => ({
  usePitchAccent: () => ({
    morae: ['は', 'し'],
    pattern: [0, 1],
    patternName: '平板',
    reading: 'はし',
  }),
}));

// Deterministic scorer.
vi.mock('../../lib/pitch-analyzer', () => ({
  comparePitchToPattern: () => ({ matches: [true, true], accuracy: 92 }),
}));

// Fake PitchTracker: start() is a no-op, stop() returns one voiced frame.
const trackerStart = vi.fn();
const trackerStop = vi.fn(() => [{ time: 0, pitch: 120, clarity: 0.9 }]);
vi.mock('../../lib/pitch-tracker', () => ({
  PitchTracker: class {
    start = trackerStart;
    stop = trackerStop;
  },
}));

describe('PitchPractice', () => {
  beforeEach(() => {
    trackerStart.mockClear();
    trackerStop.mockClear();
    // Grant a fake mic stream.
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
  });

  it('shows the target word and a record control', () => {
    render(<PitchPractice onBack={vi.fn()} />);
    expect(screen.getByText('Pitch Trainer')).toBeInTheDocument();
    expect(screen.getByText('Record & say it')).toBeInTheDocument();
  });

  it('records, scores, and shows the result with retry/next', async () => {
    render(<PitchPractice onBack={vi.fn()} />);

    fireEvent.click(screen.getByText('Record & say it'));

    // Mic acquired and tracker started.
    await waitFor(() => expect(trackerStart).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Stop'));

    // Score from the mocked comparator is rendered (now in the "92% native" bar).
    expect(await screen.findByText((_, el) => el?.textContent?.replace(/\s/g, '') === '92%native')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(trackerStop).toHaveBeenCalled();
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    render(<PitchPractice onBack={onBack} />);
    fireEvent.click(screen.getByLabelText('Back'));
    expect(onBack).toHaveBeenCalled();
  });
});
