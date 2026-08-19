# NihonGo — プロジェクト文脈

このファイルは Claude Code が毎セッション自動で読み込む。作業前にここを読めば現状が分かる。
詳しい経緯・判断理由は `docs/CONTEXT.md`。

## いま何を売っているか

**NihonGo: Pitch Accent Trainer** — 日本語の高低アクセントを「耳で聞き分ける → 声で再現する」iOSアプリ。

- App Store: https://apps.apple.com/jp/app/nihongo-pitch-accent-trainer/id6796564239 (**公開済み**)
- 本番サイト: https://nihongo.amorjp.com/ (**ランディングページ専用**)
- リポジトリ: `syou6/Nihonngodeasobo` / ブランチ `main`

課金は**サブスクのみ、無料枠なし**。月 $8.99 / 年 $59.99(推し) / 買い切り $129.99、全プラン7日間無料トライアル。

## このリポジトリの現在の役割

**LP1枚 + SEO記事 + マーケ動画生成パイプライン。** Webアプリとしては動いていない。

| 対象 | 状態 |
|---|---|
| `public/index.html` | **本番LP。ここが主戦場。** 単一ファイル・素のHTML/CSS/JS |
| `public/learn/` | SEO記事 84ページ(静的HTML) |
| `marketing/` | TikTok/YouTube向け動画の自動生成パイプライン(Node + Playwright + ffmpeg) |
| `src/`, `app.html` | **旧Webアプリ。生きているが本番からは到達不能**(下記) |
| `supabase/functions/` | 旧アプリのEdge Functions。未使用だが削除していない |

### 旧Webアプリを「隠している」仕組み

iOSアプリがサブスク専用になったため、無料で遊べるWeb版は competitor になる。そこで**削除ではなく非表示**にした(オーナー判断)。

`vercel.json` の redirects で `/app`, `/app.html`, `/app/*`, `/subscription/*` を `/` に307リダイレクトしているだけ。**そのブロックを消せばWeb版は即復活する。** `src/` 以下のコード・Stripe連携・Supabase連携は無傷で残っている。

Stripe/Supabase の環境変数もまだ revoke していない(非表示方針のため保留)。

## デザインシステム(iOSアプリと一致させる。逸脱禁止)

ダークテーマのみ。ライト/ダーク切替は作らない(アプリに無い)。

```
--bg:#0B0E17  --bg2:#0E1220  --card:#131828  --card2:#1A2136
--line:#222A40  --stage:#070910(ピッチ可視化の背後のみ)
--text:#F2F4F8  --sub:#8B93A7  --dim:#5A6175(12px以上のsemiboldラベル専用。本文サイズはAA不合格)
--teal:#7FD4C1(primary/正解)  --tealDeep:#4A9D8A(hover)
--amber:#FFB454(streak/惜しい)  --rose:#FF7A8A(Pitchiが聞き違えた時)  --violet:#9D8CFF(premium)
```

- **アクセント色は1色1役。** teal を装飾に散らさない。稀に出て、出たら必ず意味がある状態を保つ。
- 影・グラデ・グラスモーフィズム**すべて禁止**。奥行きは `bg → bg2 → card → card2` のサーフェス階層だけで出す。
- フォント: 英語 = **Outfit** / 日本語 = **Zen Maru Gothic**。日本語をLatinフォントやシステムフォントで組まない(丸ゴシックがブランドの一部)。
- ピッチのモチーフ = **2段のドット列**(モーラごとに1点、アクセント落ちで段差になる細い線でつなぐ)。絵文字アイコン(🥢🌉👂🎤🎯)は使わない。

### マスコット Pitchi

teal の小さな浮遊生物。丸い体、手足なし。**縦長楕円の大きな耳が頭の上に生え、左右非対称**(左はほぼ直立、右は約40度外へ傾く)。目は点で中心より下、小さな笑み。

Pitchi はコーチでも先生でもなく **「聞き手」** — あなたが理解されたい相手。ピッチを文字通りに聞くのが欠点で、「あめ」を違う高低で言うと雨ではなく飴を真顔で差し出す。**勝利条件はスコアではなく「Pitchi に伝わった」。**

正確に描けないなら描かない。間違ったマスコットは無いより悪い。イラストは `public/pitchi/*.webp` に実物あり。

## 書いてよい事実 / 書いてはいけないこと

**書いてよい:**
- 最小対 36ペア / アクセント種別つき 611語
- 検証ストーリー: 「全単語のアクセントは OpenJTalk アクセント辞書由来。各録音は実際のピッチ曲線を計測し、宣言されたアクセントと照合。一致しなかった音声は破棄した(818生成 → 611採用)」
- オンデバイス採点(YINアルゴリズム)、アカウント不要、サーバーなし、機内でも動く

**禁止(虚偽または証明不能):**
- 「real native audio」 → 音声は**合成**。上の検証ストーリーで置き換える(その方が強い)
- 「slow-mo replay」「A/B loop」 → 存在しない
- 「100+ minimal pairs」 → 実際は36
- 無料プラン・無料版の記述
- 証言・評価・ユーザー数・メディアロゴ・「導入企業」 — **ユーザーはまだ実質いない。捏造した証拠は無い方がマシ**
- 出典のない競合価格比較

## 計測リンク

チャネル別のインストール計測用に `/r/:tag` を用意(`vercel.json` の redirects)。App Store の provider token 付き。

`/r/lp` `/r/bio` `/r/x` `/r/x_jp` `/r/reddit` `/r/reddit_profile` `/r/hn` `/r/discord` `/r/wanikani` `/r/influencer`(末尾スラッシュ版も有り)

LP内のApp Storeボタンは `public/index.html` の `var APP_STORE_URL = '/r/lp';` を経由する。

## 作業フロー(このプロジェクトの標準)

1. 変更する
2. `npm run build` でローカルビルド確認
3. コミット → `git push origin main`(Vercelが自動デプロイ)
4. **本番URLを curl で叩いて実際に反映されたか確認する。** ここまでやって「完了」

ビルド時に `gemini-api.ts` 等の dynamic import 警告が出るが既存のもので無害。`dist/index.html` が生成されていれば成功。

## 注意点

- `marketing/out-batch*/` の生成済み動画は約423MB。**gitignore 済み。GitHubに上げない。** スクリプトから再生成できる。
- ルートに残っている `STRIPE_*.md` `FIREBASE_*.md` `PLAN.md` 等は**旧アプリ時代の遺物**。現行とは無関係。
- `public/learn/` の84ページは内部リンクをすべて `/` に修正済み(旧app.htmlへのリンクは残っていない)。
