# Skill Registry — Bibliotech

## Project Skills (SDD)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| sdd-init | `/sdd-init` | Bootstrap SDD context |
| sdd-explore | `/sdd-explore <topic>` | Investigate ideas, read codebase |
| sdd-propose | `/sdd-propose <change>` | Create change proposals |
| sdd-spec | `/sdd-spec [change]` | Write delta specifications |
| sdd-design | `/sdd-design [change]` | Technical design documents |
| sdd-tasks | `/sdd-tasks [change]` | Implementation task breakdown |
| sdd-apply | `/sdd-apply [change]` | Implement code from tasks |
| sdd-verify | `/sdd-verify [change]` | Validate against specs |
| sdd-archive | `/sdd-archive [change]` | Close change, persist artifacts |

## Quality Gates

| Tool | Command | Config |
|------|---------|--------|
| Linter | `npm run lint` (backend), `eslint src` (frontend) | eslint.config.ts |
| Type Checker | `npm run typecheck` | tsconfig.json |
| Test Runner | `vitest run` | vitest.config.ts |
| Coverage | `vitest run --coverage` | vitest.config.ts |
| E2E | `npm run test:e2e` | playwright.config.ts |

## Stack

- **Backend**: Fastify + TypeScript + Prisma + SQLite
- **Frontend**: React 18 + Vite + TailwindCSS + Zustand + TanStack Query
- **Auth**: JWT + bcrypt
- **Testing**: Vitest (unit), Playwright (E2E stub)

## Conventions

- API validation: Zod schemas in `routes/*.ts`
- Error handling: `AppError` class with HTTP status codes
- Auth middleware: `requireAuth()`, `requireRole(roles[])`
- Database: Prisma ORM with soft deletes (`isActive`)
- Audit logging: `AuditLog` table for critical actions
- Frontend routing: React Router v6 with role-based guards
- State management: Zustand store + TanStack Query