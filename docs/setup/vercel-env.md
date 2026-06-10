# Vercel環境変数設定手順

## 1. Vercelダッシュボードにアクセス
1. https://vercel.com/dashboard にログイン
2. プロジェクト「ai-voce-journal」を選択

## 2. 環境変数を追加

Settings → Environment Variables に移動して、以下を追加：

### 必要な環境変数

#### 1. Stripe公開可能キー
- **Name**: `VITE_STRIPE_PUBLIC_KEY`
- **Value**: 
```
pk_live_51S0guDLPb2fukwSMiEXRrqNdpWRAFUGtCHUNQyGtKV0qCvJaEhupONgd47bsZKxs4i45JQFJzz9aHRHK1ISnqzlP00kEKZqzqh
```
- **Environment**: Production ✅

#### 2. 月額プラン価格ID
- **Name**: `VITE_STRIPE_MONTHLY_PRICE_ID`
- **Value**: 
```
price_1S1eFYLPb2fukwSM2hclG90B
```
- **Environment**: Production ✅

#### 3. 年額プラン価格ID
- **Name**: `VITE_STRIPE_YEARLY_PRICE_ID`
- **Value**: 
```
price_1S1eFqLPb2fukwSMRosadxxx
```
- **Environment**: Production ✅

#### 4. Supabase URL（既存のものを確認）
- **Name**: `VITE_SUPABASE_URL`
- **Value**: あなたのSupabase URLを確認
- **Environment**: Production ✅

#### 5. Supabase Anonキー（既存のものを確認）
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: あなたのSupabase Anonキーを確認
- **Environment**: Production ✅

## 3. 設定方法

### オプション1: Vercel Dashboard（推奨）
1. Settings → Environment Variables
2. 「Add New」をクリック
3. Name、Value、Environmentを入力
4. 「Save」をクリック
5. すべての変数を追加

### オプション2: Vercel CLI
```bash
# CLIで設定する場合
vercel env add VITE_STRIPE_PUBLIC_KEY production
# プロンプトが表示されたら値を貼り付け

vercel env add VITE_STRIPE_MONTHLY_PRICE_ID production
# 値: price_1S1eFYLPb2fukwSM2hclG90B

vercel env add VITE_STRIPE_YEARLY_PRICE_ID production
# 値: price_1S1eFqLPb2fukwSMRosadxxx
```

## 4. デプロイして反映

環境変数を追加した後：

1. 新しいデプロイをトリガー：
```bash
vercel --prod
```

または

2. Vercelダッシュボードで「Redeploy」をクリック

## 5. 確認方法

デプロイ後、ブラウザの開発者ツールで確認：
1. アプリを開く
2. Console に以下を入力：
```javascript
console.log(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
```
値が表示されればOK

## ⚠️ 重要な注意点

- `VITE_` プレフィックスが必要（Viteの仕様）
- Production環境にチェックを入れる
- 値の前後にスペースや改行を入れない
- 変更後は必ず再デプロイが必要

## トラブルシューティング

### 環境変数が反映されない場合
1. キャッシュをクリア
2. 再デプロイ
3. ブラウザのハードリロード（Cmd+Shift+R）

### undefined が返される場合
1. 変数名のタイポをチェック
2. VITE_プレフィックスを確認
3. Production環境が選択されているか確認