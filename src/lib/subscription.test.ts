import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSubscriptionStatus,
  getLimits,
  getMonthlyUsage,
  incrementUsage,
  canPerformAction,
} from './subscription';

// Mock supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from './supabase';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

// Helper to create chained mock
function mockChain(resolvedValue: { data: any; error: any }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

describe('getSubscriptionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns premium when active premium subscription exists', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    mockFrom.mockReturnValue(
      mockChain({
        data: {
          plan_id: 'premium',
          status: 'active',
          current_period_end: futureDate.toISOString(),
        },
        error: null,
      })
    );

    const result = await getSubscriptionStatus('user1');
    expect(result).toEqual({ isPremium: true, planId: 'premium' });
  });

  it('returns free when subscription is not active', async () => {
    mockFrom.mockReturnValue(
      mockChain({
        data: { plan_id: 'premium', status: 'cancelled', current_period_end: null },
        error: null,
      })
    );

    const result = await getSubscriptionStatus('user1');
    expect(result).toEqual({ isPremium: false, planId: 'free' });
  });

  it('returns free when subscription period has ended', async () => {
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 1);

    mockFrom.mockReturnValue(
      mockChain({
        data: {
          plan_id: 'premium',
          status: 'active',
          current_period_end: pastDate.toISOString(),
        },
        error: null,
      })
    );

    const result = await getSubscriptionStatus('user1');
    expect(result).toEqual({ isPremium: false, planId: 'free' });
  });

  it('returns free when no subscription data', async () => {
    mockFrom.mockReturnValue(mockChain({ data: null, error: null }));

    const result = await getSubscriptionStatus('user1');
    expect(result).toEqual({ isPremium: false, planId: 'free' });
  });

  it('returns free on error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockRejectedValue(new Error('db down')),
        }),
      }),
    });

    const result = await getSubscriptionStatus('user1');
    expect(result).toEqual({ isPremium: false, planId: 'free' });
  });

  it('returns premium when no end date (null period end)', async () => {
    mockFrom.mockReturnValue(
      mockChain({
        data: {
          plan_id: 'premium',
          status: 'active',
          current_period_end: null,
        },
        error: null,
      })
    );

    const result = await getSubscriptionStatus('user1');
    expect(result).toEqual({ isPremium: true, planId: 'premium' });
  });
});

describe('getLimits', () => {
  it('returns free limits for non-premium', () => {
    const limits = getLimits(false);
    expect(limits.diaryLimit).toBe(3);
    expect(limits.hasFeedback).toBe(false);
    expect(limits.hasTeacherSharing).toBe(false);
    expect(limits.storageRetentionDays).toBe(7);
  });

  it('returns premium limits for premium users', () => {
    const limits = getLimits(true);
    expect(limits.diaryLimit).toBe(Infinity);
    expect(limits.hasFeedback).toBe(true);
    expect(limits.hasTeacherSharing).toBe(true);
    expect(limits.storageRetentionDays).toBeNull();
  });
});

describe('getMonthlyUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns usage data when found', async () => {
    mockFrom.mockReturnValue(
      mockChain({
        data: { diary_count: 2, ai_feedback_count: 1, speaking_practice_count: 0 },
        error: null,
      })
    );

    const usage = await getMonthlyUsage('user1');
    expect(usage).toEqual({
      diaryCount: 2,
      aiFeedbackCount: 1,
      speakingPracticeCount: 0,
    });
  });

  it('returns zeros when no usage data', async () => {
    mockFrom.mockReturnValue(mockChain({ data: null, error: null }));

    const usage = await getMonthlyUsage('user1');
    expect(usage).toEqual({
      diaryCount: 0,
      aiFeedbackCount: 0,
      speakingPracticeCount: 0,
    });
  });

  it('returns zeros on error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockRejectedValue(new Error('fail')),
          }),
        }),
      }),
    });

    const usage = await getMonthlyUsage('user1');
    expect(usage).toEqual({
      diaryCount: 0,
      aiFeedbackCount: 0,
      speakingPracticeCount: 0,
    });
  });
});

describe('incrementUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates existing usage record', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'rec1', diary_count: 2 },
              error: null,
            }),
          }),
        }),
      }),
      update: updateMock,
      insert: vi.fn(),
    });

    await incrementUsage('user1', 'diary_count');
    expect(updateMock).toHaveBeenCalled();
  });

  it('inserts new record when none exists', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      update: vi.fn(),
      insert: insertMock,
    });

    await incrementUsage('user1', 'diary_count');
    expect(insertMock).toHaveBeenCalled();
  });
});

describe('canPerformAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupMocks(subscription: any, usage: any) {
    // The function calls supabase.from twice - once for subscription, once for usage
    const callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: subscription,
                error: null,
              }),
            }),
          }),
        };
      }
      // usage_tracking
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: usage,
                error: null,
              }),
            }),
          }),
        }),
      };
    });
  }

  it('allows diary recording for free user under limit', async () => {
    setupMocks(null, { diary_count: 1, ai_feedback_count: 0, speaking_practice_count: 0 });

    const result = await canPerformAction('user1', 'record_diary');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.limit).toBe(3);
  });

  it('blocks diary recording when limit reached', async () => {
    setupMocks(null, { diary_count: 3, ai_feedback_count: 0, speaking_practice_count: 0 });

    const result = await canPerformAction('user1', 'record_diary');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('blocks ai_feedback for free users (hasFeedback=false)', async () => {
    setupMocks(null, { diary_count: 0, ai_feedback_count: 0, speaking_practice_count: 0 });

    const result = await canPerformAction('user1', 'ai_feedback');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.limit).toBe(0);
  });

  it('allows ai_feedback for premium users', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    setupMocks(
      { plan_id: 'premium', status: 'active', current_period_end: futureDate.toISOString() },
      { diary_count: 0, ai_feedback_count: 5, speaking_practice_count: 0 }
    );

    const result = await canPerformAction('user1', 'ai_feedback');
    expect(result.allowed).toBe(true);
  });

  it('allows speaking practice under daily limit for free user', async () => {
    setupMocks(null, { diary_count: 0, ai_feedback_count: 0, speaking_practice_count: 0 });

    const result = await canPerformAction('user1', 'speaking_practice');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
    expect(result.limit).toBe(1);
  });

  it('blocks speaking practice when limit reached', async () => {
    setupMocks(null, { diary_count: 0, ai_feedback_count: 0, speaking_practice_count: 1 });

    const result = await canPerformAction('user1', 'speaking_practice');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
