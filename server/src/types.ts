export interface SalesforceConfig {
  /** My Domain URL, e.g. https://mydomain.my.salesforce.com */
  myDomainUrl: string;
  /** External Client App consumer key */
  clientId: string;
  /** External Client App consumer secret */
  clientSecret: string;
  /** Agent ID (0Xx...) to converse with */
  agentId: string;
  /** Agent API host. Defaults to https://api.salesforce.com (gov: https://api.gov.salesforce.com) */
  apiHost?: string;
  /** Surface type for the session. "Custom" enables custom-connection response formats. */
  surfaceType: string;
  /** Whether to send bypassUser, and its value. "omit" leaves it out of the request. */
  bypassUser: "true" | "false" | "omit";
}

/** A single structured-output entry returned by a custom connection response format. */
export interface AgentResultEntry {
  property?: string;
  /** Runtime type, e.g. "SURFACE_ACTION__TextChoices". */
  type: string;
  /** JSON string conforming to the AiResponseFormat input schema. */
  value: string;
}

/** A message object as returned by the Agent API. */
export interface AgentMessage {
  type: string;
  id: string;
  message?: string;
  result?: AgentResultEntry[];
  feedbackId?: string;
  planId?: string;
  isContentSafe?: boolean;
  citedReferences?: unknown[];
}

/** Parsed structured response-format payload handed to the client. */
export interface ResponseFormatPayload {
  /**
   * Runtime response-format name with the SURFACE_ACTION__ prefix removed. It
   * still includes the _{surfaceId} suffix (e.g. TextChoices_CustomChatClient01);
   * the client maps it to a base format via resolveFormatName.
   */
  name: string;
  /** Parsed JSON from the response format's value. */
  data: unknown;
}

/** Normalized message shape sent to the browser client. */
export interface ClientMessage {
  id: string;
  type: "ai" | "system";
  content: string;
  format?: ResponseFormatPayload | null;
  feedbackId?: string;
}

export interface CreateSessionRequest {
  Body: Record<string, never>;
}

export interface SendMessageRequest {
  Body: {
    sessionId: string;
    message: string;
    sequenceId: number;
  };
}

export interface EndSessionRequest {
  Body: {
    sessionId: string;
  };
}
