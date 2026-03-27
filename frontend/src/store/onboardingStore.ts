/**
 * Onboarding Store — Persists onboarding form data across screens.
 *
 * Holds all user-entered data during the onboarding flow (name, communication
 * style, relationship story, partner details, love bank, conflict preferences).
 * Data is submitted to the backend when onboarding completes.
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
  // Screen 3: Your Name + Gender
  firstName: string;
  gender: Gender;

  // Screen 4a: Communication Style
  communicationStyles: string[];

  // Screen 4b: Conflict Feelings
  conflictFeelings: string[];

  // Screen 5: Relationship Story
  datingStartDate: string; // ISO date string
  isLongDistance: boolean | null;
  howMet: string;
  firstDateLocation: string;

  // Screen 6: Partner Details
  partnerName: string;
  partnerGender: Gender;
  partnerCommunicationStyles: string[];
  partnerConflictFeelings: string[];

  // Screen 7: Love Bank
  loveReasons: [string, string, string];
  favoriteMemory: string;
  relationshipStrengths: string[];

  // Screen 8: Conflict Preferences
  resolutionSpeed: string;
  attachmentStyle: string;
  pastConflictPatterns: string[];
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
  communicationStyles: [],
  conflictFeelings: [],
  datingStartDate: '',
  isLongDistance: null,
  howMet: '',
  firstDateLocation: '',
  partnerName: '',
  partnerGender: '',
  partnerCommunicationStyles: [],
  partnerConflictFeelings: [],
  loveReasons: ['', '', ''],
  favoriteMemory: '',
  relationshipStrengths: [],
  resolutionSpeed: '',
  attachmentStyle: '',
  pastConflictPatterns: [],
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialData,
  pendingInviteToken: null,
  setPendingInviteToken: (token) => set({ pendingInviteToken: token }),
  setField: (key, value) => set({ [key]: value }),
  reset: () => set({ ...initialData, pendingInviteToken: null }),
}));
