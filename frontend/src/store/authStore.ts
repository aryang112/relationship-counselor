import { create } from 'zustand';
import type { UserSummary } from '../types/user';
import type { Couple } from '../types/session';

interface AuthState {
  user: UserSummary | null;
  couple: Couple | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingDone: boolean;

  setUser: (user: UserSummary) => void;
  setCouple: (couple: Couple) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingDone: (done: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  couple: null,
  isAuthenticated: false,
  isLoading: true,
  onboardingDone: false,

  setUser: (user) => set({ user, isAuthenticated: true }),
  setCouple: (couple) => set({ couple }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLoading: (isLoading) => set({ isLoading }),
  setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
  reset: () => set({ user: null, couple: null, isAuthenticated: false, isLoading: false, onboardingDone: false }),
}));
