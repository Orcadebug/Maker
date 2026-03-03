// Hook for connecting to the server-driven render engine.
// On mount: initialises the app via the renderEngine service.
// Configures EventSender so that RenderNode event handlers send events
// to the server and update state with the response.

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RenderResponse, EventPayload } from '../types';
import { initApp, sendEvent as sendEventService } from '../services/renderEngine';
import { eventSender } from '../renderer/EventSender';

interface UseRenderEngineResult {
  renderResponse: RenderResponse | null;
  isLoading: boolean;
  error: string | null;
  sendEvent: (
    event: EventPayload['event'],
    targetId: string,
    value?: any,
  ) => Promise<void>;
}

export function useRenderEngine(appId: string): UseRenderEngineResult {
  const [renderResponse, setRenderResponse] = useState<RenderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Handle a new RenderResponse from the server
  const handleResponse = useCallback((response: RenderResponse) => {
    if (!mountedRef.current) return;
    setRenderResponse(response);
    setIsLoading(false);
    setError(null);
  }, []);

  // Handle errors from the server
  const handleError = useCallback((err: Error) => {
    if (!mountedRef.current) return;
    setError(err.message);
    setIsLoading(false);
  }, []);

  // Manual sendEvent exposed to consumers (e.g. pull-to-refresh, back nav)
  const sendEvent = useCallback(
    async (event: EventPayload['event'], targetId: string, value?: any) => {
      setIsLoading(true);
      const result = await sendEventService({
        appId,
        event,
        targetId,
        value,
        inputValues: {},
      });

      if (!mountedRef.current) return;

      if (result.error) {
        handleError(new Error(result.error));
      } else if (result.data) {
        handleResponse(result.data);
      }
    },
    [appId, handleResponse, handleError],
  );

  // Initialise the app and configure EventSender on mount
  useEffect(() => {
    mountedRef.current = true;

    // Configure EventSender so that RenderNode inline event handlers work.
    // EventSender uses the renderEngine service under the hood by wiring
    // its onResponse / onError into our state callbacks.
    //
    // We override EventSender.sendEvent behaviour by configuring it with
    // a base URL. However, since the existing service uses supabase.functions.invoke,
    // we configure EventSender to NOT use its internal fetch, and instead
    // intercept events at the RenderNode level.
    //
    // Approach: configure EventSender with callbacks so events flow through
    // the existing service layer. We patch the sendEvent method to use the service.
    const originalSendEvent = eventSender.sendEvent.bind(eventSender);

    // Override sendEvent to use the Supabase-based service
    eventSender.sendEvent = async (
      event: EventPayload['event'],
      targetId: string,
      value?: any,
    ) => {
      const payload: EventPayload = {
        appId,
        event,
        targetId,
        value,
        inputValues: { ...(eventSender as any).inputValues },
      };

      const result = await sendEventService(payload);

      if (!mountedRef.current) return;

      if (result.error) {
        handleError(new Error(result.error));
      } else if (result.data) {
        handleResponse(result.data);
      }
    };

    // Load initial screen
    const loadInitialScreen = async () => {
      setIsLoading(true);
      setError(null);

      const result = await initApp(appId);

      if (!mountedRef.current) return;

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
      } else if (result.data) {
        setRenderResponse(result.data);
        setIsLoading(false);
      }
    };

    loadInitialScreen();

    return () => {
      mountedRef.current = false;
      // Restore original sendEvent and reset state
      eventSender.sendEvent = originalSendEvent;
      eventSender.reset();
    };
  }, [appId, handleResponse, handleError]);

  return {
    renderResponse,
    isLoading,
    error,
    sendEvent,
  };
}
