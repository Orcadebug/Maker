import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '../../../src/theme';
import { H1, Body, Caption, Button, Input } from '../../../src/components/ui';
import { useSubscriptionStore, selectCanGenerate } from '../../../src/stores/subscriptionStore';
import { TIER_LIMITS } from '../../../src/types/subscription';

const SUGGESTION_CHIPS = [
  'Todo List',
  'Habit Tracker',
  'Recipe Book',
  'Expense Tracker',
];

export default function CreateScreen() {
  const [prompt, setPrompt] = useState('');

  const tier = useSubscriptionStore((s) => s.tier);
  const generationsToday = useSubscriptionStore((s) => s.generationsToday);
  const canGenerate = useSubscriptionStore(selectCanGenerate);
  const maxGenerations = TIER_LIMITS[tier].maxGenerationsPerDay;

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    router.push({
      pathname: '/(main)/create/prompt',
      params: { initialPrompt: prompt.trim() },
    });
  };

  const handleChipPress = (chip: string) => {
    setPrompt(chip);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <H1 style={styles.title}>Create</H1>
          <Body style={styles.subtitle}>
            Describe what you want to build and AI will create it for you
          </Body>

          {/* Input area */}
          <Input
            placeholder="e.g. A recipe manager that lets me save and categorize my favorite recipes..."
            value={prompt}
            onChangeText={setPrompt}
            multiline
            style={styles.inputWrapper}
          />

          {/* Suggestion chips */}
          <View style={styles.chipsContainer}>
            {SUGGESTION_CHIPS.map((chip) => (
              <Pressable
                key={chip}
                style={({ pressed }) => [
                  styles.chip,
                  pressed && styles.chipPressed,
                ]}
                onPress={() => handleChipPress(chip)}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </Pressable>
            ))}
          </View>

          {/* Generate button */}
          <Button
            title="Generate App"
            onPress={handleGenerate}
            disabled={!prompt.trim() || !canGenerate}
            size="lg"
            style={styles.generateButton}
          />

          {/* Usage info */}
          <Caption style={styles.usageInfo}>
            {maxGenerations === Infinity
              ? `${generationsToday} generations used today (unlimited)`
              : `${generationsToday} of ${maxGenerations} generations used today`}
          </Caption>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.text.secondary,
    marginBottom: spacing['2xl'],
  },
  inputWrapper: {
    marginBottom: spacing.lg,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  chipPressed: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[300],
  },
  chipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },
  generateButton: {
    marginBottom: spacing.lg,
  },
  usageInfo: {
    textAlign: 'center',
  },
});
