import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // re-ask at most once per 7 days

interface FeedbackPromptStore {
  isOpen: boolean;
  context: string;
  lastShownAt: number | null;
  hasSubmitted: boolean;

  /** Open the prompt if the user hasn't submitted and isn't in cooldown. */
  request: (context: string) => void;
  close: () => void;
  markSubmitted: () => void;
}

export const useFeedbackPromptStore = create<FeedbackPromptStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      context: '',
      lastShownAt: null,
      hasSubmitted: false,

      request: (context: string) => {
        const { isOpen, hasSubmitted, lastShownAt } = get();
        if (isOpen || hasSubmitted) return;
        if (lastShownAt && Date.now() - lastShownAt < COOLDOWN_MS) return;
        set({ isOpen: true, context, lastShownAt: Date.now() });
      },

      close: () => set({ isOpen: false }),

      markSubmitted: () => set({ isOpen: false, hasSubmitted: true }),
    }),
    {
      name: 'feedback-prompt',
      partialize: (s) => ({ lastShownAt: s.lastShownAt, hasSubmitted: s.hasSubmitted }),
    }
  )
);
