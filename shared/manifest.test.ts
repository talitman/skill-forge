import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { readManifest, writeManifest, createEmptyManifest, addSkillToManifest, updateSkillStatus } from "./manifest";
import { join } from "path";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import type { Manifest, SkillEntry } from "./types";

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "forge-test-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("createEmptyManifest", () => {
  test("creates manifest with source files", () => {
    const manifest = createEmptyManifest(["prd.md"]);
    expect(manifest.source).toEqual(["prd.md"]);
    expect(manifest.skills).toEqual([]);
    expect(manifest.phases).toEqual([]);
    expect(manifest.history).toHaveLength(1);
    expect(manifest.history[0].action).toBe("created");
  });
});

describe("writeManifest and readManifest", () => {
  test("round-trips manifest to disk", async () => {
    const manifest = createEmptyManifest(["prd.md"]);
    const filePath = join(tempDir, "skill-forge-manifest.json");
    await writeManifest(filePath, manifest);
    const loaded = await readManifest(filePath);
    expect(loaded).not.toBeNull();
    expect(loaded!.source).toEqual(["prd.md"]);
    expect(loaded!.skills).toEqual([]);
  });

  test("readManifest returns null for missing file", async () => {
    const loaded = await readManifest(join(tempDir, "nonexistent.json"));
    expect(loaded).toBeNull();
  });
});

describe("addSkillToManifest", () => {
  test("adds a skill entry", () => {
    const manifest = createEmptyManifest(["prd.md"]);
    const skill: SkillEntry = {
      name: "setup-monorepo",
      scope: "global",
      status: "planned",
      phase: 1,
      dependsOn: [],
      description: "Setup pnpm monorepo",
      brief: null,
      evalResults: null,
      costEstimate: null,
      userOverride: null,
    };
    const updated = addSkillToManifest(manifest, skill);
    expect(updated.skills).toHaveLength(1);
    expect(updated.skills[0].name).toBe("setup-monorepo");
  });

  test("does not add duplicate skill names", () => {
    const manifest = createEmptyManifest(["prd.md"]);
    const skill: SkillEntry = {
      name: "setup-monorepo",
      scope: "global",
      status: "planned",
      phase: 1,
      dependsOn: [],
      description: "Setup pnpm monorepo",
      brief: null,
      evalResults: null,
      costEstimate: null,
      userOverride: null,
    };
    const m1 = addSkillToManifest(manifest, skill);
    const m2 = addSkillToManifest(m1, skill);
    expect(m2.skills).toHaveLength(1);
  });
});

describe("updateSkillStatus", () => {
  test("updates status of existing skill", () => {
    let manifest = createEmptyManifest(["prd.md"]);
    const skill: SkillEntry = {
      name: "setup-monorepo",
      scope: "global",
      status: "planned",
      phase: 1,
      dependsOn: [],
      description: "Setup pnpm monorepo",
      brief: null,
      evalResults: null,
      costEstimate: null,
      userOverride: null,
    };
    manifest = addSkillToManifest(manifest, skill);
    const updated = updateSkillStatus(manifest, "setup-monorepo", "generating");
    expect(updated.skills[0].status).toBe("generating");
  });

  test("throws for unknown skill", () => {
    const manifest = createEmptyManifest(["prd.md"]);
    expect(() => updateSkillStatus(manifest, "nonexistent", "complete")).toThrow();
  });
});
