# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-29

### Added

- **Core Plugin**
  - Claude Code plugin manifest and MCP server configuration
  - 5 skills: orchestrator (`/skill-forge`), analyze, evolve, status, feedback
  - MCP server with 6 tools: analyze, generate, status, control, manifest, feedback

- **Analysis Pipeline**
  - Markdown document parser with nested section tree building
  - Codebase scanner for tech stack, framework, and pattern detection
  - Scope classifier with heuristic rules and registry deduplication
  - Dependency resolver with DAG-based topological phase grouping

- **Real-Time Dashboard**
  - WebSocket-based live streaming dashboard at localhost:4077
  - Pipeline progress bars, skill cards, live log, dependency visualization
  - User intervention controls (skip, toggle scope, retry)
  - Safe DOM rendering (no innerHTML)

- **Cost Optimization**
  - 10 pre-built skill templates for common patterns (monorepo, TypeScript, ESLint, testing, REST API, Docker, CI, auth, database, logging)
  - 3-tier generation system: template (near-zero cost), light (fast model, no evals), full (capable model + evals)
  - Real dollar cost estimates per skill based on Claude API pricing
  - Cost summary panel showing total estimate, savings percentage, and per-tier breakdown

- **Feedback Loop**
  - Passive signal detection: reverts, heavy edits, re-prompts, rejections
  - Active user ratings: positive, tweaks, negative (with optional comments)
  - Health scoring system (0-100) with automatic threshold-based review triggers
  - External skill searcher for finding similar skills and improvement suggestions
  - PostToolUse hook for automatic signal collection
  - Health visualization in dashboard with color-coded bars

- **Testing**
  - 63 tests across 10 test files
  - Unit tests for all shared modules
  - Integration test for full PRD-to-manifest pipeline
