import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { IconButton } from './IconButton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScreenHeaderProps {
  /** Header title */
  title: string;
  /** Show back arrow. Defaults to router.back() if true, or pass a custom handler */
  onBack?: boolean | (() => void);
  /** Optional right-side action slot */
  rightAction?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScreenHeader({ title, onBack, rightAction }: ScreenHeaderProps) {
  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.header}>
      {onBack ? (
        <IconButton icon="arrow-left" onPress={handleBack} size="sm" />
      ) : (
        <View style={styles.placeholder} />
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {rightAction ? (
        rightAction
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.background,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.text.primary,
    marginHorizontal: spacing.sm,
  },
  placeholder: {
    width: 32,
  },
});
