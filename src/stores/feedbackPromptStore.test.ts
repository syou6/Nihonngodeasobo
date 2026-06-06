import { describe, it, expect, beforeEach } from 'vitest';
import { useFeedbackPromptStore } from './feedbackPromptStore';

const reset = () =>
  useFeedbackPromptStore.setState({
    isOpen: false,
    context: '',
    lastShownAt: null,
    hasSubmitted: false,
  });

describe('feedbackPromptStore', () => {
  beforeEach(reset);

  it('opens on request when eligible', () => {
    useFeedbackPromptStore.getState().request('post-ai-feedback');
    const s = useFeedbackPromptStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.context).toBe('post-ai-feedback');
    expect(s.lastShownAt).not.toBeNull();
  });

  it('does not open again within the 7-day cooldown', () => {
    useFeedbackPromptStore.getState().request('a');
    useFeedbackPromptStore.getState().close();
    useFeedbackPromptStore.getState().request('b');
    expect(useFeedbackPromptStore.getState().isOpen).toBe(false);
  });

  it('does not open once the user has submitted', () => {
    useFeedbackPromptStore.getState().markSubmitted();
    useFeedbackPromptStore.getState().request('x');
    const s = useFeedbackPromptStore.getState();
    expect(s.hasSubmitted).toBe(true);
    expect(s.isOpen).toBe(false);
  });

  it('reopens after the cooldown has elapsed', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    useFeedbackPromptStore.setState({ lastShownAt: eightDaysAgo });
    useFeedbackPromptStore.getState().request('again');
    expect(useFeedbackPromptStore.getState().isOpen).toBe(true);
  });

  it('close() hides without marking submitted', () => {
    useFeedbackPromptStore.getState().request('x');
    useFeedbackPromptStore.getState().close();
    expect(useFeedbackPromptStore.getState().isOpen).toBe(false);
    expect(useFeedbackPromptStore.getState().hasSubmitted).toBe(false);
  });
});
