/**
 * Color palette for Minimal/Clean design system (Notion/Linear style)
 *
 * Warm gray neutrals, indigo primary, and semantic colors.
 * All values are plain hex strings suitable for React Native StyleSheet usage.
 */

// ---------------------------------------------------------------------------
// Neutral – warm grays
// ---------------------------------------------------------------------------
export const neutral = {
  50: '#FAFAFA',
  100: '#F5F5F4',
  200: '#E7E5E4',
  300: '#D6D3D1',
  400: '#A8A29E',
  500: '#78716C',
  600: '#57534E',
  700: '#44403C',
  800: '#292524',
  900: '#1C1917',
} as const;

// ---------------------------------------------------------------------------
// Primary – indigo
// ---------------------------------------------------------------------------
export const primary = {
  50: '#EEF2FF',
  100: '#E0E7FF',
  200: '#C7D2FE',
  300: '#A5B4FC',
  400: '#818CF8',
  500: '#6366F1', // main
  600: '#4F46E5',
  700: '#4338CA',
} as const;

// ---------------------------------------------------------------------------
// Semantic colors
// ---------------------------------------------------------------------------
export const semantic = {
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

// ---------------------------------------------------------------------------
// Surfaces & overlays
// ---------------------------------------------------------------------------
export const background = '#FFFFFF' as const;
export const surface = '#FAFAFA' as const;
export const overlay = 'rgba(0, 0, 0, 0.4)' as const;

// ---------------------------------------------------------------------------
// Convenience text colors derived from the neutral scale
// ---------------------------------------------------------------------------
export const text = {
  primary: neutral[900],
  secondary: neutral[600],
  tertiary: neutral[400],
  inverse: '#FFFFFF',
  link: primary[500],
} as const;

// ---------------------------------------------------------------------------
// Border colors
// ---------------------------------------------------------------------------
export const border = {
  default: neutral[200],
  light: neutral[100],
  focus: primary[500],
} as const;

// ---------------------------------------------------------------------------
// Combined export
// ---------------------------------------------------------------------------
export const colors = {
  neutral,
  primary,
  semantic,
  background,
  surface,
  overlay,
  text,
  border,
} as const;

export type Colors = typeof colors;
