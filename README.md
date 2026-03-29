# Skill Forge

A Claude Code plugin that autonomously generates skills from PRDs, tech specs, and codebases.

## Installation

Install as a Claude Code plugin:

```
claude plugin install ./skill-forge
```

## Usage

### Generate skills from a PRD

```
/skill-forge prd.md
```

Opens a real-time dashboard at http://localhost:4077 and starts:
1. Analyzing documents + codebase
2. Planning skills with dependency resolution
3. Generating each skill via skill-creator
4. Running evals and quality gates

### Analyze only (no generation)

```
/skill-forge:analyze
```

### Check status

```
/skill-forge:status
```

### Sync after PRD changes

```
/skill-forge:evolve
```

## Dashboard

The dashboard shows:
- Pipeline progress with phase tracking
- Skill cards with scope, status, and dependencies
- Live log of all events
- User override controls (skip, change scope, retry)

## Architecture

- **Skills**: 4 SKILL.md files (orchestrator, analyze, evolve, status)
- **MCP Server**: Stdio for Claude + HTTP/WebSocket for dashboard
- **Shared Logic**: Document parser, codebase scanner, scope classifier, dependency resolver
