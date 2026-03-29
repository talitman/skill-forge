# Skill Forge

[![CI](https://github.com/talitman/skill-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/talitman/skill-forge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Claude Code plugin that autonomously generates skills from PRDs, tech specs, and codebases.

**Skill Forge** reads your project requirements, scans your codebase, and generates a complete set of Claude Code skills — with dependency resolution, cost optimization, and a real-time browser dashboard.

## Features

- **Autonomous generation** — Analyzes PRDs and codebases, determines what skills are needed, generates them via skill-creator
- **Smart scope classification** — Automatically classifies skills as project-specific or globally reusable
- **Dependency-aware phasing** — Resolves skill dependencies into ordered phases, parallelizes where possible
- **Cost optimization** — 3-tier system (template/light/full) with real dollar estimates, saving up to 88% vs full pipeline
- **Real-time dashboard** — Browser-based UI at localhost:4077 with live progress, skill cards, and intervention controls
- **Feedback loop** — Passive signal detection + health scoring, auto-triggers improvement when skills underperform
- **Evolution mode** — Detects PRD changes and incrementally syncs skills

## Installation

```bash
# Install bun (required)
curl -fsSL https://bun.sh/install | bash

# Install the plugin
claude plugin install ./skill-forge
```

## Quick Start

```bash
# Generate skills from a PRD
/skill-forge prd.md

# Analyze only (no generation)
/skill-forge:analyze

# Check status
/skill-forge:status

# Sync after PRD changes
/skill-forge:evolve

# View skill health
/skill-forge:feedback
```

## How It Works

```
PRD + Codebase
      │
      ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Document │────▶│  Scope   │────▶│   Dep    │
│  Parser  │     │Classifier│     │ Resolver │
└──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │  Cost    │
                                  │Optimizer │
                                  └──────────┘
                                        │
              ┌─────────────────────────┼─────────────────────┐
              ▼                         ▼                     ▼
        ┌──────────┐             ┌──────────┐          ┌──────────┐
        │ Template │             │  Light   │          │   Full   │
        │ (free)   │             │ (Sonnet) │          │(Sonnet+  │
        │          │             │ no evals │          │  evals)  │
        └──────────┘             └──────────┘          └──────────┘
              │                         │                     │
              └─────────────────────────┼─────────────────────┘
                                        ▼
                                  ┌──────────┐
                                  │ Feedback │
                                  │  Loop    │
                                  └──────────┘
```

## Dashboard

The real-time dashboard (localhost:4077) shows:

- **Pipeline progress** — phase tracking with progress bars
- **Skill cards** — name, scope, cost tier, model, dollar estimate, health score
- **Cost summary** — total estimated cost, savings vs full pipeline
- **Health overview** — per-skill health bars (green/yellow/red)
- **Live log** — streaming events and decisions
- **Override controls** — skip, change scope, retry from the browser

## Cost Optimization

Every skill is classified into a cost tier before generation:

| Tier | When | Model | Evals | ~Cost |
|---|---|---|---|---|
| **Template** | Pre-built skill matches | — | Skip | ~$0.00 |
| **Light** | Generic or simple skill | Sonnet | Skip | ~$0.17 |
| **Full** | Complex project-specific | Sonnet | Yes | ~$0.57 |

The dashboard shows the tier, model, token estimate, dollar cost, and *reason* for each decision.

## Architecture

- **5 Skills** — orchestrator, analyze, evolve, status, feedback
- **MCP Server** — stdio for Claude Code + HTTP/WebSocket for dashboard
- **6 MCP Tools** — analyze, generate, status, control, manifest, feedback
- **Shared Logic** — document parser, codebase scanner, scope classifier, dependency resolver, template registry, cost classifier, signal collector, skill searcher

## Development

```bash
# Install dependencies
bun install

# Run tests (63 tests)
bun test

# Type check
bunx tsc --noEmit
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

[MIT](LICENSE)
