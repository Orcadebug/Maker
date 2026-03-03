import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Button label */
  title: string;
  /** Press handler */
  onPress?: () => void;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Disable interactions */
  disabled?: boolean;
  /** Show a loading spinner in place of the title */
  loading?: boolean;
  /** Optional style overrides for the outer container */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Size mappings
// ---------------------------------------------------------------------------

const SIZE_CONFIG: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number; lineHeight: number }> = {
  sm: { paddingVertical: 6, paddingHorizontal: 12, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm },
  md: { paddingVertical: 10, paddingHorizontal: 16, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base },
  lg: { paddingVertical: 14, paddingHorizontal: 20, fontSize: typography.fontSize.lg, lineHeight: typography.lineHeight.lg },
};

// ---------------------------------------------------------------------------
// Variant styles (background, border, text)
// ---------------------------------------------------------------------------

interface VariantStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  textColor: string;
  loaderColor: string;
}

const VARIANT_CONFIG: Record<ButtonVariant, VariantStyle> = {
  primary: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
    borderWidth: 1,
    textColor: colors.text.inverse,
    loaderColor: colors.text.inverse,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: colors.neutral[300],
    borderWidth: 1,
    textColor: colors.text.primary,
    loaderColor: colors.text.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 1,
    textColor: colors.primary[500],
    loaderColor: colors.primary[500],
  },
  danger: {
    backgroundColor: colors.semantic.error,
    borderColor: colors.semantic.error,
    borderWidth: 1,
    textColor: colors.text.inverse,
    loaderColor: colors.text.inverse,
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const variantStyle = VARIANT_CONFIG[variant];
  const sizeStyle = SIZE_CONFIG[size];
  const scale = useSharedValue(1);

  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!isDisabled) {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.base,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          borderWidth: variantStyle.borderWidth,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          opacity: isDisabled ? 0.5 : 1,
        },
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyle.loaderColor}
        />
      ) : (
        <Text
          style={[
            styles.label,
            {
              color: variantStyle.textColor,
              fontSize: sizeStyle.fontSize,
              lineHeight: sizeStyle.lineHeight,
            },
          ]}
        >
          {title}
        </Text>
      )}
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
});
