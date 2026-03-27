/**
 * Relate App — Typography System
 *
 * Design System: Per RelateApp_DesignSpec.md §2.2
 *
 * Font Stack:
 *   Display: Cormorant Garamond — serif, emotional, literary (like Pi AI)
 *   Body:    DM Sans — clean, warm, approachable
 *
 * Font loading: Fonts are loaded in App.tsx via @expo-google-fonts packages.
 * The fontFamilies map below uses the exact names from the font packages.
 *
 * Design note: Use Cormorant Garamond Italic for emotionally loaded words
 * within sentences, e.g. "This is a space where *both of you* are heard."
 *
 * Type Scale (from spec):
 *   displayXl: 56px — Hero moments (splash)
 *   displayLg: 40px — Phase headers
 *   displayMd: 32px — Screen titles
 *   bodyXl:    22px — Pi-style prompts
 *   bodyLg:    18px — Reading text
 *   bodyMd:    16px — Standard body
 *   bodySm:    14px — Supporting text
 *   label:     12px — Uppercase labels
 */

import { TextStyle } from 'react-native';

export const fontFamilies = {
  /** Cormorant Garamond 500 — primary display font */
  display: 'CormorantGaramond_500Medium',
  /** Cormorant Garamond 600 — bold display */
  displayBold: 'CormorantGaramond_600SemiBold',
  /** Cormorant Garamond 500 Italic — emotional emphasis */
  displayItalic: 'CormorantGaramond_500Medium_Italic',
  /** DM Sans 400 — body text */
  body: 'DMSans_400Regular',
  /** DM Sans 600 — bold body, labels, buttons */
  bodyBold: 'DMSans_600SemiBold',
} as const;

export const typography = {
  /** 56px — Hero splash moments */
  displayXl: {
    fontFamily: fontFamilies.display,
    fontSize: 56,
    fontWeight: '600' as const,
    lineHeight: 56,
    letterSpacing: -1,
  } as TextStyle,

  /** 40px — Phase headers, celebration text */
  displayLg: {
    fontFamily: fontFamilies.display,
    fontSize: 40,
    fontWeight: '600' as const,
    lineHeight: 44,
    letterSpacing: -0.5,
  } as TextStyle,

  /** 32px — Screen titles, prompts */
  displayMd: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontWeight: '500' as const,
    lineHeight: 38,
    letterSpacing: -0.3,
  } as TextStyle,

  /** 22px — Pi-style conversational prompts */
  bodyXl: {
    fontFamily: fontFamilies.body,
    fontSize: 22,
    fontWeight: '400' as const,
    lineHeight: 33,
  } as TextStyle,

  /** 18px — Reading text, longer content */
  bodyLg: {
    fontFamily: fontFamilies.body,
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 29,
  } as TextStyle,

  /** 16px — Standard body text */
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  } as TextStyle,

  /** 14px — Supporting text, descriptions */
  bodySm: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  } as TextStyle,

  /** 12px — Uppercase labels, eyebrow text */
  label: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  } as TextStyle,

  // ── Backward-compat aliases ──────────────────────────────
  // Old names → new equivalents so existing screens compile.

  /** @deprecated Use displayLg */
  hero: {
    fontFamily: fontFamilies.display,
    fontSize: 36,
    fontWeight: '600' as const,
    lineHeight: 44,
    letterSpacing: -0.5,
  } as TextStyle,

  /** @deprecated Use displayMd */
  h1: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 36,
    letterSpacing: -0.3,
  } as TextStyle,

  /** @deprecated Use bodyXl */
  h2: {
    fontFamily: fontFamilies.body,
    fontSize: 22,
    fontWeight: '500' as const,
    lineHeight: 28,
    letterSpacing: -0.2,
  } as TextStyle,

  /** @deprecated Use bodyLg */
  h3: {
    fontFamily: fontFamilies.body,
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  } as TextStyle,

  /** @deprecated Use label */
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  } as TextStyle,

  /** @deprecated Use displayMd */
  display: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  } as TextStyle,
} as const;

export type TypographyVariant = keyof typeof typography;
