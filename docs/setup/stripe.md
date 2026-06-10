# Stripe 課金セットアップ

> このドキュメントは旧 `STRIPE_SETUP.md` / `STRIPE_ACTIVATION.md` /
> `STRIPE_PRODUCTION_SETUP.md` / `STRIPE_FINAL_SETUP.md` /
> `STRIPE_SETUP_COMPLETE.md` / `update_stripe_config.md` / `stripe-cli-setup.md`
> を統合したものです。
>
> **現在の価格:** $8.99/月 または $59/年（[`docs/REVENUE.md`](../REVENUE.md) と
> アプリ・Stripe が整合）。本ドキュメント下部の旧 ¥ 建てプラン表
> （¥500/¥980/¥1,980 等）はピボット前の履歴であり、現行プランではありません。

## 1. Stripe アカウントと API キー

1. [Stripe](https://dashboard.stripe.com/) にログイン
2. 開発者 → API キー
3. 以下をコピー：
   - 公開可能キー（`pk_live_...` / テストは `pk_test_...`）
   - シークレットキー（`sk_live_...` / テストは `sk_test_...`）

> ⚠️ シークレットキー（`sk_...`）は絶対にフロントエンドに含めない / Git に
> コミットしない。漏洩した場合は即ローテーション。

## 2. 商品と価格（Price）の作成

Stripe ダッシュボード → 商品 で、現行プランに対応する Price を作成：

- **月額プラン** — $8.99/月（recurring, monthly） → `VITE_STRIPE_PREMIUM_PRICE_ID`
- **年額プラン** — $59/年（recurring, yearly） → `VITE_STRIPE_ANNUAL_PRICE_ID`

作成した `price_...` ID を控えておく（公開 ID なので env に入れて配布して問題ない）。

## 3. 環境変数

### フロントエンド（Vercel / `.env`）

```env
VITE_STRIPE_PUBLIC_KEY=YOUR_PUBLISHABLE_KEY_FROM_STRIPE_DASHBOARD
VITE_STRIPE_PREMIUM_PRICE_ID=YOUR_MONTHLY_PRICE_ID
VITE_STRIPE_ANNUAL_PRICE_ID=YOUR_ANNUAL_PRICE_ID
# 任意: オンボーディング割引クーポン
VITE_STRIPE_ONBOARDING_COUPON_ID=
```

Vercel CLI で設定する場合：

```bash
vercel env add VITE_STRIPE_PUBLIC_KEY production
vercel env add VITE_STRIPE_PREMIUM_PRICE_ID production
vercel env add VITE_STRIPE_ANNUAL_PRICE_ID production
# 設定後は再デプロイ: vercel --prod
```

`VITE_` プレフィックスは Vite の仕様で必須。詳細は
[`vercel-env.md`](./vercel-env.md) を参照。

### Supabase Edge Functions（Secrets）

Supabase ダッシュボード → Project Settings → Edge Functions → Secrets：

```env
STRIPE_SECRET_KEY=YOUR_SECRET_KEY_FROM_STRIPE_DASHBOARD
STRIPE_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_FROM_STRIPE_DASHBOARD
```

## 4. Edge Functions のデプロイ

```bash
npm install -g supabase   # 未インストールの場合
supabase login
supabase link --project-ref YOUR_PROJECT_REF

supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
```

(`cancel-subscription` 等、リポジトリの `supabase/functions/` に存在する関数を
必要に応じてデプロイ。)

## 5. Webhook の設定

1. Stripe ダッシュボード → 開発者 → Webhook → エンドポイントを追加
2. URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
3. リッスンするイベント：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. 署名シークレット（`whsec_...`）をコピーし、上記 Supabase Secrets の
   `STRIPE_WEBHOOK_SECRET` に設定。

Webhook が `subscriptions` テーブルに書き込むことで、決済後に `isPremium` が
切り替わります（プレミアム判定の起点）。

## 6. データベーステーブル

`supabase/migrations/` のマイグレーションに含まれます
（[`../APPLY_MIGRATIONS.md`](../APPLY_MIGRATIONS.md) 参照）。参考として、課金関連の
代表的なスキーマは以下の通り（RLS 有効）：

```sql
-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- payment_history
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER,
  currency TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- profiles に Stripe 顧客 ID を追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own payment history" ON payment_history
  FOR SELECT USING (auth.uid() = user_id);
-- Webhook 用（service_role）
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');
```

## 7. テスト用カード番号

| 用途 | 番号 |
|------|------|
| 成功 | `4242 4242 4242 4242` |
| 拒否 | `4000 0000 0000 0002` |
| 3D セキュア認証 | `4000 0025 0000 3155` |

有効期限は任意の将来日付、CVC は任意の 3 桁、郵便番号は任意の 5 桁。

## 8. Stripe CLI（運用・ローカル開発）

```bash
# ログイン（インタラクティブ）
stripe login
# もしくは API キーを直接指定
stripe --api-key YOUR_SECRET_KEY [command]

# ローカルへ Webhook を転送
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
stripe trigger payment_intent.succeeded

# 確認系
stripe products list
stripe prices list
stripe customers list
stripe subscriptions list
stripe charges list
```

> 本番（live）操作は慎重に。`sk_live_...` を使うコマンドのキーは履歴に残さない。

## トラブルシューティング

- **決済完了してもプランが更新されない** — Webhook の設定・イベント、
  Edge Function ログ、Stripe Webhook ログを確認。`subscriptions` テーブルへの
  書き込みと `isPremium` 反映を確認。
- **"Stripe failed to load"** — 公開可能キーが正しく設定されているか、
  広告ブロッカーを確認。
- **環境変数が `undefined`** — `VITE_` プレフィックス、Production 環境の選択、
  再デプロイを確認。

---

## 付録: Stripe 本番環境申請用 サービス説明（テンプレート）

> 申請フォーム記入の参考用テンプレート。最新のプロダクト（日本語ピッチアクセント
> トレーナー）の内容・URL・価格に置き換えて使用すること。

申請時のポイント：

1. **明確な商品説明** — 何を販売しているか具体的に（例: 日本語の発音
   ピッチアクセントを練習するサブスクリプション型 Web アプリ）。
2. **料金体系** — 価格と請求サイクル（$8.99/月、$59/年）を明記。
3. **返金・キャンセルポリシー** — 条件を明記（例: 初回登録から一定期間内は返金対応、
   いつでもキャンセル可・次回請求日まで利用可）。
4. **サポート体制** — 連絡先メールと対応時間を明記。
5. **法的文書** — 利用規約・プライバシーポリシー・特定商取引法に基づく表記の URL。

---

## 付録: 履歴（旧 ¥ 建てプラン — 現行ではない）

ピボット前に Stripe 上で作成された旧プラン。参考のため記録（現在は無効/非推奨）：

- ベーシック 月額 ¥500 / 年額 ¥5,000（商品 `prod_SxZO5IqYKZmN32`）
- プレミアム ¥980/月、ファミリー ¥1,980/月（アーカイブ済み）

旧 MCP 設定メモ（`update_stripe_config.md` 由来）: Claude Desktop の
`claude_desktop_config.json` で Stripe MCP の `STRIPE_API_KEY` を本番キーに
更新する手順があったが、現行運用では不要なら削除してよい。
