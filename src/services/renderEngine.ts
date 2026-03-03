import { supabase } from './supabase';
import type { RenderResponse, EventPayload } from '../types/miniApp';

interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Initialise (or re-initialise) a mini-app by calling the
 * server-side render engine. Returns the first screen's
 * pre-rendered UI tree so the client can display it immediately.
 */
export async function initApp(
  appId: string
): Promise<ServiceResult<RenderResponse>> {
  const { data, error } = await supabase.functions.invoke('render-engine', {
    body: {
      action: 'init',
      appId,
    },
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as RenderResponse, error: null };
}

/**
 * Forward a UI event (press, change, submit, etc.) to the
 * server-side render engine and receive the updated UI tree.
 */
export async function sendEvent(
  payload: EventPayload
): Promise<ServiceResult<RenderResponse>> {
  const { data, error } = await supabase.functions.invoke('render-engine', {
    body: {
      action: 'event',
      ...payload,
    },
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as RenderResponse, error: null };
}
