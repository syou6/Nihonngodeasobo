import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// Stripe公開キー（環境変数から取得）
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number; // 定価（割引前）
  interval: 'month' | 'year';
  features: string[];
  stripePriceId?: string;
}

// Stripe coupon ID for onboarding discount (set in .env)
export const ONBOARDING_COUPON_ID = import.meta.env.VITE_STRIPE_ONBOARDING_COUPON_ID || '';

export const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: [
      'Unlimited pitch perception drills',
      '5 voice scorings per day',
      'See your contour vs a native speaker',
      'All 4 pitch patterns — intro words'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 8.99,
    interval: 'month',
    stripePriceId: import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID,
    features: [
      'Unlimited voice pitch scoring',
      'Full curated word curriculum',
      'Instant drop-location coaching',
      'Streak & per-pattern progress',
      'Minimal-pair drills (箸/橋, 雨/飴)',
      'Priority support'
    ]
  },
  {
    id: 'premium-annual',
    name: 'Premium — Annual',
    price: 59,
    originalPrice: 107.88,
    interval: 'year',
    stripePriceId: import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID,
    features: [
      'Everything in Premium',
      '2 months free vs monthly',
      'Best value for a 90-day pitch sprint'
    ]
  }
];

export class StripeService {
  /**
   * Stripeのチェックアウトセッションを作成
   */
  static async createCheckoutSession(priceId: string, userId: string, couponId?: string) {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        priceId,
        userId,
        couponId,
        successUrl: `${window.location.origin}/app.html?view=subscription-success`,
        cancelUrl: `${window.location.origin}/app.html?view=subscription-cancel`
      }
    });

    if (error) throw error;

    // Stripe Checkout URLに直接リダイレクト。data が null/undefined でも
    // ここで投げ、呼び出し側が「無言で無料に流す」のを防ぐ。
    if (data?.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No checkout URL returned');
    }
  }

  /**
   * 現在のサブスクリプション状態を取得
   */
  static async getSubscriptionStatus(userId: string) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data || { status: 'free', plan_id: 'free' };
    } catch {
      return { status: 'free', plan_id: 'free' };
    }
  }

  /**
   * サブスクリプションをキャンセル
   */
  static async cancelSubscription(subscriptionId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { subscriptionId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 支払い履歴を取得
   */
  static async getPaymentHistory(userId: string) {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  }

  /**
   * カスタマーポータルURLを取得（Stripeの管理画面へ）
   */
  static async getCustomerPortalUrl(userId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { userId, returnUrl: window.location.origin }
      });

      if (error) throw error;
      return data.url;
    } catch (error) {
      throw error;
    }
  }
}

export default StripeService;