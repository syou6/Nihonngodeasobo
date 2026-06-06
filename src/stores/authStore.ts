import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import type { JLPTLevel } from '../lib/constants';
import { signupLimiter } from '../lib/rate-limiter';

// Module-level variable to track auth subscription (prevents duplicate listeners)
let authSubscription: { unsubscribe: () => void } | null = null;

interface AuthStore {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  updateJlptLevel: (level: JLPTLevel) => Promise<void>;
  updateName: (name: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,

  signUp: async (email: string, password: string, userData: Partial<User>) => {
    try {
      if (!signupLimiter.canProceed()) {
        const cooldown = Math.ceil(signupLimiter.getRemainingCooldown() / 60000);
        throw new Error(`Sign-up is rate-limited. Please try again in ${cooldown} minute(s).`);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name || '',
            role: 'learner' // デフォルトでlearnerに設定
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name: userData.name || '',
            role: 'learner'
          });

        if (profileError) {
        }

        signupLimiter.recordAction();
      }
    } catch (error) {
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect email or password');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Email not verified. Please check your inbox.');
        }
        throw new Error(`Login failed: ${error.message}`);
      }

      // ログイン成功後、ユーザープロファイルが存在するか確認
      if (data.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!profile) {
          // プロファイルがない場合は作成
          await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              name: data.user.user_metadata?.name || '',
              role: 'learner'
            });
        }
      }
    } catch (error: any) {
      throw error;
    }
  },

  signInWithGoogle: async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app.html`,
        },
      });

      if (error) {
        if (error.message?.includes('provider is not enabled')) {
          throw new Error('Google sign-in is not enabled. Please contact the administrator.');
        }
        throw new Error(`Google sign-in failed: ${error.message}`);
      }
    } catch (error: any) {
      throw error;
    }
  },

  signOut: async () => {
    // Unsubscribe auth listener first to prevent interference
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch { /* ignored */ }

    // Always clear state and storage, regardless of signOut result
    set({ user: null, loading: false });

    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('supabase')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
    } catch (e) {
      // Storage operations might fail in some environments
    }

    // Force full page reload to clear any in-memory state
    window.location.replace('/app.html');
  },

  initialize: async () => {
    // Safety net: never let the initial loading screen hang on a slow network or
    // a stalled users query. After 5s, drop the spinner and let the app proceed;
    // the session/profile still populates once the awaits resolve.
    setTimeout(() => set({ loading: false }), 5000);
    try {
      // 環境変数が設定されていない場合はゲストモードで開始
      const hasValidConfig = import.meta.env.VITE_SUPABASE_URL && 
        import.meta.env.VITE_SUPABASE_ANON_KEY &&
        import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_url' &&
        import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key';

      if (!hasValidConfig) {
        set({ user: null, loading: false });
        return Promise.resolve();
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      // Clear OAuth tokens from URL hash after Supabase has processed them
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      if (sessionError) {
        set({ user: null, loading: false });
        return;
      }

      if (session?.user) {
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (userProfile) {
          set({ user: userProfile, loading: false });
        } else if (!error || error.code === 'PGRST116') {
          // Profile doesn't exist yet — create it
          const newUserProfile = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || '',
            role: session.user.user_metadata?.role || 'learner',
          };

          const { data: createdProfile } = await supabase
            .from('users')
            .insert(newUserProfile)
            .select()
            .single();

          set({ user: createdProfile || newUserProfile, loading: false });
        } else {
          // RLS/auth not ready yet (e.g. 406 during OAuth callback)
          // onAuthStateChange will handle it once the session is fully established
          set({ user: null, loading: false });
        }
      } else {
        set({ user: null, loading: false });
      }

      // Unsubscribe previous listener to prevent duplicates
      if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (userProfile) {
            set({ user: userProfile });
          } else if (!error || error.code === 'PGRST116') {
            // Profile doesn't exist yet — create it
            const newUserProfile = {
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.name || '',
              role: session.user.user_metadata?.role || 'learner',
            };

            const { data: createdProfile } = await supabase
              .from('users')
              .insert(newUserProfile)
              .select()
              .single();

            set({ user: createdProfile || newUserProfile });
          }
        } else {
          set({ user: null });
        }
      });
      authSubscription = subscription;
    } catch (error) {
      set({ user: null, loading: false });
      return Promise.resolve(); // エラーでもPromiseを返す
    }
  },

  updateJlptLevel: async (level: JLPTLevel) => {
    const user = get().user;
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ jlpt_level: level, cefr_level: level })
        .eq('id', user.id);

      if (error) throw error;

      set({ user: { ...user, jlpt_level: level } });
    } catch (error) {
      throw error;
    }
  },

  updateName: async (name: string) => {
    const user = get().user;
    if (!user) return;

    const trimmedName = name.trim();
    if (!trimmedName) return;

    const { error } = await supabase
      .from('users')
      .update({ name: trimmedName })
      .eq('id', user.id);

    if (error) throw error;

    set({ user: { ...user, name: trimmedName } });
  },
}));