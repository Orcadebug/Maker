import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../../../../src/theme';
import { Button, Input, H2, Body, Caption, ScreenHeader } from '../../../../src/components/ui';
import { Feather } from '@expo/vector-icons';
import { useMiniAppStore } from '../../../../src/stores/miniAppStore';
import { updateApp } from '../../../../src/services/miniApps';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ICON_OPTIONS = [
  '⚡', '🚀', '📱', '🎯', '🎨', '📊', '📝', '💡',
  '🔧', '🛠️', '📦', '🎵', '🎮', '📸', '🗓️', '💬',
  '🏠', '❤️', '⭐', '🔔', '📚', '🧮', '🕐', '🌤️',
  '🍔', '🏋️', '💰', '🗺️', '✅', '🎲', '🧠', '🌱',
];

const COLOR_OPTIONS = [
  '#6366F1', // Indigo (primary)
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#22C55E', // Green
  '#84CC16', // Lime
  '#EAB308', // Yellow
  '#F59E0B', // Amber
  '#F97316', // Orange
  '#EF4444', // Red
  '#EC4899', // Pink
  '#A855F7', // Purple
  '#78716C', // Gray
  '#1C1917', // Black
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function EditMiniAppScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const appId = id ?? '';

  // Store
  const app = useMiniAppStore((s) => s.apps.find((a) => a.id === appId));
  const updateAppInStore = useMiniAppStore((s) => s.updateApp);

  // Form state
  const [name, setName] = useState(app?.name ?? '');
  const [description, setDescription] = useState(app?.description ?? '');
  const [icon, setIcon] = useState(app?.icon ?? '⚡');
  const [color, setColor] = useState(app?.color ?? '#6366F1');
  const [saving, setSaving] = useState(false);

  // Track if anything changed
  const hasChanges = useMemo(() => {
    if (!app) return false;
    return (
      name !== app.name ||
      description !== (app.description ?? '') ||
      icon !== app.icon ||
      color !== app.color
    );
  }, [name, description, icon, color, app]);

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'App name cannot be empty.');
      return;
    }

    setSaving(true);

    const result = await updateApp(appId, {
      name: name.trim(),
      description: description.trim() || null,
      icon,
      color,
    });

    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }

    // Update local store
    if (result.data) {
      updateAppInStore(appId, result.data);
    }

    router.back();
  }, [appId, name, description, icon, color, updateAppInStore]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <ScreenHeader title="Edit App" onBack />

      {/* Form */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <Input
          label="App Name"
          placeholder="Enter app name"
          value={name}
          onChangeText={setName}
          style={styles.field}
        />

        {/* Description */}
        <Input
          label="Description"
          placeholder="What does this app do?"
          value={description}
          onChangeText={setDescription}
          multiline
          style={styles.field}
        />

        {/* Icon Picker */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Icon</Text>
          <View style={styles.grid}>
            {ICON_OPTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => setIcon(emoji)}
                style={[
                  styles.iconCell,
                  icon === emoji && styles.iconCellSelected,
                ]}
              >
                <Text style={styles.iconEmoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Color Picker */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Color</Text>
          <View style={styles.colorGrid}>
            {COLOR_OPTIONS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorCell,
                  color === c && styles.colorCellSelected,
                ]}
              >
                <View style={[styles.colorCircle, { backgroundColor: c }]}>
                  {color === c && (
                    <Feather name="check" size={16} color="#FFFFFF" />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Preview */}
        <View style={styles.previewSection}>
          <Caption style={styles.previewLabel}>Preview</Caption>
          <View style={styles.previewCard}>
            <View style={[styles.previewIcon, { backgroundColor: color + '1A' }]}>
              <Text style={styles.previewIconText}>{icon}</Text>
            </View>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName} numberOfLines={1}>
                {name || 'Untitled App'}
              </Text>
              {description ? (
                <Text style={styles.previewDesc} numberOfLines={1}>
                  {description}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <Button
          title="Save Changes"
          onPress={handleSave}
          variant="primary"
          size="lg"
          disabled={!hasChanges || saving}
          loading={saving}
          style={styles.saveButton}
        />
      </View>
    </SafeAreaView>
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
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },

  // Fields
  field: {
    marginBottom: spacing['2xl'],
  },
  fieldLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },

  // Icon grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconCellSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  iconEmoji: {
    fontSize: 22,
  },

  // Color grid
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  colorCell: {
    padding: 3,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCellSelected: {
    borderColor: colors.primary[500],
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },


  // Preview
  previewSection: {
    marginTop: spacing.sm,
  },
  previewLabel: {
    marginBottom: spacing.sm,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  previewIconText: {
    fontSize: 24,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text.primary,
  },
  previewDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background,
  },
  saveButton: {
    width: '100%',
  },
});
