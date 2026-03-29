# Contributing to Skill Forge

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone git@github.com:talitman/skill-forge.git
cd skill-forge

# Install bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Run tests
bun test

# Type check
bunx tsc --noEmit
```

## Project Structure

```
skill-forge/
├── skills/          # SKILL.md files (Claude Code skill definitions)
├── mcp-server/      # MCP server + dashboard
│   ├── server.ts    # Entry point (stdio MCP + HTTP/WS)
│   ├── state.ts     # Pipeline state manager
│   ├── tools/       # MCP tool handlers
│   └── dashboard/   # Browser-based real-time UI
├── shared/          # Core logic (all with tests)
│   ├── types.ts     # TypeScript types
│   ├── manifest.ts  # Manifest read/write
│   ├── document-parser.ts
│   ├── codebase-scanner.ts
│   ├── scope-classifier.ts
│   ├── dependency-resolver.ts
│   ├── template-registry.ts
│   ├── cost-classifier.ts
│   ├── signal-collector.ts
│   └── skill-searcher.ts
├── hooks/           # Claude Code hooks
└── tests/           # Integration tests
```

## How to Contribute

### Adding Skill Templates

Skill templates live in `shared/template-registry.ts`. To add a new template:

1. Add a `SkillTemplate` object to the `TEMPLATES` array
2. Include: `name`, `description`, `category`, `keywords`, `skillContent`, `variables`
3. Keywords are used for fuzzy matching — include at least 3 relevant terms
4. Run `bun test` to make sure nothing breaks

### Adding MCP Tools

1. Create a new handler in `mcp-server/tools/`
2. Register it in `mcp-server/server.ts` (import, tool schema, switch case)
3. Add tests if the tool has complex logic

### Modifying Shared Logic

All shared modules have test files (`*.test.ts`). Follow TDD:

1. Write the failing test first
2. Implement the change
3. Verify tests pass: `bun test`
4. Type check: `bunx tsc --noEmit`

### Updating Skills

Skills are markdown files in `skills/`. They define Claude's behavior, not code. When editing:

- Keep the YAML frontmatter `name` and `description` accurate
- The `description` field controls when the skill triggers — be specific
- Test the skill manually with Claude Code after changes

## Pull Request Process

1. Fork the repo and create a feature branch
2. Make your changes with tests
3. Run `bun test` and `bunx tsc --noEmit`
4. Submit a PR with a clear description of what and why
5. PRs require passing CI checks

## Code Style

- TypeScript strict mode
- No `innerHTML` in dashboard code — use safe DOM methods only
- Immutable data patterns for manifest operations
- Every shared module has a corresponding test file

## Reporting Issues

- Use GitHub Issues
- Include: what you expected, what happened, steps to reproduce
- For skill behavior issues, include the PRD or input that caused the problem
