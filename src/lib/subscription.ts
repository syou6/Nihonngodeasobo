import { supabase } from './supabase';

export interface UsageLimits {
  diaryLimit: number;
  aiAnalysisLimit: number;
  speakingPracticeLimit: number;
  hasFeedback: boolean;
  hasTeacherSharing: boolean;
  storageRetentionDays: number | null;
}

const FREE_LIMITS: UsageLimits = {
  diaryLimit: 3,
  aiAnalysisLimit: 3,
  speakingPracticeLimit: 1,
  hasFeedback: false,
  hasTeacherSharing: false,
  storageRetentionDays: 7,
};

const PREMIUM_LIMITS: UsageLimits = {
  diaryLimit: Infinity,
  aiAnalysisLimit: Infinity,
  speakingPracticeLimit: Infinity,
  hasFeedback: true,
  hasTeacherSharing: true,
  storageRetentionDays: null,
};

export interface SubStatus {
  isPremium: boolean;        // paid OR trialing (full access)
  planId: string;
  isTrialing: boolean;
  trialEndsAt: string | null;
}

export async function getSubscriptionStatus(userId: string): Promise<SubStatus> {
  try {
    const { data } = await supabase
      .from('subscriptions')
      .select('plan_id, status, current_period_end, trial_ends_at')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date();
    const paid =
      !!data && data.plan_id === 'premium' && data.status === 'active' &&
      (!data.current_period_end || new Date(data.current_period_end) > now);
    const trialEndsAt: string | null = data?.trial_ends_at ?? null;
    const isTrialing = !paid && !!trialEndsAt && new Date(trialEndsAt) > now;

    return {
      isPremium: paid || isTrialing,
      planId: paid ? 'premium' : 'free',
      isTrialing,
      trialEndsAt,
    };
  } catch {
    return { isPremium: false, planId: 'free', isTrialing: false, trialEndsAt: null };
  }
}

/**
 * Start the 14-day reverse trial once (called when the user first opens their
 * Karte). Server-side SECURITY DEFINER RPC — no client write to subscriptions.
 * Returns true if a trial was newly granted.
 */
export async function startTrialIfEligible(_userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('start_trial');
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

export function getLimits(isPremium: boolean): UsageLimits {
  return isPremium ? PREMIUM_LIMITS : FREE_LIMITS;
}

export async function getMonthlyUsage(userId: string): Promise<{
  diaryCount: number;
  aiFeedbackCount: number;
  speakingPracticeCount: number;
}> {
  const month = new Date().toISOString().slice(0, 7);
  try {
    const { data } = await supabase
      .from('usage_tracking')
      .select('diary_count, ai_feedback_count, speaking_practice_count')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle();

    return {
      diaryCount: data?.diary_count || 0,
      aiFeedbackCount: data?.ai_feedback_count || 0,
      speakingPracticeCount: data?.speaking_practice_count || 0,
    };
  } catch {
    return { diaryCount: 0, aiFeedbackCount: 0, speakingPracticeCount: 0 };
  }
}

export async function incrementUsage(
  userId: string,
  field: 'diary_count' | 'ai_feedback_count' | 'speaking_practice_count'
): Promise<void> {
  const month = new Date().toISOString().slice(0, 7);

  const { data: existing } = await supabase
    .from('usage_tracking')
    .select('id, ' + field)
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('usage_tracking')
      .update({ [field]: (existing[field] || 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('usage_tracking')
      .insert({ user_id: userId, month, [field]: 1 });
  }
}

export async function canPerformAction(
  userId: string,
  action: 'record_diary' | 'ai_feedback' | 'speaking_practice'
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const { isPremium } = await getSubscriptionStatus(userId);
  const limits = getLimits(isPremium);
  const usage = await getMonthlyUsage(userId);

  switch (action) {
    case 'record_diary':
      return {
        allowed: usage.diaryCount < limits.diaryLimit,
        remaining: Math.max(0, limits.diaryLimit - usage.diaryCount),
        limit: limits.diaryLimit,
      };
    case 'ai_feedback':
      return {
        allowed: limits.hasFeedback && usage.aiFeedbackCount < limits.aiAnalysisLimit,
        remaining: limits.hasFeedback ? Math.max(0, limits.aiAnalysisLimit - usage.aiFeedbackCount) : 0,
        limit: limits.hasFeedback ? limits.aiAnalysisLimit : 0,
      };
    case 'speaking_practice':
      return {
        allowed: usage.speakingPracticeCount < limits.speakingPracticeLimit,
        remaining: Math.max(0, limits.speakingPracticeLimit - usage.speakingPracticeCount),
        limit: limits.speakingPracticeLimit,
      };
  }
}
