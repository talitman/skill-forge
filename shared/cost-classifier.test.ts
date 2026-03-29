import { describe, test, expect } from "bun:test";
import { classifyCostTier, calculateCostSummary } from "./cost-classifier";
import { findTemplate } from "./template-registry";
import type { SkillCandidate, CostEstimate } from "./types";

describe("findTemplate", () => {
  test("finds exact name match", () => {
    const template = findTemplate("setup-pnpm-monorepo", "anything");
    expect(template).not.toBeNull();
    expect(template!.name).toBe("setup-pnpm-monorepo");
  });

  test("finds keyword match", () => {
    const template = findTemplate("init-monorepo", "pnpm workspace setup");
    expect(template).not.toBeNull();
    expect(template!.name).toBe("setup-pnpm-monorepo");
  });

  test("returns null for unknown skill", () => {
    const template = findTemplate("build-quantum-engine", "quantum computing pipeline");
    expect(template).toBeNull();
  });
});

describe("classifyCostTier", () => {
  test("assigns template tier when template exists", () => {
    const candidate: SkillCandidate = {
      name: "setup-pnpm-monorepo",
      domain: "infra",
      description: "Initialize pnpm monorepo",
      requirements: ["pnpm workspaces"],
      sourceSection: "Stack",
      suggestedScope: "global",
    };
    const result = classifyCostTier(candidate, { scope: "global", action: "create" });
    expect(result.tier).toBe("template");
    expect(result.model).toBe("haiku");
    expect(result.skipEvals).toBe(true);
    expect(result.templateName).toBe("setup-pnpm-monorepo");
    expect(result.reason).toContain("Pre-built template");
    expect(result.estimatedCostUSD).toBeGreaterThan(0);
    expect(result.estimatedCostUSD).toBeLessThan(0.1);
  });

  test("assigns light tier for global generic patterns", () => {
    const candidate: SkillCandidate = {
      name: "setup-yarn-workspaces",
      domain: "infra",
      description: "Configure yarn workspaces",
      requirements: ["yarn workspaces"],
      sourceSection: "Stack",
      suggestedScope: "global",
    };
    const result = classifyCostTier(candidate, { scope: "global", action: "create" });
    expect(result.tier).toBe("light");
    expect(result.model).toBe("haiku");
    expect(result.skipEvals).toBe(true);
  });

  test("assigns light/sonnet for simple project skills", () => {
    const candidate: SkillCandidate = {
      name: "create-skill-registry",
      domain: "backend",
      description: "Create file-based skill registry",
      requirements: ["Store skills", "File-based JSON"],
      sourceSection: "Architecture",
      suggestedScope: "project",
    };
    const result = classifyCostTier(candidate, { scope: "project", action: "create" });
    expect(result.tier).toBe("light");
    expect(result.model).toBe("sonnet");
    expect(result.skipEvals).toBe(true);
  });

  test("assigns full tier for complex project skills", () => {
    const candidate: SkillCandidate = {
      name: "build-policy-engine",
      domain: "backend",
      description: "Build intelligent policy engine",
      requirements: ["Reuse vs generate", "Model selection", "Cost optimization", "Conflict resolution", "User input decisions", "Fallback handling"],
      sourceSection: "Architecture",
      suggestedScope: "project",
    };
    const result = classifyCostTier(candidate, { scope: "project", action: "create" });
    expect(result.tier).toBe("full");
    expect(result.model).toBe("opus");
    expect(result.skipEvals).toBe(false);
    expect(result.reason).toContain("Complex");
    expect(result.estimatedCostUSD).toBeGreaterThan(1); // Opus + 50K tokens = expensive
  });
});

describe("calculateCostSummary", () => {
  test("calculates savings correctly", () => {
    const estimates: CostEstimate[] = [
      { tier: "template", model: "haiku", reason: "", estimatedTokens: 500, estimatedCostUSD: 0.0015, skipEvals: true, templateName: "x" },
      { tier: "template", model: "haiku", reason: "", estimatedTokens: 500, estimatedCostUSD: 0.0015, skipEvals: true, templateName: "y" },
      { tier: "light", model: "haiku", reason: "", estimatedTokens: 15000, estimatedCostUSD: 0.0456, skipEvals: true, templateName: null },
      { tier: "light", model: "sonnet", reason: "", estimatedTokens: 15000, estimatedCostUSD: 0.171, skipEvals: true, templateName: null },
      { tier: "full", model: "sonnet", reason: "", estimatedTokens: 50000, estimatedCostUSD: 0.57, skipEvals: false, templateName: null },
    ];
    const summary = calculateCostSummary(estimates);
    expect(summary.totalEstimatedTokens).toBe(81000);
    expect(summary.totalEstimatedCostUSD).toBeGreaterThan(0);
    // Full pipeline assumes all skills run with sonnet at 50K tokens each
    expect(summary.fullPipelineCostUSD).toBeGreaterThan(0);
    expect(summary.savedCostUSD).toBeGreaterThan(0);
    expect(summary.byTier).toEqual({ template: 2, light: 2, full: 1 });
    expect(summary.byModel).toEqual({ haiku: 3, sonnet: 2, opus: 0 });
    expect(summary.savedVsFullPipeline).toBe(250000 - 81000);
    expect(summary.savingsPercent).toBe(68);
  });
});
