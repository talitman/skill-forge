import { readManifest, writeManifest } from "../../shared/manifest";
import type { PipelineStateManager } from "../state";
import type { SkillScope } from "../../shared/types";

export async function handleForgeManifest(
  args: Record<string, unknown>,
  _state: PipelineStateManager,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const action = args.action as string;
  const manifestPath = args.manifestPath as string;

  const manifest = await readManifest(manifestPath);
  if (!manifest) {
    return { content: [{ type: "text", text: "Error: Manifest not found at " + manifestPath }] };
  }

  switch (action) {
    case "read":
      return { content: [{ type: "text", text: JSON.stringify(manifest, null, 2) }] };

    case "update_scope": {
      const skillName = args.skill as string;
      const newScope = args.scope as SkillScope;
      if (!skillName || !newScope) {
        return { content: [{ type: "text", text: "Error: 'skill' and 'scope' required for update_scope." }] };
      }
      const idx = manifest.skills.findIndex((s) => s.name === skillName);
      if (idx === -1) {
        return { content: [{ type: "text", text: `Error: Skill "${skillName}" not found in manifest.` }] };
      }
      const oldScope = manifest.skills[idx].scope;
      manifest.skills[idx].scope = newScope;
      manifest.history.push({
        timestamp: new Date().toISOString(),
        action: "scope-changed",
        details: `${skillName}: ${oldScope} → ${newScope}`,
      });
      await writeManifest(manifestPath, manifest);
      return { content: [{ type: "text", text: `Updated "${skillName}" scope: ${oldScope} → ${newScope}` }] };
    }

    default:
      return { content: [{ type: "text", text: `Unknown manifest action: ${action}` }] };
  }
}
