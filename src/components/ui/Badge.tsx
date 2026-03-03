import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'gray';

export interface BadgeProps {
  /** Badge label */
  text: string;
  /** Color variant */
  variant?: BadgeVariant;
  /** Style overrides */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Variant config (background + text color)
// ---------------------------------------------------------------------------

interface VariantStyle {
  backgroundColor: string;
  textColor: string;
}

const VARIANT_CONFIG: Record<BadgeVariant, VariantStyle> = {
  primary: {
    backgroundColor: colors.primary[100],
    textColor: colors.primary[700],
  },
  success: {
    backgroundColor: '#DCFCE7', // green-100 equivalent
    textColor: '#166534',       // green-800 equivalent
  },
  warning: {
    backgroundColor: '#FEF3C7', // amber-100 equivalent
    textColor: '#92400E',       // amber-800 equivalent
  },
  error: {
    backgroundColor: '#FEE2E2', // red-100 equivalent
    textColor: '#991B1B',       // red-800 equivalent
  },
  gray: {
    backgroundColor: colors.neutral[100],
    textColor: colors.neutral[700],
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Badge({ text, variant = 'gray', style }: BadgeProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.backgroundColor },
        style,
      ]}
    >
      <Text style={[styles.text, { color: config.textColor }]}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  text: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.xs,
  },
});
