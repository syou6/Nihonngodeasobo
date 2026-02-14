import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// import { analyzeText, generateFamilySummary, analyzeHealthScore } from '../lib/gemini'; // AI機能無効化

interface GuestDiary {
  id: string;
  content: string;
  title: string;
  emotion: string;
  health_score: number;
  ai_summary: string;
  created_at: string;
  expires_at: string; // 有効期限
  voice_data?: string; // Base64エンコードされた音声データ
}

interface GuestStore {
  diaries: GuestDiary[];
  usageCount: number;
  maxDiaries: number;
  isGuestMode: boolean;
  aiUsageCount: number; // AI分析の使用回数
  
  createGuestDiary: (content: string, audioBlob?: Blob) => Promise<void>;
  deleteGuestDiary: (id: string) => void;
  getGuestDiaries: () => GuestDiary[];
  getRemainingTries: () => number;
  canCreateMore: () => boolean;
  canUseAI: () => boolean; // AI分析が使用可能か
  clearGuestData: () => void;
  setGuestMode: (enabled: boolean) => void;
  cleanExpiredDiaries: () => void;
}

export const useGuestStore = create<GuestStore>()(
  persist(
    (set, get) => ({
      diaries: [],
      usageCount: 0,
      maxDiaries: 3,
      isGuestMode: false,
      aiUsageCount: 0, // AI使用回数の初期値

      createGuestDiary: async (content: string, audioBlob?: Blob) => {
        const { usageCount, maxDiaries } = get();
        
        if (usageCount >= maxDiaries) {
          throw new Error('ゲスト利用の上限に達しました。ログインしてください。');
        }

        // 音声データをBase64に変換（30秒制限）
        let voiceData: string | undefined;
        if (audioBlob) {
          // 30秒制限（約300KB）
          if (audioBlob.size > 300000) {
            throw new Error('ゲストモードでは30秒までの録音が可能です');
          }
          const reader = new FileReader();
          voiceData = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(audioBlob);
          });
        }

        // ゲストモードのAI機能制限
        let emotion = '普通';
        let healthScore = 75;
        let aiSummary = '';

        // ゲストモードは1回だけAI分析を使用可能
        if (get().canUseAI() && content) {
          try {
            const { analyzeText, generateFamilySummary, analyzeHealthScore } = await import('../lib/gemini');
            console.log('ゲストモード: AI分析を実行（1回限定）');
            
            const analysisResult = await analyzeText(content);
            emotion = analysisResult?.emotion || '普通';
            aiSummary = await generateFamilySummary(content);
            healthScore = await analyzeHealthScore(content);
            
            // AI使用回数を増やす
            set(state => ({ aiUsageCount: state.aiUsageCount + 1 }));
          } catch (error) {
            console.warn('AI分析エラー:', error);
          }
        } else if (get().aiUsageCount >= 1) {
          console.log('ゲストモード: AI分析の上限に達しています（1回まで）');
          aiSummary = 'AI分析はゲストモードで1回まで利用可能です。';
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30分後
        
        const newDiary: GuestDiary = {
          id: `guest-${Date.now()}`,
          content,
          title: content.substring(0, 50),
          emotion,
          health_score: healthScore,
          ai_summary: aiSummary,
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          voice_data: voiceData
        };

        set((state) => ({
          diaries: [newDiary, ...state.diaries],
          usageCount: state.usageCount + 1
        }));
      },

      deleteGuestDiary: (id: string) => {
        set((state) => ({
          diaries: state.diaries.filter(d => d.id !== id),
          usageCount: Math.max(0, state.usageCount - 1)
        }));
      },

      getGuestDiaries: () => get().diaries,

      getRemainingTries: () => {
        const { maxDiaries, usageCount } = get();
        return Math.max(0, maxDiaries - usageCount);
      },

      canCreateMore: () => {
        const { usageCount, maxDiaries } = get();
        return usageCount < maxDiaries;
      },

      canUseAI: () => {
        const { aiUsageCount } = get();
        return aiUsageCount < 1; // ゲストモードは1回まで
      },

      clearGuestData: () => {
        set({
          diaries: [],
          usageCount: 0,
          isGuestMode: false,
          aiUsageCount: 0
        });
      },

      setGuestMode: (enabled: boolean) => {
        console.log('setGuestMode called:', enabled);
        set({ isGuestMode: enabled });
      },

      cleanExpiredDiaries: () => {
        const now = new Date();
        set((state) => {
          const validDiaries = state.diaries.filter(diary => {
            const expiresAt = new Date(diary.expires_at);
            return expiresAt > now;
          });
          
          // 削除された日記の数だけusageCountも減らす
          const deletedCount = state.diaries.length - validDiaries.length;
          
          console.log(`期限切れの日記を${deletedCount}件削除しました`);
          
          return {
            diaries: validDiaries,
            usageCount: Math.max(0, state.usageCount - deletedCount)
          };
        });
      }
    }),
    {
      name: 'guest-diary-storage',
      partialize: (state) => ({
        diaries: state.diaries,
        usageCount: state.usageCount,
        isGuestMode: state.isGuestMode,  // ゲストモードも永続化
        aiUsageCount: state.aiUsageCount  // AI使用回数も永続化
      })
    }
  )
);