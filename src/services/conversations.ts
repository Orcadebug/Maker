import { supabase } from './supabase';
import type { Conversation, Message } from '../types/chat';

interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Get the conversation associated with a mini-app.
 * Returns null (without error) when no conversation exists yet.
 */
export async function getConversation(
  miniAppId: string
): Promise<ServiceResult<Conversation | null>> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('mini_app_id', miniAppId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return {
    data: {
      id: data.id,
      miniAppId: data.mini_app_id,
      userId: data.user_id,
      createdAt: data.created_at,
    } as Conversation,
    error: null,
  };
}

/**
 * Fetch all messages in a conversation, oldest first.
 */
export async function getMessages(
  conversationId: string
): Promise<ServiceResult<Message[]>> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  const messages: Message[] = (data ?? []).map((row: any) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    schemaSnapshot: row.schema_snapshot,
    tokensUsed: row.tokens_used,
    modelUsed: row.model_used,
    createdAt: row.created_at,
  }));

  return { data: messages, error: null };
}

/**
 * Create a new conversation for a mini-app.
 */
export async function createConversation(
  miniAppId: string
): Promise<ServiceResult<Conversation>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      mini_app_id: miniAppId,
      user_id: user.id,
    })
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      id: data.id,
      miniAppId: data.mini_app_id,
      userId: data.user_id,
      createdAt: data.created_at,
    } as Conversation,
    error: null,
  };
}
