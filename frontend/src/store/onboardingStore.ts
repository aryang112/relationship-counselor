/**
 * Onboarding Store — Persists onboarding form data across screens.
 *
 * Holds all user-entered data during the onboarding flow (name, gender,
 * behavioral profile from 8 quiz screens). Data is submitted to the backend
 * as couple onboarding data when onboarding completes.
 *
 * Profile fields map to psychological constructs (Gottman, EFT, attachment)
 * but use casual language — see relate_onboarding_redesign_spec.md.
 */

import { create } from 'zustand';

export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | '';

export const PRONOUN_MAP: Record<string, { subject: string; object: string; possessive: string }> = {
  male: { subject: 'he', object: 'him', possessive: 'his' },
  female: { subject: 'she', object: 'her', possessive: 'her' },
  'non-binary': { subject: 'they', object: 'them', possessive: 'their' },
  'prefer-not-to-say': { subject: 'they', object: 'them', possessive: 'their' },
};

export interface OnboardingData {
  // Screen 1: Identity (name + gender)
  firstName: string;
  gender: Gender;

  // Screen 2: Conflict Behavior — Gottman Four Horsemen mapping
  conflictBehavior: string;

  // Screen 3: Core Emotion — EFT primary emotion
  coreEmotion: string;

  // Screen 4: Pursue vs Withdraw — demand/withdraw cycle role
  pursueWithdraw: string;

  // Screen 5: Flooding Threshold — physiological overwhelm speed
  floodingThreshold: string;

  // Screen 6: Core Fear — attachment fear (disguised)
  coreFear: string;

  // Screen 7: Repair Style — what helps after a fight
  repairStyle: string;

  // Screen 8: Recurring Theme — perpetual conflict pattern
  recurringTheme: string;

  // Screen 9: Communication Medium — how fights happen
  communicationMedium: string;

  // Legacy fields kept for backward compatibility with existing couples
  partnerName: string;
  partnerGender: Gender;
}

interface OnboardingState extends OnboardingData {
  /** Invite token stored when Partner B validates a code before registration */
  pendingInviteToken: string | null;
  setPendingInviteToken: (token: string | null) => void;
  setField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  reset: () => void;
}

const initialData: OnboardingData = {
  firstName: '',
  gender: '',
  conflictBehavior: '',
  coreEmotion: '',
  pursueWithdraw: '',
  floodingThreshold: '',
  coreFear: '',
  repairStyle: '',
  recurringTheme: '',
  communicationMedium: '',
  partnerName: '',
  partnerGender: '',
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialData,
  pendingInviteToken: null,
  setPendingInviteToken: (token) => set({ pendingInviteToken: token }),
  setField: (key, value) => set({ [key]: value }),
  reset: () => set({ ...initialData, pendingInviteToken: null }),
}));
