import { describe, test, expect } from "bun:test";
import { classifyScope } from "./scope-classifier";
import type { SkillCandidate } from "./types";

describe("classifyScope", () => {
  test("classifies generic dev patterns as global", () => {
    const candidate: SkillCandidate = {
      name: "setup-pnpm-monorepo",
      domain: "infra",
      description: "Initialize pnpm monorepo with workspace configuration",
      requirements: ["Setup pnpm workspaces"],
      sourceSection: "Technical Stack",
      suggestedScope: "global",
    };
    const result = classifyScope(candidate, ["skill registry", "policy engine"], []);
    expect(result.scope).toBe("global");
  });

  test("classifies project-specific domain terms as project", () => {
    const candidate: SkillCandidate = {
      name: "create-skill-registry",
      domain: "backend",
      description: "Create file-based skill registry for storing and managing skills",
      requirements: ["Store skills", "File-based JSON"],
      sourceSection: "System Architecture",
      suggestedScope: "project",
    };
    const result = classifyScope(candidate, ["skill registry", "policy engine"], []);
    expect(result.scope).toBe("project");
  });

  test("returns skip when similar global skill exists", () => {
    const candidate: SkillCandidate = {
      name: "setup-monorepo",
      domain: "infra",
      description: "Setup monorepo structure",
      requirements: ["Initialize monorepo"],
      sourceSection: "Stack",
      suggestedScope: "global",
    };
    const existingGlobal = ["setup-pnpm-monorepo", "configure-eslint"];
    const result = classifyScope(candidate, [], existingGlobal);
    expect(result.action).toBe("skip");
    expect(result.existingSkill).toBe("setup-pnpm-monorepo");
  });

  test("returns create when no similar skill exists", () => {
    const candidate: SkillCandidate = {
      name: "build-policy-engine",
      domain: "backend",
      description: "Build rules-based policy engine for skill decisions",
      requirements: ["Decision making"],
      sourceSection: "Architecture",
      suggestedScope: "project",
    };
    const result = classifyScope(candidate, ["policy engine"], []);
    expect(result.action).toBe("create");
  });
});
