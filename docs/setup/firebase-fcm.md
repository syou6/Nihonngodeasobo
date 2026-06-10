# Firebase Cloud Messaging (FCM) / Web Push セットアップ

> このドキュメントは旧 `FIREBASE_SETUP.md` / `CLOUD_MESSAGING_SETUP.md` /
> `GET_FCM_KEY.md` / `ALTERNATIVE_FCM_SETUP.md` を統合したものです。プッシュ通知
> （家族日記・コメント・リマインダー）は副次機能のため、必要な場合のみ設定して
> ください。通知システム全体の設計は [`push-notifications.md`](./push-notifications.md) を参照。

## 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名を入力（例: `nikki-ai`）
4. Googleアナリティクスは任意（「今はスキップ」で可）

## 2. ウェブアプリを追加

1. プロジェクトのダッシュボードで「</> ウェブ」アイコンをクリック
2. アプリ名を入力し「アプリを登録」
3. 表示される設定値（`firebaseConfig`）をコピー：

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## 3. Cloud Messaging を有効化し VAPID（Web Push）公開鍵を取得

1. 左メニューの「Messaging」または「Cloud Messaging」を開く（初回は「開始」をクリック）
2. 「⚙️ プロジェクト設定」→「Cloud Messaging」タブ
3. 「Web configuration」→「Web Push certificates」セクションを開く
4. 鍵ペアがなければ「**Generate key pair**」をクリック。
   既にある場合は表示されている長い文字列（`Bxxxxxxx...`）をコピー
5. これが **VAPID 公開鍵（FCM 公開鍵）** です

### 「Generate key pair」ボタンが見つからない / 鍵が取得できない場合

- すでに鍵ペアが生成済みで、表示中の文字列がそのまま公開鍵のケースが多い。
- それでも詰まる場合は、自分で VAPID キーを生成してそのまま使える（下記）。
  Firebase の Web Push 証明書を使わなくても Web Push は動作する。
- 必要なら Google Cloud Console の「APIとサービス」で
  **Firebase Cloud Messaging API** を有効化する。

### VAPID キーを自分で生成する（代替）

```bash
npx web-push generate-vapid-keys
```

出力された公開鍵・秘密鍵を `.env` に設定します。多くのプロジェクトでは Firebase の
キーではなく独自に生成した VAPID キーを使用しています。

## 4. .env ファイルに設定

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID

# VAPID / Web Push 公開鍵（FCM 公開鍵と同じ値）
VITE_FCM_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
VITE_VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
# 秘密鍵はクライアントに含めない。Edge Functions 側の secret として扱う
VITE_VAPID_PRIVATE_KEY=YOUR_VAPID_PRIVATE_KEY
```

> ⚠️ VAPID **秘密鍵** は絶対にクライアントに公開しない / Git にコミットしない。

## 5. 関連ファイルを更新

- `src/lib/firebase.ts` — 設定値を環境変数から読み込む（実装済み）
- `public/firebase-messaging-sw.js` — Service Worker 側の Firebase 設定値を更新

## 6. アプリを再起動

```bash
npm run dev
```

## 動作確認

1. ブラウザの開発者ツール（F12）を開く
2. 以下が表示されればOK：
   - `Service Worker registered`
   - `Firebase Service Worker registered`
   - `FCM Token:` が出力される（エラーがないこと）
3. 設定画面で通知を有効化し「テスト通知を送信」

## トラブルシューティング

- **通知が届かない:** ブラウザの通知権限、Service Worker の登録状況
  （開発者ツール → Application → Service Workers）、Cloud Messaging が有効かを確認。
- **iOSで届かない:** iOS 16.4 以降で、PWA としてホーム画面に追加されている必要がある。
- **「Provider not enabled」エラー:** Google Cloud Console で
  Firebase Cloud Messaging API を有効化する。
