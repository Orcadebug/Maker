// ============================================================================
// AI Refine Edge Function
// Refines an existing MiniAppSchema based on follow-up conversation messages.
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
// System prompt for refinement
// ---------------------------------------------------------------------------

const REFINEMENT_SYSTEM_PROMPT = `You are an expert mobile app builder. You are refining an existing MiniAppSchema based on the user's feedback.

You will receive the current schema and a conversation history. Based on the user's latest message, update the schema accordingly.

## Rules
1. Output ONLY the complete, updated MiniAppSchema JSON -- no markdown fences, no commentary.
2. Preserve all existing functionality unless the user explicitly asks to remove or change it.
3. Maintain all existing IDs for screens, components, and events that haven't changed.
4. Keep the same meta.id unless the user asks to rename the app.
5. The version must be "${SCHEMA_VERSION}".
6. Every interactive element must have an \`id\` and appropriate \`events\`.
7. Use "$:" prefix for all dynamic expressions.
8. Make targeted changes based on the user's request -- do not rewrite the entire schema unnecessarily.

## Expression Format
Strings starting with "$:" are evaluated as expressions at runtime.
They can access: state.*, item (in repeat loops), itemIndex, inputValues.*, eventValue, config.*, meta.*

## Available Component Types
view, text, button, textInput, image, scroll, list, card, icon, switch, slider, picker, spacer, divider, badge, avatar, progressBar, activityIndicator

## Available Action Types
setState, navigate, goBack, apiCall, showAlert, conditional, forEach, runAction, setStorage, getStorage, delay

Output ONLY the complete updated JSON schema.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a JSON object from a string that may contain markdown fences.
 */
function extractJSON(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Continue
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
 * Convert a mini_apps row to the client-facing MiniApp shape.
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
      conversationId,
      message,
      model = DEFAULT_MODEL,
      stream = false,
    } = body as {
      conversationId: string;
      message: string;
      model?: string;
      stream?: boolean;
    };

    if (!conversationId || !message) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: conversationId, message',
        }),
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
    // Check usage limits
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
    // Load conversation
    // -------------------------------------------------------------------
    const { data: convo, error: convoError } = await supabaseClient
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convoError || !convo) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the conversation belongs to this user
    if (convo.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: conversation does not belong to you' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -------------------------------------------------------------------
    // Load all messages in the conversation
    // -------------------------------------------------------------------
    const { data: messages, error: messagesError } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to load conversation messages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -------------------------------------------------------------------
    // Load the current schema from the mini app
    // -------------------------------------------------------------------
    const { data: appRow, error: appError } = await supabaseClient
      .from('mini_apps')
      .select('*')
      .eq('id', convo.mini_app_id)
      .single();

    if (appError || !appRow) {
      return new Response(
        JSON.stringify({ error: 'Mini app not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentSchema: MiniAppSchema = appRow.schema_json;

    // -------------------------------------------------------------------
    // Build AI messages array
    // -------------------------------------------------------------------
    const aiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: REFINEMENT_SYSTEM_PROMPT },
      {
        role: 'system',
        content: `Current MiniAppSchema:\n${JSON.stringify(currentSchema, null, 2)}`,
      },
    ];

    // Add conversation history
    for (const msg of messages ?? []) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        aiMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add the new user message
    aiMessages.push({ role: 'user', content: message });

    // -------------------------------------------------------------------
    // Call AI API
    // -------------------------------------------------------------------
    const aiApiUrl =
      Deno.env.get('AI_API_URL') ?? 'https://api.openai.com/v1/chat/completions';
    const aiApiKey = Deno.env.get('AI_API_KEY') ?? '';

    const aiRequestBody = {
      model,
      messages: aiMessages,
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
        JSON.stringify({ error: 'AI refinement failed' }),
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
            const updatedSchema = extractJSON(fullContent) as MiniAppSchema | null;
            if (!updatedSchema) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: 'Failed to parse refined schema' })}\n\n`
                )
              );
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }

            // Ensure version
            updatedSchema.version = updatedSchema.version || SCHEMA_VERSION;

            // Update the mini_app schema in DB
            const { data: updatedRow, error: updateError } =
              await supabaseClient
                .from('mini_apps')
                .update({
                  schema_json: updatedSchema,
                  name: updatedSchema.meta.name,
                  description: updatedSchema.meta.description,
                  icon: updatedSchema.meta.icon,
                  color: updatedSchema.meta.color,
                  schema_version: updatedSchema.version,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', convo.mini_app_id)
                .select('*')
                .single();

            if (updateError || !updatedRow) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: 'Failed to update app' })}\n\n`
                )
              );
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }

            const miniApp = rowToMiniApp(updatedRow);

            // Save the new messages
            await supabaseClient.from('messages').insert([
              {
                conversation_id: conversationId,
                role: 'user',
                content: message,
                tokens_used: 0,
                model_used: model,
              },
              {
                conversation_id: conversationId,
                role: 'assistant',
                content: fullContent,
                schema_snapshot: updatedSchema,
                tokens_used: 0,
                model_used: model,
              },
            ]);

            // Log usage
            await supabaseClient.from('usage_logs').insert({
              user_id: user.id,
              action: 'refine',
              model_used: model,
              tokens_used: 0,
            });

            // Send final result
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ miniApp })}\n\n`
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

    // Parse the updated schema
    const updatedSchema = extractJSON(content) as MiniAppSchema | null;
    if (!updatedSchema) {
      return new Response(
        JSON.stringify({
          error: 'Failed to parse refined schema from AI response',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure version
    updatedSchema.version = updatedSchema.version || SCHEMA_VERSION;

    // Update the mini_app schema in DB
    const { data: updatedRow, error: updateError } = await supabaseClient
      .from('mini_apps')
      .update({
        schema_json: updatedSchema,
        name: updatedSchema.meta.name,
        description: updatedSchema.meta.description,
        icon: updatedSchema.meta.icon,
        color: updatedSchema.meta.color,
        schema_version: updatedSchema.version,
        updated_at: new Date().toISOString(),
      })
      .eq('id', convo.mini_app_id)
      .select('*')
      .single();

    if (updateError || !updatedRow) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update mini app' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const miniApp = rowToMiniApp(updatedRow);

    // Save the new messages (user + assistant)
    await supabaseClient.from('messages').insert([
      {
        conversation_id: conversationId,
        role: 'user',
        content: message,
        tokens_used: 0,
        model_used: model,
      },
      {
        conversation_id: conversationId,
        role: 'assistant',
        content,
        schema_snapshot: updatedSchema,
        tokens_used: tokensUsed,
        model_used: model,
      },
    ]);

    // Log usage
    await supabaseClient.from('usage_logs').insert({
      user_id: user.id,
      action: 'refine',
      model_used: model,
      tokens_used: tokensUsed,
    });

    return new Response(
      JSON.stringify({ miniApp }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('ai-refine error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
