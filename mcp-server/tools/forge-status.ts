import type { PipelineStateManager } from "../state";

export async function handleForgeStatus(
  _args: Record<string, unknown>,
  state: PipelineStateManager,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const currentState = state.getState();
  const overrides = currentState.pendingOverrides;

  let response = JSON.stringify(currentState, null, 2);

  if (overrides.length > 0) {
    response += "\n\nPENDING USER OVERRIDES (from dashboard):\n";
    for (const o of overrides) {
      response += `- ${o.action} on "${o.skill}"\n`;
    }
    response += "\nApply these overrides before continuing generation.";
  }

  return { content: [{ type: "text", text: response }] };
}
