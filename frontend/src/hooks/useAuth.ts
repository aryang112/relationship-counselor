import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import * as SecureStore from 'expo-secure-store';
import {
  getAuthToken,
  getStoredUser,
  clearAuthToken,
  clearStoredUser,
} from '../services/api';
import { getMyCouple } from '../services/auth';
import type { AxiosError } from 'axios';

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
        setAuthenticated(true);

        const storedUser = await getStoredUser();
        if (storedUser && mounted) {
          setUser(storedUser);
        }

        // Check per-user onboarding key
        const obKey = storedUser?.id ? `onboarding_done_${storedUser.id}` : 'onboarding_done';
        const obDone = await SecureStore.getItemAsync(obKey);
        if (obDone === 'true' && mounted) {
          setOnboardingDone(true);
        }

        try {
          const coupleData = await getMyCouple();
          if (!mounted) return;
          setCouple(coupleData);

          if (storedUser) {
            if (coupleData.userA?.id === storedUser.id) {
              setUser(coupleData.userA);
            } else if (coupleData.userB?.id === storedUser.id) {
              setUser(coupleData.userB);
            }
          }
        } catch (error) {
          const axiosErr = error as AxiosError;
          const status = axiosErr?.response?.status;

          // 404 = user exists but has no couple yet — perfectly normal for new users.
          // Network errors (no response) = backend unreachable — don't wipe auth.
          // Only wipe auth on 401 (token invalid/expired).
          if (status === 401) {
            await clearAuthToken();
            await clearStoredUser();
            if (mounted) reset();
          }
        }
      } catch {
        // Only clear auth if we're sure token is bad.
        // Network errors should not wipe stored credentials.
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setUser, setCouple, setLoading, reset]);

  const handleLogout = useCallback(async () => {
    await clearAuthToken();
    await clearStoredUser();
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
