import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { parseMarkdownDocument } from "../shared/document-parser";
import { scanCodebase } from "../shared/codebase-scanner";
import { classifyScope } from "../shared/scope-classifier";
import { resolvePhases } from "../shared/dependency-resolver";
import { createEmptyManifest, writeManifest, readManifest, addSkillToManifest } from "../shared/manifest";
import type { SkillCandidate, SkillEntry } from "../shared/types";

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "forge-integration-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("full pipeline: PRD to manifest", () => {
  test("parses PRD, scans codebase, classifies skills, resolves phases, writes manifest", async () => {
    // Setup: write a mini PRD
    const prdPath = join(tempDir, "prd.md");
    writeFileSync(prdPath, `# My App
## Architecture
### Components
1. REST API server
2. Custom data processor
3. Dashboard UI

## Technical Stack
- Node.js + TypeScript
- pnpm monorepo
`);

    // Setup: write a package.json
    writeFileSync(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "my-app", packageManager: "pnpm@9.0.0" })
    );
    writeFileSync(join(tempDir, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true } }));

    // Step 1: Parse PRD
    const doc = await parseMarkdownDocument(prdPath);
    expect(doc.sections.length).toBeGreaterThan(0);

    // Step 2: Scan codebase
    const codebase = await scanCodebase(tempDir);
    expect(codebase.packageManager).toBe("pnpm");
    expect(codebase.language).toBe("typescript");

    // Step 3: Create skill candidates (simulating what Claude would do)
    const candidates: SkillCandidate[] = [
      { name: "setup-pnpm-monorepo", domain: "infra", description: "Initialize pnpm monorepo", requirements: ["pnpm workspaces"], sourceSection: "Technical Stack", suggestedScope: "global" },
      { name: "configure-typescript", domain: "infra", description: "Setup TypeScript with strict mode", requirements: ["strict TS"], sourceSection: "Technical Stack", suggestedScope: "global" },
      { name: "create-rest-api", domain: "backend", description: "Build REST API server", requirements: ["REST endpoints"], sourceSection: "Components", suggestedScope: "global" },
      { name: "build-data-processor", domain: "backend", description: "Custom data processor for the app", requirements: ["data processing pipeline"], sourceSection: "Components", suggestedScope: "project" },
    ];

    // Step 4: Classify scope
    const projectTerms = ["data processor", "custom"];
    const existingGlobal: string[] = [];
    const classifications = candidates.map((c) => ({
      ...c,
      classification: classifyScope(c, projectTerms, existingGlobal),
    }));

    expect(classifications[0].classification.scope).toBe("global");
    expect(classifications[1].classification.scope).toBe("global");
    expect(classifications[3].classification.scope).toBe("project");

    // Step 5: Resolve dependencies
    const deps: Record<string, string[]> = {
      "setup-pnpm-monorepo": [],
      "configure-typescript": ["setup-pnpm-monorepo"],
      "create-rest-api": ["setup-pnpm-monorepo", "configure-typescript"],
      "build-data-processor": ["create-rest-api"],
    };
    const phases = resolvePhases(deps);
    expect(phases.length).toBeGreaterThanOrEqual(3);
    expect(phases[0].skills).toContain("setup-pnpm-monorepo");

    // Step 6: Write manifest
    let manifest = createEmptyManifest([prdPath]);
    manifest.phases = phases;

    for (const c of classifications) {
      const entry: SkillEntry = {
        name: c.name,
        scope: c.classification.scope,
        status: "planned",
        phase: phases.find((p) => p.skills.includes(c.name))?.id ?? 1,
        dependsOn: deps[c.name],
        description: c.description,
        brief: null,
        costEstimate: null,
        evalResults: null,
        userOverride: null,
      };
      manifest = addSkillToManifest(manifest, entry);
    }

    const manifestPath = join(tempDir, "skill-forge-manifest.json");
    await writeManifest(manifestPath, manifest);

    // Verify
    const loaded = await readManifest(manifestPath);
    expect(loaded).not.toBeNull();
    expect(loaded!.skills).toHaveLength(4);
    expect(loaded!.phases.length).toBeGreaterThanOrEqual(3);
    expect(loaded!.skills.find((s) => s.name === "build-data-processor")?.scope).toBe("project");
    expect(loaded!.skills.find((s) => s.name === "setup-pnpm-monorepo")?.scope).toBe("global");
  });
});
