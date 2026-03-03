/**
 * Typography scale for Minimal/Clean design system
 *
 * Uses the Inter font family loaded via expo-google-fonts.
 * Each preset includes fontFamily, fontSize, and lineHeight so it can be
 * spread directly into a React Native StyleSheet.
 */

// ---------------------------------------------------------------------------
// Font families – these names must match what @expo-google-fonts/inter exports
// after loading via useFonts().
// ---------------------------------------------------------------------------
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

// ---------------------------------------------------------------------------
// Raw size / line-height scale
// ---------------------------------------------------------------------------
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const lineHeight = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 40,
} as const;

// ---------------------------------------------------------------------------
// Pre-composed typography presets
//
// Usage:
//   <Text style={typography.presets.headingLg}>Title</Text>
// ---------------------------------------------------------------------------
export const presets = {
  /** Large heading – e.g. page titles */
  heading4xl: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['4xl'],
  },
  heading3xl: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['3xl'],
  },
  heading2xl: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
  },
  headingXl: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
  },
  headingLg: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },

  /** Body text */
  bodyLg: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },
  bodyBase: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  bodySm: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  bodyXs: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },

  /** Labels & UI chrome */
  labelLg: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  labelBase: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  labelSm: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },
} as const;

// ---------------------------------------------------------------------------
// Combined export
// ---------------------------------------------------------------------------
export const typography = {
  fontFamily,
  fontSize,
  lineHeight,
  presets,
} as const;

export type Typography = typeof typography;
