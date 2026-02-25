# English AI Diary 実装計画書

## 概要

既存の「English AI Diary」（日本語の高齢者向け音声日記アプリ）をベースに、英語学習者向けの新アプリ「English AI Diary」を作成する。

| 項目 | 内容 |
|------|------|
| アプリ名 | English AI Diary（仮） |
| ターゲット | TOEIC 500点前後の日本人英語学習者 |
| UI言語 | 100%英語 |
| フィードバック言語 | 日本語 |
| 目的 | 毎日1分以上英語を話す習慣づけ |

---

## 技術スタック（既存）

- React 18 + TypeScript + Vite
- Zustand（状態管理）
- TailwindCSS + Framer Motion
- Supabase（PostgreSQL + Auth + Storage + Edge Functions）
- Google Gemini 2.0 Flash API
- Stripe（決済）
- Firebase Cloud Messaging（通知）

---

## Phase 1: 英語UI化

### 1.1 英語テキスト定数ファイル作成
**新規:** `/src/i18n/en.ts`

```typescript
export const EN = {
  nav: {
    home: 'Home',
    record: 'Record',
    diary: 'My Diary',
    practice: 'Practice',
    settings: 'Settings',
  },
  dashboard: {
    greeting: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    },
    todayPrompt: "Let's record today's diary",
    recordButton: 'Start Recording',
  },
  recording: {
    title: 'Record Your Diary',
    instruction: 'Press the microphone button and speak in English',
    recording: 'Recording...',
    save: 'Save',
    discard: 'Discard',
  },
  // ... more
} as const;
```

### 1.2 音声認識を英語に変更
**変更:** `/src/lib/speechRecognition.ts`
- `this.recognition.lang = 'en-US'`

### 1.3 UIコンポーネント英語化
- `/src/components/navigation/ElderlyNav.tsx`
- `/src/components/dashboard/ElderlyParentDashboard.tsx`
- `/src/components/recording/VoiceRecorder.tsx`
- `/src/components/auth/AuthForm.tsx`
- `/src/components/diary/DiaryCard.tsx`
- `/src/components/diary/DiaryList.tsx`
- `/src/pages/LandingPage.tsx`
- `/src/pages/AppPage.tsx`
- その他UIコンポーネント

---

## Phase 2: AIフィードバック機能

### 2.1 型定義
**変更:** `/src/types/index.ts`

```typescript
interface EnglishFeedback {
  feedback: {
    grammar: GrammarCorrection[];
    vocabulary: VocabSuggestion[];
  };
  pronunciationTips: PronunciationTip[];
  reading: {
    topic: string;
    article: string;
    japaneseSummary: string;
  };
  vocabulary: VocabItem[];
}

interface GrammarCorrection {
  original: string;
  better: string;
  explanation: string;  // 日本語
}

interface VocabSuggestion {
  original: string;
  better: string;
  context: string;  // 日本語
}

interface PronunciationTip {
  word: string;
  ipa: string;
  tip: string;  // 日本語
}

interface VocabItem {
  word: string;
  ipa: string;
  meaning: string;  // 日本語
}
```

### 2.2 フィードバックAPI
**新規:** `/src/lib/gemini-feedback.ts`

Gemini APIにJSON形式でフィードバックを要求するプロンプト:
- 文法・フレーズの修正
- 語彙の改善提案
- 発音アドバイス（2-3語）
- トピック関連の英語記事生成（150-200語）
- Key Vocabulary 10語

### 2.3 フィードバックコンポーネント
**新規:**
- `/src/components/feedback/FeedbackCard.tsx`
- `/src/components/feedback/GrammarFeedback.tsx`
- `/src/components/feedback/PronunciationTips.tsx`
- `/src/components/feedback/ReadingMaterial.tsx`
- `/src/components/feedback/VocabularyList.tsx`

### 2.4 設定画面（CEFRレベル）
**変更:** `/src/components/settings/` → CEFRレベル選択追加

### 2.5 DBスキーマ
**新規:** `/supabase/migrations/xxx_add_feedback_fields.sql`

```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS cefr_level VARCHAR(2) DEFAULT 'A2';

ALTER TABLE public.diaries
ADD COLUMN IF NOT EXISTS ai_feedback JSONB;
```

---

## Phase 3: Versant Test機能

### 3.1 型定義
```typescript
interface VersantQuestion {
  id: string;
  part: 'E' | 'F';
  text: string;
  timeLimit: number;  // 秒
}

interface VersantAnswer {
  id: string;
  questionId: string;
  transcribedText: string;
  feedback: VersantFeedback;
  createdAt: string;
}

interface VersantFeedback {
  cefrLevel: string;
  advice: string;
  sampleAnswer: string;
}
```

### 3.2 問題データ
**新規:** `/src/lib/versant-questions.ts`
- Part E: 要約問題（6問）
- Part F: 意見問題（20問）

### 3.3 TTS（Text-to-Speech）
**新規:** `/src/lib/tts.ts`
- Web Speech API使用
- 英語音声再生

### 3.4 Versantコンポーネント
**新規:**
- `/src/components/versant/VersantHome.tsx`
- `/src/components/versant/QuestionPlayer.tsx`
- `/src/components/versant/AnswerRecorder.tsx`
- `/src/components/versant/PartEQuestion.tsx`
- `/src/components/versant/PartFQuestion.tsx`
- `/src/components/versant/ResultDisplay.tsx`
- `/src/components/versant/TestHistory.tsx`

### 3.5 Versant Store
**新規:** `/src/stores/versantStore.ts`

### 3.6 DBスキーマ
**新規:** `/supabase/migrations/xxx_create_versant_tables.sql`

```sql
CREATE TABLE public.versant_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  question_id TEXT NOT NULL,
  part CHAR(1) NOT NULL,
  transcribed_text TEXT NOT NULL,
  feedback JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 4: テスト・仕上げ

- ユニットテスト
- E2Eテスト（Playwright）
- パフォーマンス最適化
- UI調整

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| Gemini APIコスト増 | キャッシング、レート制限 |
| 英語音声認識精度 | 手動編集機能、ゆっくり話す推奨 |
| TTS音声品質 | 速度調整、将来Cloud TTS検討 |
| プロンプト品質 | イテレーション改善 |

---

## 成功基準

### Phase 1 (完了)
- [x] 全UIが英語表示
- [x] 英語音声認識が動作 (`en-US`)
- [x] 英語テキスト定数ファイル作成 (`/src/i18n/en.ts`)
- [x] ナビゲーションに Practice メニュー追加

### Phase 2 (完了)
- [x] 設定画面でCEFRレベル変更可能
- [x] CEFR判定+日本語フィードバック表示
- [x] 文法修正・語彙提案が表示される
- [x] 発音アドバイスが表示される
- [x] トピック関連の英語記事が生成される
- [x] FeedbackCard コンポーネント作成
- [x] 日記保存時にフィードバック自動生成

### Phase 3 (完了)
- [x] Versant Part E/F 練習可能
- [x] TTS問題読み上げ (Web Speech API)
- [x] 練習履歴保存
- [x] Part E: 6問 (Summary, 30秒)
- [x] Part F: 20問 (Opinion, 40秒)
- [x] AIフィードバック付き結果表示

### Phase 4 (未着手)
- [ ] ユニットテスト
- [ ] E2Eテスト
- [ ] パフォーマンス最適化

---

## ファイル一覧

### 新規作成
| ファイル | Phase | 状態 |
|---------|-------|------|
| `/src/i18n/en.ts` | 1 | ✅ 完了 |
| `/src/lib/gemini-feedback.ts` | 2 | ✅ 完了 |
| `/src/components/feedback/FeedbackCard.tsx` | 2 | ✅ 完了 |
| `/src/components/settings/CEFRSettings.tsx` | 2 | ✅ 完了 |
| `/src/components/settings/SettingsView.tsx` | 2 | ✅ 完了 |
| `/src/components/practice/PracticePlaceholder.tsx` | 2 | ✅ 完了 |
| `/src/lib/versant-questions.ts` | 3 | ✅ 完了 |
| `/src/lib/tts.ts` | 3 | ✅ 完了 |
| `/src/stores/versantStore.ts` | 3 | ✅ 完了 |
| `/src/components/versant/VersantHome.tsx` | 3 | ✅ 完了 |
| `/src/components/versant/PartEPractice.tsx` | 3 | ✅ 完了 |
| `/src/components/versant/PartFPractice.tsx` | 3 | ✅ 完了 |
| `/src/components/versant/ResultDisplay.tsx` | 3 | ✅ 完了 |
| `/src/components/versant/TestHistory.tsx` | 3 | ✅ 完了 |

### 変更
| ファイル | Phase | 状態 |
|---------|-------|------|
| `/src/lib/speechRecognition.ts` | 1 | ✅ 完了 |
| `/src/components/navigation/ElderlyNav.tsx` | 1 | ✅ 完了 |
| `/src/components/dashboard/ElderlyParentDashboard.tsx` | 1 | ✅ 完了 |
| `/src/components/recording/VoiceRecorder.tsx` | 1 | ✅ 完了 |
| `/src/components/auth/AuthForm.tsx` | 1 | ✅ 完了 |
| `/src/components/diary/DiaryCard.tsx` | 1, 2 | ✅ 完了 |
| `/src/components/diary/DiaryList.tsx` | 1 | ✅ 完了 |
| `/src/pages/LandingPage.tsx` | 1 | ✅ 完了 |
| `/src/pages/AppPage.tsx` | 1, 2 | ✅ 完了 |
| `/src/types/index.ts` | 2 | ✅ 完了 |
| `/src/stores/diaryStore.ts` | 2 | ✅ 完了 |
| `/src/stores/authStore.ts` | 2 | ✅ 完了 |
