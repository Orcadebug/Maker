import { create } from 'zustand';
import type { Message, ChatStatus } from '../types/chat';

interface ChatState {
  messages: Message[];
  status: ChatStatus;
  conversationId: string | null;
  currentSchema: any | null;
}

interface ChatActions {
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setStatus: (status: ChatStatus) => void;
  setConversationId: (conversationId: string | null) => void;
  setCurrentSchema: (schema: any | null) => void;
  reset: () => void;
}

export type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  messages: [],
  status: 'idle',
  conversationId: null,
  currentSchema: null,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages) => set({ messages }),
  setStatus: (status) => set({ status }),
  setConversationId: (conversationId) => set({ conversationId }),
  setCurrentSchema: (currentSchema) => set({ currentSchema }),

  reset: () => set(initialState),
}));
