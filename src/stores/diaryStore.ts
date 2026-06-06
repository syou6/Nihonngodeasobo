import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { analyzeText, generateSummary } from '../lib/gemini';
import { generateJapaneseFeedback } from '../lib/gemini-feedback';
import { diaryLimiter } from '../lib/rate-limiter';
import { trackEvent } from '../lib/analytics';
import { toast } from 'sonner';
import type { DiaryEntry, JLPTLevel } from '../types';

// ファイルサイズのフォーマット関数（インライン定義）
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

interface DiaryStore {
  entries: DiaryEntry[];
  loading: boolean;
  isRecording: boolean;
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  currentAudio: Blob | null;
  
  fetchEntries: () => Promise<void>;
  createEntry: (content: string, audioBlob?: Blob) => Promise<any>;
  deleteEntry: (id: string) => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  clearRecording: () => void;
  notifyConnectedUsers: (authorId: string, authorName: string) => Promise<void>;
}

export const useDiaryStore = create<DiaryStore>((set, get) => ({
  entries: [],
  loading: false,
  isRecording: false,
  mediaRecorder: null,
  audioChunks: [],
  currentAudio: null,

  fetchEntries: async () => {
    set({ loading: true });

    // Timeout to prevent infinite loading
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Diary fetch timeout (15s)')), 15000)
    );

    try {
      const { data: { user } } = await Promise.race([
        supabase.auth.getUser(),
        timeout.then(() => { throw new Error('Auth timeout'); })
      ]);
      if (!user) {
        set({ entries: [], loading: false });
        return;
      }

      // 並列でクエリを実行
      const [relationshipsResult, initialDiariesResult] = await Promise.race([
        Promise.all([
          // 家族関係を取得（teacherとしての関係のみ = teacher_id）
          supabase
            .from('family_relationships')
            .select('teacher_id, learner_id')
            .eq('teacher_id', user.id)
            .eq('status', 'accepted'),

          // まず自分の日記だけを取得（高速表示用）
          supabase
            .from('diaries')
            .select(`
              *,
              user:users(*),
              comments:comments(*, user:users(*))
            `)
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(10)
        ]),
        timeout.then(() => { throw new Error('Query timeout'); })
      ]);

      // 自分の日記を即座に表示
      if (initialDiariesResult.data) {
        set({ entries: initialDiariesResult.data });
      }

      // Teacher only: collect student IDs (one-directional viewing)
      const connectedUserIds = new Set([user.id]);
      relationshipsResult.data?.forEach(rel => {
        connectedUserIds.add(rel.learner_id);
      });

      // teacherの場合のみ、生徒の日記を追加で取得
      if (connectedUserIds.size > 1) {
        const { data, error } = await supabase
          .from('diaries')
          .select(`
            *,
            user:users(*),
            comments:comments(*, user:users(*))
          `)
          .in('user_id', Array.from(connectedUserIds))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
        } else if (data) {
          set({ entries: data });
        }
      }
    } catch (error) {
      toast.error('Failed to load diary. Please try again.');
    } finally {
      set({ loading: false });
    }
  },

  createEntry: async (content: string, audioBlob?: Blob): Promise<any> => {
    try {
      if (!diaryLimiter.canProceed()) {
        const cooldown = Math.ceil(diaryLimiter.getRemainingCooldown() / 60000);
        throw new Error(`Posting is rate-limited. Please try again in ${cooldown} minute(s).`);
      }

      let voiceUrl = null;

      // Get user first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        throw new Error(`Authentication error: ${authError.message}`);
      }
      if (!user) {
        throw new Error('Please log in first');
      }
      
      // If we have audio, upload it (but don't transcribe)
      if (audioBlob) {
        try {
          const audioSize = audioBlob.size;

          // File size limit (50MB)
          const MAX_FILE_SIZE = 50 * 1024 * 1024;
          if (audioSize > MAX_FILE_SIZE) {
            throw new Error(`File too large (${formatFileSize(audioSize)}). Please keep it under 50MB.`);
          }
          
          const fileName = `${user.id}/voice_${Date.now()}.webm`;
          
          // タイムアウト付きアップロード (120秒 - 5分の録音に対応)
          toast.loading('Uploading audio...', { id: 'audio-upload' });

          const uploadPromise = supabase.storage
            .from('voice-recordings')
            .upload(fileName, audioBlob, {
              contentType: 'audio/webm',
              upsert: false
            });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Upload timeout (120 seconds). Please try again with a shorter recording.')), 120000)
          );
          
          const { data: uploadData, error: uploadError } = await Promise.race([
            uploadPromise,
            timeoutPromise
          ]).catch(err => ({ data: null, error: err })) as any;

          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('voice-recordings')
              .getPublicUrl(fileName);
            voiceUrl = publicUrl;
            toast.success('Audio uploaded!', { id: 'audio-upload' });
          } else {
            // エラーメッセージを詳細化
            const errorMsg = uploadError?.message || 'Failed to upload audio';
            toast.error(`Audio upload error: ${errorMsg}`, { id: 'audio-upload' });
            // 音声なしでも日記は保存を続行
          }
        } catch (storageError: any) {
          toast.error(storageError.message || 'Failed to upload audio', { id: 'audio-upload' });
          // 音声なしでも日記は保存を続行
        }
      }

      // Save diary immediately without waiting for AI analysis
      const { data: insertedData, error } = await supabase
        .from('diaries')
        .insert({
          user_id: user.id,
          title: content.substring(0, 50),
          content: content,
          voice_url: voiceUrl,
          duration: audioBlob ? Math.round(audioBlob.size / 1000) : null,
          emotion: 'neutral',
          ai_summary: '',
          ai_keywords: [],
          ai_feedback: null,
          tags: [],
          visibility: 'family'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save diary: ${error.message || 'Unknown error'}`);
      }

      diaryLimiter.recordAction();
      trackEvent('diary_created', { has_audio: !!audioBlob });

      // Refresh entries
      await get().fetchEntries();

      // Run AI analysis in background (don't block save)
      if (content && content.trim() && insertedData?.id) {
        const diaryId = insertedData.id;
        (async () => {
          try {
            // Get user's JLPT level
            const { data: userProfile } = await supabase
              .from('users')
              .select('jlpt_level')
              .eq('id', user.id)
              .single();
            const jlptLevel: JLPTLevel = userProfile?.jlpt_level || 'N4';

            // Run all AI calls in parallel
            const [analysisResult, aiSummary, japaneseFeedback] = await Promise.allSettled([
              analyzeText(content),
              generateSummary(content),
              generateJapaneseFeedback(content, jlptLevel),
            ]);

            const analysis = analysisResult.status === 'fulfilled' ? analysisResult.value : null;
            const summary = aiSummary.status === 'fulfilled' ? aiSummary.value : '';
            const feedback = japaneseFeedback.status === 'fulfilled' ? japaneseFeedback.value : null;

            // Update diary with AI results
            await supabase
              .from('diaries')
              .update({
                emotion: analysis?.emotion || 'neutral',
                ai_summary: summary || analysis?.summary || '',
                ai_keywords: analysis?.keywords || [],
                ai_feedback: feedback || null,
              })
              .eq('id', diaryId);

            // Refresh entries to show AI results
            await get().fetchEntries();
          } catch { /* ignored */ }
        })();
      }

      // Send family notification in background
      (async () => {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();

          if (userData?.name) {
            await get().notifyConnectedUsers(user.id, userData.name);
          }
        } catch { /* ignored */ }
      })();

      return insertedData;
    } catch (error: any) {
      // より詳細なエラー情報を提供
      if (error.message) {
        throw new Error(`Failed to save diary: ${error.message}`);
      }
      throw new Error('Failed to save diary. Please check your network connection.');
    }
  },

  deleteEntry: async (id: string) => {
    try {
      // Soft delete - move to trash (set deleted_at)
      const { error } = await supabase
        .from('diaries')
        .update({
          deleted_at: new Date().toISOString(),
          delete_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days later
        })
        .eq('id', id)
        .select();

      if (error) {
        throw error;
      }

      set(state => ({
        entries: state.entries.filter(entry => entry.id !== id)
      }));
    } catch (error) {
      throw error;
    }
  },

  startRecording: async () => {
    try {
      // シンプルなオプションに戻す（互換性のため）
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // MediaRecorderのオプションを設定（ビットレート削減）
      let mediaRecorder: MediaRecorder;
      try {
        const options = {
          mimeType: 'audio/webm',
          audioBitsPerSecond: 64000 // 64kbps（互換性を考慮して少し上げる）
        };
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // フォールバック：デフォルト設定を使用
        mediaRecorder = new MediaRecorder(stream);
      }
      
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      // 通常の開始方法に戻す（安定性重視）
      mediaRecorder.start();
      
      set({ 
        mediaRecorder, 
        audioChunks, 
        isRecording: true 
      });
    } catch (error) {
      throw error;
    }
  },

  stopRecording: async () => {
    const { mediaRecorder, audioChunks } = get();

    return new Promise((resolve) => {
      if (!mediaRecorder) {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        set({
          currentAudio: audioBlob,
          isRecording: false,
          mediaRecorder: null
        });
        resolve(audioBlob);
      };

      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });
  },

  clearRecording: () => {
    set({
      currentAudio: null,
      audioChunks: [],
      isRecording: false,
      mediaRecorder: null
    });
  },

  notifyConnectedUsers: async (authorId: string, authorName: string) => {
    try {
      // 家族関係を取得
      const { data: relationships } = await supabase
        .from('family_relationships')
        .select('teacher_id, learner_id')
        .or(`teacher_id.eq.${authorId},learner_id.eq.${authorId}`)
        .eq('status', 'accepted');

      if (!relationships || relationships.length === 0) {
        return;
      }

      // 通知対象のユーザーIDを収集
      const connectedUserIds = new Set<string>();
      relationships.forEach(rel => {
        if (rel.teacher_id !== authorId) connectedUserIds.add(rel.teacher_id);
        if (rel.learner_id !== authorId) connectedUserIds.add(rel.learner_id);
      });

      // 各接続ユーザーに通知を送信
      for (const userId of connectedUserIds) {
        try {
          // Edge Function経由でバックグラウンド通知を送信（オプション）
          try {
            const response = await supabase.functions.invoke('send-push-notification', {
              body: {
                userId,
                title: '新しい日記が投稿されました',
                body: `${authorName}さんが日記を投稿しました`,
                type: 'new_diary',
                data: {
                  url: 'https://journal-ai.cloud/diary'
                }
              }
            });

            if (response.error) {
              // Edge Functionが存在しない場合は無視（404エラー）
            }
          } catch { /* ignored */ }

          // ブラウザが開いている場合はローカル通知も送信（フォールバック）
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              title: '新しい日記が投稿されました',
              body: `${authorName}さんが日記を投稿しました`,
              data: {
                url: '/diary'
              }
            });
          }
        } catch { /* ignored */ }
      }
    } catch { /* ignored */ }
  }
}));