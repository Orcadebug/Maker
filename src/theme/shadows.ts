/**
 * Shadow presets for Minimal/Clean design system
 *
 * These use the iOS shadow properties supported by React Native.
 * For Android elevation, a numeric `elevation` value is included as well.
 *
 * Usage:
 *   <View style={shadows.sm} />
 */

import { Platform, type ViewStyle } from 'react-native';

// ---------------------------------------------------------------------------
// Helper – return iOS shadow props + Android elevation in one object
// ---------------------------------------------------------------------------
type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/** Subtle shadow for cards and list items */
export const sm: ShadowStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
} as const;

/** Medium shadow for dropdowns and popovers */
export const md: ShadowStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
} as const;

/** Large shadow for modals and overlays */
export const lg: ShadowStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 6,
} as const;

/** No shadow – useful as a reset */
export const none: ShadowStyle = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
} as const;

// ---------------------------------------------------------------------------
// Combined export
// ---------------------------------------------------------------------------
export const shadows = {
  sm,
  md,
  lg,
  none,
} as const;

export type Shadows = typeof shadows;
