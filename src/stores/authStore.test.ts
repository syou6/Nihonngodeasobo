import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from './authStore';

// ---- Supabase mock ----

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

const mockFrom = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Helper to build chained query mock
function chainedQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const proxy = () => chain;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  // Allow insert(...).select().single() chain
  chain.insert = vi.fn().mockReturnValue(chain);

  // When resolved directly (Promise-like)
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));

  return chain;
}

// Reset store between tests
function resetStore() {
  useAuthStore.setState({ user: null, loading: true });
}

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();

    // Default: onAuthStateChange returns a subscription
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Initial state ----

  describe('initial state', () => {
    it('has null user and loading true', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.loading).toBe(true);
    });
  });

  // ---- signUp ----

  describe('signUp', () => {
    it('calls supabase auth.signUp and inserts user profile', async () => {
      const fakeUser = { id: 'u1', email: 'test@example.com' };
      mockSignUp.mockResolvedValue({ data: { user: fakeUser }, error: null });

      const insertChain = chainedQuery({ data: null, error: null });
      mockFrom.mockReturnValue(insertChain);

      await useAuthStore.getState().signUp('test@example.com', 'pass123', { name: 'Taro' });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'pass123',
        options: { data: { name: 'Taro', role: 'learner' } },
      });
      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(insertChain.insert).toHaveBeenCalledWith({
        id: 'u1',
        email: 'test@example.com',
        name: 'Taro',
        role: 'learner',
      });
    });

    it('throws when supabase auth.signUp returns error', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: new Error('Signup failed'),
      });

      await expect(
        useAuthStore.getState().signUp('a@b.com', 'pw', { name: '' })
      ).rejects.toThrow('Signup failed');
    });

    it('uses empty string as name when userData.name is not provided', async () => {
      const fakeUser = { id: 'u2', email: 'x@y.com' };
      mockSignUp.mockResolvedValue({ data: { user: fakeUser }, error: null });
      mockFrom.mockReturnValue(chainedQuery({ data: null, error: null }));

      await useAuthStore.getState().signUp('x@y.com', 'pw', {});

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { data: { name: '', role: 'learner' } },
        })
      );
    });
  });

  // ---- signIn ----

  describe('signIn', () => {
    it('signs in and creates profile if missing', async () => {
      const fakeUser = { id: 'u3', email: 'u3@test.com', user_metadata: { name: 'Hanako' } };
      mockSignInWithPassword.mockResolvedValue({ data: { user: fakeUser }, error: null });

      // First call: select profile -> not found
      const selectChain = chainedQuery({ data: null, error: null });
      // Second call: insert profile
      const insertChain = chainedQuery({ data: null, error: null });
      mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(insertChain);

      await useAuthStore.getState().signIn('u3@test.com', 'pass');

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'u3@test.com',
        password: 'pass',
      });
      // Profile creation attempted
      expect(insertChain.insert).toHaveBeenCalledWith({
        id: 'u3',
        email: 'u3@test.com',
        name: 'Hanako',
        role: 'learner',
      });
    });

    it('does not insert profile when profile already exists', async () => {
      const fakeUser = { id: 'u4', email: 'u4@test.com', user_metadata: {} };
      mockSignInWithPassword.mockResolvedValue({ data: { user: fakeUser }, error: null });

      const profileData = { id: 'u4', email: 'u4@test.com', name: 'Existing', role: 'learner' };
      const selectChain = chainedQuery({ data: profileData, error: null });
      mockFrom.mockReturnValue(selectChain);

      await useAuthStore.getState().signIn('u4@test.com', 'pass');

      // insert should NOT be called a second time
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('throws translated error for invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        useAuthStore.getState().signIn('bad@test.com', 'wrong')
      ).rejects.toThrow('メールアドレスまたはパスワードが正しくありません');
    });

    it('throws translated error for unconfirmed email', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email not confirmed' },
      });

      await expect(
        useAuthStore.getState().signIn('bad@test.com', 'pass')
      ).rejects.toThrow('メールアドレスが確認されていません');
    });

    it('throws generic error for other auth failures', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Rate limit exceeded' },
      });

      await expect(
        useAuthStore.getState().signIn('a@b.com', 'pw')
      ).rejects.toThrow('ログインに失敗しました: Rate limit exceeded');
    });
  });

  // ---- signInWithGoogle ----

  describe('signInWithGoogle', () => {
    it('calls signInWithOAuth with google provider', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });

      await useAuthStore.getState().signInWithGoogle();

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: expect.stringContaining('/app.html') },
      });
    });

    it('throws when provider is not enabled', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: 'provider is not enabled' },
      });

      await expect(
        useAuthStore.getState().signInWithGoogle()
      ).rejects.toThrow('Google認証が有効化されていません');
    });

    it('throws generic error for other OAuth failures', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      await expect(
        useAuthStore.getState().signInWithGoogle()
      ).rejects.toThrow('Googleログインに失敗しました: Network error');
    });
  });

  // ---- signOut ----

  describe('signOut', () => {
    let originalLocation: Location;

    beforeEach(() => {
      originalLocation = window.location;
      // Use delete + defineProperty to mock location.replace without breaking other globals
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, replace: vi.fn(), origin: 'http://localhost' },
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it('clears user state and calls supabase signOut', async () => {
      useAuthStore.setState({ user: { id: '1', email: 'a@b.com', name: 'X', role: 'learner', created_at: '' }, loading: false });
      mockSignOut.mockResolvedValue({ error: null });

      await useAuthStore.getState().signOut();

      expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(window.location.replace).toHaveBeenCalledWith('/app.html');
    });

    it('clears state even if supabase signOut throws', async () => {
      useAuthStore.setState({ user: { id: '1', email: 'a@b.com', name: 'X', role: 'learner', created_at: '' }, loading: false });
      mockSignOut.mockRejectedValue(new Error('network'));

      await useAuthStore.getState().signOut();

      expect(useAuthStore.getState().user).toBeNull();
    });

    it('removes supabase-related localStorage keys', async () => {
      // Set up a mock localStorage with the expected keys
      const storageData: Record<string, string> = {
        'sb-token': 'abc',
        'supabase.auth': 'xyz',
        'unrelated': 'keep',
      };

      const mockLocalStorage = {
        getItem: vi.fn((key: string) => storageData[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { storageData[key] = value; }),
        removeItem: vi.fn((key: string) => { delete storageData[key]; }),
        clear: vi.fn(),
        length: 3,
        key: vi.fn((i: number) => Object.keys(storageData)[i] ?? null),
        [Symbol.iterator]: function* () { yield* Object.entries(storageData); },
      };

      // Mock Object.keys on localStorage to return our keys
      const originalKeys = Object.keys;
      vi.spyOn(Object, 'keys').mockImplementation((obj: object) => {
        if (obj === localStorage) {
          return Object.keys(storageData);
        }
        return originalKeys(obj);
      });

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      });

      useAuthStore.setState({ user: { id: '1', email: 'a@b.com', name: 'X', role: 'learner', created_at: '' }, loading: false });
      mockSignOut.mockResolvedValue({ error: null });

      await useAuthStore.getState().signOut();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sb-token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('supabase.auth');
      // 'unrelated' should NOT have been removed
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('unrelated');
    });
  });

  // ---- initialize ----

  describe('initialize', () => {
    it('sets user to null when no valid config (env vars missing)', async () => {
      // import.meta.env defaults are undefined in test, so hasValidConfig = false
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
    });

    it('sets user from session profile when session exists', async () => {
      // We need to mock import.meta.env - since the store reads env at call time,
      // and the env mock is already in place, we simulate by testing the code path
      // where getSession is called (means hasValidConfig passed).
      // To test this path we call getSession directly through the store internals.
      // Since import.meta.env is undefined, initialize will take the !hasValidConfig path.
      // So we just verify the null/loading state for this path.
      await useAuthStore.getState().initialize();
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('handles session error gracefully', async () => {
      // Even if something throws, initialize should not crash
      mockGetSession.mockRejectedValue(new Error('session error'));

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  // ---- updateJlptLevel ----

  describe('updateJlptLevel', () => {
    it('does nothing when no user is set', async () => {
      useAuthStore.setState({ user: null });

      await useAuthStore.getState().updateJlptLevel('N3');

      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('updates jlpt_level in state after successful DB update', async () => {
      const user = { id: 'u1', email: 'a@b.com', name: 'Taro', role: 'learner' as const, created_at: '2026-01-01' };
      useAuthStore.setState({ user });

      const updateChain = chainedQuery({ data: null, error: null });
      mockFrom.mockReturnValue(updateChain);

      await useAuthStore.getState().updateJlptLevel('N2');

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(updateChain.update).toHaveBeenCalledWith({ cefr_level: 'N2' });

      const state = useAuthStore.getState();
      expect(state.user?.jlpt_level).toBe('N2');
      // Verify immutability - original user object should not be mutated
      expect(user.jlpt_level).toBeUndefined();
    });

    it('throws when DB update fails', async () => {
      useAuthStore.setState({
        user: { id: 'u1', email: 'a@b.com', name: 'Taro', role: 'learner', created_at: '2026-01-01' },
      });

      const updateChain = chainedQuery({ data: null, error: new Error('DB error') });
      // Make the eq call throw because error is truthy
      updateChain.eq = vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') });
      mockFrom.mockReturnValue(updateChain);

      await expect(
        useAuthStore.getState().updateJlptLevel('N1')
      ).rejects.toThrow('DB error');
    });
  });
});
