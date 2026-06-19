import axios from "axios";
import { FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import {
  AgentMessage,
  ClientMessage,
  EndSessionRequest,
  SalesforceConfig,
} from "../types";
import { clearTokenCache, getAccessToken } from "./salesforce-auth";

const DEFAULT_API_HOST = "https://api.salesforce.com";
const SURFACE_ACTION_PREFIX = "SURFACE_ACTION__";

/** Resolves the Agent API base URL (env override > token-provided > default). */
export function getAgentApiBase(
  config: SalesforceConfig,
  apiInstanceUrl?: string
): string {
  const host = config.apiHost || apiInstanceUrl || DEFAULT_API_HOST;
  return host.replace(/\/+$/, "");
}

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

/**
 * Normalizes Agent API messages into the client shape, extracting any custom
 * connection response format from the `result` array. See "Parse the Response"
 * in the custom connections setup guide.
 */
export function parseAgentMessages(
  messages: AgentMessage[] = []
): ClientMessage[] {
  return messages
    .filter(
      (message) =>
        message &&
        (typeof message.message === "string" ||
          (Array.isArray(message.result) && message.result.length > 0))
    )
    .map((message) => {
      const clientMessage: ClientMessage = {
        id: message.id || randomUUID(),
        type: "ai",
        content: message.message ?? "",
        feedbackId: message.feedbackId,
        format: null,
      };

      const result = message.result?.[0];
      if (result?.type?.startsWith(SURFACE_ACTION_PREFIX)) {
        const name = result.type.slice(SURFACE_ACTION_PREFIX.length);
        try {
          clientMessage.format = { name, data: JSON.parse(result.value) };
        } catch {
          // Platform doesn't guarantee schema-valid JSON; fall back to text.
          clientMessage.format = null;
        }
      }

      return clientMessage;
    });
}

/**
 * Starts an Agent API session, opting into the custom connection via
 * `surfaceConfig` so the agent can return structured response formats.
 */
export async function handleCreateSession(config: SalesforceConfig) {
  const body: Record<string, unknown> = {
    externalSessionKey: randomUUID(),
    instanceConfig: { endpoint: config.myDomainUrl },
    streamingCapabilities: { chunkTypes: ["Text"] },
    surfaceConfig: { surfaceType: config.surfaceType },
  };

  if (config.bypassUser !== "omit") {
    body.bypassUser = config.bypassUser === "true";
  }

  const start = async (forceRefresh: boolean) => {
    const { accessToken, apiInstanceUrl } = await getAccessToken(
      config,
      forceRefresh
    );
    const base = getAgentApiBase(config, apiInstanceUrl);
    return axios.post(
      `${base}/einstein/ai-agent/v1/agents/${config.agentId}/sessions`,
      body,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  };

  let response;
  try {
    response = await start(false);
  } catch (error) {
    if (isUnauthorized(error)) {
      clearTokenCache();
      response = await start(true);
    } else {
      throw error;
    }
  }

  return {
    sessionId: response.data.sessionId as string,
    messages: parseAgentMessages(response.data.messages),
  };
}

/** Ends an Agent API session. Best-effort: never throws to the client. */
export async function handleEndSession(
  config: SalesforceConfig,
  request: FastifyRequest<EndSessionRequest>
) {
  const sessionId = request.body?.sessionId;
  if (!sessionId) {
    return { success: true };
  }

  const end = async (forceRefresh: boolean) => {
    const { accessToken, apiInstanceUrl } = await getAccessToken(
      config,
      forceRefresh
    );
    const base = getAgentApiBase(config, apiInstanceUrl);
    return axios.delete(`${base}/einstein/ai-agent/v1/sessions/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-session-end-reason": "UserRequest",
      },
    });
  };

  try {
    await end(false);
  } catch (error) {
    if (isUnauthorized(error)) {
      clearTokenCache();
      try {
        await end(true);
      } catch {
        // Session may already be closed/expired; ignore.
      }
    }
  }

  return { success: true };
}
