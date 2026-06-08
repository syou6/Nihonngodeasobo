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
    localStorage.clear();
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
    expect(screen.getByText('Pitch Accent Practice')).toBeInTheDocument();
    expect(screen.getByText('Record & say it')).toBeInTheDocument();
  });

  it('records, scores, and shows the result with retry/next', async () => {
    render(<PitchPractice onBack={vi.fn()} />);

    fireEvent.click(screen.getByText('Record & say it'));

    // Mic acquired and tracker started.
    await waitFor(() => expect(trackerStart).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Stop'));

    // Score from the mocked comparator is rendered.
    expect(await screen.findByText('92')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(trackerStop).toHaveBeenCalled();
  });

  it('marks a word mastered after a high score and tracks progress', async () => {
    render(<PitchPractice onBack={vi.fn()} />);
    // Starts with nothing mastered.
    expect(screen.getByText(/✓ 0\//)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Record & say it'));
    await waitFor(() => expect(trackerStart).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Stop'));

    // Mocked score is 92 (≥80) → the word counts as mastered.
    expect(await screen.findByText('92')).toBeInTheDocument();
    expect(screen.getByText(/✓ 1\//)).toBeInTheDocument();
  });

  it('shows the live "match the bands" contour while recording', async () => {
    render(<PitchPractice onBack={vi.fn()} />);

    fireEvent.click(screen.getByText('Record & say it'));

    await waitFor(() => expect(trackerStart).toHaveBeenCalled());
    expect(
      await screen.findByText('Recording — match the shaded bands'),
    ).toBeInTheDocument();
  });

  it('shows a session summary with stats after finishing', async () => {
    render(<PitchPractice onBack={vi.fn()} />);

    fireEvent.click(screen.getByText('Record & say it'));
    await waitFor(() => expect(trackerStart).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Stop'));
    await screen.findByText('92');

    fireEvent.click(screen.getByText('Finish session'));

    expect(await screen.findByText('Session complete')).toBeInTheDocument();
    expect(screen.getByText('Share my progress')).toBeInTheDocument();
    expect(screen.getByText('Keep practicing')).toBeInTheDocument();
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    render(<PitchPractice onBack={onBack} />);
    fireEvent.click(screen.getByLabelText('Back'));
    expect(onBack).toHaveBeenCalled();
  });
});
