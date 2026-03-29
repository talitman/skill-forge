---
name: skill-forge:status
description: Quick status check for Skill Forge — shows what skills exist, what's planned, what's stale, and if the PRD has changed since last analysis. Use when the user asks "skill forge status", "what skills do I have", "is my skill set up to date".
---

# Skill Forge — Status

Show the current state of the skill forge pipeline.

## Workflow

1. Call `forge_status` to get pipeline state.
2. Call `forge_manifest` with action `read` to get the manifest.
3. Check if source documents have changed since `manifest.snapshot.docHashes`.
4. Present a summary:

**Pipeline:** [status]
**Last analysis:** [timestamp]
**Skills:** [complete] / [total] generated ([project] project, [global] global)

**By Phase:**
- Phase 1 (Infrastructure): 3/3 complete
- Phase 2 (Core): 2/4 generating
- ...

**Stale:** [Yes/No — PRD changed since last analysis]

If stale, suggest: "Run `/skill-forge:evolve` to sync."
If skills are pending, suggest: "Run `/skill-forge` to continue generation."

5. Tell user the dashboard is at http://localhost:4077 for detailed view.
