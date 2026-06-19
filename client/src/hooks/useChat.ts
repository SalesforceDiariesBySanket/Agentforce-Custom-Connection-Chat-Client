import { useState, useEffect, useRef, useCallback } from "react";
import { Message } from "../types";
import { extractResponseFormat, useAgentApi } from "./useAgentApi";

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const AGENT_DISPLAY_NAME = "Agentforce";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const sequenceRef = useRef(1);
  const aiMessageRef = useRef<{ id: string; text: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);

  const { createSession, endSession, streamMessage } = useAgentApi();

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (!sessionIdRef.current) return;

      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      try {
        await endSession(sessionId);
      } catch (err) {
        console.error("Failed to end session:", err);
      }
      setIsConnected(false);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "system",
          content: "Chat ended due to inactivity",
          timestamp: new Date(),
        },
      ]);
    }, INACTIVITY_TIMEOUT);
  }, [endSession]);

  const startChat = useCallback(async () => {
    abortRef.current?.abort();

    setMessages([]);
    setIsLoading(false);
    setIsTyping(false);
    setCurrentAgent(null);
    setError(null);

    try {
      const { sessionId, messages: initial } = await createSession();
      sessionIdRef.current = sessionId;
      sequenceRef.current = 1;
      aiMessageRef.current = null;

      setIsConnected(true);
      setCurrentAgent(AGENT_DISPLAY_NAME);
      setMessages(
        initial.map((message) => ({
          id: message.id,
          type: message.type,
          content: message.content,
          format: message.format ?? null,
          timestamp: new Date(),
        }))
      );
      resetTimeout();
    } catch (err) {
      console.error("Chat initialization error:", err);
      setError("Failed to start chat");
      setIsConnected(false);
    }
  }, [createSession, resetTimeout]);

  const sendMessage = useCallback(
    async (content: string) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;

      resetTimeout();

      const userMessage: Message = {
        id: crypto.randomUUID(),
        type: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      aiMessageRef.current = null;
      const sequenceId = sequenceRef.current;
      sequenceRef.current += 1;

      const ensureAiBubble = () => {
        if (!aiMessageRef.current) {
          const id = crypto.randomUUID();
          aiMessageRef.current = { id, text: "" };
          setMessages((prev) => [
            ...prev,
            { id, type: "ai", content: "", timestamp: new Date() },
          ]);
        }
        return aiMessageRef.current;
      };

      const updateBubble = (id: string, patch: Partial<Message>) =>
        setMessages((prev) =>
          prev.map((message) =>
            message.id === id ? { ...message, ...patch } : message
          )
        );

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamMessage(
          sessionId,
          sequenceId,
          content,
          {
            onProgress: () => setIsTyping(true),
            onChunk: (text) => {
              const bubble = ensureAiBubble();
              bubble.text += text;
              setIsTyping(false);
              setIsLoading(false);
              updateBubble(bubble.id, { content: bubble.text });
            },
            onReset: () => {
              if (!aiMessageRef.current) return;
              aiMessageRef.current.text = "";
              updateBubble(aiMessageRef.current.id, {
                content: "",
                format: null,
              });
            },
            onComplete: (inform) => {
              const bubble = ensureAiBubble();
              const format = extractResponseFormat(inform);
              const finalText = inform.message ?? bubble.text;
              bubble.text = finalText;
              setIsTyping(false);
              setIsLoading(false);
              updateBubble(bubble.id, { content: finalText, format });
            },
            onError: (err) => {
              console.error(err);
              setError("Something went wrong while contacting the agent.");
            },
            onEnd: () => {
              setIsLoading(false);
              setIsTyping(false);
              aiMessageRef.current = null;
              resetTimeout();
            },
          },
          controller.signal
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error(err);
        setError("Failed to send message");
        setIsLoading(false);
        setIsTyping(false);
      }
    },
    [resetTimeout, streamMessage]
  );

  const closeChat = useCallback(
    async (onClosed: () => void) => {
      const sessionId = sessionIdRef.current;
      abortRef.current?.abort();
      sessionIdRef.current = null;

      try {
        if (sessionId) await endSession(sessionId);
      } catch (err) {
        console.error("Failed to close chat:", err);
      } finally {
        setIsConnected(false);
        setIsTyping(false);
        setCurrentAgent(null);
        setMessages([]);
        setIsLoading(false);
        setError(null);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        onClosed();
      }
    },
    [endSession]
  );

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    startChat();

    return () => {
      abortRef.current?.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [startChat]);

  return {
    messages,
    isConnected,
    isLoading,
    isTyping,
    currentAgent,
    error,
    sendMessage,
    closeChat,
    startNewChat: startChat,
  };
}
