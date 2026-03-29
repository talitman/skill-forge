---
name: skill-forge:analyze
description: Analyze PRDs, tech specs, and codebases to determine what Claude Code skills a project needs. Use when the user wants to understand what skills they should build, or when running analysis as a standalone step before generation. Triggers on "analyze my PRD", "what skills do I need", "scan this project for skills".
---

# Skill Forge — Analyze

Analyze a project's documents and codebase to produce a skill manifest.

## Workflow

1. Call `forge_analyze` with the document paths and project directory.
2. Review the returned content:
   - Parsed document sections with all requirements
   - Codebase info: language, framework, package manager, existing patterns
3. From the requirements, identify skill candidates:
   - What features need to be built? Each major feature may need a skill.
   - What infrastructure is required? (monorepo, CI, testing, deployment)
   - What patterns repeat? (API endpoints, database models, auth flows)
   - What optimizations are mentioned? (caching, performance, monitoring)
4. For each candidate, classify scope:
   - Does it reference project-specific domain terms? → Project scope
   - Is it a generic dev pattern? → Global scope
   - Does a similar global skill already exist? → Skip or extend
5. Resolve dependencies and group into phases.
6. Write the manifest via `forge_manifest`.
7. Present the skill plan to the user with a summary table.

## Output Format

Present results as:

| # | Skill Name | Scope | Phase | Dependencies | Description |
|---|---|---|---|---|---|
| 1 | setup-monorepo | global | 1 | — | Initialize pnpm monorepo |
| 2 | configure-typescript | global | 1 | — | Strict TS config |
| ... | ... | ... | ... | ... | ... |

Then tell the user: "Review the plan in the dashboard at http://localhost:4077. Run `/skill-forge` to generate all skills, or `/skill-forge:status` to check current state."
