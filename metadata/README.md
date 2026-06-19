# Custom Connection Metadata

This folder contains the Salesforce metadata that makes the agent return
**structured response formats** to the custom chat client, following the
[Set Up a Custom Connection](https://developer.salesforce.com/docs/ai/agentforce/guide/custom-connections-get-started.html)
guide.

## What's here

```
unpackaged/
├── package.xml                       # Deploys AiResponseFormat + AiSurface
├── aiResponseFormats/
│   ├── TextChoices_CustomChatClient01.aiResponseFormat
│   └── ChoicesWithImages_CustomChatClient01.aiResponseFormat
├── aiSurfaces/
│   └── CustomChatClient_CustomChatClient01.aiSurface
└── genAiPlannerBundles/
    ├── README.md                     # How to wire the surface into your agent
    └── My_Custom_Client_Agent/…example
```

`CustomChatClient01` is the **surfaceId** — a unique suffix that ties the surface
and its response formats together. Rename it everywhere (file names, the
`<responseFormat>` references in the `.aiSurface`, and the `<surface>` value in
your planner bundle) if you want a different id.

## Requirements

- Metadata API **v66.0 or later**.
- An External Client App configured for the client credentials flow (same app
  the server uses — see the root `README.md`).

## Deploy

From this `metadata/` directory:

```bash
sf project deploy start --manifest unpackaged/package.xml
```

`AiResponseFormat` entities are deployed before `AiSurface` automatically when
using the manifest. If you deploy piecemeal, deploy the response formats first.

Then associate the surface with your agent's planner bundle — see
[`unpackaged/genAiPlannerBundles/README.md`](./unpackaged/genAiPlannerBundles/README.md).

## How it connects to the client

At runtime the agent returns the selected format in `result[0].type` as
`SURFACE_ACTION__<developerName>`, where `<developerName>` is the format's FULL
developer name and still **includes** the `_CustomChatClient01` surface-id
suffix. The client strips the `SURFACE_ACTION__` prefix and then matches on the
base-name prefix (see `resolveFormatName` in
`client/src/components/chat/formatRegistry.ts`), so rendering works regardless of
the surfaceId you choose:

| Response format developer name         | Runtime `type`                                         | Client base name    |
| -------------------------------------- | ------------------------------------------------------ | ------------------- |
| `TextChoices_CustomChatClient01`       | `SURFACE_ACTION__TextChoices_CustomChatClient01`       | `TextChoices`       |
| `ChoicesWithImages_CustomChatClient01` | `SURFACE_ACTION__ChoicesWithImages_CustomChatClient01` | `ChoicesWithImages` |

If you add or rename a response format, update both the metadata and the client
base-name constants (`FORMAT_TEXT_CHOICES` / `FORMAT_CHOICES_WITH_IMAGES`) so the
renderer recognizes it. Anything the client doesn't recognize falls back to
plain-text rendering.
