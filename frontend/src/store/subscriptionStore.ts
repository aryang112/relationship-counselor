/**
 * Zustand store for subscription state management.
 * Tracks user's subscription tier, session count, and paywall eligibility.
 */

import { create } from 'zustand';
import type { SubscriptionStatus, SubscriptionTier } from '../types/subscription';
import { FREE_SESSION_LIMIT } from '../types/subscription';

interface SubscriptionStore {
  status: SubscriptionStatus | null;
  isLoading: boolean;
  error: string | null;

  setStatus: (status: SubscriptionStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Computed helpers
  needsPaywall: () => boolean;
  isPremium: () => boolean;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  status: null,
  isLoading: false,
  error: null,

  setStatus: (status) => set({ status, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ status: null, isLoading: false, error: null }),

  needsPaywall: () => {
    const { status } = get();
    if (!status) return false;
    if (status.tier === 'premium' && status.isActive) return false;
    return status.resolvedSessionCount >= FREE_SESSION_LIMIT;
  },

  isPremium: () => {
    const { status } = get();
    return status?.tier === 'premium' && status?.isActive === true;
  },
}));
