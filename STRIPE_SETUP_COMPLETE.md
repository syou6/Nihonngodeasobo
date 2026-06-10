# Stripe決済設定完了 ✅

## 設定完了項目

### 1. Vercel環境変数 ✅
- VITE_STRIPE_PUBLIC_KEY
- VITE_STRIPE_MONTHLY_PRICE_ID  
- VITE_STRIPE_YEARLY_PRICE_ID

### 2. Supabaseデータベース ✅
- subscriptionsテーブル作成済み
- payment_historyテーブル作成済み
- usersテーブルにstripe_customer_id追加済み
- RLSポリシー設定済み

### 3. Edge Functions ✅
- create-checkout-session: デプロイ済み
- stripe-webhook: デプロイ済み

### 4. Stripe Webhook ✅
- URL: https://dtcskayvcsrgjausqkni.supabase.co/functions/v1/stripe-webhook
- Webhook ID: we_1S1ezgLPb2fukwSMPDmeybsb
- Webhook Secret: whsec_YOUR_WEBHOOK_SECRET

## 🔴 重要：最後の手順

Supabaseダッシュボードで以下の環境変数を設定してください：

1. [Supabaseダッシュボード](https://supabase.com/dashboard/project/dtcskayvcsrgjausqkni/settings/vault)にアクセス
2. Settings → Edge Functions → Secrets
3. 以下を追加：

```
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_FROM_STRIPE_DASHBOARD
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

## テスト方法

環境変数設定後、以下でテスト可能：

1. アプリにログイン
2. 設定画面から「プランをアップグレード」をクリック
3. Stripeチェックアウトページが表示される
4. テストカード使用：4242 4242 4242 4242
5. 決済完了後、サブスクリプションが有効化される

## 確認事項

- [ ] Supabaseに環境変数を設定
- [ ] アプリを再デプロイ（vercel --prod）
- [ ] チェックアウトフローをテスト