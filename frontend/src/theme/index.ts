/**
 * Relate App — Theme Exports
 *
 * Single warm-light theme. No dark mode toggle.
 *
 * Usage:
 *   const colors = useThemeColors();
 *   const { colors, typography, spacing, radius, shadows } = useTheme();
 */

import { colors, type Colors, type ColorScheme, type ThemeMode } from './colors';
import { typography, fontFamilies, type TypographyVariant } from './typography';
import { spacing, radius, shadows, type SpacingKey } from './spacing';

export { colors, typography, fontFamilies, spacing, radius, shadows };
export type { Colors, ColorScheme, ThemeMode, TypographyVariant, SpacingKey };

/** Returns the warm-light color palette */
export function useThemeColors(): Colors {
  return colors;
}

/** Always returns 'light' — app uses a single warm-light theme */
export function useThemeMode(): ThemeMode {
  return 'light';
}

/** Full theme object with all design tokens */
export function useTheme() {
  return { colors, typography, spacing, radius, shadows };
}
