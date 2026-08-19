# NihonGo — LP & マーケティング

日本語の高低アクセント訓練アプリ **NihonGo: Pitch Accent Trainer** のランディングページとマーケティング資材。

- App Store: https://apps.apple.com/jp/app/nihongo-pitch-accent-trainer/id6796564239
- 本番サイト: https://nihongo.amorjp.com/

**作業前に `CLAUDE.md` を読むこと**(現状・デザイントークン・書いてよい事実の制約)。経緯と次の一手は `docs/CONTEXT.md`。

## 構成

| パス | 中身 |
|---|---|
| `public/index.html` | 本番LP。単一ファイル・素のHTML/CSS/JS。**ここが主戦場** |
| `public/learn/` | SEO記事 84ページ(静的HTML) |
| `public/pitchi/` | マスコット Pitchi のイラスト(webp) |
| `marketing/` | TikTok/YouTube向け動画の自動生成(Node + Playwright + ffmpeg) |
| `vercel.json` | 旧Webアプリへのリダイレクト + `/r/:tag` インストール計測 |
| `src/`, `app.html` | 旧Webアプリ。本番からは到達不能(削除はしていない) |

## 開発

```bash
npm install
npm run build     # ビルド確認。dist/index.html が出れば成功
```

LPは静的HTMLなので、`public/index.html` を直接編集 → `npm run build` → push。
Vercelがmainブランチのpushで自動デプロイ。**pushしたら本番URLをcurlで叩いて反映を確認する。**

## マーケ動画の生成

```bash
node marketing/generate-batch.mjs                      # TikTok版(画面にURLを出さない)
node marketing/generate-batch.mjs --platform youtube    # YouTube版(URL + SEOタイトル/概要欄付き)
node marketing/generate-batch.mjs --tease               # 答えを明かさない版(コメント誘発)
node marketing/record-ear.mjs                           # 実アプリのゲームプレイ録画
```

生成物は `marketing/out-batch*/` に出る(約423MB、gitignore済み。スクリプトから再生成可能)。

## 注意

ルート直下の `STRIPE_*.md` `FIREBASE_*.md` `SUPABASE_SETUP.md` `PLAN.md` 等は
**旧「AI音声日記アプリ」時代の遺物**で、現行プロダクトとは無関係。
