/**
 * Subscription types for the Relate app paywall system.
 * Free tier: 2 mediation sessions. Premium: monthly or annual.
 */

export type SubscriptionTier = 'free' | 'premium';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  expiresAt: string | null;
  resolvedSessionCount: number;
  freeSessionsRemaining: number;
  isActive: boolean;
}

export interface SubscriptionState {
  status: SubscriptionStatus | null;
  isLoading: boolean;
  error: string | null;
}

export const FREE_SESSION_LIMIT = 2;

export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'com.relationcounselor.app.premium.monthly.v2',
  PREMIUM_ANNUAL: 'com.relationcounselor.app.premium.annual.v2',
} as const;

export const PRICING = {
  PREMIUM_MONTHLY: '$14.99/month',
  PREMIUM_ANNUAL: '$99.99/year',
} as const;
