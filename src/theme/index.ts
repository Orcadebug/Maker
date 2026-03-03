/**
 * Unified theme export for Minimal/Clean design system (Notion/Linear style)
 *
 * Import the whole theme:
 *   import { theme } from '@/theme';
 *   theme.colors.primary[500]  // '#6366F1'
 *
 * Or import individual modules:
 *   import { colors, typography, spacing } from '@/theme';
 */

// Re-export every module so consumers can import granularly
export { colors, neutral, primary, semantic, background, surface, overlay, text, border } from './colors';
export type { Colors } from './colors';

export { typography, fontFamily, fontSize, lineHeight, presets } from './typography';
export type { Typography } from './typography';

export { spacing, borderRadius } from './spacing';
export type { Spacing, BorderRadius } from './spacing';

export { shadows, sm, md, lg, none } from './shadows';
export type { Shadows } from './shadows';

// ---------------------------------------------------------------------------
// Unified theme object
// ---------------------------------------------------------------------------
import { colors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius } from './spacing';
import { shadows } from './shadows';

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof theme;

export default theme;
