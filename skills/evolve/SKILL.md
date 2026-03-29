---
name: skill-forge:evolve
description: Detect changes in PRDs, tech specs, or codebase since last analysis and suggest incremental skill updates. Use when the user has modified their requirements and wants to sync their skills, or says "evolve", "sync skills", "update skills from PRD", "what changed".
---

# Skill Forge — Evolve

Detect changes since last analysis and suggest incremental skill updates.

## Workflow

1. Call `forge_manifest` with action `read` to load the current manifest.
2. For each source document in the manifest:
   - Read the current file content
   - Compare its hash against `manifest.snapshot.docHashes`
   - If changed, compute the diff
3. Classify change size:
   - **Small** (diff < 20% of doc): Map changed lines to affected skills
   - **Medium** (diff 20-60%): Re-analyze affected domain
   - **Large** (diff > 60% or new file): Full re-analysis
4. For small/medium changes:
   - Identify which existing skills are affected
   - Determine if new skills are needed
   - Determine if any skills should be removed
5. For large changes:
   - Run full analysis (same as `/skill-forge:analyze`)
   - Diff new manifest against old
6. Present evolution report showing:
   - What changed in the documents
   - Skills to create, update, or remove
   - Recommended actions
7. If user approves, update the manifest and trigger generation for affected skills only.

## Watch Mode

If invoked with `--watch`:
1. Start a filesystem watcher on all source documents
2. On change, automatically run the evolution analysis
3. Broadcast results to the dashboard
4. Wait for user approval before generating
