import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  getSubscriptionStatus,
  getMonthlyUsage,
  getLimits,
  canPerformAction,
  incrementUsage,
} from '../lib/subscription';
import type { UsageLimits } from '../lib/subscription';

// Simple in-memory cache to avoid duplicate API calls across components
let cachedResult: {
  isPremium: boolean;
  isTrialing: boolean;
  trialEndsAt: string | null;
  limits: UsageLimits;
  usage: { diaryCount: number; aiFeedbackCount: number; speakingPracticeCount: number };
  userId: string;
  timestamp: number;
} | null = null;

const CACHE_TTL = 60_000; // 1 minute

export function useSubscription() {
  const { user } = useAuthStore();
  const [isPremium, setIsPremium] = useState(false);
  const [isTrialing, setIsTrialing] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [limits, setLimits] = useState<UsageLimits>(getLimits(false));
  const [usage, setUsage] = useState({
    diaryCount: 0,
    aiFeedbackCount: 0,
    speakingPracticeCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Use cache if available and fresh
    if (
      cachedResult &&
      cachedResult.userId === user.id &&
      Date.now() - cachedResult.timestamp < CACHE_TTL
    ) {
      setIsPremium(cachedResult.isPremium);
      setIsTrialing(cachedResult.isTrialing);
      setTrialEndsAt(cachedResult.trialEndsAt);
      setLimits(cachedResult.limits);
      setUsage(cachedResult.usage);
      setLoading(false);
      return;
    }

    // Prevent duplicate loads in the same render cycle
    if (loadedRef.current) return;
    loadedRef.current = true;

    const load = async () => {
      try {
        const [sub, monthlyUsage] = await Promise.all([
          getSubscriptionStatus(user.id),
          getMonthlyUsage(user.id),
        ]);
        const newLimits = getLimits(sub.isPremium);

        cachedResult = {
          isPremium: sub.isPremium,
          isTrialing: sub.isTrialing,
          trialEndsAt: sub.trialEndsAt,
          limits: newLimits,
          usage: monthlyUsage,
          userId: user.id,
          timestamp: Date.now(),
        };

        setIsPremium(sub.isPremium);
        setIsTrialing(sub.isTrialing);
        setTrialEndsAt(sub.trialEndsAt);
        setLimits(newLimits);
        setUsage(monthlyUsage);
      } catch {
        // Defaults are already set
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const checkAction = async (
    action: 'record_diary' | 'ai_feedback' | 'speaking_practice'
  ): Promise<{ allowed: boolean; remaining: number; limit: number }> => {
    if (!user) return { allowed: false, remaining: 0, limit: 0 };
    return canPerformAction(user.id, action);
  };

  const trackUsage = async (
    field: 'diary_count' | 'ai_feedback_count' | 'speaking_practice_count'
  ): Promise<void> => {
    if (!user) return;
    await incrementUsage(user.id, field);
    const updated = await getMonthlyUsage(user.id);
    setUsage(updated);
    // Invalidate cache so next mount fetches fresh data
    cachedResult = null;
  };

  return { isPremium, isTrialing, trialEndsAt, limits, usage, loading, checkAction, trackUsage };
}
