/**
 * Relate App — Spacing, Radius & Shadows
 *
 * Design System: Per RelateApp_DesignSpec.md §2.3–2.4
 *
 * Base unit: 8px
 *
 * Shadows use warm orange-tinted shadows (rgba(180, 90, 30, x))
 * instead of pure black, matching the therapeutic warm palette.
 *
 * Safe areas (iOS):
 *   Horizontal padding: 24px
 *   Bottom safe area: 34px (home indicator)
 *   Top safe area: 59px (dynamic island)
 */

export const spacing = {
  xs: 4,    // --space-1
  sm: 8,    // --space-2
  md: 16,   // --space-4
  lg: 24,   // --space-6
  xl: 32,   // --space-8
  '2xl': 48,  // --space-12
  '3xl': 64,  // --space-16
  '4xl': 80,  // --space-20
} as const;

export const radius = {
  sm: 8,     // Small elements (pills, tags)
  md: 16,    // Cards, inputs
  lg: 24,    // Large cards
  xl: 32,    // Feature cards
  pill: 999, // Full-round buttons, pill shapes
  full: 999, // Alias for pill
} as const;

/**
 * Shadows — Warm orange-tinted for the light theme.
 * Uses rgba(180, 90, 30, x) as shadow color for a cohesive warm feel.
 */
export const shadows = {
  /** Subtle card shadow */
  sm: {
    shadowColor: 'rgb(180, 90, 30)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  /** Medium shadow for elevated elements */
  md: {
    shadowColor: 'rgb(180, 90, 30)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  /** Large shadow for modals/floating elements */
  lg: {
    shadowColor: 'rgb(180, 90, 30)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 8,
  },
  /** Standard card shadow (neutral) */
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  /** Orange glow effect for primary buttons */
  glow: {
    shadowColor: '#E07832',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  /** Alias for backward compat */
  float: {
    shadowColor: 'rgb(180, 90, 30)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 8,
  },
} as const;

export type SpacingKey = keyof typeof spacing;
