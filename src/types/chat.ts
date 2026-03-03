export interface Conversation {
  id: string;
  miniAppId: string;
  userId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  schemaSnapshot?: any;
  tokensUsed: number;
  modelUsed: string | null;
  createdAt: string;
}

export type ChatStatus = 'idle' | 'generating' | 'refining' | 'error';
