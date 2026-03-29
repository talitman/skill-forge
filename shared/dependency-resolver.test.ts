import { describe, test, expect } from "bun:test";
import { buildDependencyGraph, resolvePhases } from "./dependency-resolver";
import type { SkillCandidate } from "./types";

describe("buildDependencyGraph", () => {
  test("builds adjacency list from skill candidates", () => {
    const candidates: SkillCandidate[] = [
      { name: "setup-monorepo", domain: "infra", description: "", requirements: [], sourceSection: "", suggestedScope: "global" },
      { name: "configure-ts", domain: "infra", description: "", requirements: [], sourceSection: "", suggestedScope: "global" },
      { name: "build-registry", domain: "backend", description: "depends on monorepo and typescript", requirements: [], sourceSection: "", suggestedScope: "project" },
    ];
    const deps: Record<string, string[]> = {
      "setup-monorepo": [],
      "configure-ts": ["setup-monorepo"],
      "build-registry": ["setup-monorepo", "configure-ts"],
    };
    const graph = buildDependencyGraph(candidates, deps);
    expect(graph["setup-monorepo"]).toEqual([]);
    expect(graph["configure-ts"]).toEqual(["setup-monorepo"]);
    expect(graph["build-registry"]).toContain("setup-monorepo");
    expect(graph["build-registry"]).toContain("configure-ts");
  });
});

describe("resolvePhases", () => {
  test("groups independent skills into same phase", () => {
    const deps: Record<string, string[]> = {
      "skill-a": [],
      "skill-b": [],
      "skill-c": ["skill-a", "skill-b"],
    };
    const phases = resolvePhases(deps);
    expect(phases).toHaveLength(2);
    expect(phases[0].skills).toContain("skill-a");
    expect(phases[0].skills).toContain("skill-b");
    expect(phases[1].skills).toContain("skill-c");
  });

  test("handles linear chain", () => {
    const deps: Record<string, string[]> = {
      "a": [],
      "b": ["a"],
      "c": ["b"],
    };
    const phases = resolvePhases(deps);
    expect(phases).toHaveLength(3);
    expect(phases[0].skills).toEqual(["a"]);
    expect(phases[1].skills).toEqual(["b"]);
    expect(phases[2].skills).toEqual(["c"]);
  });

  test("handles single skill with no deps", () => {
    const deps: Record<string, string[]> = { "solo": [] };
    const phases = resolvePhases(deps);
    expect(phases).toHaveLength(1);
    expect(phases[0].skills).toEqual(["solo"]);
  });

  test("detects circular dependency", () => {
    const deps: Record<string, string[]> = {
      "a": ["b"],
      "b": ["a"],
    };
    expect(() => resolvePhases(deps)).toThrow("Circular dependency");
  });
});
