/**
 * deepLinkStore — Stores pending deep link navigation intent.
 *
 * When a push notification is tapped while the user is not authenticated
 * (app was killed or user logged out), the intended navigation is stored here.
 * After authentication completes, RootNavigator consumes the pending link
 * and navigates to the correct screen.
 */

import { create } from 'zustand';

export interface PendingDeepLink {
  screen: string;
  params?: Record<string, any>;
}

interface DeepLinkState {
  pendingDeepLink: PendingDeepLink | null;
  setPendingDeepLink: (link: PendingDeepLink | null) => void;
  consumePendingDeepLink: () => PendingDeepLink | null;
}

export const useDeepLinkStore = create<DeepLinkState>((set, get) => ({
  pendingDeepLink: null,

  setPendingDeepLink: (link) => set({ pendingDeepLink: link }),

  consumePendingDeepLink: () => {
    const link = get().pendingDeepLink;
    if (link) {
      set({ pendingDeepLink: null });
    }
    return link;
  },
}));
