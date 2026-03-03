import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '../../../src/theme';
import { H1, Body, Caption, Card, Avatar, Badge, Button } from '../../../src/components/ui';
import { useAuthStore } from '../../../src/stores/authStore';
import { useSubscriptionStore } from '../../../src/stores/subscriptionStore';
import { signOut } from '../../../src/services/auth';

const APP_VERSION = '1.0.0';

interface SettingsRowProps {
  label: string;
  onPress: () => void;
}

function SettingsRow({ label, onPress }: SettingsRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingsRow,
        pressed && styles.settingsRowPressed,
      ]}
      onPress={onPress}
    >
      <Body>{label}</Body>
      <Feather name="chevron-right" size={18} color="#A8A29E" />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const authSignOut = useAuthStore((s) => s.signOut);
  const tier = useSubscriptionStore((s) => s.tier);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            await signOut();
            authSignOut();
            setSigningOut(false);
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    // Navigate to edit profile (placeholder)
  };

  const handleUpgrade = () => {
    router.push('/(main)/subscription');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <H1 style={styles.title}>Settings</H1>

        {/* Profile section */}
        <View style={styles.section}>
          <View style={styles.profileHeader}>
            <Avatar
              name={profile?.displayName || user?.email || ''}
              uri={profile?.avatarUrl || undefined}
              size="lg"
            />
            <View style={styles.profileInfo}>
              <Body style={styles.profileName}>
                {profile?.displayName || 'User'}
              </Body>
              <Caption>{user?.email || ''}</Caption>
            </View>
          </View>
          <Button
            title="Edit Profile"
            variant="secondary"
            size="sm"
            onPress={handleEditProfile}
            style={styles.editProfileButton}
          />
        </View>

        {/* Subscription section */}
        <Card style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <Body style={styles.sectionLabel}>Subscription</Body>
            <Badge
              text={tier === 'pro' ? 'Pro' : 'Free'}
              variant={tier === 'pro' ? 'primary' : 'gray'}
            />
          </View>
          <Caption style={styles.subscriptionDescription}>
            {tier === 'pro'
              ? 'Unlimited apps, generations, and premium models'
              : 'Up to 3 apps and 5 generations per day'}
          </Caption>
          {tier === 'free' && (
            <Button
              title="Upgrade to Pro"
              size="sm"
              onPress={handleUpgrade}
              style={styles.upgradeButton}
            />
          )}
        </Card>

        {/* App section */}
        <View style={styles.section}>
          <Caption style={styles.sectionTitle}>APP</Caption>
          <View style={styles.settingsList}>
            <SettingsRow label="About" onPress={() => {}} />
            <SettingsRow label="Privacy Policy" onPress={() => {}} />
            <SettingsRow label="Terms of Service" onPress={() => {}} />
          </View>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Caption style={styles.sectionTitle}>ACCOUNT</Caption>
          <Button
            title="Sign Out"
            variant="danger"
            onPress={handleSignOut}
            loading={signingOut}
            style={styles.signOutButton}
          />
        </View>

        {/* Version */}
        <Caption style={styles.versionText}>
          Version {APP_VERSION}
        </Caption>
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
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },
  title: {
    marginBottom: spacing['2xl'],
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileInfo: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  profileName: {
    fontFamily: typography.fontFamily.semiBold,
    marginBottom: spacing.xs,
  },
  editProfileButton: {
    alignSelf: 'flex-start',
  },
  subscriptionCard: {
    marginBottom: spacing['2xl'],
    backgroundColor: colors.surface,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.semiBold,
  },
  subscriptionDescription: {
    marginBottom: spacing.md,
  },
  upgradeButton: {
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.medium,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  settingsList: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  settingsRowPressed: {
    backgroundColor: colors.neutral[100],
  },

  signOutButton: {
    width: '100%',
  },
  versionText: {
    textAlign: 'center',
    color: colors.text.tertiary,
    marginTop: spacing.lg,
  },
});
