# Associate the connection with your agent

The `AiSurface` only takes effect once your agent's **GenAiPlannerBundle**
references it through a `plannerSurfaces` entry.

> ⚠️ Deploying a `GenAiPlannerBundle` **replaces** the existing one. Never deploy
> a stub bundle that contains only `plannerSurfaces` — it will wipe your agent's
> topics and actions. Always edit your real, fully-populated bundle.

## Steps

1. Retrieve your agent's planner bundle into this folder, for example:

   ```bash
   sf project retrieve start -m "GenAiPlannerBundle:Your_Agent_Planner"
   ```

2. Add this block inside the `<GenAiPlannerBundle>` element (keep all existing
   topics/actions). See `My_Custom_Client_Agent.genAiPlannerBundle.example`.

   ```xml
   <plannerSurfaces>
       <callRecordingAllowed>false</callRecordingAllowed>
       <surface>CustomChatClient_CustomChatClient01</surface>
       <surfaceType>Custom</surfaceType>
   </plannerSurfaces>
   ```

3. Deploy the bundle (and uncomment the `GenAiPlannerBundle` block in
   `../package.xml` if deploying via the manifest):

   ```bash
   sf project deploy start -m "GenAiPlannerBundle:Your_Agent_Planner"
   ```

The `surface` value must match the `AiSurface` developer name, including the
`_CustomChatClient01` surfaceId suffix.
