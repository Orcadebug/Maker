// ============================================================================
// MiniAppSchema Types - Server-Only Schema (never sent to client)
// ============================================================================

// Schema version
export const SCHEMA_VERSION = '1.0';

// Expression prefix - strings starting with this are evaluated
export const EXPR_PREFIX = '$:';

// State value types
export type StateValue =
  | string
  | number
  | boolean
  | null
  | StateValue[]
  | Record<string, StateValue>;

// Component node in the schema (contains expressions - server resolves these)
export interface SchemaNode {
  type: string;
  id?: string;
  props: Record<string, any>;
  style?: Record<string, any>;
  children?: SchemaNode[];
  condition?: string; // e.g. "$:state.isLoaded"
  repeat?: {
    over: string;  // e.g. "$:state.items"
    as: string;    // iterator variable name
    key: string;   // key expression
  };
  events?: Record<string, ActionStep[]>;
}

export interface ScreenDef {
  id: string;
  name: string;
  title: string; // Can contain expressions
  component: SchemaNode;
  onMount?: ActionStep[];
  headerRight?: SchemaNode;
}

export type ActionStep =
  | { type: 'setState'; key: string; value: string } // value is expression
  | { type: 'navigate'; screen: string; params?: Record<string, string> }
  | { type: 'goBack' }
  | { type: 'apiCall'; api: string; onSuccess?: ActionStep[]; onError?: ActionStep[] }
  | { type: 'setStorage'; key: string; value: string }
  | { type: 'getStorage'; key: string; intoState: string }
  | { type: 'showAlert'; title: string; message: string }
  | { type: 'runAction'; name: string }
  | { type: 'conditional'; condition: string; then: ActionStep[]; else?: ActionStep[] }
  | { type: 'forEach'; over: string; as: string; do: ActionStep[] }
  | { type: 'delay'; ms: number; then?: ActionStep[] };

export interface ApiDef {
  url: string; // Can contain expressions
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string; // Expression
  resultKey: string;
  errorKey?: string;
  loadingKey?: string;
}

export interface StorageDef {
  key: string;
  defaultValue: StateValue;
  syncToState?: string;
}

export interface MiniAppSchema {
  version: string;
  meta: {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
  };
  state: Record<string, StateValue>;
  screens: ScreenDef[];
  actions: Record<string, ActionStep[]>;
  apis: Record<string, ApiDef>;
  storage: StorageDef[];
  config: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    fontFamily?: string;
  };
}

// ============================================================================
// Client-facing types - What we send to the iOS renderer
// ============================================================================

// Pre-computed node tree (no expressions, fully resolved)
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
  headerRight?: RenderedNode;
  navStack: string[];
  alerts?: Array<{ title: string; message: string }>;
  loading?: boolean;
}

export interface EventPayload {
  appId: string;
  event: 'press' | 'change' | 'submit' | 'longPress' | 'refresh';
  targetId: string;
  value?: any;
  inputValues?: Record<string, any>;
}

// ============================================================================
// Session state stored in DB
// ============================================================================

export interface AppSession {
  userId: string;
  miniAppId: string;
  currentScreen: string;
  navStack: string[];
  state: Record<string, any>;
}
