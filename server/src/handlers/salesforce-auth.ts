import axios from "axios";
import { SalesforceConfig } from "../types";

interface CachedToken {
  accessToken: string;
  apiInstanceUrl?: string;
  expiresAt: number;
}

// Client-credentials access tokens typically live ~2 hours. Refresh proactively
// well before that, and additionally fall back to a forced refresh on any 401.
const TOKEN_SOFT_TTL_MS = 100 * 60 * 1000;

let cached: CachedToken | null = null;
let inFlight: Promise<CachedToken> | null = null;

/**
 * Mints (or returns a cached) Agent API access token using the OAuth 2.0
 * client credentials flow against the org's My Domain token endpoint.
 */
export async function getAccessToken(
  config: SalesforceConfig,
  forceRefresh = false
): Promise<CachedToken> {
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  // Collapse concurrent refreshes into a single token request.
  if (!forceRefresh && inFlight) {
    return inFlight;
  }

  inFlight = mintToken(config)
    .then((token) => {
      cached = token;
      return token;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

async function mintToken(config: SalesforceConfig): Promise<CachedToken> {
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const { data } = await axios.post(
    `${config.myDomainUrl}/services/oauth2/token`,
    params.toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  if (!data?.access_token) {
    throw new Error("Token endpoint did not return an access_token");
  }

  return {
    accessToken: data.access_token,
    apiInstanceUrl: data.api_instance_url,
    expiresAt: Date.now() + TOKEN_SOFT_TTL_MS,
  };
}

/** Drops the cached token so the next request mints a fresh one (used on 401). */
export function clearTokenCache(): void {
  cached = null;
}
