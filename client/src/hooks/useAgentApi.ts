import { useCallback } from "react";
import { ServerMessage } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api";

interface SessionResponse {
  sessionId: string;
  messages: ServerMessage[];
}

/** A complete agent message (Agent API "Inform" event). */
export interface AgentInform {
  type: string;
  id: string;
  message?: string;
  result?: Array<{ type: string; value: string; property?: string }>;
  feedbackId?: string;
}

export interface StreamHandlers {
  /** A streamed text increment (TextChunk event). */
  onChunk?: (text: string) => void;
  /** Agent is working on the response (ProgressIndicator event). */
  onProgress?: () => void;
  /** The complete response message, including any structured result. */
  onComplete?: (message: AgentInform) => void;
  /** Validation failed; discard chunks rendered so far. */
  onReset?: () => void;
  /** The turn is finished. */
  onEnd?: () => void;
  /** A transport or agent error occurred. */
  onError?: (error: Error) => void;
}

const SURFACE_ACTION_PREFIX = "SURFACE_ACTION__";

export interface AgentApiHook {
  createSession: () => Promise<SessionResponse>;
  endSession: (sessionId: string) => Promise<void>;
  streamMessage: (
    sessionId: string,
    sequenceId: number,
    message: string,
    handlers: StreamHandlers,
    signal?: AbortSignal
  ) => Promise<void>;
}

export function useAgentApi(): AgentApiHook {
  const createSession = useCallback(async (): Promise<SessionResponse> => {
    const response = await fetch(`${API_BASE_URL}/chat/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!response.ok) throw new Error("Failed to start session");
    return response.json();
  }, []);

  const endSession = useCallback(async (sessionId: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/chat/session`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
  }, []);

  const streamMessage = useCallback(
    async (
      sessionId: string,
      sequenceId: number,
      message: string,
      handlers: StreamHandlers,
      signal?: AbortSignal
    ): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ sessionId, sequenceId, message }),
        signal,
      });

      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Failed to send message (${response.status}) ${detail}`.trim()
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          // SSE events are separated by a blank line.
          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() ?? "";
          for (const event of events) dispatchEvent(event, handlers);
        }
        if (buffer.trim()) dispatchEvent(buffer, handlers);
      } finally {
        handlers.onEnd?.();
        reader.releaseLock();
      }
    },
    []
  );

  return { createSession, endSession, streamMessage };
}

/** Parses a single SSE event block and routes it to the appropriate handler. */
function dispatchEvent(rawEvent: string, handlers: StreamHandlers): void {
  const dataLines = rawEvent
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"));
  if (dataLines.length === 0) return;

  const data = dataLines.map((line) => line.slice(5).trimStart()).join("\n");
  if (!data || data === "[DONE]") return;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(data);
  } catch {
    return;
  }

  // The complete response arrives wrapped in a `messages` array.
  if (Array.isArray(parsed.messages)) {
    const messages = parsed.messages as AgentInform[];
    const inform = messages.find((m) => m.type === "Inform") ?? messages[0];
    if (inform) handlers.onComplete?.(inform);
    return;
  }

  const message = parsed.message as
    | { type?: string; message?: string }
    | undefined;
  if (!message?.type) return;

  switch (message.type) {
    case "TextChunk":
      handlers.onChunk?.(message.message ?? "");
      break;
    case "ProgressIndicator":
      handlers.onProgress?.();
      break;
    case "Inform":
      handlers.onComplete?.(message as AgentInform);
      break;
    case "EndOfTurn":
      handlers.onEnd?.();
      break;
    case "ValidationFailureChunk":
      handlers.onReset?.();
      break;
    case "Error":
      handlers.onError?.(new Error(message.message ?? "Agent error"));
      break;
    default:
      break;
  }
}

/** Extracts a custom-connection response format from an Inform message, if any. */
export function extractResponseFormat(
  inform: AgentInform
): { name: string; data: unknown } | null {
  const result = inform.result?.[0];
  if (!result?.type?.startsWith(SURFACE_ACTION_PREFIX)) return null;

  const name = result.type.slice(SURFACE_ACTION_PREFIX.length);
  try {
    return { name, data: JSON.parse(result.value) };
  } catch {
    return null;
  }
}
