export interface MiniApp {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  schemaVersion: string;
  isArchived: boolean;
  usageCount: number;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What the server sends to the client (pre-computed, no expressions) */
export interface RenderedNode {
  type: string;
  id: string;
  props: Record<string, any>;
  style: Record<string, any>;
  children?: RenderedNode[];
  visible: boolean;
  events?: string[];
}

export interface RenderResponse {
  screen: string;
  screenTitle: string;
  ui: RenderedNode;
  navStack: string[];
  loading?: boolean;
}

export interface EventPayload {
  appId: string;
  event: 'press' | 'change' | 'submit' | 'longPress' | 'refresh';
  targetId: string;
  value?: any;
  inputValues?: Record<string, any>;
}
