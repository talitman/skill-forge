import { parseMarkdownDocument } from "../../shared/document-parser";
import { scanCodebase } from "../../shared/codebase-scanner";
import { createEmptyManifest, writeManifest } from "../../shared/manifest";
import type { PipelineStateManager } from "../state";
import { join } from "path";

export async function handleForgeAnalyze(
  args: Record<string, unknown>,
  state: PipelineStateManager,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const documents = args.documents as string[];
  const projectDir = args.projectDir as string;

  state.setStatus("analyzing");

  const parsedDocs = await Promise.all(
    documents.map((doc) => parseMarkdownDocument(doc))
  );

  const codebaseInfo = await scanCodebase(projectDir);

  const allContent = parsedDocs
    .flatMap((doc) => flattenSections(doc.sections))
    .join("\n\n");

  const manifestPath = join(projectDir, "skill-forge-manifest.json");
  const manifest = createEmptyManifest(documents);
  manifest.snapshot.codebaseFingerprint = JSON.stringify(codebaseInfo);

  for (const doc of documents) {
    const { createHash } = await import("crypto");
    const content = (await import("fs/promises")).readFile(doc, "utf-8");
    const hash = createHash("sha256").update(await content).digest("hex");
    manifest.snapshot.docHashes[doc] = hash;
  }

  await writeManifest(manifestPath, manifest);

  state.setStatus("idle");

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        manifestPath,
        documentCount: documents.length,
        codebaseInfo,
        sectionCount: parsedDocs.reduce((sum, d) => sum + countSections(d.sections), 0),
        allContent,
        message: "Analysis complete. Documents parsed and codebase scanned. The manifest has been created. Now use the content above to determine what skills are needed — call forge_manifest to add skills, then forge_generate to start generation.",
      }, null, 2),
    }],
  };
}

function flattenSections(sections: Array<{ title: string; content: string; children: any[] }>): string[] {
  const result: string[] = [];
  for (const s of sections) {
    if (s.title) result.push(`## ${s.title}\n${s.content}`);
    else if (s.content) result.push(s.content);
    result.push(...flattenSections(s.children));
  }
  return result;
}

function countSections(sections: Array<{ children: any[] }>): number {
  let count = sections.length;
  for (const s of sections) count += countSections(s.children);
  return count;
}
