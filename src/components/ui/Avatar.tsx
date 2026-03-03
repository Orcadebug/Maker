import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** Image URI; when absent the component shows initials */
  uri?: string;
  /** Full name used to derive initials when no image is available */
  name?: string;
  /** Size preset */
  size?: AvatarSize;
  /** Style overrides */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Size config
// ---------------------------------------------------------------------------

const SIZE_CONFIG: Record<AvatarSize, { container: number; fontSize: number }> = {
  sm: { container: 32, fontSize: typography.fontSize.xs },
  md: { container: 40, fontSize: typography.fontSize.sm },
  lg: { container: 56, fontSize: typography.fontSize.xl },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract up to two initials from a name string. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Deterministic background color from a name string. */
const PALETTE = [
  colors.primary[400],
  colors.primary[500],
  colors.primary[600],
  colors.semantic.success,
  colors.semantic.info,
  colors.semantic.warning,
] as const;

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Avatar({ uri, name = '', size = 'md', style }: AvatarProps) {
  const { container, fontSize } = SIZE_CONFIG[size];
  const borderRadius = container / 2;

  const bgColor = useMemo(() => colorFromName(name), [name]);
  const initials = useMemo(() => getInitials(name), [name]);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          {
            width: container,
            height: container,
            borderRadius,
            backgroundColor: colors.neutral[200],
          } as ImageStyle,
          style as ImageStyle,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: container,
          height: container,
          borderRadius,
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
});
