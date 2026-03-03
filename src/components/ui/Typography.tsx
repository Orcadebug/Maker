import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// ---------------------------------------------------------------------------
// Shared props
// ---------------------------------------------------------------------------

export interface TypographyProps {
  children: React.ReactNode;
  /** Style overrides */
  style?: StyleProp<TextStyle>;
  /** Number of lines before truncating (optional) */
  numberOfLines?: number;
}

// ---------------------------------------------------------------------------
// H1
// ---------------------------------------------------------------------------

export function H1({ children, style, numberOfLines }: TypographyProps) {
  return (
    <Text style={[styles.h1, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// H2
// ---------------------------------------------------------------------------

export function H2({ children, style, numberOfLines }: TypographyProps) {
  return (
    <Text style={[styles.h2, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// H3
// ---------------------------------------------------------------------------

export function H3({ children, style, numberOfLines }: TypographyProps) {
  return (
    <Text style={[styles.h3, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

export function Body({ children, style, numberOfLines }: TypographyProps) {
  return (
    <Text style={[styles.body, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Caption
// ---------------------------------------------------------------------------

export function Caption({ children, style, numberOfLines }: TypographyProps) {
  return (
    <Text style={[styles.caption, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

export function Label({ children, style, numberOfLines }: TypographyProps) {
  return (
    <Text style={[styles.label, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  h1: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize['3xl'],
    lineHeight: typography.lineHeight['3xl'],
    color: colors.text.primary,
  },
  h2: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize['2xl'],
    lineHeight: typography.lineHeight['2xl'],
    color: colors.text.primary,
  },
  h3: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.text.primary,
  },
  body: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text.primary,
  },
  caption: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.primary,
  },
});
