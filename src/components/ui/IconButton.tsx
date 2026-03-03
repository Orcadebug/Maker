import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import type { FeatherIconName } from './Icon';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IconButtonSize = 'sm' | 'md' | 'lg';
type IconButtonVariant = 'ghost' | 'filled';

export interface IconButtonProps {
  /** Feather icon name */
  icon: FeatherIconName;
  /** Press handler */
  onPress: () => void;
  /** Size preset: sm=32, md=40, lg=48 */
  size?: IconButtonSize;
  /** Visual variant: ghost (transparent) or filled (primary bg) */
  variant?: IconButtonVariant;
  /** Override icon color */
  color?: string;
  /** Disable interactions */
  disabled?: boolean;
  /** Style overrides */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SIZE_CONFIG: Record<IconButtonSize, { container: number; icon: number }> = {
  sm: { container: 32, icon: 16 },
  md: { container: 40, icon: 20 },
  lg: { container: 48, icon: 24 },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IconButton({
  icon,
  onPress,
  size = 'md',
  variant = 'ghost',
  color,
  disabled = false,
  style,
}: IconButtonProps) {
  const scale = useSharedValue(1);
  const { container, icon: iconSize } = SIZE_CONFIG[size];

  const isFilled = variant === 'filled';

  const resolvedColor = color
    ?? (isFilled ? colors.text.inverse : colors.text.primary);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.88, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={8}
      style={[
        styles.base,
        {
          width: container,
          height: container,
          borderRadius: container / 2,
          backgroundColor: isFilled ? colors.primary[500] : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        animatedStyle,
        style,
      ]}
    >
      <Feather name={icon} size={iconSize} color={resolvedColor} />
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
