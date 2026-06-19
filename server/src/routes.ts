import { FastifyInstance } from "fastify";
import {
  createSessionSchema,
  endSessionSchema,
  sendMessageSchema,
} from "./schema";
import {
  handleCreateSession,
  handleEndSession,
  handleSendMessage,
} from "./handlers";
import {
  EndSessionRequest,
  SalesforceConfig,
  SendMessageRequest,
} from "./types";

function buildConfig(): SalesforceConfig {
  const {
    SF_MY_DOMAIN_URL,
    SF_CLIENT_ID,
    SF_CLIENT_SECRET,
    SF_AGENT_ID,
    SF_API_HOST,
    SF_SURFACE_TYPE,
    SF_BYPASS_USER,
  } = process.env;

  if (!SF_MY_DOMAIN_URL || !SF_CLIENT_ID || !SF_CLIENT_SECRET || !SF_AGENT_ID) {
    throw new Error(
      "Missing required environment variables: SF_MY_DOMAIN_URL, SF_CLIENT_ID, SF_CLIENT_SECRET, SF_AGENT_ID"
    );
  }

  const bypassUser =
    SF_BYPASS_USER === "false"
      ? "false"
      : SF_BYPASS_USER === "omit"
        ? "omit"
        : "true";

  return {
    myDomainUrl: SF_MY_DOMAIN_URL.replace(/\/+$/, ""),
    clientId: SF_CLIENT_ID,
    clientSecret: SF_CLIENT_SECRET,
    agentId: SF_AGENT_ID,
    apiHost: SF_API_HOST?.replace(/\/+$/, ""),
    surfaceType: SF_SURFACE_TYPE || "Custom",
    bypassUser,
  };
}

export default async function agentRoutes(fastify: FastifyInstance) {
  const config = buildConfig();

  // Start a new Agent API session (opts into the custom connection surface).
  fastify.post("/chat/session", { schema: createSessionSchema }, () =>
    handleCreateSession(config)
  );

  // Send a message; response is streamed back as Server-Sent Events.
  fastify.post<SendMessageRequest>(
    "/chat/message",
    { schema: sendMessageSchema },
    (request, reply) => handleSendMessage(config, request, reply)
  );

  // End the session.
  fastify.delete<EndSessionRequest>(
    "/chat/session",
    { schema: endSessionSchema },
    (request) => handleEndSession(config, request)
  );
}
