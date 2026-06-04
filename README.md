# 日本語であそぼ (AI Voice Journal)

AI を活用した日本語学習アプリ。音声で日記を録音し、NVIDIA NIM (LLM) がフィードバックを提供します。

## 技術スタック

- **フロントエンド:** React 18 + TypeScript + Vite + Tailwind CSS
- **状態管理:** Zustand
- **バックエンド:** Supabase (認証・DB・Edge Functions)
- **AI:** NVIDIA NIM / qwen2.5-72b-instruct (テキストフィードバック)
- **音声/ピッチ解析:** クライアント側 (pitchy + hatsuon)
- **決済:** Stripe
- **通知:** Firebase Cloud Messaging
- **テスト:** Vitest + Playwright

## 主な機能

- 音声日記の録音と AI フィードバック
- Versant 練習 (Part E / Part F)
- 保護者・先生向けダッシュボード
- 高齢者向け UI モード
- ゲストモード (未登録でも試用可能)
- サブスクリプション (Stripe)
- PWA 対応・プッシュ通知

## セットアップ

```bash
npm install
cp .env.example .env  # 環境変数を設定
npm run dev
```

### 環境変数

| 変数名 | 説明 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase プロジェクト URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key |
NVIDIA NIM の API キーは Supabase Edge Function 側で管理:
```bash
supabase secrets set NVIDIA_API_KEY=your_key
# モデル変更は任意（既定: qwen/qwen2.5-72b-instruct）
supabase secrets set NVIDIA_MODEL=qwen/qwen2.5-72b-instruct
```

## スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run test` | ユニットテスト実行 |
| `npm run test:e2e` | E2E テスト実行 |
| `npm run test:all` | 全テスト実行 |
