# Stripe CLI セットアップガイド

## 1. ログイン方法

### オプション1: インタラクティブログイン
```bash
stripe login
```
表示されたURLをブラウザで開いて認証

### オプション2: APIキーを直接使用
```bash
# テスト環境
stripe listen --api-key sk_test_xxx

# 本番環境 
stripe --api-key sk_live_xxx [command]
```

## 2. よく使うコマンド

### 商品・価格の作成
```bash
# 商品を作成
stripe products create \
  --name="English AI Diary プレミアムプラン" \
  --description="月額980円のプレミアムプラン"

# 価格を作成
stripe prices create \
  --product=prod_xxx \
  --unit-amount=980 \
  --currency=jpy \
  --recurring[interval]=month
```

### 商品・価格の確認
```bash
# 商品一覧
stripe products list

# 価格一覧
stripe prices list

# 特定の商品を確認
stripe products retrieve prod_xxx
```

### 顧客管理
```bash
# 顧客一覧
stripe customers list

# 顧客検索
stripe customers list --email=user@example.com

# 顧客詳細
stripe customers retrieve cus_xxx
```

### サブスクリプション管理
```bash
# サブスクリプション一覧
stripe subscriptions list

# 特定顧客のサブスクリプション
stripe subscriptions list --customer=cus_xxx

# サブスクリプションキャンセル
stripe subscriptions cancel sub_xxx
```

### 支払い履歴
```bash
# 支払い一覧
stripe charges list

# 請求書一覧
stripe invoices list
```

### Webhookテスト（ローカル開発用）
```bash
# Webhookイベントをローカルに転送
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# 特定のイベントをトリガー
stripe trigger payment_intent.succeeded
```

## 3. 本番環境での作業

本番環境で作業する場合は、必ず `--live` フラグまたは本番APIキーを使用：

```bash
# 本番モードで実行
stripe --api-key sk_live_xxx products list

# または環境変数を設定
export STRIPE_API_KEY=sk_live_xxx
stripe products list
```

## 4. 環境変数の設定

```bash
# .envファイルに追加
echo "STRIPE_API_KEY=sk_test_xxx" >> .env.local

# または一時的に設定
export STRIPE_API_KEY=sk_test_xxx
```

## 5. 便利なエイリアス

```bash
# ~/.zshrcまたは~/.bashrcに追加
alias stripe-test='stripe --api-key sk_test_xxx'
alias stripe-live='stripe --api-key sk_live_xxx'
alias stripe-listen='stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook'
```

## 注意事項

- 本番環境のAPIキーは絶対にGitにコミットしない
- 本番環境での操作は慎重に行う
- テスト環境で十分にテストしてから本番に適用