import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '../../src/theme';
import { H1, H2, H3, Body, Caption, Card, Badge, Button } from '../../src/components/ui';
import { Feather } from '@expo/vector-icons';
import { IconButton } from '../../src/components/ui';
import { useSubscriptionStore } from '../../src/stores/subscriptionStore';

const FREE_FEATURES = [
  'Up to 3 mini-apps',
  '5 generations per day',
  '20 refinements per day',
  'Auto model selection',
];

const PRO_FEATURES = [
  'Unlimited mini-apps',
  'Unlimited generations',
  'Unlimited refinements',
  'Premium AI models',
  'Cloud sync',
  'Priority support',
];

const COMPARISON = [
  { feature: 'Mini-apps', free: '3', pro: 'Unlimited' },
  { feature: 'Generations / day', free: '5', pro: 'Unlimited' },
  { feature: 'Refinements / day', free: '20', pro: 'Unlimited' },
  { feature: 'AI Models', free: 'Auto', pro: 'All models' },
  { feature: 'Cloud sync', free: '---', pro: 'Included' },
];

export default function SubscriptionScreen() {
  const tier = useSubscriptionStore((s) => s.tier);

  const handleUpgrade = () => {
    // Placeholder for payment flow
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <View style={styles.backButton}>
          <IconButton icon="arrow-left" onPress={() => router.back()} size="sm" />
        </View>

        {/* Title */}
        <H1 style={styles.title}>Subscription</H1>

        {/* Current plan */}
        <Card style={styles.currentPlanCard}>
          <View style={styles.currentPlanHeader}>
            <Body style={styles.currentPlanLabel}>Current Plan</Body>
            <Badge
              text={tier === 'pro' ? 'Pro' : 'Free'}
              variant={tier === 'pro' ? 'primary' : 'gray'}
            />
          </View>
          <Caption>
            {tier === 'pro'
              ? 'You have access to all features'
              : 'Upgrade to unlock unlimited access'}
          </Caption>
        </Card>

        {/* Plan cards */}
        <View style={styles.plansRow}>
          {/* Free plan */}
          <Card style={[styles.planCard, tier === 'free' && styles.planCardActive]}>
            <H3 style={styles.planName}>Free</H3>
            <Text style={styles.planPrice}>$0</Text>
            <Caption style={styles.planPeriod}>forever</Caption>
            <View style={styles.featureList}>
              {FREE_FEATURES.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <Feather name="check" size={14} color="#22C55E" style={styles.checkmark} />
                  <Caption style={styles.featureText}>{feature}</Caption>
                </View>
              ))}
            </View>
            {tier === 'free' ? (
              <Badge
                text="Current Plan"
                variant="gray"
                style={styles.planBadge}
              />
            ) : (
              <View style={styles.planBadgePlaceholder} />
            )}
          </Card>

          {/* Pro plan */}
          <Card style={[styles.planCard, tier === 'pro' && styles.planCardActive]}>
            <H3 style={styles.planName}>Pro</H3>
            <Text style={styles.planPrice}>$9.99</Text>
            <Caption style={styles.planPeriod}>per month</Caption>
            <View style={styles.featureList}>
              {PRO_FEATURES.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <Feather name="check" size={14} color="#6366F1" style={styles.checkmarkPro} />
                  <Caption style={styles.featureText}>{feature}</Caption>
                </View>
              ))}
            </View>
            {tier === 'pro' ? (
              <Badge
                text="Current Plan"
                variant="primary"
                style={styles.planBadge}
              />
            ) : (
              <Button
                title="Upgrade to Pro"
                size="sm"
                onPress={handleUpgrade}
                style={styles.upgradeButton}
              />
            )}
          </Card>
        </View>

        {/* Feature comparison */}
        <H2 style={styles.comparisonTitle}>Feature Comparison</H2>
        <Card style={styles.comparisonCard}>
          {/* Header row */}
          <View style={[styles.comparisonRow, styles.comparisonHeaderRow]}>
            <Body style={[styles.comparisonCell, styles.comparisonFeatureCell, styles.comparisonHeaderText]}>
              Feature
            </Body>
            <Body style={[styles.comparisonCell, styles.comparisonHeaderText]}>Free</Body>
            <Body style={[styles.comparisonCell, styles.comparisonHeaderText]}>Pro</Body>
          </View>
          {/* Data rows */}
          {COMPARISON.map((row, index) => (
            <View
              key={row.feature}
              style={[
                styles.comparisonRow,
                index < COMPARISON.length - 1 && styles.comparisonRowBorder,
              ]}
            >
              <Caption style={[styles.comparisonCell, styles.comparisonFeatureCell]}>
                {row.feature}
              </Caption>
              <Caption style={styles.comparisonCell}>{row.free}</Caption>
              <Caption style={[styles.comparisonCell, styles.comparisonProText]}>
                {row.pro}
              </Caption>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  backButton: {
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },

  title: {
    marginBottom: spacing['2xl'],
  },
  currentPlanCard: {
    marginBottom: spacing['2xl'],
    backgroundColor: colors.surface,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  currentPlanLabel: {
    fontFamily: typography.fontFamily.semiBold,
  },
  plansRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['3xl'],
  },
  planCard: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    padding: spacing.lg,
  },
  planCardActive: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  planName: {
    marginBottom: spacing.xs,
  },
  planPrice: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize['3xl'],
    lineHeight: typography.lineHeight['3xl'],
    color: colors.text.primary,
  },
  planPeriod: {
    marginBottom: spacing.lg,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  checkmark: {
    marginRight: spacing.sm,
  },
  checkmarkPro: {
    marginRight: spacing.sm,
  },
  featureText: {
    flex: 1,
  },
  planBadge: {
    alignSelf: 'center',
  },
  planBadgePlaceholder: {
    height: 22,
  },
  upgradeButton: {
    alignSelf: 'stretch',
  },
  comparisonTitle: {
    marginBottom: spacing.lg,
  },
  comparisonCard: {
    padding: 0,
    overflow: 'hidden',
  },
  comparisonRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  comparisonHeaderRow: {
    backgroundColor: colors.neutral[100],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  comparisonHeaderText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.sm,
  },
  comparisonRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  comparisonCell: {
    flex: 1,
    textAlign: 'center',
  },
  comparisonFeatureCell: {
    flex: 1.5,
    textAlign: 'left',
  },
  comparisonProText: {
    color: colors.primary[600],
    fontFamily: typography.fontFamily.medium,
  },
});
