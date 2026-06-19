import { FastifyReply, FastifyRequest } from "fastify";
import { Readable } from "node:stream";
import { ReadableStream } from "node:stream/web";
import { SalesforceConfig, SendMessageRequest } from "../types";
import { clearTokenCache, getAccessToken } from "./salesforce-auth";
import { getAgentApiBase } from "./chat-session-handler";

const DEFAULT_CLIENT_ORIGIN = "http://localhost:5173";

/**
 * Sends a user message to the Agent API streaming endpoint and proxies the
 * raw server-sent event stream back to the browser. The client parses the
 * stream (TextChunk / Inform / EndOfTurn events) and renders the result,
 * including any custom-connection structured response format.
 */
export async function handleSendMessage(
  config: SalesforceConfig,
  request: FastifyRequest<SendMessageRequest>,
  reply: FastifyReply
) {
  const { sessionId, message, sequenceId } = request.body;

  const payload = JSON.stringify({
    message: {
      sequenceId: sequenceId ?? Date.now(),
      type: "Text",
      text: message,
    },
  });

  const sendStreamRequest = async (forceRefresh: boolean) => {
    const { accessToken, apiInstanceUrl } = await getAccessToken(
      config,
      forceRefresh
    );
    const base = getAgentApiBase(config, apiInstanceUrl);
    return fetch(
      `${base}/einstein/ai-agent/v1/sessions/${sessionId}/messages/stream`,
      {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: payload,
      }
    );
  };

  let upstream = await sendStreamRequest(false);
  if (upstream.status === 401) {
    clearTokenCache();
    upstream = await sendStreamRequest(true);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    reply.code(upstream.status || 502).send({
      error: "Failed to stream message from the Agent API",
      detail,
    });
    return;
  }

  // Take over the socket; we stream raw SSE bytes ourselves.
  reply.hijack();
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin":
      process.env.CLIENT_ORIGIN || DEFAULT_CLIENT_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
  });

  const nodeStream = Readable.fromWeb(
    upstream.body as unknown as ReadableStream
  );

  request.raw.on("close", () => nodeStream.destroy());
  nodeStream.on("error", () => {
    nodeStream.destroy();
    reply.raw.end();
  });

  nodeStream.pipe(reply.raw);
}
