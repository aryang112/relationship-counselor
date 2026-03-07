/**
 * Relate App — Color Palette
 *
 * Design System: "Warm Light Therapeutic" per RelateApp_DesignSpec.md §2.1
 *
 * Philosophy: Soft morning light through frosted glass — intimate, honest, safe.
 * The palette uses warm off-whites as base with an orange gradient accent system.
 *
 * Changed from dark theme (#1A1412 base) to warm light theme (#FAF7F4 base)
 * as of March 2026 design revamp.
 *
 * Partner identity:
 *   - Partner A → Orange (#E07832)
 *   - Partner B → Cool blue-gray (#7B8FA6) for contrast
 *   - Shared/Both → Soft lavender (#9B7EC8)
 *
 * Gradient usage (with expo-linear-gradient):
 *   - gradientHero: Radial-like hero areas (splash, home header)
 *   - gradientCard: Button & accent card fills
 *   - gradientSoft: Subtle background wash
 */

export const colors = {
  // ── Backgrounds ──────────────────────────────────────────
  bgPrimary: '#FAF7F4',     // Warm off-white, main backgrounds
  bgSecondary: '#F2EDE6',   // Slightly deeper warm white, cards/sections
  bgElevated: '#FFFFFF',    // Pure white for floating elements

  // ── Orange Accent System ─────────────────────────────────
  orangeDeep: '#C45A1A',    // Deep burnt orange, hero areas
  orangeMid: '#E07832',     // Mid orange, primary buttons & active states
  orangeLight: '#F0A060',   // Light orange, hover/active accents
  orangeGlow: '#F5C49A',    // Softest orange, glow effects
  orangeTint: '#FBE8D8',    // Near-white orange tint, subtle card backgrounds

  // ── Gradients (arrays for LinearGradient component) ──────
  gradientHero: ['#E07832', '#C45A1A', '#8B3A1A'] as [string, string, string],
  gradientCard: ['#F0A060', '#C45A1A'] as [string, string],
  gradientSoft: ['#FBE8D8', '#FAF7F4'] as [string, string],

  // ── Text Colors ──────────────────────────────────────────
  textPrimary: '#1A1208',    // Near-black with warm undertone
  textSecondary: '#6B5A4A',  // Warm medium gray
  textMuted: '#A89880',      // Muted warm gray (placeholders, hints)
  textInverse: '#FFFFFF',    // White text on dark/orange backgrounds

  // ── Partner Identity ─────────────────────────────────────
  partnerA: '#E07832',       // Partner A accent — orange
  partnerB: '#7B8FA6',       // Partner B accent — cool blue-gray
  shared: '#9B7EC8',         // Shared/both — soft lavender

  // ── Semantic Colors ──────────────────────────────────────
  success: '#5A8A6A',        // Resolution green
  safe: '#E8F4EA',           // Safe space green tint (privacy badges)
  warning: '#F0B84A',        // Caution amber
  error: '#E07070',          // Error red

  // ── Borders ──────────────────────────────────────────────
  border: '#E8DDD4',         // Default input/card borders
  borderFocus: '#E07832',    // Focus state border

  // ── Special ──────────────────────────────────────────────
  overlay: 'rgba(0, 0, 0, 0.5)',  // Modal overlays
  darkBg: '#1A0E08',              // Dark background for unpacking reveal screen

  // ── Backward-compat aliases ──────────────────────────────
  // Mapped from old dark-theme names → new light values.
  // Existing components that reference these will still work.
  bgBase: '#FAF7F4',
  bgSurface: '#F2EDE6',
  accentPrimary: '#E07832',
  accentSoft: '#F0A060',
  accentMuted: 'rgba(224, 120, 50, 0.15)',
  partnerBoth: '#9B7EC8',
  textDisabled: '#A89880',
  glassFill: 'rgba(0, 0, 0, 0.03)',
  glassBorder: '#E8DDD4',
  gradientPrimary: ['#F0A060', '#C45A1A', '#8B3A1A'] as [string, string, string],
  primary: '#E07832',
  primaryDark: '#C45A1A',
  primaryLight: 'rgba(224, 120, 50, 0.15)',
  background: '#FAF7F4',
  surface: '#F2EDE6',
  surface2: '#FFFFFF',
  info: '#7B8FA6',
  accentCalm: '#7B8FA6',
  accentWarm: '#F0A060',
} as const;

export type Colors = typeof colors;

/** @deprecated Use Colors instead */
export interface ColorScheme extends Colors {}

export type ThemeMode = 'light' | 'dark';
