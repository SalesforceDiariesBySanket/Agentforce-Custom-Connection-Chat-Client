/** Structured output produced by a custom-connection response format. */
export interface ResponseFormat {
  /**
   * Runtime response-format name with the `SURFACE_ACTION__` prefix removed.
   * It still includes the `_{surfaceId}` suffix (e.g. `TextChoices_CustomChatClient01`);
   * use `resolveFormatName` to map it to a known base format.
   */
  name: string;
  /** Parsed JSON conforming to the format's input schema. */
  data: unknown;
}

export interface Message {
  id: string;
  type: "user" | "ai" | "system";
  content: string;
  timestamp: Date;
  /** Present when the agent applied a custom-connection response format. */
  format?: ResponseFormat | null;
}

/** Shape of a message as returned by the server's session endpoint. */
export interface ServerMessage {
  id: string;
  type: "ai" | "system";
  content: string;
  format?: ResponseFormat | null;
  feedbackId?: string;
}

export type Theme = "dark" | "light";

interface ThemeStyles {
  primary: string;
  primaryHover: string;
  primaryText: string;
  secondary: string;
  secondaryHover: string;
  secondaryText: string;
  border: string;
  inputBg: string;
  messageBubble: {
    user: string;
    ai: string;
    system: string;
  };
}

export interface ThemeConfig {
  dark: ThemeStyles;
  light: ThemeStyles;
}
