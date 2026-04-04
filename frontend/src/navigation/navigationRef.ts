/**
 * navigationRef — Global navigation reference for use outside React components.
 *
 * Enables deep linking from push notifications, background handlers, and other
 * non-component contexts. Import `navigationRef` wherever you need programmatic
 * navigation without access to the `navigation` prop.
 *
 * Usage:
 *   import { navigationRef } from './navigationRef';
 *   if (navigationRef.isReady()) {
 *     navigationRef.navigate('ScreenName', { param: value });
 *   }
 */

import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Navigate to a screen from outside React components.
 * Uses CommonActions.navigate to avoid strict type constraints on the ref.
 */
export function navigateFromOutside(screen: string, params?: Record<string, any>) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: screen,
        params,
      }),
    );
  }
}
