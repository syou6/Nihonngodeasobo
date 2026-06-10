# Edge Functions デプロイ手順

## 方法1: Supabase CLIを使う場合

```bash
# 1. Supabase CLIをインストール（まだの場合）
brew install supabase/tap/supabase

# 2. ログイン
supabase login

# 3. プロジェクトをリンク（データベースパスワードが必要）
supabase link --project-ref dtcskayvcsrgjausqkni

# 4. Edge Functionsをデプロイ
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

## 方法2: Supabaseダッシュボードから手動デプロイ（推奨）

### Step 1: create-checkout-session 関数を作成

1. [Supabase Dashboard](https://supabase.com/dashboard/project/dtcskayvcsrgjausqkni/functions) を開く
2. **Functions** → **Create a new function**
3. 関数名: `create-checkout-session`
4. 以下のコードを貼り付け：

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    // CORSヘッダー
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    const { priceId, userId, successUrl, cancelUrl } = await req.json()

    // ユーザー情報を取得
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single()

    if (userError) throw userError

    let customerId = userData?.stripe_customer_id

    // Stripeカスタマーが存在しない場合は作成
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          supabase_user_id: userId,
        },
      })
      
      customerId = customer.id

      // カスタマーIDをデータベースに保存
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    // チェックアウトセッションを作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
        },
      },
      metadata: {
        supabase_user_id: userId,
      },
      allow_promotion_codes: true,
      locale: 'ja',
    })

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
```

5. **Deploy** をクリック

### Step 2: stripe-webhook 関数を作成

1. **Functions** → **Create a new function**
2. 関数名: `stripe-webhook`
3. `/supabase/functions/stripe-webhook/index.ts` の内容を貼り付け
4. **Deploy** をクリック

## 方法3: GitHub経由での自動デプロイ

1. GitHubリポジトリとSupabaseプロジェクトを連携
2. Push時に自動デプロイ

## デプロイ後の確認

1. Functions一覧に表示されているか確認
2. ステータスが「Active」になっているか確認
3. URLをメモ：
   - `https://dtcskayvcsrgjausqkni.supabase.co/functions/v1/create-checkout-session`
   - `https://dtcskayvcsrgjausqkni.supabase.co/functions/v1/stripe-webhook`