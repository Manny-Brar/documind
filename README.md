# DocuMind

AI-Powered Document Search Platform - Search, query, and extract insights from your documents using natural language.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Vite + React 18 + TanStack Router + TanStack Query
- **Backend**: Fastify + tRPC
- **Database**: PostgreSQL + Prisma 6
- **UI**: Tailwind CSS + shadcn/ui
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env

# Generate Prisma client
pnpm --filter @documind/db db:generate

# Run database migrations (requires running PostgreSQL)
pnpm --filter @documind/db db:push

# Start development servers
pnpm dev
```

### Development Commands

```bash
# Start all apps in dev mode
pnpm dev

# Build all packages
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format code
pnpm format
```

## Project Structure

```
documind/
├── apps/
│   ├── web/          # React frontend (Vite)
│   └── api/          # Fastify + tRPC backend
├── packages/
│   ├── db/           # Prisma schema and client
│   ├── ui/           # shadcn/ui components
│   ├── shared/       # Shared types and Zod schemas
│   └── tsconfig/     # Shared TypeScript configs
├── turbo.json        # Turborepo configuration
└── pnpm-workspace.yaml
```

## License

Proprietary - Base Analytics Corporation
