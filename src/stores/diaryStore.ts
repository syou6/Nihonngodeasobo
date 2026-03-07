import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { analyzeText, generateFamilySummary, analyzeHealthScore } from '../lib/gemini';
import { generateJapaneseFeedback } from '../lib/gemini-feedback';
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
  notifyFamilyMembers: (authorId: string, authorName: string) => Promise<void>;
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
    const startTime = performance.now();

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
          // 家族関係を取得（teacherとしての関係のみ = parent_id）
          supabase
            .from('family_relationships')
            .select('parent_id, child_id')
            .eq('parent_id', user.id)
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
      const familyIds = new Set([user.id]);
      relationshipsResult.data?.forEach(rel => {
        familyIds.add(rel.child_id);
      });

      // teacherの場合のみ、生徒の日記を追加で取得
      if (familyIds.size > 1) {
        const { data, error } = await supabase
          .from('diaries')
          .select(`
            *,
            user:users(*),
            comments:comments(*, user:users(*))
          `)
          .in('user_id', Array.from(familyIds))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Failed to fetch family diaries:', error);
        } else if (data) {
          set({ entries: data });
        }
      }

      const endTime = performance.now();
      console.log(`日記取得時間: ${Math.round(endTime - startTime)}ms`);

    } catch (error) {
      console.error('Failed to fetch entries:', error);
      toast.error('Failed to load diary. Please try again.');
    } finally {
      set({ loading: false });
    }
  },

  createEntry: async (content: string, audioBlob?: Blob): Promise<any> => {
    try {
      console.log('createEntry start:', { contentLength: content.length, hasAudio: !!audioBlob });
      
      let voiceUrl = null;
      let transcribedContent = content;
      
      // Get user first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('認証エラー:', authError);
        throw new Error(`認証エラー: ${authError.message}`);
      }
      if (!user) {
        console.error('User not authenticated');
        throw new Error('ログインが必要です');
      }
      console.log('User authenticated:', user.id);
      
      // If we have audio, upload it (but don't transcribe)
      if (audioBlob) {
        try {
          const audioSize = audioBlob.size;
          console.log('音声アップロード開始:', {
            size: formatFileSize(audioSize),
            type: audioBlob.type
          });
          
          // ファイルサイズ制限 (50MB)
          const MAX_FILE_SIZE = 50 * 1024 * 1024;
          if (audioSize > MAX_FILE_SIZE) {
            throw new Error(`ファイルサイズが大きすぎます (${formatFileSize(audioSize)})。50MB以下にしてください。`);
          }
          
          const uploadStartTime = performance.now();
          const fileName = `${user.id}/voice_${Date.now()}.webm`;
          
          // バケット存在チェック（デバッグ用）
          console.log('アップロード準備:', {
            bucketName: 'voice-recordings',
            fileName,
            fileSize: formatFileSize(audioSize),
            fileType: audioBlob.type,
            userId: user.id
          });
          
          // タイムアウト付きアップロード (90秒 - 3分の録音に対応)
          toast.loading('Uploading audio...', { id: 'audio-upload' });

          const uploadPromise = supabase.storage
            .from('voice-recordings')
            .upload(fileName, audioBlob, {
              contentType: 'audio/webm',
              upsert: false
            });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Upload timeout (90 seconds). Please try again with a shorter recording.')), 90000)
          );
          
          const { data: uploadData, error: uploadError } = await Promise.race([
            uploadPromise,
            timeoutPromise
          ]).catch(err => ({ data: null, error: err })) as any;

          const uploadEndTime = performance.now();
          const uploadTime = Math.round(uploadEndTime - uploadStartTime);
          console.log(`音声アップロード時間: ${uploadTime}ms`);

          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('voice-recordings')
              .getPublicUrl(fileName);
            voiceUrl = publicUrl;
            console.log('音声URL取得成功:', publicUrl);
            toast.success('Audio uploaded!', { id: 'audio-upload' });
          } else {
            console.error('音声アップロードエラー詳細:', {
              error: uploadError,
              message: uploadError?.message,
              statusCode: uploadError?.statusCode,
              fileName,
              blobSize: audioBlob.size,
              blobType: audioBlob.type
            });
            // エラーメッセージを詳細化
            const errorMsg = uploadError?.message || 'Failed to upload audio';
            toast.error(`Audio upload error: ${errorMsg}`, { id: 'audio-upload' });
            // 音声なしでも日記は保存を続行
          }
        } catch (storageError: any) {
          console.error('音声アップロードエラー:', storageError);
          toast.error(storageError.message || 'Failed to upload audio', { id: 'audio-upload' });
          // 音声なしでも日記は保存を続行
        }
      }

      // Save diary immediately without waiting for AI analysis
      console.log('Inserting diary entry...');
      const { data: insertedData, error } = await supabase
        .from('diaries')
        .insert({
          user_id: user.id,
          title: content.substring(0, 50),
          content: content,
          voice_url: voiceUrl,
          duration: audioBlob ? Math.round(audioBlob.size / 1000) : null,
          emotion: 'neutral',
          health_score: 75,
          ai_summary: '',
          ai_keywords: [],
          ai_feedback: null,
          tags: [],
          visibility: 'family'
        })
        .select()
        .single();

      if (error) {
        console.error('データベース挿入エラー詳細:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`日記の保存に失敗: ${error.message || '不明なエラー'}`);
      }
      
      console.log('Diary saved successfully:', insertedData);

      // Refresh entries
      await get().fetchEntries();

      // Run AI analysis in background (don't block save)
      if (content && content.trim() && insertedData?.id) {
        const diaryId = insertedData.id;
        (async () => {
          try {
            console.log('Background AI analysis started for diary:', diaryId);

            // Get user's JLPT level
            const { data: userProfile } = await supabase
              .from('users')
              .select('jlpt_level')
              .eq('id', user.id)
              .single();
            const jlptLevel: JLPTLevel = userProfile?.jlpt_level || 'N4';

            // Run all AI calls in parallel
            const [analysisResult, aiSummary, healthScore, japaneseFeedback] = await Promise.allSettled([
              analyzeText(content),
              generateFamilySummary(content),
              analyzeHealthScore(content),
              generateJapaneseFeedback(content, jlptLevel),
            ]);

            const analysis = analysisResult.status === 'fulfilled' ? analysisResult.value : null;
            const summary = aiSummary.status === 'fulfilled' ? aiSummary.value : '';
            const health = healthScore.status === 'fulfilled' ? healthScore.value : 75;
            const feedback = japaneseFeedback.status === 'fulfilled' ? japaneseFeedback.value : null;

            // Update diary with AI results
            await supabase
              .from('diaries')
              .update({
                emotion: feedback?.jlptLevel ? 'neutral' : (analysis?.emotion || 'neutral'),
                health_score: health,
                ai_summary: feedback?.summary || summary || analysis?.summary || '',
                ai_keywords: analysis?.keywords || [],
                ai_feedback: feedback || null,
              })
              .eq('id', diaryId);

            console.log('Background AI analysis completed for diary:', diaryId);

            // Refresh entries to show AI results
            await get().fetchEntries();
          } catch (bgError) {
            console.warn('Background AI analysis failed:', bgError);
          }
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
            await get().notifyFamilyMembers(user.id, userData.name);
          }
        } catch (notifyError) {
          console.error('Failed to send notifications:', notifyError);
        }
      })();

      return insertedData;
    } catch (error: any) {
      console.error('Failed to create entry:', error);
      
      // より詳細なエラー情報を提供
      if (error.message) {
        throw new Error(`日記の保存に失敗しました: ${error.message}`);
      }
      throw new Error('日記の保存に失敗しました。ネットワーク接続を確認してください。');
    }
  },

  deleteEntry: async (id: string) => {
    try {
      console.log('deleteEntry開始:', id);

      // Soft delete - ゴミ箱に移動（deleted_atを設定）
      const { data, error } = await supabase
        .from('diaries')
        .update({
          deleted_at: new Date().toISOString(),
          delete_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30日後
        })
        .eq('id', id)
        .select();

      console.log('deleteEntry結果:', { data, error });

      if (error) {
        console.error('deleteEntry エラー詳細:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('deleteEntry: 更新された行がありません。RLS権限を確認してください。');
      }

      set(state => ({
        entries: state.entries.filter(entry => entry.id !== id)
      }));

      console.log('deleteEntry完了');
    } catch (error) {
      console.error('Failed to delete entry:', error);
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
        console.log('録音開始: ビットレート64kbps');
      } catch (e) {
        // フォールバック：デフォルト設定を使用
        console.warn('カスタム設定が使用できません。デフォルト設定を使用します。');
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
      console.error('Failed to start recording:', error);
      throw error;
    }
  },

  stopRecording: async () => {
    const { mediaRecorder, audioChunks } = get();
    
    console.log('stopRecording開始:', {
      hasMediaRecorder: !!mediaRecorder,
      chunksCount: audioChunks.length
    });
    
    return new Promise((resolve) => {
      if (!mediaRecorder) {
        console.warn('MediaRecorderが存在しません');
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder停止イベント発火');
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        console.log('Blob作成完了:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunksUsed: audioChunks.length
        });
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

  notifyFamilyMembers: async (authorId: string, authorName: string) => {
    try {
      // 家族関係を取得
      const { data: relationships } = await supabase
        .from('family_relationships')
        .select('parent_id, child_id')
        .or(`parent_id.eq.${authorId},child_id.eq.${authorId}`)
        .eq('status', 'accepted');

      if (!relationships || relationships.length === 0) {
        console.log('No family relationships found');
        return;
      }

      // 通知対象のユーザーIDを収集
      const familyUserIds = new Set<string>();
      relationships.forEach(rel => {
        if (rel.parent_id !== authorId) familyUserIds.add(rel.parent_id);
        if (rel.child_id !== authorId) familyUserIds.add(rel.child_id);
      });

      // 各家族メンバーに通知を送信
      for (const userId of familyUserIds) {
        try {
          // Edge Function経由でバックグラウンド通知を送信（オプション）
          try {
            const response = await supabase.functions.invoke('send-push-notification', {
              body: {
                userId,
                title: '新しい日記が投稿されました',
                body: `${authorName}さんが日記を投稿しました`,
                type: 'family_diary',
                data: {
                  url: 'https://journal-ai.cloud/diary'
                }
              }
            });

            if (response.error) {
              // Edge Functionが存在しない場合は無視（404エラー）
              if (response.error.message?.includes('not found') || response.error.message?.includes('404')) {
                console.log('プッシュ通知機能は未実装です');
              } else {
                console.warn(`プッシュ通知送信エラー (user ${userId}):`, response.error.message);
              }
            } else {
              console.log(`Push notification sent to user ${userId}`);
            }
          } catch (funcError: any) {
            // Edge Functionのエラーは無視（日記保存には影響なし）
            console.log('プッシュ通知はスキップされました');
          }

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
        } catch (error) {
          console.error(`Failed to notify user ${userId}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to notify family members:', error);
    }
  }
}));