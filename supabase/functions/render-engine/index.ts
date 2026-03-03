// ============================================================================
// Render Engine Edge Function
// Handles server-driven UI: initializes apps and processes UI events.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../shared/cors.ts';
import {
  evaluateExpression,
  resolveExpressions,
} from './ExpressionEvaluator.ts';
import type {
  MiniAppSchema,
  SchemaNode,
  ScreenDef,
  ActionStep,
  ApiDef,
  RenderedNode,
  RenderResponse,
  AppSession,
} from '../shared/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a deterministic-ish unique id for rendered nodes. */
let _nodeCounter = 0;
function nextNodeId(prefix: string): string {
  _nodeCounter++;
  return `${prefix}_${_nodeCounter}`;
}

function resetNodeCounter(): void {
  _nodeCounter = 0;
}

/** Deep-clone a plain JSON-serialisable value. */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Find a SchemaNode by id anywhere in the tree. */
function findNodeById(
  node: SchemaNode,
  targetId: string
): SchemaNode | null {
  if (node.id === targetId) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Recursively render a SchemaNode tree into a RenderedNode tree.
 * Resolves all expressions, evaluates conditions, and expands repeat nodes.
 */
function renderNode(
  node: SchemaNode,
  scope: Record<string, any>
): RenderedNode | RenderedNode[] | null {
  // -- Handle repeat nodes ---------------------------------------------------
  if (node.repeat) {
    const list = evaluateExpression(node.repeat.over, scope);
    if (!Array.isArray(list)) return null;

    const rendered: RenderedNode[] = [];
    for (let i = 0; i < list.length; i++) {
      const itemScope = {
        ...scope,
        [node.repeat.as]: list[i],
        [`${node.repeat.as}Index`]: i,
      };

      // Clone the node without repeat to avoid infinite recursion
      const cloned: SchemaNode = {
        ...node,
        repeat: undefined,
        id: node.id ? `${node.id}_${i}` : undefined,
      };

      const result = renderNode(cloned, itemScope);
      if (result) {
        if (Array.isArray(result)) {
          rendered.push(...result);
        } else {
          rendered.push(result);
        }
      }
    }
    return rendered;
  }

  // -- Evaluate condition ----------------------------------------------------
  let visible = true;
  if (node.condition) {
    const condResult = evaluateExpression(node.condition, scope);
    visible = Boolean(condResult);
  }

  // -- Resolve props and style -----------------------------------------------
  const resolvedProps = node.props
    ? resolveExpressions({ ...node.props }, scope)
    : {};

  const resolvedStyle = node.style
    ? resolveExpressions({ ...node.style }, scope)
    : {};

  // -- Collect event names ---------------------------------------------------
  const eventNames = node.events ? Object.keys(node.events) : undefined;

  // -- Build id --------------------------------------------------------------
  const nodeId = node.id || nextNodeId(node.type);

  // -- Render children -------------------------------------------------------
  let renderedChildren: RenderedNode[] | undefined;
  if (node.children && node.children.length > 0) {
    renderedChildren = [];
    for (const child of node.children) {
      const result = renderNode(child, scope);
      if (result) {
        if (Array.isArray(result)) {
          renderedChildren.push(...result);
        } else {
          renderedChildren.push(result);
        }
      }
    }
    if (renderedChildren.length === 0) {
      renderedChildren = undefined;
    }
  }

  return {
    type: node.type,
    id: nodeId,
    props: resolvedProps,
    style: resolvedStyle,
    children: renderedChildren,
    visible,
    events: eventNames,
  };
}

/**
 * Render an entire screen into a RenderResponse.
 */
function renderScreen(
  screen: ScreenDef,
  session: AppSession,
  schema: MiniAppSchema
): RenderResponse {
  resetNodeCounter();

  const scope = {
    state: session.state,
    config: schema.config,
    meta: schema.meta,
  };

  // Resolve screen title (may contain expressions)
  const screenTitle = evaluateExpression(screen.title, scope) ?? screen.name;

  // Render the main component tree
  const uiResult = renderNode(screen.component, scope);
  let ui: RenderedNode;
  if (Array.isArray(uiResult)) {
    // Wrap multiple root nodes in a container
    ui = {
      type: 'view',
      id: 'root',
      props: {},
      style: { flex: 1 },
      children: uiResult,
      visible: true,
    };
  } else if (uiResult) {
    ui = uiResult;
  } else {
    ui = {
      type: 'view',
      id: 'root',
      props: {},
      style: { flex: 1 },
      visible: true,
    };
  }

  // Render header right if present
  let headerRight: RenderedNode | undefined;
  if (screen.headerRight) {
    const hrResult = renderNode(screen.headerRight, scope);
    if (hrResult && !Array.isArray(hrResult)) {
      headerRight = hrResult;
    }
  }

  return {
    screen: screen.id,
    screenTitle: String(screenTitle),
    ui,
    headerRight,
    navStack: [...session.navStack],
  };
}

// ---------------------------------------------------------------------------
// Action execution
// ---------------------------------------------------------------------------

interface ActionContext {
  schema: MiniAppSchema;
  session: AppSession;
  supabase: any;
  alerts: Array<{ title: string; message: string }>;
  inputValues?: Record<string, any>;
  eventValue?: any;
}

async function executeActions(
  steps: ActionStep[],
  ctx: ActionContext
): Promise<void> {
  for (const step of steps) {
    await executeAction(step, ctx);
  }
}

async function executeAction(
  step: ActionStep,
  ctx: ActionContext
): Promise<void> {
  const scope = {
    state: ctx.session.state,
    config: ctx.schema.config,
    meta: ctx.schema.meta,
    inputValues: ctx.inputValues ?? {},
    eventValue: ctx.eventValue,
  };

  switch (step.type) {
    case 'setState': {
      const value = evaluateExpression(step.value, scope);
      ctx.session.state[step.key] = value;

      // Persist state to DB
      await ctx.supabase
        .from('app_sessions')
        .update({
          state: ctx.session.state,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', ctx.session.userId)
        .eq('mini_app_id', ctx.session.miniAppId);
      break;
    }

    case 'navigate': {
      // Push current screen onto nav stack
      ctx.session.navStack.push(ctx.session.currentScreen);
      ctx.session.currentScreen = step.screen;

      // Merge navigation params into state if provided
      if (step.params) {
        for (const [key, expr] of Object.entries(step.params)) {
          ctx.session.state[key] = evaluateExpression(expr, scope);
        }
      }

      // Persist session
      await ctx.supabase
        .from('app_sessions')
        .update({
          current_screen: ctx.session.currentScreen,
          nav_stack: ctx.session.navStack,
          state: ctx.session.state,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', ctx.session.userId)
        .eq('mini_app_id', ctx.session.miniAppId);
      break;
    }

    case 'goBack': {
      if (ctx.session.navStack.length > 0) {
        ctx.session.currentScreen = ctx.session.navStack.pop()!;

        await ctx.supabase
          .from('app_sessions')
          .update({
            current_screen: ctx.session.currentScreen,
            nav_stack: ctx.session.navStack,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', ctx.session.userId)
          .eq('mini_app_id', ctx.session.miniAppId);
      }
      break;
    }

    case 'apiCall': {
      const apiDef: ApiDef | undefined = ctx.schema.apis[step.api];
      if (!apiDef) break;

      // Set loading state if defined
      if (apiDef.loadingKey) {
        ctx.session.state[apiDef.loadingKey] = true;
      }

      try {
        // Resolve URL (may contain expressions)
        const url = evaluateExpression(apiDef.url, scope) ?? apiDef.url;

        // Resolve headers
        const headers: Record<string, string> = {};
        if (apiDef.headers) {
          for (const [k, v] of Object.entries(apiDef.headers)) {
            headers[k] = String(evaluateExpression(v, scope) ?? v);
          }
        }

        // Resolve body
        let body: string | undefined;
        if (apiDef.body && apiDef.method !== 'GET') {
          const bodyValue = evaluateExpression(apiDef.body, scope);
          body =
            typeof bodyValue === 'string'
              ? bodyValue
              : JSON.stringify(bodyValue);
        }

        const fetchOptions: RequestInit = {
          method: apiDef.method,
          headers,
        };
        if (body) {
          fetchOptions.body = body;
          if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
          }
        }

        const response = await fetch(url, fetchOptions);
        const responseData = await response.json().catch(() => null);

        ctx.session.state[apiDef.resultKey] = responseData;
        if (apiDef.errorKey) {
          ctx.session.state[apiDef.errorKey] = response.ok
            ? null
            : responseData;
        }

        // Execute onSuccess / onError callbacks
        if (response.ok && step.onSuccess) {
          await executeActions(step.onSuccess, ctx);
        } else if (!response.ok && step.onError) {
          await executeActions(step.onError, ctx);
        }
      } catch (err: any) {
        if (apiDef.errorKey) {
          ctx.session.state[apiDef.errorKey] = err.message ?? 'Network error';
        }
        if (step.onError) {
          await executeActions(step.onError, ctx);
        }
      } finally {
        if (apiDef.loadingKey) {
          ctx.session.state[apiDef.loadingKey] = false;
        }
      }

      // Persist updated state
      await ctx.supabase
        .from('app_sessions')
        .update({
          state: ctx.session.state,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', ctx.session.userId)
        .eq('mini_app_id', ctx.session.miniAppId);
      break;
    }

    case 'showAlert': {
      const title = evaluateExpression(step.title, scope) ?? step.title;
      const message =
        evaluateExpression(step.message, scope) ?? step.message;
      ctx.alerts.push({ title: String(title), message: String(message) });
      break;
    }

    case 'conditional': {
      const condValue = evaluateExpression(step.condition, scope);
      if (condValue) {
        await executeActions(step.then, ctx);
      } else if (step.else) {
        await executeActions(step.else, ctx);
      }
      break;
    }

    case 'forEach': {
      const list = evaluateExpression(step.over, scope);
      if (Array.isArray(list)) {
        for (const item of list) {
          ctx.session.state[step.as] = item;
          await executeActions(step.do, ctx);
        }
      }
      break;
    }

    case 'runAction': {
      const namedSteps = ctx.schema.actions[step.name];
      if (namedSteps) {
        await executeActions(namedSteps, ctx);
      }
      break;
    }

    case 'setStorage': {
      const val = evaluateExpression(step.value, scope);
      // Store in a storage table or state (simplified: just use state)
      ctx.session.state[`_storage_${step.key}`] = val;
      await ctx.supabase
        .from('app_sessions')
        .update({
          state: ctx.session.state,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', ctx.session.userId)
        .eq('mini_app_id', ctx.session.miniAppId);
      break;
    }

    case 'getStorage': {
      const stored = ctx.session.state[`_storage_${step.key}`];
      ctx.session.state[step.intoState] = stored ?? null;
      break;
    }

    case 'delay': {
      await new Promise((resolve) => setTimeout(resolve, step.ms));
      if (step.then) {
        await executeActions(step.then, ctx);
      }
      break;
    }

    default:
      // Unknown action type -- silently skip
      break;
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, appId } = body;

    if (!action || !appId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, appId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with the user's auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -----------------------------------------------------------------------
    // Load the mini-app schema
    // -----------------------------------------------------------------------
    const { data: appRow, error: appError } = await supabaseClient
      .from('mini_apps')
      .select('id, schema_json')
      .eq('id', appId)
      .single();

    if (appError || !appRow) {
      return new Response(
        JSON.stringify({ error: 'Mini app not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const schema: MiniAppSchema = appRow.schema_json;
    if (!schema || !schema.screens || schema.screens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid schema: no screens defined' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -----------------------------------------------------------------------
    // Load or create session
    // -----------------------------------------------------------------------
    let { data: sessionRow } = await supabaseClient
      .from('app_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('mini_app_id', appId)
      .maybeSingle();

    if (!sessionRow) {
      const firstScreenId = schema.screens[0].id;
      const initialState = schema.state ? deepClone(schema.state) : {};

      const { data: newSession, error: insertError } = await supabaseClient
        .from('app_sessions')
        .insert({
          user_id: user.id,
          mini_app_id: appId,
          current_screen: firstScreenId,
          nav_stack: [],
          state: initialState,
        })
        .select('*')
        .single();

      if (insertError || !newSession) {
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      sessionRow = newSession;
    }

    const session: AppSession = {
      userId: sessionRow.user_id,
      miniAppId: sessionRow.mini_app_id,
      currentScreen: sessionRow.current_screen,
      navStack: sessionRow.nav_stack ?? [],
      state: sessionRow.state ?? {},
    };

    // =====================================================================
    // ACTION: init
    // =====================================================================
    if (action === 'init') {
      // Reset session to the first screen with fresh state
      const firstScreen = schema.screens[0];
      session.currentScreen = firstScreen.id;
      session.navStack = [];
      session.state = schema.state ? deepClone(schema.state) : {};

      // Persist the reset session
      await supabaseClient
        .from('app_sessions')
        .update({
          current_screen: session.currentScreen,
          nav_stack: session.navStack,
          state: session.state,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('mini_app_id', appId);

      // Execute onMount actions if defined
      if (firstScreen.onMount && firstScreen.onMount.length > 0) {
        const ctx: ActionContext = {
          schema,
          session,
          supabase: supabaseClient,
          alerts: [],
        };
        await executeActions(firstScreen.onMount, ctx);
      }

      // Render the first screen
      const response = renderScreen(firstScreen, session, schema);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =====================================================================
    // ACTION: event
    // =====================================================================
    if (action === 'event') {
      const { event, targetId, value, inputValues } = body;

      if (!event || !targetId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: event, targetId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find the current screen
      const currentScreen = schema.screens.find(
        (s) => s.id === session.currentScreen
      );
      if (!currentScreen) {
        return new Response(
          JSON.stringify({ error: `Screen not found: ${session.currentScreen}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find the target node in the schema
      const targetNode = findNodeById(currentScreen.component, targetId);
      if (!targetNode) {
        return new Response(
          JSON.stringify({ error: `Node not found: ${targetId}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find the event handler
      const eventHandlers = targetNode.events;
      if (!eventHandlers || !eventHandlers[event]) {
        return new Response(
          JSON.stringify({ error: `No handler for event '${event}' on node '${targetId}'` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const actionSteps = eventHandlers[event];

      // If this is a 'change' event, store the value in state
      if (event === 'change' && value !== undefined && targetId) {
        session.state[targetId] = value;
      }

      // Execute the action steps
      const ctx: ActionContext = {
        schema,
        session,
        supabase: supabaseClient,
        alerts: [],
        inputValues,
        eventValue: value,
      };

      await executeActions(actionSteps, ctx);

      // Re-render the (possibly new) current screen
      const updatedScreen = schema.screens.find(
        (s) => s.id === session.currentScreen
      );
      if (!updatedScreen) {
        return new Response(
          JSON.stringify({ error: `Screen not found after action: ${session.currentScreen}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = renderScreen(updatedScreen, session, schema);

      // Attach alerts if any were generated
      if (ctx.alerts.length > 0) {
        response.alerts = ctx.alerts;
      }

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Unknown action
    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Render engine error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
