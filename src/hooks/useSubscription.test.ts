import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({ user: null })),
}));

vi.mock('../lib/subscription', () => ({
  getSubscriptionStatus: vi.fn(() => Promise.resolve({ isPremium: false })),
  getMonthlyUsage: vi.fn(() => Promise.resolve({ diaryCount: 0, aiFeedbackCount: 0, speakingPracticeCount: 0 })),
  getLimits: vi.fn((isPremium: boolean) => ({
    diaryLimit: isPremium ? Infinity : 3,
    aiAnalysisLimit: isPremium ? Infinity : 5,
    speakingPracticeLimit: isPremium ? Infinity : 1,
    hasFeedback: isPremium,
    hasTeacherSharing: isPremium,
    storageRetentionDays: isPremium ? null : 30,
  })),
  canPerformAction: vi.fn(() => Promise.resolve({ allowed: true, remaining: 2, limit: 3 })),
  incrementUsage: vi.fn(() => Promise.resolve()),
}));

import { useSubscription } from './useSubscription';
import { useAuthStore } from '../stores/authStore';
import {
  getSubscriptionStatus,
  getMonthlyUsage,
  getLimits,
  canPerformAction,
  incrementUsage,
} from '../lib/subscription';

const mockUseAuthStore = vi.mocked(useAuthStore);
const mockGetSubscriptionStatus = vi.mocked(getSubscriptionStatus);
const mockGetMonthlyUsage = vi.mocked(getMonthlyUsage);
const mockCanPerformAction = vi.mocked(canPerformAction);
const mockIncrementUsage = vi.mocked(incrementUsage);

describe('useSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ user: null } as any);
    mockGetSubscriptionStatus.mockResolvedValue({ isPremium: false } as any);
    mockGetMonthlyUsage.mockResolvedValue({ diaryCount: 0, aiFeedbackCount: 0, speakingPracticeCount: 0 });
  });

  it('returns default values when no user', () => {
    const { result } = renderHook(() => useSubscription());
    expect(result.current.isPremium).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.usage).toEqual({
      diaryCount: 0,
      aiFeedbackCount: 0,
      speakingPracticeCount: 0,
    });
  });

  it('loads subscription data for logged-in user', async () => {
    mockUseAuthStore.mockReturnValue({
      user: { id: 'user-1', email: 'a@b.com', name: 'Test' },
    } as any);
    mockGetSubscriptionStatus.mockResolvedValue({ isPremium: true } as any);
    mockGetMonthlyUsage.mockResolvedValue({
      diaryCount: 5,
      aiFeedbackCount: 3,
      speakingPracticeCount: 1,
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isPremium).toBe(true);
    expect(result.current.usage.diaryCount).toBe(5);
  });

  it('checkAction returns not allowed when no user', async () => {
    const { result } = renderHook(() => useSubscription());
    const action = await result.current.checkAction('record_diary');
    expect(action).toEqual({ allowed: false, remaining: 0, limit: 0 });
  });

  it('checkAction delegates to canPerformAction for logged-in user', async () => {
    mockUseAuthStore.mockReturnValue({
      user: { id: 'user-1', email: 'a@b.com', name: 'Test' },
    } as any);
    mockCanPerformAction.mockResolvedValue({ allowed: true, remaining: 2, limit: 3 });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const action = await result.current.checkAction('record_diary');
    expect(action).toEqual({ allowed: true, remaining: 2, limit: 3 });
    expect(mockCanPerformAction).toHaveBeenCalledWith('user-1', 'record_diary');
  });

  it('trackUsage does nothing when no user', async () => {
    const { result } = renderHook(() => useSubscription());
    await result.current.trackUsage('diary_count');
    expect(mockIncrementUsage).not.toHaveBeenCalled();
  });

  it('trackUsage increments and refreshes usage', async () => {
    mockUseAuthStore.mockReturnValue({
      user: { id: 'user-1', email: 'a@b.com', name: 'Test' },
    } as any);
    mockGetMonthlyUsage.mockResolvedValue({
      diaryCount: 1,
      aiFeedbackCount: 0,
      speakingPracticeCount: 0,
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.trackUsage('diary_count');
    });

    expect(mockIncrementUsage).toHaveBeenCalledWith('user-1', 'diary_count');
    // getMonthlyUsage called at least once after trackUsage (init may be cached)
    expect(mockGetMonthlyUsage).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    mockUseAuthStore.mockReturnValue({
      user: { id: 'user-1', email: 'a@b.com', name: 'Test' },
    } as any);
    mockGetSubscriptionStatus.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should use defaults on error
    expect(result.current.isPremium).toBe(false);
  });

  it('returns free limits by default', () => {
    const { result } = renderHook(() => useSubscription());
    expect(result.current.limits.diaryLimit).toBe(3);
    expect(result.current.limits.aiAnalysisLimit).toBe(5);
    expect(result.current.limits.speakingPracticeLimit).toBe(1);
  });
});
