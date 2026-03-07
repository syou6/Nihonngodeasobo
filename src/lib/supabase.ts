import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 環境変数が設定されているかチェック
const hasValidConfig = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_url' && 
  supabaseAnonKey !== 'your_supabase_anon_key';

let supabase: any = null;

if (hasValidConfig) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // ダミーのSupabaseクライアントを作成（エラーを防ぐため）
  supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.reject(new Error('認証機能は利用できません')),
      signUp: () => Promise.reject(new Error('認証機能は利用できません')),
      signInWithOAuth: () => Promise.reject(new Error('認証機能は利用できません')),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null })
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: new Error('ストレージ機能は利用できません') }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    },
    functions: {
      invoke: () => Promise.resolve({ data: null, error: new Error('Edge Functionsは利用できません') })
    }
  };
}

export { supabase };