# Football Life

Football Life is a luck-based football career simulation web game built with Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, Prisma, and Supabase. 

Players draft a Squad XI of 11 fictional career players via setup wheels and an interactive year-by-year career simulation loop (stats update wheels, transfers, cup standings, Ballon d'Or, and national team tournaments), competing to build the highest-rated squad.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui + Framer Motion
- **ORM & DB**: Prisma ORM + Supabase PostgreSQL
- **State Management**: Zustand (UI-only state) + TanStack Query (server state)
- **Testing**: Vitest (unit/component) + Playwright (E2E)

## Commands

```bash
# Install dependencies
pnpm install

# Run Next.js development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Prisma database tasks
pnpm prisma generate
pnpm prisma db push
pnpm prisma db seed

# Run tests
pnpm test          # Vitest unit & component tests
pnpm test:e2e      # Playwright E2E tests
pnpm lint          # Next.js linting
```

For detailed guides, please refer to the documents in the `docs/` folder:

- `docs/Football_Life_Project_Planning_Document.md` â€” Project planning and roadmap
- `docs/game-design.md` â€” In-depth gameplay flow, wheel weights, and simulation rules
- `docs/FOOTBALL_LIFE_PROJECT_WIKI.md` â€” Master project wiki & concepts glossary
- `docs/architecture.md` â€” Architecture layer boundaries and truth models
- `docs/source-code-architecture-guide.md` â€” Code conventions, patterns, and structure guide
- `docs/state-management.md` â€” Zustand vs TanStack Query state boundaries and data flows
- `docs/api-integration.md` â€” Server Actions, API Route Handlers, and Zod schemas
- `docs/modal-agent-guide.md` â€” Dialog and confirm modal implementation patterns
- `docs/module-boundaries.md` â€” Feature boundaries and dependency graph
- `docs/environment-variables.md` â€” Environment configuration rules
- `docs/ai-agent-rules.md` â€” AI agent rules and constraints

