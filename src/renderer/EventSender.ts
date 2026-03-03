// Handles sending user interactions back to the server.
// The server processes events and returns updated UI.

import type { EventPayload, RenderResponse } from '../types';

type EventCallback = (response: RenderResponse) => void;
type ErrorCallback = (error: Error) => void;

class EventSender {
  private appId: string | null = null;
  private onResponse: EventCallback | null = null;
  private onError: ErrorCallback | null = null;
  private inputValues: Record<string, any> = {};
  private baseUrl: string = ''; // Set from Supabase Edge Function URL

  configure(params: {
    appId: string;
    baseUrl: string;
    onResponse: EventCallback;
    onError: ErrorCallback;
  }) {
    this.appId = params.appId;
    this.baseUrl = params.baseUrl;
    this.onResponse = params.onResponse;
    this.onError = params.onError;
    this.inputValues = {};
  }

  setInputValue(targetId: string, value: any) {
    this.inputValues[targetId] = value;
  }

  async sendEvent(event: EventPayload['event'], targetId: string, value?: any) {
    if (!this.appId || !this.onResponse) return;

    const payload: EventPayload = {
      appId: this.appId,
      event,
      targetId,
      value,
      inputValues: { ...this.inputValues },
    };

    try {
      const response = await fetch(`${this.baseUrl}/render-engine/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data: RenderResponse = await response.json();
      this.onResponse(data);
    } catch (error) {
      this.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  reset() {
    this.appId = null;
    this.onResponse = null;
    this.onError = null;
    this.inputValues = {};
  }
}

export const eventSender = new EventSender();
export default EventSender;
