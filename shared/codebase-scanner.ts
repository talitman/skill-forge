import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import type { CodebaseInfo } from "./types";

export async function scanCodebase(projectDir: string): Promise<CodebaseInfo> {
  const info: CodebaseInfo = {
    packageManager: null,
    language: null,
    framework: null,
    existingPatterns: [],
    fileStructure: [],
  };

  let entries: string[];
  try {
    entries = await readdir(projectDir);
  } catch {
    return info;
  }

  for (const entry of entries) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    try {
      const s = await stat(join(projectDir, entry));
      info.fileStructure.push(s.isDirectory() ? `${entry}/` : entry);
    } catch {
      // skip unreadable entries
    }
  }

  try {
    const pkgRaw = await readFile(join(projectDir, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw);

    if (typeof pkg.packageManager === "string") {
      if (pkg.packageManager.startsWith("pnpm")) info.packageManager = "pnpm";
      else if (pkg.packageManager.startsWith("yarn")) info.packageManager = "yarn";
      else if (pkg.packageManager.startsWith("npm")) info.packageManager = "npm";
    }

    if (!info.packageManager) {
      if (entries.includes("pnpm-lock.yaml")) info.packageManager = "pnpm";
      else if (entries.includes("yarn.lock")) info.packageManager = "yarn";
      else if (entries.includes("package-lock.json")) info.packageManager = "npm";
      else if (entries.includes("bun.lockb")) info.packageManager = "bun";
    }

    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (allDeps["next"]) info.framework = "next";
    else if (allDeps["express"]) info.framework = "express";
    else if (allDeps["fastify"]) info.framework = "fastify";
    else if (allDeps["react"]) info.framework = "react";
    else if (allDeps["vue"]) info.framework = "vue";
  } catch {
    // No package.json or invalid
  }

  if (entries.includes("tsconfig.json")) {
    info.language = "typescript";
  } else if (entries.includes("package.json")) {
    info.language = "javascript";
  } else if (entries.includes("pyproject.toml") || entries.includes("setup.py")) {
    info.language = "python";
  } else if (entries.includes("go.mod")) {
    info.language = "go";
  } else if (entries.includes("Cargo.toml")) {
    info.language = "rust";
  }

  if (entries.includes("pnpm-workspace.yaml") || entries.includes("lerna.json")) {
    info.existingPatterns.push("monorepo");
  }
  if (entries.includes(".github")) info.existingPatterns.push("github-actions");
  if (entries.includes("Dockerfile") || entries.includes("docker-compose.yml")) {
    info.existingPatterns.push("docker");
  }
  if (entries.includes(".eslintrc.json") || entries.includes("eslint.config.js")) {
    info.existingPatterns.push("eslint");
  }
  if (entries.includes("jest.config.ts") || entries.includes("vitest.config.ts")) {
    info.existingPatterns.push("testing-configured");
  }

  return info;
}
