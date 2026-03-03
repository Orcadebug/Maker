// Top-level mini-app renderer.
// Receives a RenderResponse from the server and renders the full screen.
// Manages a simple navigation stack, header with back button, loading overlay,
// and pull-to-refresh via a "refresh" event.

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RenderResponse } from '../types';
import { eventSender } from './EventSender';
import RenderNode from './RenderNode';
import { colors, spacing, borderRadius } from '../theme';

interface MiniAppRendererProps {
  renderResponse: RenderResponse;
  isLoading: boolean;
  onBack?: () => void;
}

const MiniAppRenderer: React.FC<MiniAppRendererProps> = ({
  renderResponse,
  isLoading,
  onBack,
}) => {
  const { screenTitle, ui, navStack, loading: serverLoading } = renderResponse;
  const showLoading = isLoading || serverLoading;
  const showBackButton = navStack.length > 1;

  const handleRefresh = useCallback(() => {
    eventSender.sendEvent('refresh', '__screen__');
  }, []);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      // Send a back-navigation event to the server
      eventSender.sendEvent('press', '__back__');
    }
  }, [onBack]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={showLoading ?? false}
        onRefresh={handleRefresh}
        tintColor={colors.primary[500]}
      />
    ),
    [showLoading, handleRefresh],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      {screenTitle ? (
        <View style={styles.header}>
          {showBackButton ? (
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
              hitSlop={8}
            >
              <Text style={styles.backButtonText}>{'<'}</Text>
            </Pressable>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {screenTitle}
          </Text>
          {/* Spacer to center the title */}
          <View style={styles.backButtonPlaceholder} />
        </View>
      ) : null}

      {/* Body: scrollable with pull-to-refresh */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
      >
        <RenderNode node={ui} />
      </ScrollView>

      {/* Loading overlay */}
      {showLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  backButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: colors.neutral[100],
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  backButtonPlaceholder: {
    width: 32,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(MiniAppRenderer);
