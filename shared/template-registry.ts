import type { SkillTemplate } from "./types";

const TEMPLATES: SkillTemplate[] = [
  {
    name: "setup-pnpm-monorepo",
    description: "Initialize pnpm monorepo with workspace configuration",
    category: "infra",
    keywords: ["monorepo", "pnpm", "workspace"],
    variables: { packageManager: "pnpm" },
    skillContent: `---
name: setup-pnpm-monorepo
description: Initialize a pnpm monorepo with workspace configuration. Use when setting up a new monorepo project or adding workspace support to an existing project.
---

# Setup pnpm Monorepo

Create a pnpm monorepo with proper workspace configuration.

## Steps
1. Initialize root package.json with \`packageManager\` field
2. Create \`pnpm-workspace.yaml\` with packages glob
3. Create shared tsconfig.base.json
4. Add common scripts (build, test, lint) to root
5. Create first workspace package as template
`,
  },
  {
    name: "configure-typescript-strict",
    description: "Setup TypeScript with strict mode and modern configuration",
    category: "infra",
    keywords: ["typescript", "tsconfig", "strict"],
    variables: { strict: "true" },
    skillContent: `---
name: configure-typescript-strict
description: Configure TypeScript with strict mode, modern module resolution, and best-practice compiler options. Use when setting up TypeScript in a new project or tightening an existing config.
---

# Configure TypeScript Strict

Set up TypeScript with strict mode and modern defaults.

## Steps
1. Create/update tsconfig.json with strict: true
2. Set module: ESNext, moduleResolution: bundler
3. Enable all strict flags (noUncheckedIndexedAccess, exactOptionalPropertyTypes)
4. Configure path aliases if monorepo
5. Add tsconfig.build.json for production builds
`,
  },
  {
    name: "setup-eslint-prettier",
    description: "Configure ESLint and Prettier for consistent code style",
    category: "infra",
    keywords: ["eslint", "prettier", "linting", "formatting"],
    variables: {},
    skillContent: `---
name: setup-eslint-prettier
description: Configure ESLint and Prettier for consistent code formatting and linting. Use when setting up code quality tools in a new project.
---

# Setup ESLint + Prettier

Configure ESLint for linting and Prettier for formatting.

## Steps
1. Install eslint, prettier, and integration plugins
2. Create eslint.config.js with recommended rules
3. Create .prettierrc with project conventions
4. Add lint and format scripts to package.json
5. Configure VS Code settings for auto-fix on save
`,
  },
  {
    name: "setup-testing-framework",
    description: "Configure testing framework with common patterns",
    category: "infra",
    keywords: ["testing", "jest", "vitest", "test"],
    variables: { framework: "vitest" },
    skillContent: `---
name: setup-testing-framework
description: Set up a testing framework with sensible defaults, coverage reporting, and common test utilities. Use when adding testing to a project.
---

# Setup Testing Framework

Configure a modern testing framework with coverage.

## Steps
1. Install test framework and dependencies
2. Create config file with coverage thresholds
3. Add test utilities (setup files, custom matchers)
4. Create example test demonstrating patterns
5. Add test scripts to package.json
`,
  },
  {
    name: "create-rest-api-endpoint",
    description: "Create a REST API endpoint with validation and error handling",
    category: "backend",
    keywords: ["rest", "api", "endpoint", "express", "fastify"],
    variables: {},
    skillContent: `---
name: create-rest-api-endpoint
description: Create REST API endpoints with input validation, error handling, and consistent response format. Use when building or extending an API.
---

# Create REST API Endpoint

Build a REST endpoint following project conventions.

## Steps
1. Define route with HTTP method and path
2. Add input validation schema
3. Implement handler with error boundaries
4. Add response type definitions
5. Write integration tests
6. Add to API router
`,
  },
  {
    name: "setup-docker",
    description: "Create Dockerfile and docker-compose for local development",
    category: "devops",
    keywords: ["docker", "dockerfile", "container", "docker-compose"],
    variables: {},
    skillContent: `---
name: setup-docker
description: Create Dockerfile and docker-compose.yml for containerized development and deployment. Use when containerizing an application.
---

# Setup Docker

Create Docker configuration for the project.

## Steps
1. Create multi-stage Dockerfile (dev + production)
2. Create docker-compose.yml for local development
3. Add .dockerignore
4. Configure health checks
5. Add docker scripts to package.json
`,
  },
  {
    name: "setup-ci-github-actions",
    description: "Configure GitHub Actions CI/CD pipeline",
    category: "devops",
    keywords: ["ci", "cd", "github actions", "pipeline", "ci/cd"],
    variables: {},
    skillContent: `---
name: setup-ci-github-actions
description: Set up GitHub Actions workflows for CI/CD with test, lint, build, and deploy stages. Use when adding continuous integration to a project.
---

# Setup GitHub Actions CI

Create CI/CD pipeline with GitHub Actions.

## Steps
1. Create .github/workflows/ci.yml
2. Add test, lint, type-check jobs
3. Configure caching for node_modules
4. Add build job with artifact upload
5. Add branch protection rules recommendation
`,
  },
  {
    name: "add-authentication",
    description: "Add authentication with JWT or session-based auth",
    category: "backend",
    keywords: ["auth", "authentication", "jwt", "login", "session"],
    variables: {},
    skillContent: `---
name: add-authentication
description: Implement authentication with JWT tokens, session management, and secure password handling. Use when adding user authentication to an application.
---

# Add Authentication

Implement secure authentication.

## Steps
1. Create auth middleware
2. Implement login/register endpoints
3. Add JWT token generation and validation
4. Create refresh token flow
5. Add password hashing with bcrypt
6. Write auth integration tests
`,
  },
  {
    name: "setup-database",
    description: "Configure database connection with ORM/query builder",
    category: "backend",
    keywords: ["database", "db", "prisma", "drizzle", "sql", "postgres", "mongodb"],
    variables: {},
    skillContent: `---
name: setup-database
description: Configure database connection, schema management, and migrations. Use when adding database support to a project.
---

# Setup Database

Configure database with schema management.

## Steps
1. Install database driver and ORM/query builder
2. Create connection configuration
3. Define initial schema/models
4. Create migration system
5. Add seed script for development data
6. Write connection health check
`,
  },
  {
    name: "add-logging-monitoring",
    description: "Add structured logging and basic monitoring",
    category: "optimization",
    keywords: ["logging", "monitoring", "observability", "logs"],
    variables: {},
    skillContent: `---
name: add-logging-monitoring
description: Add structured logging with levels, request tracing, and basic health monitoring. Use when adding observability to a project.
---

# Add Logging & Monitoring

Implement structured logging and monitoring.

## Steps
1. Create logger utility with levels (debug, info, warn, error)
2. Add request ID tracing middleware
3. Implement health check endpoint
4. Add request/response logging
5. Configure log output format (JSON for production)
`,
  },
];

export function findTemplate(skillName: string, description: string): SkillTemplate | null {
  const lowerName = skillName.toLowerCase();
  const lowerDesc = description.toLowerCase();
  const combined = `${lowerName} ${lowerDesc}`;

  // Direct name match
  const exactMatch = TEMPLATES.find((t) => t.name === lowerName);
  if (exactMatch) return exactMatch;

  // Keyword match — need at least 2 keyword hits for confidence
  let bestMatch: SkillTemplate | null = null;
  let bestScore = 0;

  for (const template of TEMPLATES) {
    const hits = template.keywords.filter((kw) => combined.includes(kw)).length;
    const score = hits / template.keywords.length;
    if (hits >= 2 && score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  return bestMatch;
}

export function getAllTemplates(): SkillTemplate[] {
  return [...TEMPLATES];
}

export function getTemplateNames(): string[] {
  return TEMPLATES.map((t) => t.name);
}
