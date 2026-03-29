import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { parseMarkdownDocument } from "./document-parser";
import { join } from "path";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "forge-parse-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("parseMarkdownDocument", () => {
  test("parses headings into sections", async () => {
    const md = `# Title\nIntro text\n## Section A\nContent A\n## Section B\nContent B`;
    const filePath = join(tempDir, "test.md");
    writeFileSync(filePath, md);
    const doc = await parseMarkdownDocument(filePath);
    expect(doc.filePath).toBe(filePath);
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].title).toBe("Title");
    expect(doc.sections[0].children).toHaveLength(2);
    expect(doc.sections[0].children[0].title).toBe("Section A");
    expect(doc.sections[0].children[0].content).toContain("Content A");
    expect(doc.sections[0].children[1].title).toBe("Section B");
  });

  test("handles nested headings (h1 > h2 > h3)", async () => {
    const md = `# Top\n## Mid\n### Deep\nDeep content`;
    const filePath = join(tempDir, "nested.md");
    writeFileSync(filePath, md);
    const doc = await parseMarkdownDocument(filePath);
    expect(doc.sections[0].children[0].children[0].title).toBe("Deep");
    expect(doc.sections[0].children[0].children[0].content).toContain("Deep content");
  });

  test("handles document with no headings", async () => {
    const md = `Just plain text\nwith multiple lines`;
    const filePath = join(tempDir, "plain.md");
    writeFileSync(filePath, md);
    const doc = await parseMarkdownDocument(filePath);
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].title).toBe("");
    expect(doc.sections[0].content).toContain("Just plain text");
  });

  test("extracts bullet points as content", async () => {
    const md = `# Features\n- Feature one\n- Feature two\n- Feature three`;
    const filePath = join(tempDir, "bullets.md");
    writeFileSync(filePath, md);
    const doc = await parseMarkdownDocument(filePath);
    expect(doc.sections[0].content).toContain("Feature one");
    expect(doc.sections[0].content).toContain("Feature three");
  });
});
