import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import * as SecureStore from 'expo-secure-store';
import {
  getAuthToken,
  getStoredUser,
  clearAuthToken,
  clearStoredUser,
} from '../services/api';
import { getMe, getMyCouple } from '../services/auth';
import { unregisterPushToken } from '../services/notifications';
import type { AxiosError } from 'axios';

/**
 * Clear all auth-related keys from SecureStore, including per-user
 * onboarding flags.  Accepts the userId so we can target the right key.
 */
async function clearAllAuthData(userId?: string) {
  await clearAuthToken();
  await clearStoredUser();
  if (userId) {
    await SecureStore.deleteItemAsync(`onboarding_done_${userId}`);
  }
  // Also try the generic key in case it was set without a userId
  await SecureStore.deleteItemAsync('onboarding_done');
}

export function useAuth() {
  const {
    user,
    couple,
    isAuthenticated,
    isLoading,
    setUser,
    setCouple,
    setAuthenticated,
    setLoading,
    setOnboardingDone,
    reset,
  } = useAuthStore();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token || !mounted) {
          setLoading(false);
          return;
        }

        const storedUser = await getStoredUser();

        // ── Validate the token against the backend ──
        // If the user was deleted from the DB (e.g. dev reset), the JWT
        // will fail validation and we clear everything immediately.
        try {
          const me = await getMe();
          if (!mounted) return;
          setUser(me);
          setAuthenticated(true);
        } catch (error) {
          // Any failure (401, network error) means we can't trust this token.
          await clearAllAuthData(storedUser?.id);
          if (mounted) reset();
          return; // bail — AuthNavigator will render
        }

        // ── Restore onboarding flag from SecureStore ──
        const currentUser = useAuthStore.getState().user;
        const obKey = currentUser?.id
          ? `onboarding_done_${currentUser.id}`
          : 'onboarding_done';
        const obDone = await SecureStore.getItemAsync(obKey);
        if (obDone === 'true' && mounted) {
          setOnboardingDone(true);
        }

        // ── Fetch couple data (optional — new users won't have one) ──
        try {
          const coupleData = await getMyCouple();
          if (!mounted) return;
          setCouple(coupleData);

          if (currentUser) {
            if (coupleData.userA?.id === currentUser.id) {
              setUser(coupleData.userA);
            } else if (coupleData.userB?.id === currentUser.id) {
              setUser(coupleData.userB);
            }
          }
        } catch (error) {
          const axiosErr = error as AxiosError;
          const status = axiosErr?.response?.status;

          // 404 = no couple yet — normal for new users.
          // 401 = token died mid-session — clear auth.
          if (status === 401) {
            await clearAllAuthData(currentUser?.id);
            if (mounted) reset();
          }
        }
      } catch {
        // Unexpected error — don't wipe on unknown failures.
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setUser, setCouple, setLoading, reset]);

  const handleLogout = useCallback(async () => {
    // Unregister push token before clearing auth (needs valid JWT)
    await unregisterPushToken();
    const currentUser = useAuthStore.getState().user;
    await clearAllAuthData(currentUser?.id);
    reset();
  }, [reset]);

  return {
    user,
    couple,
    isAuthenticated,
    isLoading,
    logout: handleLogout,
  };
}
