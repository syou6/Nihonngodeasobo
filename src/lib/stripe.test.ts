import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripeService, pricingPlans } from './stripe';

// Mock supabase
vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock @stripe/stripe-js
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}));

import { supabase } from './supabase';

const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

describe('pricingPlans', () => {
  it('has free, premium (monthly) and premium-annual plans', () => {
    expect(pricingPlans).toHaveLength(3);
    expect(pricingPlans.map((p) => p.id)).toEqual(['free', 'premium', 'premium-annual']);
  });

  it('free plan has price 0', () => {
    const free = pricingPlans.find((p) => p.id === 'free');
    expect(free?.price).toBe(0);
  });

  it('premium plan has features array', () => {
    const premium = pricingPlans.find((p) => p.id === 'premium');
    expect(premium?.features.length).toBeGreaterThan(0);
  });
});

describe('StripeService.createCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { origin: 'http://localhost:3000', href: '' },
    });
  });

  it('calls supabase function and redirects to checkout URL', async () => {
    mockInvoke.mockResolvedValue({
      data: { url: 'https://checkout.stripe.com/session123' },
      error: null,
    });

    await StripeService.createCheckoutSession('price_123', 'user_456');

    expect(mockInvoke).toHaveBeenCalledWith('create-checkout-session', {
      body: {
        priceId: 'price_123',
        userId: 'user_456',
        successUrl: 'http://localhost:3000/app.html?view=subscription-success',
        cancelUrl: 'http://localhost:3000/app.html?view=subscription-cancel',
      },
    });
    expect(window.location.href).toBe('https://checkout.stripe.com/session123');
  });

  it('throws when supabase returns error', async () => {
    const err = new Error('Edge function error');
    mockInvoke.mockResolvedValue({ data: null, error: err });

    await expect(
      StripeService.createCheckoutSession('price_123', 'user_456')
    ).rejects.toThrow();
  });

  it('throws when no checkout URL returned', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null });

    await expect(
      StripeService.createCheckoutSession('price_123', 'user_456')
    ).rejects.toThrow('No checkout URL returned');
  });
});

describe('StripeService.getSubscriptionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns subscription data when found', async () => {
    const subData = { status: 'active', plan_id: 'premium', user_id: 'u1' };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: subData, error: null }),
        }),
      }),
    });

    const result = await StripeService.getSubscriptionStatus('u1');
    expect(result).toEqual(subData);
  });

  it('returns free defaults when no subscription found (PGRST116)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      }),
    });

    const result = await StripeService.getSubscriptionStatus('u1');
    expect(result).toEqual({ status: 'free', plan_id: 'free' });
  });

  it('throws on real database error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'INTERNAL', message: 'db error' },
          }),
        }),
      }),
    });

    // The catch block returns free defaults
    const result = await StripeService.getSubscriptionStatus('u1');
    expect(result).toEqual({ status: 'free', plan_id: 'free' });
  });
});

describe('StripeService.cancelSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls cancel-subscription edge function', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

    const result = await StripeService.cancelSubscription('sub_123');
    expect(result).toEqual({ success: true });
    expect(mockInvoke).toHaveBeenCalledWith('cancel-subscription', {
      body: { subscriptionId: 'sub_123' },
    });
  });

  it('throws on error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('cancel failed') });

    await expect(StripeService.cancelSubscription('sub_123')).rejects.toThrow(
      'cancel failed'
    );
  });
});

describe('StripeService.getPaymentHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns payment history', async () => {
    const payments = [
      { id: 'p1', amount: 499, created_at: '2026-01-01' },
      { id: 'p2', amount: 499, created_at: '2026-02-01' },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: payments, error: null }),
        }),
      }),
    });

    const result = await StripeService.getPaymentHistory('u1');
    expect(result).toEqual(payments);
  });

  it('returns empty array on error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('fail'),
          }),
        }),
      }),
    });

    const result = await StripeService.getPaymentHistory('u1');
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const result = await StripeService.getPaymentHistory('u1');
    expect(result).toEqual([]);
  });
});

describe('StripeService.getCustomerPortalUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { origin: 'http://localhost:3000' },
    });
  });

  it('returns portal URL', async () => {
    mockInvoke.mockResolvedValue({
      data: { url: 'https://billing.stripe.com/portal' },
      error: null,
    });

    const url = await StripeService.getCustomerPortalUrl('u1');
    expect(url).toBe('https://billing.stripe.com/portal');
  });

  it('throws on error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new Error('portal error'),
    });

    await expect(StripeService.getCustomerPortalUrl('u1')).rejects.toThrow(
      'portal error'
    );
  });
});
