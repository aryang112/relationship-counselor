/**
 * useSubscription — Hook wrapping RevenueCat SDK + backend subscription API.
 *
 * Provides methods for purchasing subscriptions, single sessions, restoring
 * purchases, and checking paywall eligibility. Uses the subscriptionStore
 * for state management.
 */

import Purchases from 'react-native-purchases';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { api } from '../services/api';
import { FREE_SESSION_LIMIT } from '../types/subscription';
import type { SubscriptionStatus } from '../types/subscription';

/** RevenueCat production API key */
const REVENUECAT_API_KEY = 'appl_NPIYjgntHzLcsGFcSVfWfGZCeJq';

export function useSubscription() {
  const store = useSubscriptionStore();

  /** Initialize RevenueCat — call once at app startup */
  const initialize = async (userId: string) => {
    try {
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: userId });
    } catch (e) {
      console.warn('RevenueCat init failed:', e);
    }
  };

  /** Fetch subscription status from backend */
  const fetchStatus = async () => {
    store.setLoading(true);
    try {
      const res = await api.get<SubscriptionStatus>('/auth/subscription');
      store.setStatus(res.data);
    } catch (e) {
      store.setError('Failed to load subscription status');
    } finally {
      store.setLoading(false);
    }
  };

  /** Purchase monthly subscription via RevenueCat */
  const purchaseSubscription = async (packageId: string) => {
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages.find(
        (p) => p.identifier === packageId,
      );
      if (!pkg) throw new Error('Package not found');

      const { customerInfo } = await Purchases.purchasePackage(pkg);

      // Verify with backend
      await api.post('/auth/subscription/verify', {
        revenuecatId: customerInfo.originalAppUserId,
        tier: 'premium',
      });

      await fetchStatus();
      return true;
    } catch (e: any) {
      if (e.userCancelled) return false;
      store.setError('Purchase failed. Please try again.');
      return false;
    }
  };

  /** One-time session purchase via RevenueCat */
  const purchaseSingleSession = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages.find(
        (p) => p.identifier === 'relate_resolve_now',
      );
      if (!pkg) throw new Error('Package not found');

      const { customerInfo } = await Purchases.purchasePackage(pkg);

      await api.post('/auth/subscription/verify', {
        revenuecatId: customerInfo.originalAppUserId,
        tier: 'resolve_now',
      });

      await fetchStatus();
      return true;
    } catch (e: any) {
      if (e.userCancelled) return false;
      store.setError('Purchase failed. Please try again.');
      return false;
    }
  };

  /** Restore purchases via RevenueCat */
  const restorePurchases = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      await api.post('/auth/subscription/restore', {
        revenuecatId: customerInfo.originalAppUserId,
      });
      await fetchStatus();
      return true;
    } catch (e) {
      store.setError('Could not restore purchases.');
      return false;
    }
  };

  /** Check if paywall should be shown */
  const needsPaywall = store.needsPaywall();

  /** Check if user has active premium subscription */
  const isPremium = store.isPremium();

  return {
    ...store,
    initialize,
    fetchStatus,
    purchaseSubscription,
    purchaseSingleSession,
    restorePurchases,
    needsPaywall,
    isPremium,
  };
}
