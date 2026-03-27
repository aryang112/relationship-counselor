import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isHapticsAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

export function lightTap(): void {
  if (isHapticsAvailable) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function mediumTap(): void {
  if (isHapticsAvailable) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

export function heavyTap(): void {
  if (isHapticsAvailable) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

export function successTap(): void {
  if (isHapticsAvailable) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

export function errorTap(): void {
  if (isHapticsAvailable) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

export function selectionTap(): void {
  if (isHapticsAvailable) {
    Haptics.selectionAsync();
  }
}
