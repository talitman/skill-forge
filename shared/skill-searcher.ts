import type { ExternalSkillMatch, SkillHealth } from "./types";

// Build search queries for finding similar skills
export function buildSearchQueries(skillName: string, description: string): string[] {
  const baseTerms = skillName.replace(/-/g, " ");
  return [
    `Claude Code skill "${baseTerms}"`,
    `claude-code plugin skill ${baseTerms} github`,
    `AI coding assistant prompt template ${baseTerms}`,
    `${baseTerms} best practices automation`,
  ];
}

// Parse and score external results against our skill
export function scoreExternalMatch(
  externalName: string,
  externalDescription: string,
  ourSkillName: string,
  ourDescription: string,
): number {
  const ourWords = new Set(
    `${ourSkillName} ${ourDescription}`.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );
  const extWords = new Set(
    `${externalName} ${externalDescription}`.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );
  const overlap = [...ourWords].filter((w) => extWords.has(w));
  return overlap.length / Math.max(ourWords.size, 1);
}

// Build improvement suggestions based on health + external matches
export function buildImprovementSuggestions(
  health: SkillHealth,
  externalMatches: ExternalSkillMatch[],
): string[] {
  const suggestions: string[] = [];

  // Analyze signal patterns
  const revertCount = health.signals.filter((s) => s.type === "output_reverted").length;
  const rejectCount = health.signals.filter((s) => s.type === "user_rejected").length;
  const repromptCount = health.signals.filter((s) => s.type === "reprompt_same_topic").length;
  const heavyEditCount = health.signals.filter((s) => s.type === "output_heavily_edited").length;
  const negativeCount = health.signals.filter((s) => s.type === "user_rating_negative").length;

  if (revertCount > 0) {
    suggestions.push(
      `Skill output was reverted ${revertCount} time(s) — the generated code may have fundamental issues. Consider regenerating with stricter requirements.`
    );
  }

  if (rejectCount > 0) {
    suggestions.push(
      `Skill was rejected ${rejectCount} time(s) — it may be triggering on wrong contexts. Review the skill description and trigger conditions.`
    );
  }

  if (repromptCount > 0) {
    suggestions.push(
      `Users re-prompted the same topic ${repromptCount} time(s) after this skill ran — the skill may not fully solve the problem. Review success criteria.`
    );
  }

  if (heavyEditCount > 0) {
    suggestions.push(
      `Skill output was heavily edited ${heavyEditCount} time(s) — it's producing partially correct results. Fine-tune the skill instructions.`
    );
  }

  if (negativeCount > 0) {
    suggestions.push(
      `Received ${negativeCount} negative rating(s) from users. Check user comments for specific issues.`
    );
  }

  // Add external suggestions
  const goodMatches = externalMatches.filter((m) => m.similarity > 0.3);
  if (goodMatches.length > 0) {
    const best = goodMatches[0];
    suggestions.push(
      `Found similar skill "${best.name}" (${best.source}) with ${Math.round(best.similarity * 100)}% overlap. Advantages: ${best.advantages.join(", ") || "review manually"}.`
    );
  }

  if (suggestions.length === 0) {
    suggestions.push("No specific issues identified from signals. Consider running manual evals to diagnose.");
  }

  return suggestions;
}
