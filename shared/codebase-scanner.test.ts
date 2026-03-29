import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { scanCodebase } from "./codebase-scanner";
import { join } from "path";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "forge-scan-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("scanCodebase", () => {
  test("detects package.json with pnpm", async () => {
    writeFileSync(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "test", packageManager: "pnpm@9.0.0" })
    );
    const info = await scanCodebase(tempDir);
    expect(info.packageManager).toBe("pnpm");
  });

  test("detects TypeScript from tsconfig.json", async () => {
    writeFileSync(join(tempDir, "tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
    writeFileSync(join(tempDir, "package.json"), JSON.stringify({ name: "test" }));
    const info = await scanCodebase(tempDir);
    expect(info.language).toBe("typescript");
  });

  test("detects monorepo from pnpm-workspace.yaml", async () => {
    writeFileSync(join(tempDir, "pnpm-workspace.yaml"), "packages:\n  - packages/*");
    writeFileSync(join(tempDir, "package.json"), JSON.stringify({ name: "test" }));
    const info = await scanCodebase(tempDir);
    expect(info.existingPatterns).toContain("monorepo");
  });

  test("lists top-level directory structure", async () => {
    mkdirSync(join(tempDir, "src"));
    mkdirSync(join(tempDir, "tests"));
    writeFileSync(join(tempDir, "package.json"), JSON.stringify({ name: "test" }));
    const info = await scanCodebase(tempDir);
    expect(info.fileStructure).toContain("src/");
    expect(info.fileStructure).toContain("tests/");
  });

  test("handles empty directory", async () => {
    const info = await scanCodebase(tempDir);
    expect(info.packageManager).toBeNull();
    expect(info.language).toBeNull();
    expect(info.existingPatterns).toEqual([]);
  });
});
