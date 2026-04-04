/**
 * useNotifications — Push notification registration and deep link handler.
 *
 * Registers for Expo push notifications and listens for notification taps.
 * When a notification is tapped, navigates to the relevant screen based on
 * the notification data payload ({ sessionId, type }).
 *
 * If the user is not authenticated when tapping a notification, the intended
 * navigation is stored in deepLinkStore and consumed after auth completes.
 *
 * Foreground notifications: displayed as banners (default Expo behavior),
 * no auto-navigation since the user is already in the app.
 */

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { navigationRef, navigateFromOutside } from '../navigation/navigationRef';
import { useDeepLinkStore } from '../store/deepLinkStore';
import { useAuthStore } from '../store/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Resolves a notification type + sessionId to a screen name and params.
 */
function resolveNotificationRoute(
  type: string | undefined,
  sessionId: string,
): { screen: string; params?: Record<string, any> } {
  switch (type) {
    case 'session_initiated':
    case 'partner_b_invite':
    case 'partner_b_reminder_4h':
    case 'partner_b_reminder_24h':
    case 'partner_b_reminder_72h':
      return { screen: 'PartnerBEntry', params: { sessionId } };

    case 'unpacking_ready':
    case 'partner_viewed_unpacking':
    case 'unpacking_unlocked':
      return { screen: 'UnpackingChoice', params: { sessionId } };

    case 'reconnection_turn':
      return { screen: 'Reconnection', params: { sessionId } };

    case 'post_resolution_checkin':
    case 'manual_interview_reminder':
      return { screen: 'SessionDetail', params: { id: sessionId } };

    default:
      return { screen: 'HomeTabs' };
  }
}

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotifications().then(setExpoPushToken);

    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        // Foreground notification received — let Expo show the banner.
        // No auto-navigation; the user is already in the app.
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        const sessionId = data?.sessionId as string | undefined;
        const type = data?.type as string | undefined;

        if (!sessionId) return;

        const route = resolveNotificationRoute(type, sessionId);
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        const onboardingDone = useAuthStore.getState().onboardingDone;

        if (!isAuthenticated || !onboardingDone) {
          // User isn't authenticated — store deep link for after auth.
          useDeepLinkStore.getState().setPendingDeepLink(route);
          return;
        }

        // Navigate immediately if the navigation container is ready.
        if (navigationRef.isReady()) {
          navigateFromOutside(route.screen, route.params);
        } else {
          // Nav not ready yet — store for consumption once ready.
          useDeepLinkStore.getState().setPendingDeepLink(route);
        }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return { expoPushToken };
}

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}
