import React, { useCallback, useState } from 'react';
import { View, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../../src/theme';
import { Button, Body, LoadingOverlay, ScreenHeader, IconButton, Caption } from '../../../src/components/ui';
import { useChatStore } from '../../../src/stores/chatStore';
import { useMiniAppStore } from '../../../src/stores/miniAppStore';
import { useViewerStore } from '../../../src/stores/viewerStore';
import { refineApp } from '../../../src/services/aiService';
import { MiniAppRenderer } from '../../../src/renderer';
import type { Message } from '../../../src/types/chat';

export default function PreviewScreen() {
  const { currentSchema, conversationId, status, addMessage, setStatus, setCurrentSchema } = useChatStore();
  const { addApp } = useMiniAppStore();
  const { renderResponse, isLoading, error, setError } = useViewerStore();
  const [isSaving, setIsSaving] = useState(false);
  const [refineText, setRefineText] = useState('');

  const isGenerating = status === 'generating' || status === 'refining';

  const handleSave = useCallback(async () => {
    if (!currentSchema) {
      Alert.alert('No App', 'There is no generated app to save yet.');
      return;
    }

    setIsSaving(true);
    try {
      addApp(currentSchema);
      useChatStore.getState().reset();
      useViewerStore.getState().reset();
      router.replace('/(main)/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message ?? 'Could not save the app.');
    } finally {
      setIsSaving(false);
    }
  }, [currentSchema, addApp]);

  const handleRefine = useCallback(async () => {
    const text = refineText.trim();
    if (!text || isGenerating || !conversationId) return;

    setRefineText('');
    setStatus('refining');

    const userMessage: Message = {
      id: Date.now().toString(),
      conversationId,
      role: 'user',
      content: text,
      tokensUsed: 0,
      modelUsed: null,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMessage);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      conversationId,
      role: 'assistant',
      content: '',
      tokensUsed: 0,
      modelUsed: null,
      createdAt: new Date().toISOString(),
    };
    addMessage(assistantMessage);

    try {
      const onChunk = (chunk: string) => {
        const store = useChatStore.getState();
        const updatedMessages = store.messages.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: msg.content + chunk }
            : msg
        );
        useChatStore.setState({ messages: updatedMessages });
      };

      const result = await refineApp(conversationId, text, undefined, onChunk);

      if (result.error) {
        setStatus('error');
      } else {
        if (result.miniApp) {
          setCurrentSchema(result.miniApp);
        }
        setStatus('idle');
      }
    } catch (err: any) {
      setStatus('error');
    }
  }, [refineText, isGenerating, conversationId, addMessage, setStatus, setCurrentSchema]);

  const handleRetry = useCallback(() => {
    setError(null);
    router.back();
  }, [setError]);

  const saveAction = (
    <Button
      title="Save"
      onPress={handleSave}
      size="sm"
      disabled={!currentSchema || isSaving}
      loading={isSaving}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Preview" onBack rightAction={saveAction} />

      {/* Main Content */}
      <View style={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconCircle}>
              <Feather name="alert-circle" size={32} color="#EF4444" />
            </View>
            <Body style={styles.errorText}>{error}</Body>
            <Button
              title="Go Back"
              onPress={handleRetry}
              variant="secondary"
              size="md"
              style={styles.retryButton}
            />
          </View>
        ) : renderResponse ? (
          <MiniAppRenderer
            renderResponse={renderResponse}
            isLoading={isLoading}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.generatingContainer}>
              <Caption style={styles.generatingText}>
                {isGenerating ? 'Generating your app...' : 'No preview available yet.'}
              </Caption>
            </View>
          </View>
        )}
      </View>

      {/* Loading overlay */}
      <LoadingOverlay visible={isLoading && !renderResponse} message="Generating your app..." />

      {/* Inline refine input */}
      <View style={styles.refineBar}>
        <TextInput
          style={styles.refineInput}
          placeholder="Describe a change..."
          placeholderTextColor={colors.neutral[400]}
          value={refineText}
          onChangeText={setRefineText}
          multiline
          maxLength={2000}
          editable={!isGenerating && !!conversationId}
        />
        <IconButton
          icon="arrow-up"
          variant="filled"
          size="sm"
          onPress={handleRefine}
          disabled={!refineText.trim() || isGenerating || !conversationId}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
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
    color: colors.semantic.error,
    marginBottom: spacing.xl,
  },
  retryButton: {
    minWidth: 120,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  generatingContainer: {
    alignItems: 'center',
  },
  generatingText: {
    textAlign: 'center',
    color: colors.text.secondary,
  },
  refineBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  refineInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text.primary,
    backgroundColor: colors.neutral[50],
  },
});
