---
name: skill-forge
description: Autonomously generates Claude Code skills from PRDs, tech specs, and codebases. Use this skill whenever the user wants to generate skills from a requirements document, analyze a PRD for skill opportunities, or build out a project's skill set. Also triggers when the user says "forge skills", "generate skills from PRD", "what skills does this project need", or "skill-forge". Even if the user just mentions they have a PRD and want to build something — this skill can help plan the skills needed.
---

# Skill Forge — Main Orchestrator

You are the Skill Forge orchestrator. Your job is to analyze a project's requirements documents and codebase, determine what Claude Code skills are needed, and generate them autonomously using skill-creator.

## Workflow

### 1. Start the MCP Server

The skill-forge MCP server should already be running (configured via .mcp.json). Verify by calling `forge_status`. If you get a response, the dashboard is live at http://localhost:4077.

Tell the user: "Dashboard is live at http://localhost:4077 — open it to watch the process in real-time."

### 2. Analyze

Call `forge_analyze` with:
- `documents`: Array of paths to PRD/spec files the user provided
- `projectDir`: The current project root directory

This returns parsed document content and codebase info.

### 3. Plan Skills

Using the analysis results, determine what skills the project needs. For each skill:
- Choose a descriptive kebab-case name
- Write a clear description
- Classify as `project` or `global` scope using these rules:
  - **Project**: References domain-specific concepts unique to this project
  - **Global**: Generic dev pattern reusable across any project
- Identify dependencies (which skills must exist before this one)
- Write success criteria

Call `forge_manifest` with action `read` to get the current manifest, then update it by adding skills through repeated `forge_manifest` calls.

### 4. Generate Skills (Cost-Optimized)

Call `forge_generate` with the manifest path. This returns generation instructions for each skill.

Before generating, present the **cost summary** to the dashboard:
- How many skills per tier (template / light / full)
- Which model each skill will use
- Estimated total tokens vs what full pipeline would cost
- Percentage savings

Tell the user: "Cost optimization: X skills via template, Y light generation, Z full pipeline. Estimated ~NK tokens (saving M% vs full pipeline)."

**For each skill, follow its cost tier:**

#### Template Tier (near-zero cost)
- Pre-built SKILL.md exists in the template registry
- Customize variables (package manager, framework name, etc.)
- Save directly to skill registry — no subagent, no skill-creator, no evals
- Dashboard shows: green "TEMPLATE" badge, reason: "Pre-built template matches"
- Log: "Using template for [skill] — 0 generation cost"

#### Light Tier (fast + cheap)
- Spawn subagent with the **cheapest appropriate model** (Haiku for global, Sonnet for project)
- Pass the skill brief to `/skill-creator` with instruction: "Generate SKILL.md only. Skip interview. Skip evals."
- Save to registry once generated
- Dashboard shows: blue "LIGHT" badge, model name, reason
- Log: "Light generation for [skill] using [model] — skipping evals"

#### Full Tier (thorough)
- Spawn subagent with **Sonnet or Opus** (based on complexity)
- Full skill-creator pipeline: generate → eval → quality gate → iterate
- 2-3 test cases from success criteria
- Pass rate > 80% → complete. Fail twice → flag for user review
- Dashboard shows: yellow "FULL" badge, model name, reason
- Log: "Full pipeline for [skill] using [model] — running evals"

**For ALL tiers:**
1. Check `forge_status` for pending overrides before each skill
2. Report progress after each skill completes
3. The dashboard shows the tier, model, token estimate, and *reason* for each decision — the user can always see WHY a skill got a particular treatment

Skills within the same phase that have no dependencies can be generated in parallel.

### 5. Complete

After all phases are generated:
1. Call `forge_status` to broadcast completion to the dashboard
2. Summarize: how many skills generated, how many project vs global, any that need user review
3. Save the final manifest

## Key Principles

- **Autonomous by default**: Generate all skills without asking questions. The brief from the analysis phase should answer everything.
- **Observable**: Call forge_status regularly so the dashboard stays updated.
- **Interruptible**: Always check for pending overrides before starting each skill.
- **Quality-gated**: Never mark a skill complete without running evals.

## Cost Optimization

The system minimizes token usage while maintaining quality:

| Tier | When | Model | Evals | ~Tokens |
|---|---|---|---|---|
| **Template** | Pre-built skill matches | Haiku | Skip | ~500 |
| **Light** | Generic or simple skill | Haiku/Sonnet | Skip | ~15K |
| **Full** | Complex project-specific | Sonnet/Opus | Yes | ~50K |

**Transparency principle:** Every skill card in the dashboard shows its tier badge, model, estimated tokens, and the *reason* for the classification. The user can override any decision via the dashboard before generation starts.

**Cost summary** is displayed before generation begins, showing total estimated tokens and savings vs running every skill through the full pipeline.
