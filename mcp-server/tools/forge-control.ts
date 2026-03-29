import type { PipelineStateManager } from "../state";

export async function handleForgeControl(
  args: Record<string, unknown>,
  state: PipelineStateManager,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const action = args.action as string;
  const skill = args.skill as string | undefined;

  switch (action) {
    case "pause":
      state.setStatus("paused");
      return { content: [{ type: "text", text: "Pipeline paused. Call forge_control with action 'resume' to continue." }] };

    case "resume":
      state.setStatus("generating");
      return { content: [{ type: "text", text: "Pipeline resumed." }] };

    case "skip":
      if (!skill) {
        return { content: [{ type: "text", text: "Error: 'skill' is required for skip action." }] };
      }
      state.addOverride({
        id: `ov-${Date.now()}`,
        skill,
        action: "skip",
        payload: null,
        timestamp: new Date().toISOString(),
      });
      return { content: [{ type: "text", text: `Skill "${skill}" will be skipped on next generation cycle.` }] };

    case "retry":
      if (!skill) {
        return { content: [{ type: "text", text: "Error: 'skill' is required for retry action." }] };
      }
      state.addOverride({
        id: `ov-${Date.now()}`,
        skill,
        action: "retry",
        payload: null,
        timestamp: new Date().toISOString(),
      });
      return { content: [{ type: "text", text: `Skill "${skill}" queued for retry.` }] };

    default:
      return { content: [{ type: "text", text: `Unknown action: ${action}` }] };
  }
}
