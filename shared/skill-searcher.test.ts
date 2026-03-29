import { describe, test, expect } from "bun:test";
import { buildSearchQueries, scoreExternalMatch, buildImprovementSuggestions } from "./skill-searcher";
import type { SkillHealth, ExternalSkillMatch } from "./types";

describe("buildSearchQueries", () => {
  test("generates relevant search queries", () => {
    const queries = buildSearchQueries("create-rest-api", "Create REST API endpoints");
    expect(queries.length).toBeGreaterThanOrEqual(3);
    expect(queries.some((q) => q.includes("rest api"))).toBe(true);
    expect(queries.some((q) => q.includes("Claude Code"))).toBe(true);
  });
});

describe("scoreExternalMatch", () => {
  test("scores similar descriptions higher", () => {
    const high = scoreExternalMatch(
      "rest-api-builder", "Build REST API endpoints with validation",
      "create-rest-api", "Create REST API endpoints with input validation"
    );
    const low = scoreExternalMatch(
      "css-theme-maker", "Create CSS themes and color palettes",
      "create-rest-api", "Create REST API endpoints with input validation"
    );
    expect(high).toBeGreaterThan(low);
  });
});

describe("buildImprovementSuggestions", () => {
  test("suggests fixes based on revert signals", () => {
    const health: SkillHealth = {
      skillName: "bad-skill",
      score: 40,
      totalUses: 5,
      signals: [
        { id: "1", skillName: "bad-skill", type: "output_reverted", timestamp: "", details: "Reverted", sessionId: "s1" },
        { id: "2", skillName: "bad-skill", type: "output_reverted", timestamp: "", details: "Reverted again", sessionId: "s2" },
      ],
      lastUsed: null,
      lastScoreChange: null,
      needsReview: true,
    };
    const suggestions = buildImprovementSuggestions(health, []);
    expect(suggestions.some((s) => s.includes("reverted 2 time"))).toBe(true);
  });

  test("includes external matches in suggestions", () => {
    const health: SkillHealth = {
      skillName: "my-skill",
      score: 45,
      totalUses: 3,
      signals: [],
      lastUsed: null,
      lastScoreChange: null,
      needsReview: true,
    };
    const matches: ExternalSkillMatch[] = [{
      source: "github",
      name: "better-skill",
      url: "https://github.com/example/better-skill",
      description: "A better version",
      similarity: 0.6,
      advantages: ["handles edge cases", "better error messages"],
    }];
    const suggestions = buildImprovementSuggestions(health, matches);
    expect(suggestions.some((s) => s.includes("better-skill"))).toBe(true);
    expect(suggestions.some((s) => s.includes("handles edge cases"))).toBe(true);
  });
});
