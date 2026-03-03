import { supabase } from './supabase';
import type { MiniApp } from '../types/miniApp';

interface GenerateResult {
  miniApp: MiniApp | null;
  conversationId: string | null;
  error: string | null;
}

interface RefineResult {
  miniApp: MiniApp | null;
  error: string | null;
}

/**
 * Callback signature for streaming token chunks back to the UI.
 */
export type StreamCallback = (chunk: string) => void;

/**
 * Ask the AI to generate a brand-new mini-app from a text prompt.
 *
 * Calls the `ai-generate` Supabase Edge Function. When a
 * `onChunk` callback is supplied the function will attempt to
 * consume the response as a text stream so the chat UI can show
 * incremental output. If streaming is not supported it falls back
 * to returning the full response in one shot.
 */
export async function generateApp(
  prompt: string,
  model?: string,
  onChunk?: StreamCallback
): Promise<GenerateResult> {
  try {
    // When streaming, we need the raw response so we can read the body
    // as a ReadableStream. Supabase's invoke helper returns parsed JSON
    // by default, so for streaming we fall through to a manual fetch.
    if (onChunk) {
      return await streamGenerate(prompt, model, onChunk);
    }

    const { data, error } = await supabase.functions.invoke('ai-generate', {
      body: { prompt, model },
    });

    if (error) {
      return { miniApp: null, conversationId: null, error: error.message };
    }

    return {
      miniApp: data.miniApp ?? null,
      conversationId: data.conversationId ?? null,
      error: null,
    };
  } catch (err: any) {
    return { miniApp: null, conversationId: null, error: err.message ?? 'Unknown error' };
  }
}

/**
 * Ask the AI to refine an existing mini-app based on a follow-up
 * message within an ongoing conversation.
 */
export async function refineApp(
  conversationId: string,
  message: string,
  model?: string,
  onChunk?: StreamCallback
): Promise<RefineResult> {
  try {
    if (onChunk) {
      return await streamRefine(conversationId, message, model, onChunk);
    }

    const { data, error } = await supabase.functions.invoke('ai-refine', {
      body: { conversationId, message, model },
    });

    if (error) {
      return { miniApp: null, error: error.message };
    }

    return {
      miniApp: data.miniApp ?? null,
      error: null,
    };
  } catch (err: any) {
    return { miniApp: null, error: err.message ?? 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Internal streaming helpers
// ---------------------------------------------------------------------------

/**
 * Build the full URL for a Supabase Edge Function.
 * Reads the project URL that was used to initialise the client.
 */
function edgeFunctionUrl(functionName: string): string {
  // TODO: Replace with your actual Supabase project URL
  const baseUrl = 'https://your-project-ref.supabase.co';
  return `${baseUrl}/functions/v1/${functionName}`;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
    apikey: '', // TODO: Set your Supabase anon key here
  };
}

async function streamGenerate(
  prompt: string,
  model: string | undefined,
  onChunk: StreamCallback
): Promise<GenerateResult> {
  const response = await fetch(edgeFunctionUrl('ai-generate'), {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ prompt, model, stream: true }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { miniApp: null, conversationId: null, error: text || response.statusText };
  }

  const result = await consumeStream(response, onChunk);

  return {
    miniApp: result.miniApp ?? null,
    conversationId: result.conversationId ?? null,
    error: null,
  };
}

async function streamRefine(
  conversationId: string,
  message: string,
  model: string | undefined,
  onChunk: StreamCallback
): Promise<RefineResult> {
  const response = await fetch(edgeFunctionUrl('ai-refine'), {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ conversationId, message, model, stream: true }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { miniApp: null, error: text || response.statusText };
  }

  const result = await consumeStream(response, onChunk);

  return {
    miniApp: result.miniApp ?? null,
    error: null,
  };
}

/**
 * Read a streaming response body line-by-line (SSE / newline-delimited JSON).
 * Each line that starts with `data:` is treated as a chunk. The final line
 * may contain a JSON object with the completed miniApp / conversationId.
 */
async function consumeStream(
  response: Response,
  onChunk: StreamCallback
): Promise<Record<string, any>> {
  const reader = response.body?.getReader();
  if (!reader) {
    return {};
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: Record<string, any> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // Keep the last (possibly incomplete) line in the buffer
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('data:')) {
        const payload = trimmed.slice(5).trim();

        if (payload === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(payload);

          if (parsed.chunk) {
            onChunk(parsed.chunk);
          }

          // The last SSE event often carries the final result
          if (parsed.miniApp || parsed.conversationId) {
            finalResult = { ...finalResult, ...parsed };
          }
        } catch {
          // Not JSON -- treat the raw text as a chunk
          onChunk(payload);
        }
      }
    }
  }

  return finalResult;
}
