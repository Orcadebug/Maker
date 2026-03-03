// ============================================================================
// AI Generate Edge Function
// Generates a brand-new MiniAppSchema from a user's text prompt.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../shared/cors.ts';
import { SCHEMA_VERSION } from '../shared/types.ts';
import type { MiniAppSchema } from '../shared/types.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAILY_USAGE_LIMIT = 50;
const DEFAULT_MODEL = 'gpt-4o';

// ---------------------------------------------------------------------------
// System prompt describing the MiniAppSchema format
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert mobile app builder. The user will describe an app they want, and you must generate a valid MiniAppSchema JSON object.

## MiniAppSchema Format

The schema must conform to this exact TypeScript structure:

\`\`\`typescript
interface MiniAppSchema {
  version: string;            // Always "${SCHEMA_VERSION}"
  meta: {
    id: string;               // Unique kebab-case id, e.g. "todo-app"
    name: string;             // Human-readable name
    description: string;      // Short description
    icon: string;             // Emoji icon
    color: string;            // Hex color, e.g. "#4A90D9"
  };
  state: Record<string, any>; // Initial app state
  screens: ScreenDef[];       // Array of screen definitions
  actions: Record<string, ActionStep[]>; // Named reusable action sequences
  apis: Record<string, ApiDef>;          // API endpoint definitions
  storage: StorageDef[];                 // Persistent storage definitions
  config: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;     // Hex color
    fontFamily?: string;
  };
}
\`\`\`

### ScreenDef
\`\`\`typescript
interface ScreenDef {
  id: string;
  name: string;
  title: string;           // Can use expressions like "$:state.title"
  component: SchemaNode;   // Root component tree
  onMount?: ActionStep[];  // Actions to run when screen loads
  headerRight?: SchemaNode;
}
\`\`\`

### SchemaNode (Component Tree)
\`\`\`typescript
interface SchemaNode {
  type: string;            // "view", "text", "button", "textInput", "image", "scroll", "list", "card", etc.
  id?: string;             // Unique ID for event targeting
  props: Record<string, any>;  // Component-specific props (can contain "$:expression" strings)
  style?: Record<string, any>; // React Native-like styles (can contain "$:expression" strings)
  children?: SchemaNode[];
  condition?: string;      // Expression: show/hide, e.g. "$:state.isLoggedIn"
  repeat?: {               // Loop over an array
    over: string;          // Expression for array, e.g. "$:state.items"
    as: string;            // Iterator variable name, e.g. "item"
    key: string;           // Key expression, e.g. "$:item.id"
  };
  events?: Record<string, ActionStep[]>;  // Event handlers: "press", "change", "submit", etc.
}
\`\`\`

### ActionStep Types
- \`{ type: 'setState', key: 'keyName', value: '$:expression' }\` - Update state
- \`{ type: 'navigate', screen: 'screenId', params?: { key: '$:expr' } }\` - Navigate to screen
- \`{ type: 'goBack' }\` - Go back in navigation
- \`{ type: 'apiCall', api: 'apiName', onSuccess?: [...], onError?: [...] }\` - Call an API
- \`{ type: 'showAlert', title: 'Title', message: '$:expression' }\` - Show alert
- \`{ type: 'conditional', condition: '$:expr', then: [...], else?: [...] }\` - Conditional logic
- \`{ type: 'forEach', over: '$:state.items', as: 'item', do: [...] }\` - Loop actions
- \`{ type: 'runAction', name: 'actionName' }\` - Run a named action
- \`{ type: 'setStorage', key: 'key', value: '$:expr' }\` - Persist to storage
- \`{ type: 'getStorage', key: 'key', intoState: 'stateKey' }\` - Read from storage
- \`{ type: 'delay', ms: 1000, then?: [...] }\` - Delay execution

### Expressions
Strings starting with "$:" are expressions evaluated at runtime.
They can reference: state.*, item (in repeat), itemIndex, inputValues.*, eventValue, config.*, meta.*
Examples: "$:state.count + 1", "$:state.items.filter(i => i.done)", "$:state.name.toUpperCase()"

### ApiDef
\`\`\`typescript
interface ApiDef {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;           // Expression for body
  resultKey: string;       // State key to store result
  errorKey?: string;
  loadingKey?: string;
}
\`\`\`

## Rules
1. Always output ONLY valid JSON -- no markdown, no commentary, no code fences.
2. Every interactive element must have an \`id\` and appropriate \`events\`.
3. Use "$:" prefix for all dynamic expressions.
4. Provide sensible default state values.
5. Create at least one screen.
6. Use mobile-friendly styling (padding, margin, fontSize etc.).
7. The version must be "${SCHEMA_VERSION}".

## Example: Simple Counter App
{
  "version": "${SCHEMA_VERSION}",
  "meta": { "id": "counter", "name": "Counter", "description": "A simple counter app", "icon": "🔢", "color": "#4A90D9" },
  "state": { "count": 0 },
  "screens": [{
    "id": "main",
    "name": "Counter",
    "title": "Counter",
    "component": {
      "type": "view",
      "props": {},
      "style": { "flex": 1, "justifyContent": "center", "alignItems": "center", "padding": 20 },
      "children": [
        { "type": "text", "props": { "text": "$:\`Count: \${state.count}\`" }, "style": { "fontSize": 32, "fontWeight": "bold", "marginBottom": 20 } },
        { "type": "button", "id": "increment", "props": { "title": "Increment" }, "style": { "marginBottom": 10 }, "events": { "press": [{ "type": "setState", "key": "count", "value": "$:state.count + 1" }] } },
        { "type": "button", "id": "decrement", "props": { "title": "Decrement" }, "events": { "press": [{ "type": "setState", "key": "count", "value": "$:state.count - 1" }] } }
      ]
    }
  }],
  "actions": {},
  "apis": {},
  "storage": [],
  "config": { "theme": "light", "primaryColor": "#4A90D9" }
}

Generate the MiniAppSchema JSON for the user's request. Output ONLY the JSON object.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a JSON object from a string that may contain markdown fences
 * or other surrounding text.
 */
function extractJSON(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Continue to extraction
  }

  // Try extracting from markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // Try finding the first { ... } block
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {
      // Give up
    }
  }

  return null;
}

/**
 * Convert a MiniAppSchema into a database row for the mini_apps table.
 */
function schemaToMiniAppRow(schema: MiniAppSchema, userId: string) {
  return {
    user_id: userId,
    name: schema.meta.name,
    description: schema.meta.description,
    icon: schema.meta.icon,
    color: schema.meta.color,
    schema_json: schema,
    schema_version: schema.version,
  };
}

/**
 * Convert a mini_apps row into the client-facing MiniApp shape.
 */
function rowToMiniApp(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    schemaVersion: row.schema_version,
    isArchived: row.is_archived,
    usageCount: row.usage_count,
    lastOpenedAt: row.last_opened_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
    const {
      prompt,
      model = DEFAULT_MODEL,
      stream = false,
    } = body as {
      prompt: string;
      model?: string;
      stream?: boolean;
    };

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing required field: prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
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

    // -------------------------------------------------------------------
    // Check usage limits (count today's usage)
    // -------------------------------------------------------------------
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: usageCount, error: usageError } = await supabaseClient
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString());

    if (usageError) {
      console.error('Usage check error:', usageError);
    }

    if ((usageCount ?? 0) >= DAILY_USAGE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: 'Daily usage limit reached. Please try again tomorrow.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -------------------------------------------------------------------
    // Call AI API
    // -------------------------------------------------------------------
    const aiApiUrl =
      Deno.env.get('AI_API_URL') ?? 'https://api.openai.com/v1/chat/completions';
    const aiApiKey = Deno.env.get('AI_API_KEY') ?? '';

    const aiRequestBody = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      ...(stream ? { stream: true } : {}),
    };

    const aiResponse = await fetch(aiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify(aiRequestBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI generation failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -------------------------------------------------------------------
    // STREAMING RESPONSE
    // -------------------------------------------------------------------
    if (stream) {
      const encoder = new TextEncoder();
      let fullContent = '';

      const readable = new ReadableStream({
        async start(controller) {
          try {
            const reader = aiResponse.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() ?? '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;

                const payload = trimmed.slice(5).trim();
                if (payload === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(payload);
                  const delta =
                    parsed.choices?.[0]?.delta?.content ?? '';
                  if (delta) {
                    fullContent += delta;
                    // Forward chunk to client
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ chunk: delta })}\n\n`
                      )
                    );
                  }
                } catch {
                  // Skip unparseable lines
                }
              }
            }

            // Parse the completed content into a schema
            const schema = extractJSON(fullContent) as MiniAppSchema | null;
            if (!schema) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: 'Failed to parse generated schema' })}\n\n`
                )
              );
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }

            // Ensure version is set
            schema.version = schema.version || SCHEMA_VERSION;

            // Save to DB
            const { data: appRow, error: insertError } = await supabaseClient
              .from('mini_apps')
              .insert(schemaToMiniAppRow(schema, user.id))
              .select('*')
              .single();

            if (insertError || !appRow) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: 'Failed to save app' })}\n\n`
                )
              );
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }

            const miniApp = rowToMiniApp(appRow);

            // Create conversation
            const { data: convo, error: convoError } = await supabaseClient
              .from('conversations')
              .insert({
                mini_app_id: appRow.id,
                user_id: user.id,
              })
              .select('*')
              .single();

            let conversationId: string | null = null;
            if (!convoError && convo) {
              conversationId = convo.id;

              // Save initial messages
              await supabaseClient.from('messages').insert([
                {
                  conversation_id: convo.id,
                  role: 'user',
                  content: prompt,
                  tokens_used: 0,
                  model_used: model,
                },
                {
                  conversation_id: convo.id,
                  role: 'assistant',
                  content: fullContent,
                  schema_snapshot: schema,
                  tokens_used: 0,
                  model_used: model,
                },
              ]);
            }

            // Log usage
            await supabaseClient.from('usage_logs').insert({
              user_id: user.id,
              action: 'generate',
              model_used: model,
              tokens_used: 0,
            });

            // Send final result
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ miniApp, conversationId })}\n\n`
              )
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (err: any) {
            console.error('Stream processing error:', err);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: err.message })}\n\n`
              )
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // -------------------------------------------------------------------
    // NON-STREAMING RESPONSE
    // -------------------------------------------------------------------
    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content ?? '';
    const tokensUsed = aiData.usage?.total_tokens ?? 0;

    // Parse the schema
    const schema = extractJSON(content) as MiniAppSchema | null;
    if (!schema) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse generated schema from AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure version
    schema.version = schema.version || SCHEMA_VERSION;

    // Save to mini_apps table
    const { data: appRow, error: insertError } = await supabaseClient
      .from('mini_apps')
      .insert(schemaToMiniAppRow(schema, user.id))
      .select('*')
      .single();

    if (insertError || !appRow) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save mini app' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const miniApp = rowToMiniApp(appRow);

    // Create conversation and initial messages
    let conversationId: string | null = null;

    const { data: convo, error: convoError } = await supabaseClient
      .from('conversations')
      .insert({
        mini_app_id: appRow.id,
        user_id: user.id,
      })
      .select('*')
      .single();

    if (!convoError && convo) {
      conversationId = convo.id;

      // Save the user prompt and AI response as messages
      await supabaseClient.from('messages').insert([
        {
          conversation_id: convo.id,
          role: 'user',
          content: prompt,
          tokens_used: 0,
          model_used: model,
        },
        {
          conversation_id: convo.id,
          role: 'assistant',
          content,
          schema_snapshot: schema,
          tokens_used: tokensUsed,
          model_used: model,
        },
      ]);
    }

    // Log usage
    await supabaseClient.from('usage_logs').insert({
      user_id: user.id,
      action: 'generate',
      model_used: model,
      tokens_used: tokensUsed,
    });

    return new Response(
      JSON.stringify({ miniApp, conversationId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('ai-generate error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
