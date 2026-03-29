import type { SkillCandidate, SkillScope } from "./types";

export interface ClassificationResult {
  scope: SkillScope;
  action: "create" | "skip" | "extend";
  reason: string;
  existingSkill?: string;
}

const GENERIC_KEYWORDS = [
  "monorepo", "typescript", "eslint", "prettier", "jest", "vitest",
  "docker", "ci/cd", "github actions", "rest api", "graphql",
  "authentication", "authorization", "logging", "monitoring",
  "testing", "linting", "formatting", "deployment", "database",
];

export function classifyScope(
  candidate: SkillCandidate,
  projectDomainTerms: string[],
  existingGlobalSkills: string[],
): ClassificationResult {
  const similarSkill = findSimilarSkill(candidate.name, existingGlobalSkills);
  if (similarSkill) {
    return {
      scope: "global",
      action: "skip",
      reason: `Similar global skill already exists: ${similarSkill}`,
      existingSkill: similarSkill,
    };
  }

  const lowerDesc = candidate.description.toLowerCase();
  const lowerName = candidate.name.toLowerCase();
  const combined = `${lowerName} ${lowerDesc}`;

  for (const term of projectDomainTerms) {
    if (combined.includes(term.toLowerCase())) {
      return {
        scope: "project",
        action: "create",
        reason: `References project-specific term: "${term}"`,
      };
    }
  }

  for (const keyword of GENERIC_KEYWORDS) {
    if (combined.includes(keyword.toLowerCase())) {
      return {
        scope: "global",
        action: "create",
        reason: `Matches generic dev pattern: "${keyword}"`,
      };
    }
  }

  return {
    scope: "project",
    action: "create",
    reason: "No generic pattern match — defaulting to project scope",
  };
}

function findSimilarSkill(candidateName: string, existingSkills: string[]): string | null {
  const candidateWords = candidateName.toLowerCase().split("-").filter(Boolean);

  for (const existing of existingSkills) {
    const existingWords = existing.toLowerCase().split("-").filter(Boolean);
    const common = candidateWords.filter((w) => existingWords.includes(w));
    const similarity = common.length / Math.max(candidateWords.length, existingWords.length);
    if (similarity >= 0.6) {
      return existing;
    }
  }
  return null;
}
