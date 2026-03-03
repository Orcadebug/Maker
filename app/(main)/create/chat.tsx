import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../../../src/theme';
import { Body, Caption, ScreenHeader, IconButton } from '../../../src/components/ui';
import { Feather } from '@expo/vector-icons';
import { useChatStore } from '../../../src/stores/chatStore';
import { refineApp } from '../../../src/services/aiService';
import type { Message } from '../../../src/types/chat';

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);

  const {
    messages,
    status,
    conversationId,
    addMessage,
    setStatus,
    setCurrentSchema,
  } = useChatStore();

  const isGenerating = status === 'generating' || status === 'refining';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isGenerating || !conversationId) return;

    setInputText('');
    setStatus('refining');

    // Add the user message
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

    // Add assistant placeholder for streaming
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
        const errorMsg: Message = {
          id: (Date.now() + 2).toString(),
          conversationId,
          role: 'system',
          content: `Error: ${result.error}`,
          tokensUsed: 0,
          modelUsed: null,
          createdAt: new Date().toISOString(),
        };
        addMessage(errorMsg);
      } else {
        if (result.miniApp) {
          setCurrentSchema(result.miniApp);
        }
        setStatus('idle');
      }
    } catch (err: any) {
      setStatus('error');
      const errorMsg: Message = {
        id: (Date.now() + 3).toString(),
        conversationId,
        role: 'system',
        content: `Something went wrong: ${err.message ?? 'Unknown error'}`,
        tokensUsed: 0,
        modelUsed: null,
        createdAt: new Date().toISOString(),
      };
      addMessage(errorMsg);
    }
  }, [inputText, isGenerating, conversationId, addMessage, setStatus, setCurrentSchema]);

  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<Message>) => {
      if (item.role === 'system') {
        return (
          <View style={styles.systemMessageContainer}>
            <Caption style={styles.systemMessageText}>{item.content}</Caption>
          </View>
        );
      }

      const isUser = item.role === 'user';

      return (
        <View
          style={[
            styles.messageBubbleRow,
            isUser ? styles.messageBubbleRowUser : styles.messageBubbleRowAssistant,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Body
              style={[
                styles.messageText,
                isUser ? styles.userMessageText : styles.assistantMessageText,
              ]}
            >
              {item.content}
            </Body>
          </View>
        </View>
      );
    },
    []
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <ScreenHeader
        title="Refining Your App"
        onBack
        rightAction={
          <Pressable
            onPress={() => router.push('/(main)/create/preview')}
            style={({ pressed }) => [
              styles.previewButton,
              pressed && styles.previewButtonPressed,
            ]}
          >
            <Feather name="eye" size={14} color="#4F46E5" style={{ marginRight: 4 }} />
            <Text style={styles.previewButtonText}>Preview</Text>
          </Pressable>
        }
      />

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.messagesList}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListFooterComponent={
          isGenerating ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
              <Caption style={styles.typingText}>Generating...</Caption>
            </View>
          ) : null
        }
      />

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.chatInput}
          placeholder="Describe a change..."
          placeholderTextColor={colors.neutral[400]}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
          editable={!isGenerating}
        />
        <IconButton
          icon="arrow-up"
          variant="filled"
          size="sm"
          onPress={handleSend}
          disabled={!inputText.trim() || isGenerating}
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
  // ---- Header ----
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.text.primary,
    marginHorizontal: spacing.sm,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
  },
  previewButtonPressed: {
    backgroundColor: colors.primary[100],
  },
  previewButtonText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
  },
  // ---- Messages ----
  messagesList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageBubbleRow: {
    marginBottom: spacing.md,
    flexDirection: 'row',
  },
  messageBubbleRowUser: {
    justifyContent: 'flex-end',
  },
  messageBubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  userBubble: {
    backgroundColor: colors.primary[500],
    borderBottomRightRadius: borderRadius.sm,
  },
  assistantBubble: {
    backgroundColor: colors.neutral[100],
    borderBottomLeftRadius: borderRadius.sm,
  },
  messageText: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.base,
  },
  userMessageText: {
    color: colors.text.inverse,
  },
  assistantMessageText: {
    color: colors.text.primary,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  systemMessageText: {
    textAlign: 'center',
    color: colors.text.tertiary,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  typingText: {
    color: colors.text.secondary,
  },
  // ---- Input Bar ----
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  chatInput: {
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
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonPressed: {
    backgroundColor: colors.primary[600],
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.inverse,
  },
});
