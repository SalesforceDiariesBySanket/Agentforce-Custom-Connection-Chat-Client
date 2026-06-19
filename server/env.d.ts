declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /** My Domain URL, e.g. https://mydomain.my.salesforce.com */
      SF_MY_DOMAIN_URL: string;
      /** External Client App consumer key */
      SF_CLIENT_ID: string;
      /** External Client App consumer secret */
      SF_CLIENT_SECRET: string;
      /** Agent ID (0Xx...) */
      SF_AGENT_ID: string;
      /** Optional Agent API host override (default https://api.salesforce.com) */
      SF_API_HOST?: string;
      /** Optional surface type (default "Custom") */
      SF_SURFACE_TYPE?: string;
      /** Optional bypassUser control: "true" | "false" | "omit" (default "true") */
      SF_BYPASS_USER?: string;
      /** Optional CORS origin for the browser client (default http://localhost:5173) */
      CLIENT_ORIGIN?: string;
      /** Optional server port (default 8080) */
      PORT?: string;
    }
  }
}

export {};
