import { readFile, writeFile } from "fs/promises";
import type { Manifest, SkillEntry, SkillStatus } from "./types";

export function createEmptyManifest(sources: string[]): Manifest {
  return {
    source: sources,
    analyzedAt: new Date().toISOString(),
    skills: [],
    phases: [],
    history: [
      {
        timestamp: new Date().toISOString(),
        action: "created",
        details: `Manifest created for sources: ${sources.join(", ")}`,
      },
    ],
    snapshot: {
      docHashes: {},
      codebaseFingerprint: "",
    },
  };
}

export async function writeManifest(filePath: string, manifest: Manifest): Promise<void> {
  await writeFile(filePath, JSON.stringify(manifest, null, 2), "utf-8");
}

export async function readManifest(filePath: string): Promise<Manifest | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as Manifest;
  } catch {
    return null;
  }
}

export function addSkillToManifest(manifest: Manifest, skill: SkillEntry): Manifest {
  const exists = manifest.skills.some((s) => s.name === skill.name);
  if (exists) return manifest;
  return {
    ...manifest,
    skills: [...manifest.skills, skill],
    history: [
      ...manifest.history,
      {
        timestamp: new Date().toISOString(),
        action: "skill-added",
        details: `Added skill: ${skill.name} (${skill.scope})`,
      },
    ],
  };
}

export function updateSkillStatus(manifest: Manifest, skillName: string, status: SkillStatus): Manifest {
  const idx = manifest.skills.findIndex((s) => s.name === skillName);
  if (idx === -1) throw new Error(`Skill not found: ${skillName}`);
  const updatedSkills = [...manifest.skills];
  updatedSkills[idx] = { ...updatedSkills[idx], status };
  return {
    ...manifest,
    skills: updatedSkills,
    history: [
      ...manifest.history,
      {
        timestamp: new Date().toISOString(),
        action: "status-changed",
        details: `${skillName}: ${manifest.skills[idx].status} → ${status}`,
      },
    ],
  };
}
