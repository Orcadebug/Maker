import React, { useState, useCallback } from 'react';
import {
  View,
  Pressable,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../../../src/theme';
import { Button, Input, H1, Body, Caption, ScreenHeader } from '../../../src/components/ui';
import { useChatStore } from '../../../src/stores/chatStore';
import { useSubscriptionStore, selectCanGenerate } from '../../../src/stores/subscriptionStore';
import { TIER_LIMITS } from '../../../src/types/subscription';
import { generateApp } from '../../../src/services/aiService';
import type { Message } from '../../../src/types/chat';

const SUGGESTION_CHIPS = [
  'Todo List',
  'Habit Tracker',
  'Recipe Book',
  'Expense Tracker',
];

export default function PromptScreen() {
  const params = useLocalSearchParams<{ initialPrompt?: string; prompt?: string }>();
  const [prompt, setPrompt] = useState(params.initialPrompt ?? params.prompt ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tier = useSubscriptionStore((s) => s.tier);
  const generationsToday = useSubscriptionStore((s) => s.generationsToday);
  const canGenerate = useSubscriptionStore(selectCanGenerate);
  const maxGenerations = TIER_LIMITS[tier].maxGenerationsPerDay;

  const { addMessage, setStatus, setConversationId, setCurrentSchema, reset } =
    useChatStore();

  const handleChipPress = (chip: string) => {
    setPrompt(chip);
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);

    // Reset the chat store for a fresh conversation
    reset();
    setStatus('generating');

    // Add the user's prompt as the first message
    const userMessage: Message = {
      id: Date.now().toString(),
      conversationId: '',
      role: 'user',
      content: prompt.trim(),
      tokensUsed: 0,
      modelUsed: null,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMessage);

    // Add an initial assistant message placeholder for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      conversationId: '',
      role: 'assistant',
      content: '',
      tokensUsed: 0,
      modelUsed: null,
      createdAt: new Date().toISOString(),
    };
    addMessage(assistantMessage);

    // Navigate to preview screen immediately so user sees progress
    router.push('/(main)/create/preview');

    try {
      const onChunk = (chunk: string) => {
        // Update the assistant message content incrementally
        const store = useChatStore.getState();
        const messages = store.messages.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: msg.content + chunk }
            : msg
        );
        useChatStore.setState({ messages });
      };

      const result = await generateApp(prompt.trim(), undefined, onChunk);

      if (result.error) {
        setStatus('error');
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          conversationId: '',
          role: 'system',
          content: `Error: ${result.error}`,
          tokensUsed: 0,
          modelUsed: null,
          createdAt: new Date().toISOString(),
        };
        addMessage(errorMessage);
      } else {
        if (result.conversationId) {
          setConversationId(result.conversationId);
          // Update assistant message with the conversation ID
          const store = useChatStore.getState();
          const messages = store.messages.map((msg) =>
            msg.conversationId === ''
              ? { ...msg, conversationId: result.conversationId! }
              : msg
          );
          useChatStore.setState({ messages });
        }
        if (result.miniApp) {
          setCurrentSchema(result.miniApp);
        }
        setStatus('idle');
      }
    } catch (err: any) {
      setStatus('error');
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        conversationId: '',
        role: 'system',
        content: `Something went wrong: ${err.message ?? 'Unknown error'}`,
        tokensUsed: 0,
        modelUsed: null,
        createdAt: new Date().toISOString(),
      };
      addMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [prompt, isSubmitting, addMessage, setStatus, setConversationId, setCurrentSchema, reset]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Create App" onBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title & Description */}
          <H1 style={styles.title}>Describe Your App</H1>
          <Body style={styles.description}>
            Tell us what you'd like to build. Be as specific as you can.
          </Body>

          {/* Prompt Input */}
          <Input
            placeholder="e.g. A habit tracker that lets me log daily habits, see streaks, and get weekly summaries..."
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={6}
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
                  prompt === chip && styles.chipActive,
                ]}
                onPress={() => handleChipPress(chip)}
              >
                <Text style={[
                  styles.chipText,
                  prompt === chip && styles.chipTextActive,
                ]}>{chip}</Text>
              </Pressable>
            ))}
          </View>

          {/* Tips Section */}
          <View style={styles.tipsContainer}>
            <Caption style={styles.tipsTitle}>Tips for a great prompt:</Caption>
            <View style={styles.tipRow}>
              <Text style={styles.tipBullet}>{'\u2022'}</Text>
              <Caption style={styles.tipText}>
                Include the main features you want
              </Caption>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.tipBullet}>{'\u2022'}</Text>
              <Caption style={styles.tipText}>
                Describe the look and feel
              </Caption>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.tipBullet}>{'\u2022'}</Text>
              <Caption style={styles.tipText}>
                Mention any specific data it should handle
              </Caption>
            </View>
          </View>
        </ScrollView>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <Button
            title="Generate App"
            onPress={handleGenerate}
            variant="primary"
            size="lg"
            disabled={!prompt.trim() || !canGenerate}
            loading={isSubmitting}
            style={styles.generateButton}
          />
          <Caption style={styles.usageInfo}>
            {maxGenerations === Infinity
              ? `${generationsToday} generations used today (unlimited)`
              : `${generationsToday} of ${maxGenerations} generations used today`}
          </Caption>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  inputWrapper: {
    marginBottom: spacing.lg,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
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
  chipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  chipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.primary[600],
  },
  tipsContainer: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  tipsTitle: {
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  tipBullet: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },
  tipText: {
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background,
  },
  generateButton: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  usageInfo: {
    textAlign: 'center',
  },
});
