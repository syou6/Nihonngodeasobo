# Googleログイン リダイレクト設定修正

## 問題
Googleログイン後、アプリではなくホームページにリダイレクトされる

## 修正手順

### 1. コード修正（完了）
- `src/stores/authStore.ts` のリダイレクトURLを `/app` から `/` に変更

### 2. Supabaseダッシュボードでの設定

1. [Supabase Dashboard](https://supabase.com/dashboard)にログイン
2. プロジェクトを選択
3. **Authentication** → **URL Configuration** に移動
4. 以下のURLを追加/確認：

#### Redirect URLs（リダイレクトURL）
```
http://localhost:5173/
http://localhost:5174/
http://localhost:5175/
http://localhost:5176/
http://localhost:5177/
https://あなたのドメイン.vercel.app/
https://あなたのドメイン.com/
```

#### Site URL
```
http://localhost:5176/
```
（本番環境では本番URLに変更）

### 3. Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/)にログイン
2. プロジェクトを選択
3. **APIs & Services** → **Credentials** に移動
4. OAuth 2.0 クライアントIDを編集
5. **Authorized redirect URIs** に以下を追加：

```
https://dtcskayvcsrgjausqkni.supabase.co/auth/v1/callback
```

### 4. テスト方法

1. ブラウザのシークレットモードで開く
2. Googleログインを試す
3. 正常にアプリにリダイレクトされることを確認

## トラブルシューティング

### ローカル開発環境での問題
- ポート番号が変わる場合は、その都度SupabaseのRedirect URLsに追加
- `localhost` と `127.0.0.1` の両方を登録しておくと安全

### 本番環境での問題
- Vercelのドメインが正しくRedirect URLsに登録されているか確認
- HTTPSが必須なので、必ず `https://` で登録

### セッション維持の問題
ログイン後にセッションが保持されない場合：
```javascript
// App.tsxの初期化部分を確認
useEffect(() => {
  initialize(); // これが正しく呼ばれているか
}, []);
```