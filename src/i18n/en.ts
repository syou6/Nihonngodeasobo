// English text constants for NihonGo
// 開発用: 日本語コメント = ふりがな（最終的に削除OK）

export const EN = {
  // App name / アプリ名
  app: {
    name: 'NihonGo',
    tagline: 'Learn Japanese Every Day', // 毎日日本語を学ぼう
  },

  // Navigation / ナビゲーション
  nav: {
    home: 'Home',           // ホーム
    record: 'Record',       // 録音
    diary: 'Diary',         // 日記
    practice: 'Practice',   // 練習
    settings: 'Settings',   // 設定
    family: 'Share',        // 共有
    homeDesc: 'Dashboard',  // ダッシュボード
    recordDesc: 'Speak',    // 話す
    diaryDesc: 'History',   // 履歴
    practiceDesc: 'JLPT',
    settingsDesc: 'Config', // 設定
    active: 'Active',       // アクティブ
  },

  // Dashboard / ダッシュボード
  dashboard: {
    greeting: {
      morning: 'Good morning',     // おはようございます
      afternoon: 'Good afternoon', // こんにちは
      evening: 'Good evening',     // こんばんは
    },
    todayPrompt: "Let's record today's diary",  // 今日の日記を録音しよう
    recordButton: 'Start Recording',             // 録音開始
    alreadyRecorded: 'Already recorded today',   // 今日はもう録音済み
    greatJob: 'Great job!',                      // よくできました！
    viewDiary: 'View Diary',                     // 日記を見る
    practice: 'JLPT Speaking Practice',          // JLPTスピーキング練習
    logout: 'Logout',                            // ログアウト
    logoutConfirm: 'Are you sure you want to logout?', // ログアウトしますか？
    tips: {
      title: "Today's Tips",                    // 今日のヒント
      tip1: 'What did you do today?',           // 今日何をしましたか？
      tip2: 'How are you feeling?',             // 気分はどうですか？
      tip3: 'What made you happy?',             // 何が嬉しかった？
    },
  },

  // Recording / 録音
  recording: {
    title: 'Record Your Diary',                  // 日記を録音する
    instruction: 'Press the microphone button and speak in Japanese about your day', // マイクボタンを押して日本語で話す
    recording: 'Recording...',                   // 録音中...
    stopButton: 'Stop Recording',                // 録音停止
    startButton: 'Start Recording',              // 録音開始
    pressToStart: 'Press the microphone to start recording', // マイクを押して録音開始
    whenDone: 'When you\'re done speaking, press the "Stop Recording" button below', // 話し終わったら停止ボタンを押す
    completed: 'Recording completed!',           // 録音完了！
    reviewAndSave: 'Review your recording and save it', // 録音を確認して保存
    play: 'Play Recording',   // 録音を再生
    pause: 'Pause',            // 一時停止
    save: 'Save Diary',       // 日記を保存
    discard: 'Re-record',     // やり直し
    saveTitle: 'Save Your Diary',                // 日記を保存
    transcribedText: 'Transcribed Text',         // 文字起こしテキスト
    additionalNotes: 'Additional Notes (Optional)', // 追加メモ（任意）
    notesPlaceholder: 'e.g., Today I went to the convenience store...', // 例：今日コンビニに行きました...
    saving: 'Saving...',      // 保存中...
    saveButton: 'Save',       // 保存
    back: 'Back',              // 戻る
    transcribing: 'Transcribing:',               // 文字起こし中:
    noTranscription: 'Voice diary (could not transcribe)', // 音声日記（文字起こし失敗）
    additionalNotesLabel: 'Additional Notes',    // 追加メモ
    startSuccess: 'Recording started',           // 録音開始しました
    stopSuccess: 'Recording stopped',            // 録音停止しました
    saveSuccess: 'Diary saved!',                 // 日記保存しました！
    saveError: 'Failed to save',                 // 保存失敗
    discardSuccess: 'Recording discarded',       // 録音を破棄しました
    guestLimit: 'Guest limit reached. Please login.', // ゲスト上限。ログインしてください
    guestTimeLimit: 'Guest mode is limited to 30 seconds', // ゲストは30秒まで
    micPermissionDenied: 'Microphone access denied. Please check your browser settings.', // マイクアクセス拒否
    notSupported: 'Your browser does not support voice recognition', // ブラウザ非対応
    saveTimeout: 'Save timed out. Please try again.', // 保存タイムアウト
    noRecordingData: 'No recording data',        // 録音データなし
  },

  // Diary list / 日記一覧
  diary: {
    title: 'My Diary',       // マイ日記
    empty: 'No diary entries yet',  // まだ日記がありません
    startFirst: 'Record your first diary!', // 最初の日記を録音しよう！
    delete: 'Delete',         // 削除
    deleteConfirm: 'Are you sure you want to delete this diary?', // この日記を削除しますか？
    play: 'Play',             // 再生
    pause: 'Pause',           // 一時停止
  },

  // Auth / 認証
  auth: {
    login: 'Login',                    // ログイン
    signup: 'Sign Up',                 // 新規登録
    email: 'Email',                    // メールアドレス
    password: 'Password',             // パスワード
    confirmPassword: 'Confirm Password', // パスワード確認
    forgotPassword: 'Forgot Password?',  // パスワードを忘れた？
    noAccount: "Don't have an account?", // アカウントがない？
    hasAccount: 'Already have an account?', // アカウントをお持ち？
    loginWithGoogle: 'Continue with Google', // Googleでログイン
    or: 'or',                          // または
  },

  // Guest mode / ゲストモード
  guest: {
    banner: 'Guest Mode',     // ゲストモード
    limit: 'entries remaining', // 残り回数
    tryMode: 'Trial Mode',    // お試しモード
    loginPrompt: 'Login to save your diaries', // ログインして日記を保存
  },

  // Settings / 設定
  settings: {
    title: 'Settings',                  // 設定
    cefrLevel: 'Japanese Level (JLPT)', // 日本語レベル（JLPT）
    cefrDescription: 'AI feedback will be based on this level', // AIフィードバックはこのレベルに基づく
    notifications: 'Notifications',     // 通知
    notificationSettings: 'Notification Settings', // 通知設定
    language: 'Language',               // 言語
    account: 'Account',                 // アカウント
    logout: 'Logout',                   // ログアウト
    apiUsage: 'AI Usage Statistics',    // AI使用統計
  },

  // JLPT levels / JLPTレベル
  jlpt: {
    'N5': 'N5 - Beginner',       // N5 - 初級
    'N4': 'N4 - Elementary',     // N4 - 基礎
    'N3': 'N3 - Intermediate',   // N3 - 中級
    'N2': 'N2 - Advanced',       // N2 - 上級
    'N1': 'N1 - Proficient',     // N1 - 熟達
  },

  // Feedback / フィードバック
  feedback: {
    title: 'AI Feedback',                // AIフィードバック
    loading: 'Analyzing your Japanese...', // 日本語を分析中...
    grammar: 'Grammar & Phrasing',       // 文法・表現
    vocabulary: 'Vocabulary',            // 語彙
    pronunciation: 'Pronunciation Tips', // 発音のコツ
    reading: 'Recommended Study',        // おすすめ学習
    summary: 'Summary (English)',        // 要約（英語）
    keyVocab: 'Key Vocabulary',          // 重要語彙
  },

  // JLPT Speaking Practice / JLPTスピーキング練習
  versant: {
    title: 'JLPT Speaking Practice',     // JLPTスピーキング練習
    subtitle: 'Practice speaking with JLPT-style exercises', // JLPT形式の練習
    partE: {
      title: 'Part E: Summary',          // パートE: 要約
      description: 'Listen to a short passage and summarize it in 30 seconds.', // 短い文章を聞いて30秒で要約
      descriptionJa: '短い文章を聞いて30秒以内で要約します。',
      instructions: 'Listen to the passage, then summarize the main points in your own words. You have 30 seconds.', // 文章を聞いて要点を自分の言葉で要約。30秒
      playButton: 'Play Passage',        // 文章を再生
      pressPlay: 'Press play to listen to the passage', // 再生ボタンで文章を聞く
      listening: 'Listening...',          // 聞いています...
      listenTip: 'Pay attention to the main points', // 要点に注目
      showPassage: 'Show Passage Text',  // 文章テキストを表示
      hidePassage: 'Hide Passage Text',  // 文章テキストを隠す
      passageLabel: 'Passage:',          // 文章:
    },
    partF: {
      title: 'Part F: Opinion',          // パートF: 意見
      description: 'Answer a question with your opinion in about 40 seconds.', // 40秒で意見を述べる
      descriptionJa: '質問に対して40秒程度で自分の意見を述べます。',
      instructions: 'Listen to the question, then give your opinion with reasons. You have 40 seconds to respond.', // 質問を聞いて理由付きで意見。40秒
      playButton: 'Play Question',       // 質問を再生
      pressPlay: 'Press play to hear the question', // 再生で質問を聞く
      showQuestion: 'Show Question Text', // 質問テキストを表示
      hideQuestion: 'Hide Question Text', // 質問テキストを隠す
      questionLabel: 'Question:',        // 質問:
    },
    start: 'Start Practice',             // 練習開始
    history: 'Practice History',         // 練習履歴
    viewHistory: 'View Practice History', // 練習履歴を見る
    playQuestion: 'Play Question',       // 質問を再生
    playing: 'Playing...',               // 再生中...
    timeLimit: 'Time limit',             // 制限時間
    seconds: 'seconds',                  // 秒
    secondsRemaining: 'seconds remaining', // 残り秒数
    yourAnswer: 'Your Answer',           // あなたの回答
    yourResponse: 'Your Response',       // あなたの応答
    sampleAnswer: 'Sample Answer',       // 模範回答
    result: 'Your Result',              // あなたの結果
    advice: 'Advice',                    // アドバイス
    nextLevel: 'To reach the next level', // 次のレベルへ
    tryAgain: 'Try Again',               // もう一度
    tryAnother: 'Try Another Question',  // 別の問題に挑戦
    nextQuestion: 'Next Question',       // 次の問題
    backToPractice: 'Back to Practice',  // 練習に戻る
    recording: 'Recording...',           // 録音中...
    stopRecording: 'Stop Recording',     // 録音停止
    yourResponseLabel: 'Your response:', // あなたの応答:
    analyzing: 'Analyzing your response...', // 応答を分析中...
    cefrLevel: 'JLPT Level',            // JLPTレベル
    grammarNotes: 'Grammar Notes',      // 文法メモ
    vocabularyTips: 'Vocabulary Tips',   // 語彙のヒント
    playRecording: 'Play Recording',     // 録音を再生
    pause: 'Pause',                      // 一時停止
    noSpeechDetected: '(No speech detected)', // （音声未検出）
    ttsError: 'Failed to play audio. Starting recording...', // 音声再生失敗。録音開始...
    ttsErrorRetry: 'Failed to play audio. Please try again.', // 音声再生失敗。再試行
    processError: 'Failed to process your answer', // 回答処理失敗
    tipsTitle: 'Tips for Success',       // 成功のコツ
    tips: [
      'Listen carefully to the question before you start speaking',  // 話す前に質問をよく聞く
      'Speak clearly and at a natural pace - don\'t rush',           // はっきり自然なペースで話す
      'Use the full time available - silence is okay while thinking', // 時間を全部使う。考え中の沈黙はOK
      'Practice daily to build confidence and fluency',              // 毎日練習して自信と流暢さを
    ],
  },

  // User / ユーザー
  user: {
    guest: 'Guest',         // ゲスト
    user: 'User',           // ユーザー
    admin: 'Admin',         // 管理者
    trialMode: 'Trial Mode', // お試しモード
  },

  // Header / ヘッダー
  header: {
    voiceJournal: 'Voice Journal', // 音声ジャーナル
    logout: 'Logout',              // ログアウト
  },

  // Common / 共通
  common: {
    loading: 'Loading...',   // 読み込み中...
    error: 'An error occurred', // エラーが発生しました
    retry: 'Retry',          // 再試行
    cancel: 'Cancel',        // キャンセル
    confirm: 'Confirm',      // 確認
    close: 'Close',          // 閉じる
    save: 'Save',            // 保存
    delete: 'Delete',        // 削除
    edit: 'Edit',            // 編集
  },

  // Errors / エラー
  errors: {
    generic: 'Something went wrong. Please try again.', // 問題が発生しました。再試行してください
    network: 'Network error. Please check your connection.', // ネットワークエラー。接続を確認
    auth: 'Authentication failed. Please login again.', // 認証失敗。再ログインしてください
  },

  // Guest mode messages / ゲストモードメッセージ
  guestMode: {
    banner: 'Guest Mode',              // ゲストモード
    remaining: 'tries remaining',      // 残り回数
    loginPrompt: 'Login to save all features', // ログインして全機能を使う
    createAccount: 'Create Free Account', // 無料アカウント作成
    login: 'Login',                     // ログイン
    loginSignup: 'Login / Sign Up',     // ログイン / 新規登録
    limitReached: 'Guest limit reached', // ゲスト上限到達
    limitMessage: 'Create a free account to continue', // 無料アカウントを作って続ける
    noDiaries: 'No diary entries yet',  // まだ日記がありません
    startRecording: 'Record your first diary entry', // 最初の日記を録音
    autoDelete: 'This diary will be auto-deleted in 30 minutes', // 30分後に自動削除
    expiresIn: 'Expires in',           // 有効期限
    minutes: 'minutes',                 // 分
    expired: 'Expired',                 // 期限切れ
    deleteConfirm: 'Are you sure you want to delete this diary?', // この日記を削除しますか？
    deleted: 'Diary deleted',           // 日記削除済み
    healthScore: 'Health Score',        // 健康スコア
    aiSummary: 'AI Summary',           // AI要約
    play: 'Play',                       // 再生
    stop: 'Stop',                       // 停止
    playAudio: 'Play Audio',           // 音声再生
  },

  // Volume indicator / 音量インジケーター
  volume: {
    level: 'Volume Level',              // 音量レベル
    startRecording: 'Press record to start', // 録音ボタンで開始
    tooQuiet: 'Too quiet',              // 小さすぎ
    tooLoud: 'Too loud',                // 大きすぎ
    justRight: 'Perfect volume',        // ちょうどいい音量
    low: 'Low',                         // 低
    optimal: 'Optimal',                 // 最適
    high: 'High',                       // 高
  },

  // Share / 共有
  share: {
    button: 'Share',        // 共有
    copied: 'Link copied!', // リンクコピー済み！
    copyLink: 'Copy Link',  // リンクをコピー
  },

  // Notifications / 通知
  notifications: {
    title: 'Notification Settings',     // 通知設定
    premium: 'Premium Plan',            // プレミアムプラン
    premiumDesc: 'Get all features for $5/month', // 月$5で全機能
    viewPlans: 'View Plans',            // プラン一覧
    on: 'Notifications On',             // 通知オン
    off: 'Notifications Off',           // 通知オフ
    types: 'Notification Types',        // 通知の種類
    newComment: 'New Comments',         // 新しいコメント
    newCommentDesc: 'Get notified when someone comments on your diary', // 日記にコメントが付いたら通知
    familyDiary: 'Student Diary',       // 生徒の日記
    familyDiaryDesc: 'Get notified when your student posts a diary', // 生徒が日記を投稿したら通知
    dailyReminder: 'Daily Reminder',    // 毎日のリマインダー
    dailyReminderDesc: 'Get reminded to write your diary', // 日記を書くリマインダー
    reminderTime: 'Reminder Time',      // リマインダー時刻
    testNotification: 'Send Test Notification', // テスト通知を送信
    testSent: 'Test notification sent', // テスト通知送信済み
    enablePrompt: 'Enable push notifications to receive updates in real-time', // プッシュ通知を有効にしてリアルタイム更新
    iosInstruction: 'To enable notifications on iPhone, add this app to your home screen', // iPhoneはホーム画面に追加
    howToAdd: 'How to add:',            // 追加方法:
    step1: 'Tap the share button at the bottom of Safari', // Safariの共有ボタンをタップ
    step2: 'Select "Add to Home Screen"', // 「ホーム画面に追加」を選択
    step3: 'Tap "Add" at the top right',  // 右上の「追加」をタップ
    step4: 'Open "NihonGo" from home screen', // ホーム画面から開く
    iosNote: 'Requires iOS 16.4 or later', // iOS 16.4以降が必要
    androidTip: 'For smartphone users',    // スマホユーザー向け
    androidInstructions: 'Use Chrome/Edge browser, Menu → Add to Home Screen', // Chrome/Edgeでメニュー→ホーム画面に追加
    enableButton: 'Enable Notifications',  // 通知を有効にする
    success: {
      on: 'Notifications enabled',      // 通知有効化完了
      off: 'Notifications disabled',    // 通知無効化完了
      updated: 'Settings updated',      // 設定更新完了
    },
    error: {
      enable: 'Failed to enable notifications', // 通知有効化失敗
      disable: 'Failed to disable notifications', // 通知無効化失敗
      update: 'Failed to update settings', // 設定更新失敗
    },
  },

  // Teacher Sharing / 先生との接続
  family: {
    title: 'Teacher Connection',         // 先生との接続
    addRecipient: 'Invite Your Japanese Teacher', // 日本語の先生を招待
    addDescription: 'Enter your teacher\'s email address to share your diary for feedback', // 先生のメールを入力して日記を共有
    addButton: 'Invite',                 // 招待
    yourViewers: 'Your Teacher',         // あなたの先生
    youCanView: 'Students You Teach',    // 教えている生徒
    remove: 'Remove',                    // 削除
    removeConfirm: 'Are you sure you want to disconnect from this teacher?', // この先生との接続を解除しますか？
    removed: 'Teacher removed',          // 先生を削除しました
    noSharing: 'No teacher connected yet. Invite your teacher to get feedback!', // まだ先生がいません。招待してフィードバックをもらおう！
    noViewers: 'No students connected yet', // まだ生徒がいません
    userNotFound: 'Teacher not found. Please check the email address.', // 先生が見つかりません。メールを確認
    cannotAddSelf: 'Cannot add yourself', // 自分は追加できません
    alreadyShared: 'Already connected',  // すでに接続済み
    shareSuccess: 'Now connected with',  // 接続完了：
    addError: 'Failed to connect',       // 接続失敗
    user: 'User',                        // ユーザー
  },

  // Subscription / サブスクリプション
  subscription: {
    title: 'Subscription Management',    // サブスク管理
    subtitle: 'Your plan and usage',     // プランと使用状況
    currentPlan: 'Current Plan',         // 現在のプラン
    active: 'Active',                    // 有効
    freePlan: 'Free Plan',              // 無料プラン
    nextRenewal: 'Next renewal',         // 次回更新日
    cancelScheduled: 'Scheduled to cancel at period end', // 期間終了時にキャンセル予定
    manage: 'Manage Subscription',       // サブスク管理
    processing: 'Processing...',         // 処理中...
    popular: 'Popular',                  // 人気
    perMonth: '/month',                  // /月
    perYear: '/year',                    // /年
    selectPlan: 'Select Plan',           // プラン選択
    startFree: 'Start Free',            // 無料で始める
    usage: 'Usage',                      // 使用状況
    recordings: 'Recordings this month', // 今月の録音数
    savedDiaries: 'Saved diaries',       // 保存済み日記
    sharedMembers: 'Shared members',     // 共有メンバー数
    error: {
      loadStatus: 'Failed to load subscription status', // サブスク状態の読み込み失敗
      checkout: 'Failed to start checkout', // チェックアウト開始失敗
      portal: 'Failed to open management portal', // 管理ポータルを開けません
    },
  },

  // API Usage / API使用状況
  apiUsage: {
    guestMode: 'Guest Mode',            // ゲストモード
    usage: 'Gemini API Usage',          // Gemini API使用状況
    simple: 'Simple',                    // シンプル
    details: 'Details',                  // 詳細
    aiUsage: 'AI Analysis Usage',       // AI分析使用状況
    times: 'times',                      // 回
    status: 'Status',                    // ステータス
    used: 'AI analysis used',           // AI分析使用済み
    available: 'AI analysis available', // AI分析利用可能
    aiLimitGuest: 'AI analysis limited to 1 use. Please login to continue.', // ゲストはAI分析1回まで
    todayUsage: 'Today\'s usage',       // 今日の使用量
    remaining: 'Remaining',              // 残り
    estimatedTokens: 'Estimated tokens', // 推定トークン数
    estimatedCost: 'Estimated cost',     // 推定コスト
    limitReached: 'Daily limit reached. Please try again tomorrow.', // 1日の上限到達。明日再試行
    nearLimit: 'Approaching usage limit.', // 使用上限に近づいています
    resetUsage: 'Reset Usage (Dev)',     // 使用量リセット（開発用）
  },

  // Dashboard / ダッシュボード（親画面）
  parentDashboard: {
    todayDate: 'Today is',               // 今日は
    recordPrompt: 'Record your Japanese diary', // 日本語日記を録音
    recordSubPrompt: '1-3 minutes is perfect!', // 1〜3分でOK！
    topicIdeas: 'Topic ideas:',          // トピックのアイデア:
    topics: {
      food: 'What you ate today',        // 今日食べたもの
      feeling: 'How you\'re feeling',    // 今の気分
      activities: 'What made you happy', // 嬉しかったこと
    },
    startRecording: 'Start Recording',   // 録音開始
    viewDiaries: 'View Past Diaries',    // 過去の日記を見る
    viewDiariesDesc: 'Review your diary history', // 日記履歴を確認
    viewDiaryButton: 'View Diary',       // 日記を見る
    todaySummary: 'Today\'s Summary',    // 今日のまとめ
    speakingScore: 'Speaking Score',      // スピーキングスコア
    todayMood: 'Today\'s Mood',          // 今日の気分
    familyComments: "Teacher's Comments", // 先生のコメント
    familyMessages: "Teacher's Messages", // 先生のメッセージ
    noMessages: 'No messages from your teacher yet', // まだ先生からのメッセージなし
    sharePrompt: 'Connect with your teacher to get feedback', // 先生と繋がってフィードバックをもらおう
    viewAllComments: 'View All Diaries & Comments', // 全日記&コメントを見る
  },

  // Onboarding/Welcome / オンボーディング
  onboarding: {
    steps: [
      {
        title: 'Practice Japanese Every Day',    // 毎日日本語を練習
        description: 'Record a short diary in Japanese each day. Just 1-3 minutes of speaking practice helps you improve naturally.', // 毎日短い日記を録音。1〜3分で自然に上達
        benefit: 'Build a daily Japanese habit'  // 毎日の日本語習慣を作る
      },
      {
        title: 'Just Speak - No Typing Required', // 話すだけ。タイピング不要
        description: 'Press record and speak about your day in Japanese. The app transcribes your speech automatically.', // 録音して話すだけ。自動で文字起こし
        benefit: 'Perfect for busy learners'     // 忙しい学習者に最適
      },
      {
        title: 'Get AI Feedback',                // AIフィードバックをもらう
        description: 'Receive personalized feedback on your grammar, vocabulary, and pronunciation from AI — tailored to your JLPT level.', // JLPTレベルに合わせた文法・語彙・発音のAIフィードバック
        benefit: 'Learn from your mistakes'      // 間違いから学ぶ
      },
      {
        title: 'Track Your Progress',            // 進捗を追跡
        description: 'Review past entries, see your JLPT level progress, and practice with JLPT Speaking Practice questions.', // 過去の日記を振り返り、JLPTレベルの進捗を確認
        benefit: 'Measure your improvement'      // 上達を測定
      }
    ],
    previous: 'Previous',   // 前へ
    next: 'Next',            // 次へ
    start: 'Get Started',   // 始める
    skip: 'Skip',            // スキップ
  },

  // Help / ヘルプ
  help: {
    title: 'Help',                       // ヘルプ
    subtitle: 'How to use guide',        // 使い方ガイド
    home: {
      title: 'Home Screen',             // ホーム画面
      description: 'Record and view your diary entries', // 日記の録音と閲覧
      tips: [
        'Press the large record button to start recording', // 大きな録音ボタンを押して開始
        'Scroll down to see your recent diary entries',     // スクロールして最近の日記を見る
        'Tap a diary entry to see details and AI feedback'  // 日記をタップして詳細とAIフィードバック
      ]
    },
    recording: {
      title: 'Recording Screen',        // 録音画面
      description: 'Record your voice diary in Japanese', // 日本語で音声日記を録音
      tips: [
        'Press the record button to start',              // 録音ボタンを押して開始
        'Speak in Japanese for 1-3 minutes',             // 日本語で1〜3分話す
        'The volume meter shows if your voice is clear', // 音量メーターで声の大きさを確認
        'Review and save your recording when done'       // 終わったら確認して保存
      ]
    },
    diary: {
      title: 'Diary List',              // 日記一覧
      description: 'View your past diary entries', // 過去の日記を見る
      tips: [
        'Tap a diary to see full details',             // 日記をタップして詳細
        'Press play to listen to your recording',      // 再生ボタンで録音を聞く
        'View AI feedback for grammar and vocabulary'  // 文法・語彙のAIフィードバックを見る
      ]
    },
    settings: {
      title: 'Settings',                // 設定
      description: 'Configure your preferences', // 設定をカスタマイズ
      tips: [
        'Set your Japanese level (JLPT)',   // 日本語レベル（JLPT）を設定
        'Manage notifications',              // 通知を管理
        'View your account details'          // アカウント詳細を見る
      ]
    },
    faq: {
      title: 'FAQ',                      // よくある質問
      q1: "Recording doesn't work?",     // 録音が動かない？
      q2: 'How to connect with my teacher?', // 先生との接続方法は？
      q3: 'How to recover deleted diary?', // 削除した日記の復元方法は？
    },
    support: {
      title: "Need more help?",          // もっとヘルプが必要？
      description: 'Contact our support team', // サポートチームに連絡
      button: 'Contact Support',         // サポートに連絡
    },
  },

  // PWA Install / PWAインストール
  pwa: {
    useAsApp: 'Use as App',              // アプリとして使う
    install: 'Install App',              // アプリをインストール
    installDescription: 'Add NihonGo to your home screen for the best experience. You\'ll also receive push notifications.', // ホーム画面に追加して最高の体験を
    iosInstructions: 'Add to home screen to enable push notifications', // ホーム画面に追加してプッシュ通知を有効に
    step1: 'Tap the share button below', // 下の共有ボタンをタップ
    step2: 'Select "Add to Home Screen"', // 「ホーム画面に追加」を選択
    step3: 'Tap "Add" at the top right', // 右上の「追加」をタップ
    installButton: 'Install',            // インストール
    later: 'Later',                      // あとで
  },

  // Pricing / 料金
  pricing: {
    popular: 'Most Popular',             // 一番人気
    currentPlan: 'Current Plan',         // 現在のプラン
    freePlan: 'Free Plan',              // 無料プラン
    processing: 'Processing...',         // 処理中...
    startNow: 'Start Now',              // 今すぐ始める
    managePlan: 'Manage Plan',           // プラン管理
    loginRequired: 'Please login first', // まずログインしてください
    notAvailable: 'This plan is not available', // このプランは利用不可
    error: 'An error occurred. Please try again.', // エラーが発生しました。再試行してください
  },

  // Dialog defaults / ダイアログ
  dialog: {
    confirm: 'Confirm',         // 確認
    cancel: 'Cancel',           // キャンセル
    processing: 'Processing...', // 処理中...
    confirmation: 'Confirmation', // 確認
    areYouSure: 'Are you sure?', // 本当にいいですか？
    execute: 'OK',               // OK
    close: 'Close',              // 閉じる
    showMore: 'Show more',      // もっと見る
  },

  // Subscription pages / サブスクページ
  subscriptionPage: {
    back: 'Back',                        // 戻る
    selectPlan: 'Choose a Plan',         // プランを選ぶ
    chooseDescription: 'Select the plan that fits you best', // 自分に合ったプランを選択
    campaign: 'Limited Time Offer',      // 期間限定オファー
    campaignDesc: 'Try Premium free for 30 days!', // プレミアム30日間無料！
    securePayment: 'Secure Payment',     // 安全な決済
    instantUpgrade: 'Instant Upgrade',   // 即時アップグレード
    faq: 'FAQ',                          // よくある質問
    faqCancelQ: 'Can I cancel anytime?', // いつでもキャンセルできる？
    faqCancelA: 'Yes, you can cancel anytime. Service continues until the end of billing period.', // はい。請求期間終了まで利用可能
    faqPaymentQ: 'What payment methods are accepted?', // 使える支払い方法は？
    faqPaymentA: 'We accept Visa, Mastercard, American Express, and JCB credit cards.', // Visa, MC, Amex, JCB
    faqChangeQ: 'Can I change plans?',   // プラン変更できる？
    faqChangeA: 'Yes, you can upgrade or downgrade anytime. Charges are prorated.', // はい。日割り計算で変更可能
    sslEncrypted: 'SSL Encrypted',       // SSL暗号化
    poweredBy: 'Powered by',             // 提供:
  },

  // Subscription success/cancel / サブスク結果
  subscriptionResult: {
    successTitle: 'Subscription Started!', // サブスク開始！
    successMessage: 'Thank you for subscribing. You now have access to premium features.', // ご登録ありがとうございます。プレミアム機能が使えます
    startApp: 'Start App',               // アプリを開始
    manageSubscription: 'Manage Subscription', // サブスク管理
    premiumActivated: 'Premium features activated. Unlimited recordings, AI analysis, and family sharing are now available.', // プレミアム有効化。無制限録音、AI分析、共有が利用可能
    cancelTitle: 'Subscription Cancelled', // サブスクキャンセル済み
    cancelMessage: 'Your subscription has been cancelled. You can resubscribe anytime.', // キャンセルされました。いつでも再登録可能
    backToApp: 'Back to App',            // アプリに戻る
    reviewPlans: 'Review Plans',         // プラン一覧を見る
    freeFeatures: 'You can still use basic features on the free plan. Recording limits apply.', // 無料プランの基本機能は引き続き利用可能。録音制限あり
  },
} as const;

export type TranslationKey = keyof typeof EN;
