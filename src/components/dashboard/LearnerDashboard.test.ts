import { describe, it } from 'vitest';

// LearnerDashboard unit testing is blocked by a vitest module resolution issue:
// The component's deep dependency chain (diaryStore -> gemini -> supabase,
// plus lucide-react 29MB, date-fns 38MB, framer-motion) causes the vitest
// worker to hang/OOM during jsdom environment setup, even with comprehensive
// vi.mock() calls for all direct and transitive dependencies.
//
// Approaches attempted:
// 1. Static imports (.tsx) with vi.mock() -- hangs during module resolution
// 2. Dynamic imports (.ts) with await import() -- OOM (4GB+ heap exhausted)
// 3. require() in .ts -- cannot resolve .tsx extensions
// 4. Mocking @supabase/supabase-js + all transitive deps -- still hangs
// 5. Increased heap to 8GB -- still OOM
//
// These tests should be covered by Playwright E2E tests instead.
// See: src/components/auth/AuthForm.test.tsx for a working component test pattern.

describe('LearnerDashboard', () => {
  it.todo('renders time-of-day greeting (Good morning/afternoon/evening)');
  it.todo('renders formatted date');
  it.todo('shows first-time user guide when no diary entries exist');
  it.todo('renders quick action cards (Record diary, View Past Diaries)');
  it.todo('renders today summary section (Speaking Score, Mood, Comments)');
  it.todo('shows usage banner with limits for free users');
  it.todo('hides usage banner for premium users');
  it.todo('shows no messages placeholder when no teacher comments');
  it.todo('displays recent teacher comments when available');
  it.todo('calls fetchEntries on mount when user is logged in');
  it.todo('fetches weather data on mount');
  it.todo('navigates to record view when Record Now is clicked');
  it.todo('navigates to diary view when View Past Diaries is clicked');
});
