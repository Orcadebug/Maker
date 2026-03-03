import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../../../../src/theme';
import { Button, Modal, LoadingOverlay, Body, ScreenHeader, IconButton } from '../../../../src/components/ui';
import { Feather } from '@expo/vector-icons';
import { useMiniAppStore } from '../../../../src/stores/miniAppStore';
import { useViewerStore } from '../../../../src/stores/viewerStore';
import { archiveApp } from '../../../../src/services/miniApps';
import { useRenderEngine } from '../../../../src/hooks/useRenderEngine';
import { MiniAppRenderer } from '../../../../src/renderer';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MiniAppViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const appId = id ?? '';

  // Store data
  const app = useMiniAppStore((s) => s.apps.find((a) => a.id === appId));
  const removeApp = useMiniAppStore((s) => s.removeApp);
  const viewerReset = useViewerStore((s) => s.reset);

  // Render engine
  const { renderResponse, isLoading, error, sendEvent } = useRenderEngine(appId);

  // Menu modal
  const [menuVisible, setMenuVisible] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Reset viewer store on unmount
  useEffect(() => {
    return () => {
      viewerReset();
    };
  }, [viewerReset]);

  // -----------------------------------------------------------------------
  // Menu actions
  // -----------------------------------------------------------------------

  const handleEditDetails = useCallback(() => {
    setMenuVisible(false);
    router.push(`/(main)/app/${appId}/edit`);
  }, [appId]);

  const handleRefine = useCallback(() => {
    setMenuVisible(false);
    router.push('/(main)/create/chat');
  }, []);

  const handleArchive = useCallback(() => {
    setMenuVisible(false);

    Alert.alert(
      'Archive App',
      `Are you sure you want to archive "${app?.name ?? 'this app'}"? You can restore it later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            setArchiving(true);
            const result = await archiveApp(appId);
            setArchiving(false);

            if (result.error) {
              Alert.alert('Error', result.error);
              return;
            }

            removeApp(appId);
            router.back();
          },
        },
      ],
    );
  }, [appId, app?.name, removeApp]);

  const handleRetry = useCallback(() => {
    // Re-mount the render engine by navigating to the same screen
    router.replace(`/(main)/app/${appId}`);
  }, [appId]);

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (error && !isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title={app?.name ?? 'App'} onBack />

        <View style={styles.errorContainer}>
          <View style={styles.errorIconCircle}>
            <Feather name="alert-circle" size={32} color="#EF4444" />
          </View>
          <Body style={styles.errorText}>
            Something went wrong loading this app.
          </Body>
          <Body style={styles.errorDetail}>{error}</Body>
          <Button
            title="Retry"
            onPress={handleRetry}
            variant="primary"
            size="md"
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------------------------------
  // Loading state (no render response yet)
  // -----------------------------------------------------------------------

  if (!renderResponse) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingOverlay visible message="Loading app..." />
      </SafeAreaView>
    );
  }

  // -----------------------------------------------------------------------
  // Main viewer
  // -----------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header bar */}
      <ScreenHeader
        title={app?.name ?? renderResponse.screenTitle ?? 'App'}
        onBack
        rightAction={
          <IconButton icon="more-horizontal" onPress={() => setMenuVisible(true)} size="sm" />
        }
      />

      {/* Mini app renderer (full remaining area) */}
      <View style={styles.rendererContainer}>
        <MiniAppRenderer
          renderResponse={renderResponse}
          isLoading={isLoading}
        />
      </View>

      {/* Archive loading overlay */}
      <LoadingOverlay visible={archiving} message="Archiving..." />

      {/* Menu modal */}
      <Modal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title="Options"
      >
        <View style={styles.menuList}>
          <MenuItem
            label="Edit Details"
            icon="pencil"
            onPress={handleEditDetails}
          />
          <MenuItem
            label="Refine with AI"
            icon="sparkles"
            onPress={handleRefine}
          />
          <MenuItem
            label="Share"
            icon="share"
            onPress={() => {}}
            disabled
          />
          <View style={styles.menuDivider} />
          <MenuItem
            label="Archive"
            icon="archive"
            onPress={handleArchive}
            destructive
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Menu Item
// ---------------------------------------------------------------------------

interface MenuItemProps {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

const MENU_ICON_MAP: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  pencil: 'edit-2',
  sparkles: 'zap',
  share: 'share',
  archive: 'archive',
};

function MenuItem({ label, icon, onPress, disabled = false, destructive = false }: MenuItemProps) {
  const iconName = MENU_ICON_MAP[icon] ?? 'circle';
  const iconColor = destructive ? '#EF4444' : disabled ? '#A8A29E' : '#44403C';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.menuItem,
        pressed && !disabled && styles.menuItemPressed,
      ]}
    >
      <View style={styles.menuItemLeft}>
        <Feather name={iconName} size={18} color={iconColor} />
        <Text
          style={[
            styles.menuItemLabel,
            disabled && styles.menuItemLabelDisabled,
            destructive && styles.menuItemLabelDestructive,
          ]}
        >
          {label}
        </Text>
      </View>
      {disabled && (
        <Text style={styles.menuItemBadge}>Coming soon</Text>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
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
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPressed: {
    backgroundColor: colors.neutral[100],
  },
  headerButtonText: {
    fontSize: 20,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  headerButtonPlaceholder: {
    width: 36,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text.primary,
    marginHorizontal: spacing.sm,
  },
  menuDots: {
    fontSize: 22,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 1,
  },

  // Renderer
  rendererContainer: {
    flex: 1,
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  errorText: {
    textAlign: 'center',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  errorDetail: {
    textAlign: 'center',
    color: colors.text.secondary,
    marginBottom: spacing['2xl'],
    fontSize: typography.fontSize.sm,
  },
  retryButton: {
    paddingHorizontal: spacing['3xl'],
  },

  // Menu
  menuList: {
    paddingBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  menuItemPressed: {
    backgroundColor: colors.neutral[50],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text.primary,
  },
  menuItemLabelDisabled: {
    color: colors.text.tertiary,
  },
  menuItemLabelDestructive: {
    color: colors.semantic.error,
  },
  menuItemBadge: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.tertiary,
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
    marginVertical: spacing.sm,
  },
});
