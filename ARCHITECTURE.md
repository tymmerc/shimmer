# Shimmer — Architecture Technique

**Version** : 1.0
**Date** : 2026-03-12

---

## 1. Vue d'ensemble

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (Lovable)                   │
│          Dashboard + SDK widgets intégrés             │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS (nginx reverse proxy)
                       ▼
┌─────────────────────────────────────────────────────┐
│                   apps/api (Express)                  │
│                   Port 3003                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Search   │ │ Chat     │ │ Mail     │ │Analytics│ │
│  │ Routes   │ │ Routes   │ │ Routes   │ │ Routes  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
└───────┼────────────┼────────────┼────────────┼──────┘
        ▼            ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌───────────┐
│ smart-search │ │ chatbot  │ │mail-engine│   packages/
│              │ │          │ │           │
│ BM25         │ │ SAV      │ │ Classify  │
│ Embeddings   │ │ Escalate │ │ Draft     │
│ Qualify      │ │ Context  │ │ Queue     │
│ Score        │ │          │ │           │
│ StateMachine │ │          │ │           │
└──────┬───────┘ └────┬─────┘ └─────┬─────┘
       │              │              │
       ▼              ▼              ▼
┌─────────────────────────────────────────┐
│            packages/core                 │
│  Claude Client │ Prisma │ Redis │ Types │
└───────┬────────────┬─────────┬──────────┘
        │            │         │
        ▼            ▼         ▼
┌──────────┐  ┌──────────┐  ┌───────┐
│ Claude   │  │PostgreSQL│  │ Redis │
│ API      │  │ :5434    │  │ :6381 │
└──────────┘  └──────────┘  └───────┘

┌─────────────────┐     ┌─────────────┐
│ Embedding       │     │ BullMQ      │
│ Sidecar         │     │ Workers     │
│ (FastAPI/ONNX)  │     │ (feedback,  │
│ POST /embed     │     │  reindex,   │
│                 │     │  extract)   │
└─────────────────┘     └─────────────┘
```

---

## 2. Stack technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Runtime | Node.js | 22 |
| Langage | TypeScript (strict mode) | 5.x |
| Framework API | Express | 4.x |
| ORM | Prisma | 6.x |
| IA (LLM) | Claude API via @anthropic-ai/sdk | claude-sonnet-4-20250514 |
| Embeddings | multilingual-e5-base (ONNX INT8) | via FastAPI sidecar |
| Vector search | hnswlib-node (ou usearch/vectra) | 3.x |
| Base de données | PostgreSQL | 16 |
| Cache / Queue | Redis + BullMQ | 7 / 5.x |
| Validation | Zod | 3.x |
| Logging | Pino | 9.x |
| Build (packages) | tsup | latest |
| Build (dev) | tsx | latest |
| Build (SDK) | esbuild | 0.24.x |
| Tests | Vitest | 2.x |
| Monorepo | pnpm workspaces | 9.x |
| Conteneurs | Docker Compose | 2.32.4 |
| Reverse proxy | Nginx | existant sur le serveur |

---

## 3. Structure du monorepo

```
/opt/ecommerce-automation/
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
│
├── apps/
│   └── api/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                 # Entrypoint Express
│           ├── config.ts                # Validation env (zod)
│           ├── middleware/
│           │   ├── auth.ts              # API key → store lookup
│           │   ├── error-handler.ts     # Pino structured errors
│           │   └── rate-limiter.ts      # Redis-backed rate limit
│           ├── routes/
│           │   ├── search.ts
│           │   ├── taxonomy.ts
│           │   ├── pipeline.ts
│           │   ├── chat.ts
│           │   ├── mail.ts
│           │   ├── analytics.ts
│           │   └── stores.ts
│           └── workers/
│               ├── feedback-processor.ts
│               ├── index-rebuilder.ts
│               ├── usage-extractor.ts
│               └── corpus-enricher.ts
│
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── claude-client.ts         # Anthropic SDK wrapper
│   │       ├── types.ts                 # Interfaces partagées
│   │       ├── redis.ts                 # ioredis singleton
│   │       └── prisma/
│   │           ├── schema.prisma        # Schéma complet
│   │           └── seed.ts              # 50 produits mock
│   │
│   ├── smart-search/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── bm25.ts                  # BM25 custom
│   │       ├── embeddings.ts            # Client sidecar HTTP
│   │       ├── vector-index.ts          # Hnswlib wrapper + persistance disque
│   │       ├── hybrid-search.ts         # Orchestrateur 3 étapes
│   │       ├── search-types.ts          # Détection TYPE 1/2/3/hybride
│   │       ├── similarity.ts            # Distance pondérée, 5 sous-cas
│   │       ├── taxonomy.ts              # Gestion taxonomie usages
│   │       ├── qualification.ts         # Questions, déduction, scoring
│   │       ├── scoring.ts               # Pipeline scoring multi-sources
│   │       ├── budget.ts                # Parsing budget, percentiles
│   │       └── state-machine.ts         # FSM 7 états
│   │
│   ├── chatbot/
│   │   └── src/
│   │       ├── index.ts
│   │       ├── sav-assistant.ts
│   │       ├── escalation.ts
│   │       └── context-builder.ts
│   │
│   └── mail-engine/
│       └── src/
│           ├── index.ts
│           ├── classifier.ts
│           ├── draft-generator.ts
│           └── queue-processor.ts
│
├── sdk/
│   ├── package.json
│   └── src/
│       └── embed.ts
│
├── embedding-sidecar/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app.py
│   └── download_model.py
│
├── n8n-workflows/
│   ├── email-triage.json
│   └── README.md
│
├── data/
│   └── indexes/                         # Index persistés (git-ignoré)
│       ├── bm25.json
│       ├── vectors.idx
│       └── checksum.txt
│
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    └── CONVENTIONS.md
```

---

## 4. Base de données (PostgreSQL)

### 4.1 Schéma relationnel

```
stores ──< products ──< product_attributes
  │            │──< product_variants
  │            │──< product_usages >── usage_taxonomy
  │            │──< order_items >── orders ──< shipments
  │            │                      │──< sav_requests
  │            │                      └── customers
  │            └──< alerts
  │
  ├──< search_sessions ──< conversation_state
  │        └──< learning_feedback
  ├──< chat_sessions
  ├──< mail_queue
  ├──< analytics_events
  ├──< platforms ──< sync_logs
  └──< faq
```

### 4.2 Tables principales

Voir le plan d'implémentation (section 1.2.1) pour la définition complète de chaque table.

Points clés :
- **Multi-tenant** : quasi toutes les tables ont un `store_id` FK vers `stores`
- **Enums** : SearchType (EXACT/FUNCTIONAL/SIMILARITY/HYBRID), ConversationState (7 états), MailCategory (8 catégories), MailStatus (PENDING/APPROVED/REJECTED/SENT)
- **Json** : specs produit, contexte conversation, messages chat, résultats recherche, config store
- **Index** : sur tous les FK, sur email/sku (unique), sur created_at DESC pour les requêtes analytics

---

## 5. Flux de données

### 5.1 Recherche (flux principal)

```
Client query
    │
    ▼
[Détection type] ─── TYPE 1 ──→ Fuzzy matching → Score confiance → Upsell?
    │                                                                    │
    ├── TYPE 2 ──→ Stage 1 (BM25 <10ms)                                │
    │                  │                                                 │
    │                  ├─ score > 0.85 → Usage identifié ──────────┐    │
    │                  ├─ score 0.40-0.85 → Stage 2 (Embed <100ms) │    │
    │                  └─ score < 0.40 → Stage 2 (weak signal)     │    │
    │                                          │                    │    │
    │                              score > 0.70 → Usage identifié ─┤    │
    │                              score < 0.50 → Stage 3 (Claude) │    │
    │                                                    │          │    │
    │                                          Reformulation ───────┤    │
    │                                                               │    │
    ├── TYPE 3 ──→ Identifier référence → Attributs → Distance ────┤    │
    │                                                               │    │
    └── HYBRID ──→ TYPE 1 filtre + TYPE 2 scoring ─────────────────┤    │
                                                                    │    │
                                                                    ▼    ▼
                                                        [Qualification Engine]
                                                                    │
                                                            Score ≥ 70% → Recommander
                                                            Score 40-70% → 1-2 questions
                                                            Score < 40% → Qualification complète
                                                                    │
                                                                    ▼
                                                        [Scoring Pipeline]
                                                        score = usage × w_u + criteria × w_c + history × w_h
                                                                    │
                                                                    ▼
                                                        [Recommandation]
                                                        1-3 produits + argumentation besoin
```

### 5.2 Persistance des index

```
Démarrage API
    │
    ├── checksum(products.updated_at) == data/indexes/checksum.txt ?
    │       │
    │       YES → Charger bm25.json + vectors.idx depuis disque
    │       NO  → Rebuild complet depuis DB :
    │              1. Load tous produits actifs
    │              2. Build BM25 (tokenize name+desc+usages, compute IDF)
    │              3. POST /embed au sidecar pour tous les textes produits
    │              4. Build index hnswlib
    │              5. Persist sur disque + update checksum.txt
    │
    ▼
Index prêt en mémoire
```

Reindex périodique : BullMQ worker `index-rebuilder` toutes les 6h, ou on-demand via `POST /api/pipeline/score`.

---

## 6. Embedding Sidecar

Service Python séparé (FastAPI + ONNX Runtime) qui expose l'inférence d'embeddings.

**Endpoints :**
- `POST /embed` : `{ texts: string[] }` → `{ embeddings: float[][] }` (batch max 32)
- `GET /health` : `{ status: "ok", model: "multilingual-e5-base", dimensions: 768 }`

**Modèle** : `multilingual-e5-base` quantisé INT8 via `optimum[onnxruntime]`
- ~100 MB sur disque
- Latence : ~20-50ms pour batch de 10 textes sur CPU
- Dimensions : 768

**Déploiement** : Docker container ou processus host Python selon espace disque disponible.

**Cache** : Les embeddings sont cachés dans Redis (TTL 1h, clé = hash du texte).

---

## 7. Infrastructure

### 7.1 Docker Compose

Services gérés par Docker Compose :
- `embedding-sidecar` : FastAPI ONNX (port 8100, interne)

Services externes (déjà en place) :
- `ecommerce-postgres` : PostgreSQL 16, port 5434, DB `ecommerce_db`
- `ecommerce-redis` : Redis 7, port 6381

L'API Express et les workers BullMQ tournent directement sur l'hôte (pas containerisés) pour le dev.

### 7.2 Nginx

```nginx
upstream shimmer_app {
    server 127.0.0.1:3003;
}

location /shimmer/ {
    proxy_pass http://shimmer_app;
    include /etc/nginx/snippets/proxy-params.conf;
    proxy_read_timeout 120s;
    proxy_connect_timeout 10s;
}
```

URL publique : `https://tymmerc.eu/shimmer/api/...`

### 7.3 Authentification

Chaque store a une `api_key` unique. L'API vérifie le header `Authorization: Bearer <api_key>` et résout le `store_id` associé. Toutes les requêtes sont scopées au store.

---

## 8. Claude API Integration

### 8.1 Client wrapper (`claude-client.ts`)

- SDK officiel `@anthropic-ai/sdk`
- Modèle par défaut : `claude-sonnet-4-20250514`
- Streaming : activé pour chat et reformulation recherche
- Retry : 3 attempts, backoff exponentiel (1s, 2s, 4s)
- Timeout : 30s par défaut
- Error handling : mapping vers types d'erreur internes (RateLimitError, OverloadedError, InvalidRequestError)

### 8.2 Usages Claude par module

| Module | Usage Claude | Streaming |
|--------|-------------|-----------|
| Smart Search | Reformulation Stage 3, enrichissement taxonomie | Non |
| Smart Search | Détection type recherche (si ambigu) | Non |
| Chatbot SAV | Réponses conversationnelles, tool use | Oui |
| Mail Engine | Classification email, génération brouillon | Non |
| Pipeline | Extraction usages depuis texte produit | Non |

---

## 9. BullMQ Workers

| Worker | Queue | Fréquence | Description |
|--------|-------|-----------|-------------|
| `feedback-processor` | `feedback` | Event-driven | Traite clicks/achats/retours → learning_feedback |
| `index-rebuilder` | `reindex` | 6h ou on-demand | Rebuild BM25 + vector index, persist sur disque |
| `usage-extractor` | `extract` | On-demand | Claude extrait usages depuis description produit |
| `corpus-enricher` | `enrich` | Quotidien | Ajoute queries validées au corpus BM25 + embeddings |

Tous les workers utilisent Redis (port 6381) via BullMQ. Démarrés avec l'API dans le même process (option `--workers` ou process séparé).

---

## 10. Sécurité

- HTTPS terminé par Nginx (certificats SSL existants)
- Helmet pour les headers de sécurité
- Rate limiting Redis-backed (100 req/min par store par défaut)
- API key obligatoire sur tous les endpoints (sauf health check)
- Données isolées par store (toutes les queries incluent `WHERE store_id = ?`)
- Variables sensibles dans `.env` (jamais committées)
- Validation stricte des inputs via Zod
