# Architecture Shimmer

État au 2026-05-12. Ce document décrit la structure interne, les flux de données critiques, et les décisions architecturales qui ont façonné le projet.

## Vue d'ensemble

Shimmer est une plateforme multi-tenant qui s'intègre sur les boutiques e-commerce existantes via un SDK navigateur (<30kb gzip) et une API REST. Le coeur du système se compose de cinq surfaces fonctionnelles : vendeur IA, cross-sell, mail triage, collecte d'avis, et analytics d'attribution.

```
                    ┌───────────────────────────┐
                    │     Boutique cliente      │
                    │   (n'importe quel CMS)    │
                    └────────────┬──────────────┘
                                 │ SDK JS
                                 ▼
                    ┌───────────────────────────┐
                    │           Nginx           │
                    │   tymmerc.eu/shimmer/*    │
                    └────────────┬──────────────┘
                                 │
                    ┌────────────▼──────────────┐
                    │    API Express :3003      │
                    │   middleware: auth        │
                    │   middleware: rate-limit  │
                    │   middleware: validation  │
                    └────┬────────┬────────┬────┘
                         │        │        │
            ┌────────────┘        │        └──────────────┐
            ▼                     ▼                       ▼
    ┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │  Postgres    │    │     Redis       │    │   LLM providers │
    │   :5434      │    │     :6381       │    │  Claude / Ollama│
    │              │    │  BullMQ jobs    │    │                 │
    │  20 tables   │    │  Cache hot      │    │                 │
    │  multi-tenant│    │  Sessions       │    │                 │
    └──────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                              ┌─────────▼──────────┐
                                              │ Embedding sidecar  │
                                              │ FastAPI ONNX :8100 │
                                              │ multilingual-e5    │
                                              └────────────────────┘
```

## Choix techniques structurants

### Monorepo pnpm workspaces

Tout le code applicatif vit dans un seul repo. Les packages internes (`packages/core`, `packages/smart-search`, etc.) sont versionnés ensemble. Cela permet :

- Le partage de types Prisma sans publication npm intermédiaire.
- Un refactor cross-package en un seul commit.
- Une CI unifiée.

Trade-off : la build doit être ordonnée. `pnpm -r build` respecte le DAG des dépendances.

### TypeScript strict partout

`strict: true` dans tous les `tsconfig.json`. Aucun `any` implicite. Les payloads d'endpoints sont validés via schemas avant d'atteindre le code métier, donc le code métier travaille sur des types narrowed.

### Prisma multi-tenant par store_id

Chaque table tenant-scoped porte un `storeId`. Le middleware `requireStore` résout le store depuis l'API key. Toute requête Prisma sur ces tables doit filtrer par `storeId`. Pas de row-level security PostgreSQL pour l'instant (coût opérationnel jugé trop élevé au stade actuel).

### LLM provider abstrait

`packages/core/src/llm/` expose `callLLM(prompt, opts)`. Trois implémentations :

- **Claude** : production, qualité haute, latence ~2s.
- **Ollama** : dev/fallback local, latence variable selon modèle.
- **Mock** : tests Vitest, déterministe.

Le provider est sélectionné via `LLM_PROVIDER` env. Aucune feature ne dépend strictement du LLM : tout chemin LLM a un fallback algorithmique.

### Embeddings via sidecar FastAPI

Les embeddings (multilingual-e5-base, ONNX) tournent dans un process Python séparé sur `:8100`. Raison : éviter de charger un modèle ONNX dans Node, garder l'API responsive, scaler l'embedding indépendamment.

## Flux de données critiques

### Vendeur IA

```
Client → SDK.chat("aspirateur poils de chat")
       → POST /api/search/assist
       → SmartSearch.classify(query)
            ├─ TYPE 1 (exact) : match SKU/nom
            ├─ TYPE 2 (qualification) : besoin de questions
            └─ TYPE 3 (similarité) : embeddings + reranking
       → Si TYPE 2 : génère question + critères connus
       → Si TYPE 1/3 : retourne 1 à 3 produits + rationale
       → SDK render bulle
```

État conversation : history client-side + knownCriteria envoyé à chaque tour. Pas de session DB pour l'instant (FSM persistante en roadmap).

### Cross-sell

```
Phase précompute (offline, par store)
─────────────────────────────────────
POST /api/cross-sell/precompute
  → Pour chaque produit:
     1. detectVertical(catalogue)  → drinks | lighting | fashion | generic
     2. candidates = similar(product, catalogue)  → top 12
     3. assignRoles(candidates, hints) → complement | alt | premium | accessory
     4. composeReason(role, vertical) → phrase narrative
        └─ ou LLM rewrite si CROSS_SELL_USE_LLM=1
     5. applyRules(picks, store.config.cross_sell_rules) → force/exclude/override
     6. cap à 6 picks max
  → Bulk insert dans ProductCrossSell

Phase live (boutique)
─────────────────────
GET /api/cross-sell/:productId
  → SELECT * FROM ProductCrossSell WHERE storeId AND productId
  → JOIN Product pour enrichir (nom, prix, image)
  → return picks

Phase attribution
─────────────────
Page produit chargée
  → impression event (IntersectionObserver)
  → POST /api/cross-sell/events { type: 'impression', ... }

Clic sur un pick
  → POST /api/cross-sell/events { type: 'click', ... }
  → SDK enregistre intent en localStorage (TTL 30 min)
       { productId, targetId, role, ts, sessionId }

Page produit cible chargée
  → SDK check intents matching
  → POST /api/cross-sell/events { type: 'view_target', ... }

Achat
  → SDK.crossSell.trackPurchase({ productId, amount })
  → Lit toutes les intents matching encore valides
  → POST /api/cross-sell/events { type: 'purchase', amount, ... }
  → Server attribue le CA à chaque pick origine
```

### Mail triage

```
Email reçu (webhook ou IMAP poll)
  → POST /api/mail/classify
  → LLM classify : { category, urgency, sentiment, isReclamation }
  → Si isReclamation : créer ticket SAV (workflow n8n)
  → Si sentiment négatif : alerter SAV
  → Générer brouillon de réponse (jamais envoyé sans humain)
  → Stocker dans table EmailMessage
```

### Collecte d'avis

```
Commande passée en statut livré (webhook)
  → Schedule job BullMQ "request-review" (delay 48h)
Worker exécute le job
  → Envoyer email/SMS avec lien review
Client soumet review
  → POST /api/reviews/submit
  → LLM analyse : { stars, sentiment, themes }
  → Si stars >= 4 : publication auto
  → Si stars 3 : modération humaine
  → Si stars <= 2 : alerte SAV + ticket
```

## Modèle de données

### Tables principales

| Table | Description |
|---|---|
| `Store` | Marchand. Porte `apiKey`, `config` (JSON: tone, voice, universe_overrides, cross_sell_rules). |
| `Product` | Catalogue. `storeId`, `productId` (ID marchand), `name`, `price`, `categoryPath`, `brand`, `specs` JSON, `embedding` vecteur. |
| `Universe` | Univers thématique auto-détecté (catégorie, marque, etc.). Porte les questions de qualification. |
| `ProductCrossSell` | Picks précomputés. `storeId`, `productId`, `targetId`, `role`, `reason`, `score`, `source`. |
| `CrossSellEvent` | Funnel events. `eventType`, `sessionId`, `position`, `metadata`. |
| `EmailMessage` | Mails classifiés. `category`, `urgency`, `sentiment`, `draftReply`. |
| `Review` | Avis collectés. `stars`, `themes`, `published`, `moderationStatus`. |
| `SavTicket` | Tickets SAV. `priority`, `assignedTo`, `status`. |

Voir [packages/core/src/prisma/schema.prisma](../packages/core/src/prisma/schema.prisma) pour le schéma complet.

### Indexes critiques

- `Product (storeId, productId)` unique
- `Product (storeId, categoryPath)` btree
- `ProductCrossSell (storeId, productId)` btree
- `CrossSellEvent (storeId, productId, createdAt)` btree
- `CrossSellEvent (sessionId, eventType)` btree pour l'attribution

## Sécurité

Détails dans [SECURITY.md](../SECURITY.md). Points clés :

- API keys hashées en DB
- Validation schema à chaque endpoint
- Rate-limit par store sur les endpoints lourds
- Validation anti-hallucination des outputs LLM
- Logs sans PII en clair

## Décisions notables (ADR-style)

### ADR-01 : Algo + LLM, pas LLM-only pour le cross-sell

**Contexte** : appeler le LLM à chaque page produit coûte cher et ajoute de la latence.

**Décision** : précomputer offline avec un algo déterministe, le LLM est optionnel pour réécrire les justifications.

**Conséquences** : qualité légèrement inférieure au LLM-only sur les justifications, mais coût d'inférence nul en runtime et latence stable.

### ADR-02 : Attribution côté client via localStorage

**Contexte** : tracker l'attribution cross-domain ou cross-session côté serveur impose un user-id stable, donc cookies tiers ou auth.

**Décision** : localStorage avec TTL 30 min, sessionId généré côté SDK, persisté 30 jours.

**Conséquences** : pas de cookies tiers à gérer, RGPD-friendly (pas de PII), mais on perd les attributions cross-device.

### ADR-03 : Embeddings dans un sidecar FastAPI

**Contexte** : charger un modèle ONNX dans Node bloque l'event loop pendant l'inférence.

**Décision** : process Python séparé, communication HTTP `:8100`.

**Conséquences** : un service de plus à gérer, mais l'API reste responsive et on peut scaler les embeddings indépendamment.

### ADR-04 : Multi-tenant par filtrage applicatif, pas RLS Postgres

**Contexte** : RLS Postgres exige des roles par tenant et complexifie le pooling.

**Décision** : middleware `requireStore` + filtrage `storeId` obligatoire dans chaque requête Prisma.

**Conséquences** : code applicatif plus discipliné requis, audit régulier des requêtes nécessaire. Trade simplicité opérationnelle contre rigueur de code.

## Points d'extension

- **Nouveau vertical cross-sell** : ajouter une entrée dans `CATEGORY_ROLE_HINTS` et `PHRASES_BY_ROLE` dans `apps/api/src/routes/cross-sell.ts`.
- **Nouveau provider LLM** : implémenter `LLMProvider` interface dans `packages/core/src/llm/`.
- **Nouveau type d'event d'attribution** : ajouter dans l'enum `CrossSellEventType` + handler côté SDK + agrégation côté analytics.
- **Nouvelle source de catalogue** : adapter `apps/api/src/routes/catalog.ts` (CSV, JSON, XML, Shopify API, etc.).

## Limites connues

- Pas de FSM persistante côté serveur pour les conversations vendeur IA (en roadmap).
- Pas de A/B testing intégré pour les variantes de raisons cross-sell.
- Dashboard admin protégé par gating simple, à durcir.
- Pas de support cross-device pour l'attribution.
- Pas de monitoring (Prometheus, Grafana) intégré au repo.
