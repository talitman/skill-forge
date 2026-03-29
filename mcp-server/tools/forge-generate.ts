import { readManifest } from "../../shared/manifest";
import type { PipelineStateManager } from "../state";

export async function handleForgeGenerate(
  args: Record<string, unknown>,
  state: PipelineStateManager,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const manifestPath = args.manifestPath as string;
  const targetPhase = args.phase as number | undefined;

  const manifest = await readManifest(manifestPath);
  if (!manifest) {
    return { content: [{ type: "text", text: "Error: Manifest not found. Run forge_analyze first." }] };
  }

  const overrides = state.drainOverrides();

  const phases = targetPhase
    ? manifest.phases.filter((p) => p.id === targetPhase)
    : manifest.phases;

  if (phases.length === 0) {
    return { content: [{ type: "text", text: "No phases to generate." }] };
  }

  state.setStatus("generating");
  state.setPhaseInfo(phases[0].id, manifest.phases.length, manifest.skills.length);

  const instructions: string[] = [];

  for (const phase of phases) {
    const phaseSkills = manifest.skills.filter(
      (s) => s.phase === phase.id && s.status !== "complete" && s.status !== "skipped"
    );

    if (phaseSkills.length === 0) continue;

    for (const skill of phaseSkills) {
      const override = overrides.find((o) => o.skill === skill.name);
      if (override?.action === "skip") {
        instructions.push(`SKIP skill "${skill.name}" — user requested skip via dashboard.`);
        continue;
      }

      instructions.push(
        `GENERATE skill "${skill.name}" (${skill.scope} scope):\n` +
        `  Description: ${skill.description}\n` +
        `  Brief: ${JSON.stringify(skill.brief, null, 2)}\n` +
        `  Dependencies: ${skill.dependsOn.join(", ") || "none"}\n` +
        `  Use /skill-creator to generate this skill autonomously with the brief above as pre-answered context.`
      );
    }
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        action: "generate",
        phases: phases.map((p) => p.id),
        overridesApplied: overrides.length,
        instructions,
        message: "For each instruction above, spawn a subagent with skill-creator to generate the skill. Skills within the same phase can be generated in parallel. After each skill completes, call forge_status to report progress.",
      }, null, 2),
    }],
  };
}
