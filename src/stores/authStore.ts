import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import type { JLPTLevel } from '../lib/constants';

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
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,

  signUp: async (email: string, password: string, userData: Partial<User>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name || '',
            role: 'parent' // デフォルトでparentに設定
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
            role: 'parent'
          });

        if (profileError) {
          console.warn('プロファイル作成エラー（自動作成されます）:', profileError);
        }
      }
    } catch (error) {
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      console.log('ログイン試行:', { email, url: window.location.origin });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('ログインエラー詳細:', {
          error,
          message: error.message,
          status: error.status,
          name: error.name
        });
        
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('メールアドレスまたはパスワードが正しくありません');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('メールアドレスが確認されていません。メールを確認してください。');
        }
        throw new Error(`ログインに失敗しました: ${error.message}`);
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
              role: 'parent'
            });
        }
      }
    } catch (error: any) {
      throw error;
    }
  },

  signInWithGoogle: async () => {
    try {
      console.log('Googleログイン開始:', {
        redirectTo: `${window.location.origin}/`,
        origin: window.location.origin
      });
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error('Googleログインエラー詳細:', {
          error,
          message: error.message,
          code: error.code,
          details: error
        });
        
        if (error.message?.includes('provider is not enabled')) {
          throw new Error('Google認証が有効化されていません。管理者に連絡してください。');
        }
        throw new Error(`Googleログインに失敗しました: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Googleログインエラー:', error);
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
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }

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
    window.location.replace('/');
  },

  initialize: async () => {
    try {
      // 環境変数が設定されていない場合はゲストモードで開始
      const hasValidConfig = import.meta.env.VITE_SUPABASE_URL && 
        import.meta.env.VITE_SUPABASE_ANON_KEY &&
        import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_url' &&
        import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key';

      if (!hasValidConfig) {
        console.log('Supabase環境変数が未設定のため、ゲストモードで開始します');
        set({ user: null, loading: false });
        return Promise.resolve();
      }

      console.log('認証ストア初期化開始');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('セッション取得エラー:', sessionError);
        set({ user: null, loading: false });
        return;
      }
      
      if (session?.user) {
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!error && userProfile) {
          set({ user: userProfile, loading: false });
        } else {
          // ユーザープロファイルが存在しない場合は作成
          const newUserProfile = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || '',
            role: session.user.user_metadata?.role || 'parent',
          };
          
          const { data: createdProfile, error: createError } = await supabase
            .from('users')
            .insert(newUserProfile)
            .select()
            .single();
          
          if (createError) {
            console.warn('プロファイル作成エラー（自動リトライ）:', createError);
          }
          
          set({ user: createdProfile || newUserProfile, loading: false });
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
            .single();

          if (!error && userProfile) {
            set({ user: userProfile });
          } else {
            // ユーザープロファイルが存在しない場合は作成
            const newUserProfile = {
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.name || '',
              role: session.user.user_metadata?.role || 'parent',
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
      console.error('Auth初期化エラー:', error);
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
        .update({ cefr_level: level })
        .eq('id', user.id);

      if (error) throw error;

      set({ user: { ...user, jlpt_level: level } });
    } catch (error) {
      console.error('Failed to update JLPT level:', error);
      throw error;
    }
  },
}));