import React, { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Text,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '../../../src/theme';
import { H1, H2, Body, H3, Caption, Card, Avatar, Badge, Button } from '../../../src/components/ui';
import { useAuthStore } from '../../../src/stores/authStore';
import { useMiniAppStore } from '../../../src/stores/miniAppStore';
import { fetchApps } from '../../../src/services/miniApps';
import type { MiniApp } from '../../../src/types/miniApp';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = spacing.md;
const HORIZONTAL_PADDING = spacing.xl;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const apps = useMiniAppStore((s) => s.apps);
  const setApps = useMiniAppStore((s) => s.setApps);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadApps = useCallback(async () => {
    if (!user) return;
    const result = await fetchApps(user.id);
    if (result.data) {
      setApps(result.data);
    }
    setLoading(false);
  }, [user, setApps]);

  useFocusEffect(
    useCallback(() => {
      loadApps();
    }, [loadApps])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadApps();
    setRefreshing(false);
  }, [loadApps]);

  const navigateToCreate = () => {
    router.push('/(main)/create/prompt');
  };

  const navigateToApp = (appId: string) => {
    router.push(`/(main)/app/${appId}`);
  };

  const renderAppCard = ({ item }: { item: MiniApp }) => (
    <Card
      onPress={() => navigateToApp(item.id)}
      style={styles.appCard}
    >
      <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
        <Text style={styles.iconEmoji}>{item.icon}</Text>
      </View>
      <H3 numberOfLines={1} style={styles.appName}>{item.name}</H3>
      <Caption numberOfLines={1} style={styles.appDescription}>
        {item.description || 'No description'}
      </Caption>
      <Badge
        text={`${item.usageCount} uses`}
        variant="gray"
        style={styles.usageBadge}
      />
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Feather name="smartphone" size={40} color="#818CF8" />
      </View>
      <H2 style={styles.emptyTitle}>No apps yet</H2>
      <Body style={styles.emptyBody}>
        Create your first app with AI
      </Body>
      <Button
        title="Create App"
        onPress={navigateToCreate}
        style={styles.emptyButton}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <H1>My Apps</H1>
        <Pressable onPress={() => router.push('/(main)/(tabs)/settings')}>
          <Avatar
            name={profile?.displayName || user?.email || ''}
            uri={profile?.avatarUrl || undefined}
            size="md"
          />
        </Pressable>
      </View>

      {/* Content */}
      {apps.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={apps}
          renderItem={renderAppCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary[500]}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <FAB onPress={navigateToCreate} />
    </SafeAreaView>
  );
}

function FAB({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.fab, animatedStyle]}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        onPressIn={() => { scale.value = withSpring(0.9, { damping: 15, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
        style={styles.fabInner}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  appCard: {
    width: CARD_WIDTH,
    padding: spacing.lg,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconEmoji: {
    fontSize: 24,
  },
  appName: {
    marginBottom: spacing.xs,
  },
  appDescription: {
    marginBottom: spacing.sm,
  },
  usageBadge: {
    marginTop: spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  emptyButton: {
    paddingHorizontal: spacing['3xl'],
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: HORIZONTAL_PADDING,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
