import { readFile } from "fs/promises";
import type { ParsedDocument, ParsedSection } from "./types";

export async function parseMarkdownDocument(filePath: string): Promise<ParsedDocument> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const sections = buildSectionTree(lines);
  return { filePath, sections };
}

interface FlatSection {
  title: string;
  level: number;
  contentLines: string[];
}

function buildSectionTree(lines: string[]): ParsedSection[] {
  const flat: FlatSection[] = [];
  let current: FlatSection | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (current) flat.push(current);
      current = {
        title: headingMatch[2],
        level: headingMatch[1].length,
        contentLines: [],
      };
    } else {
      if (!current) {
        current = { title: "", level: 0, contentLines: [] };
      }
      current.contentLines.push(line);
    }
  }
  if (current) flat.push(current);

  if (flat.length === 0) {
    return [{ title: "", level: 0, content: "", children: [] }];
  }

  return nestSections(flat);
}

function nestSections(flat: FlatSection[]): ParsedSection[] {
  const result: ParsedSection[] = [];
  let i = 0;

  while (i < flat.length) {
    const section = flat[i];
    const parsed: ParsedSection = {
      title: section.title,
      level: section.level,
      content: section.contentLines.join("\n").trim(),
      children: [],
    };

    i++;

    const childFlat: FlatSection[] = [];
    while (i < flat.length && (section.level === 0 || flat[i].level > section.level)) {
      childFlat.push(flat[i]);
      i++;
    }

    if (childFlat.length > 0) {
      parsed.children = nestSections(childFlat);
    }

    result.push(parsed);
  }

  return result;
}
