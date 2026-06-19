# Client — Agentforce Custom Chat Client

The React + TypeScript + Vite frontend for the Agentforce Custom Chat Client. It
renders the chat UI, parses the Agent API Server-Sent Event stream, and turns
custom-connection **structured response formats** into native UI (quick-reply
choices and image card carousels), falling back to streamed plain text.

See the [root README](../README.md) for the full architecture and an explanation
of how the custom connection works end to end.

## Develop

This package is part of a pnpm workspace. Install from the repository root:

```bash
pnpm install
```

Then run the client (it expects the proxy server on `http://localhost:8080`):

```bash
# from the repository root — starts both server and client
pnpm dev

# or just the client
pnpm dev:client
```

The dev server runs at http://localhost:5173.

## Scripts

- `pnpm dev` — start the Vite dev server
- `pnpm build` — type-check and build for production (output in `dist/`)
- `pnpm lint` — run ESLint
- `pnpm preview` — preview the production build locally

## Environment

| Variable       | Description     | Required                                     |
| -------------- | --------------- | -------------------------------------------- |
| `VITE_API_URL` | Backend API URL | No (defaults to `http://localhost:8080/api`) |

## Where things live

- `src/hooks/useAgentApi.ts` — SSE parsing and response-format extraction
- `src/components/chat/formatRegistry.ts` — maps runtime format names to renderers
- `src/components/chat/ResponseFormats.tsx` — renders text choices and image cards
