# Shimmer — AI E-commerce Platform

> **REPRISE DE PROJET / NOUVELLE SESSION : lire d'abord `/opt/shimmer/HANDOFF.md`.**
> Il contient l'état complet (juin 2026), ce qui a été fait, ce qui reste, les URLs,
> les accès, les pièges de build/déploiement, et le contexte business (réunion investisseur).

## Stack
- **Monorepo**: pnpm 9.x workspaces
- **API**: Express 4.21 + TypeScript 5.7 (strict)
- **ORM**: Prisma 6.4 (PostgreSQL)
- **LLM**: Claude API (claude-sonnet-4-20250514), fallback Ollama qwen2.5:3b
- **Embeddings**: multilingual-e5-base via FastAPI sidecar (ONNX)
- **Queue**: BullMQ 5.x (Redis)
- **SDK**: esbuild (IIFE, CJS, ESM)
- **Tests**: Vitest 2.x

## Ports
| Service | Port |
|---------|------|
| API | 3003 |
| Embedding sidecar | 8100 |
| PostgreSQL | 5434 |
| Redis | 6381 |
| Ollama | 11434 |

## Commands
```bash
pnpm install              # Install deps
pnpm dev                  # API dev (tsx watch)
pnpm build                # Build all packages
pnpm test                 # Vitest
pnpm workers              # BullMQ workers
pnpm db:migrate           # Prisma migrate dev
pnpm db:seed              # Seed DB
pnpm db:studio            # Prisma Studio
```

## Systemd Services
- `shimmer-api` — API (via start-api.sh)
- `shimmer-workers` — BullMQ workers (reindex toutes les heures)
- `shimmer-embedding` — FastAPI sidecar (uvicorn)

## Structure
```
apps/api/          → Express API (port 3003)
apps/showcase/     → Static demo HTML
packages/core/     → Prisma, Claude client, types, Redis
packages/chatbot/  → SAV/escalation
packages/mail-engine/ → Email classification
packages/reviews/  → Review collection
packages/smart-search/ → BM25 + embeddings
sdk/               → Browser SDK
embedding-sidecar/ → Python FastAPI (port 8100)
n8n-workflows/     → 6 automation workflows
```

## DB
- PostgreSQL `ecommerce_db`, user `ecommerce`, port 5434
- Schema: `packages/core/src/prisma/schema.prisma`
- Multi-tenant (Store API key gating)

## Env
- `.env` à la racine (DATABASE_URL, REDIS_URL, API_PORT, LLM_PROVIDER, etc.)
- Ne jamais committer `.env` (secrets)

## Notes
- Node >=22.0.0 requis
- Le widget SDK doit rester subtil et non-intrusif
- LLM_PROVIDER=ollama en dev, claude en prod
