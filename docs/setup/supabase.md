# Supabase設定手順

## 1. Supabaseダッシュボードで環境変数設定

1. [Supabaseダッシュボード](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. Settings → Edge Functions → Secrets
4. 以下を追加：

```
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_FROM_STRIPE_DASHBOARD
```

## 2. Edge Functionsをデプロイ

```bash
# Supabase CLIインストール（未インストールの場合）
brew install supabase/tap/supabase

# ログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref [your-project-ref]

# Edge Functionsをデプロイ
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

## 3. データベーステーブルを作成

SQLエディタで以下を実行：

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan_type TEXT CHECK (plan_type IN ('free', 'basic_monthly', 'basic_yearly')),
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  amount INTEGER,
  currency TEXT DEFAULT 'jpy',
  status TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add stripe_customer_id to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own payment history
CREATE POLICY "Users can view own payment history" ON payment_history
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for webhook)
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage payment history" ON payment_history
  FOR ALL USING (auth.role() = 'service_role');
```

## 4. Stripe Webhook設定

1. [Stripeダッシュボード](https://dashboard.stripe.com/) → 開発者 → Webhook
2. 「エンドポイントを追加」
3. エンドポイントURL: `https://[your-project-ref].supabase.co/functions/v1/stripe-webhook`
4. イベントを選択：
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed

5. 署名シークレットをコピー（whsec_xxx形式）
6. SupabaseのEdge Functions Secretsに追加：
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

## 5. 公開可能キーの確認

Stripeダッシュボードで公開可能キーを確認：
- 開発者 → APIキー
- 公開可能キー: pk_live_xxx...