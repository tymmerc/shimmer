<div align="center">

# Shimmer

**Le vendeur IA qui parle comme un humain, recommande comme un commercial, et mesure son chiffre.**

[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.x-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-121%20passing-3fb950)](#tests)
[![License](https://img.shields.io/badge/license-Proprietary-blue)](LICENSE)

[Demo live](https://tymmerc.eu/shimmer/) · [Cross-sell](https://tymmerc.eu/shimmer/cross-sell-demo.html) · [Dashboard](https://tymmerc.eu/shimmer/cross-sell-dashboard.html) · [Admin](https://tymmerc.eu/shimmer/cross-sell-admin.html) · [API docs](https://tymmerc.eu/shimmer/docs.html)

</div>

---

## En une ligne

Un client tape "un truc pour les poils de mon chat" sur la boutique. Shimmer comprend l'intention, pose une question si utile, propose le bon produit, puis enchaîne avec un cross-sell qui dit *pourquoi* l'ajout fait sens. Chaque interaction est tracée jusqu'à l'encaissement.

## Ce que ça résout

Les moteurs de recherche e-commerce comprennent les mots, pas les besoins. Les blocs "vous aimerez aussi" recommandent au hasard et ne mesurent rien. Shimmer fait les deux et attribue le chiffre.

| Feature | Ce qu'elle fait |
|---|---|
| **Vendeur IA** | Comprend une requête floue, qualifie en 1 ou 2 questions, recommande, gère les objections (trop cher, pas adapté, comparaison). |
| **Cross-sell narratif** | Pour chaque produit du catalogue, génère 4 à 6 picks avec un rôle (complément, alternative, premium, accessoire) et une phrase qui justifie l'ajout. |
| **Attribution €** | Suit le funnel impression → clic → vue cible → ajout panier → achat. Reporte le CA réellement attribuable au vendeur IA. |
| **Triage mail** | Catégorie, urgence, sentiment. Crée un ticket SAV si réclamation. Brouillon validable par l'humain. |
| **Collecte d'avis** | Demande post-livraison, publication automatique des bons, modération des moyens, alerte SAV sur les mauvais. |
| **Admin marchand** | UI pour piloter les overrides cross-sell (forcer un pick, exclure un produit, réécrire une raison) sans toucher au JSON. |

## Pourquoi c'est différent

- **Algo + LLM, pas LLM-only.** Le moteur cross-sell tourne en pur algorithmique par défaut (catégorie, prix, marque, signaux). Le LLM est optionnel pour réécrire les justifications. Pas de coût d'inférence par requête.
- **Narratif, pas un grid de cards.** Chaque pick a un rôle et une raison rédigée. Le client lit "Pour finir la cave : un vin de garde 5 ans" au lieu de "vous aimerez aussi".
- **Mesuré bout à bout.** Pas de "vues" abstraites : on suit l'utilisateur via session, on rattache l'achat au pick affiché, on rend des € attribués.
- **Multi-tenant natif.** Chaque marchand a son catalogue, ses overrides, ses analytics. Isolation par `store_id`.

## Stack

```
Express 4.21 + TypeScript 5.7 strict
Prisma 6.4 (PostgreSQL)
Redis (BullMQ) pour les jobs et cache
Claude API + fallback Ollama qwen2.5
FastAPI sidecar ONNX pour les embeddings (multilingual-e5)
esbuild pour le SDK (IIFE + CJS + ESM)
Vitest 2.x
```

## Architecture

```
            ┌──────────────────┐
            │   Boutique web   │
            │   (SDK <30kb)    │
            └────────┬─────────┘
                     │
            ┌────────▼─────────┐
            │      Nginx       │
            └────────┬─────────┘
                     │
        ┌────────────▼────────────┐
        │   API Express :3003     │
        │  (multi-tenant via      │
        │   Bearer api-key)       │
        └──┬───────┬───────┬──────┘
           │       │       │
    ┌──────▼──┐ ┌──▼───┐ ┌─▼────────┐
    │Postgres │ │Redis │ │ Ollama / │
    │ :5434   │ │:6381 │ │ Claude   │
    └─────────┘ └──────┘ └──────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Embedding sidecar  │
                    │ FastAPI ONNX :8100 │
                    └────────────────────┘
```

Détails dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Démarrage rapide

Prérequis : Node 22+, pnpm 9+, PostgreSQL, Redis, Ollama (ou clé Claude).

```bash
git clone <repo> shimmer && cd shimmer
pnpm install

cp .env.example .env
# Renseigner DATABASE_URL, REDIS_URL, LLM_PROVIDER, CLAUDE_API_KEY si besoin

pnpm db:migrate
pnpm db:seed

pnpm build
pnpm start              # API sur :3003
pnpm workers            # workers BullMQ (autre terminal)
```

Onboarding marchand pas à pas dans [docs/QUICKSTART.md](docs/QUICKSTART.md).

## API

OpenAPI 3.0.3 complet : [docs/openapi.yaml](docs/openapi.yaml). Rendu ReDoc en ligne : [docs.html](https://tymmerc.eu/shimmer/docs.html).

Toutes les routes requièrent `Authorization: Bearer <api-key>`.

| Surface | Routes principales |
|---|---|
| **Vendeur IA** | `POST /api/search/assist` |
| **Catalogue** | `POST /api/catalog/import` · `GET /api/catalog/stats` |
| **Univers** | `POST /api/universe/generate` · `GET /api/universe` |
| **Cross-sell** | `POST /api/cross-sell/precompute` · `GET /api/cross-sell/:productId` · `POST /api/cross-sell/events` · `GET /api/cross-sell/analytics` |
| **Marchand** | `GET /api/stores/me/config` · `PATCH /api/stores/me/config` |
| **Mail** | `POST /api/mail/classify` |
| **Avis** | `POST /api/reviews/submit` |

### Exemple : recherche conversationnelle

```bash
curl -X POST https://tymmerc.eu/shimmer/api/search/assist \
  -H "Authorization: Bearer test-api-key" \
  -H "Content-Type: application/json" \
  -d '{"message": "aspirateur poils de chat"}'
```

### Exemple : cross-sell sur une page produit

```bash
curl https://tymmerc.eu/shimmer/api/cross-sell/PRD-123 \
  -H "Authorization: Bearer test-api-key"
```

## SDK

```html
<script src="https://tymmerc.eu/shimmer/sdk/shimmer-sdk.min.js"></script>
<script>
  Shimmer.init({
    apiUrl: 'https://tymmerc.eu/shimmer',
    apiKey: 'sk_...',
    storeId: 1
  })

  // Vendeur IA
  const result = await Shimmer.assistant.chat("aspirateur poils de chat")

  // Cross-sell auto sur la page produit
  Shimmer.crossSell.renderInto('#xsell', { productId: 'PRD-123' })

  // Attribution (à appeler au moment du paiement)
  Shimmer.crossSell.trackPurchase({ productId: 'PRD-123', amount: 49.90 })
</script>
```

Le SDK tient sous 30kb gzip. Il utilise `IntersectionObserver` pour les impressions et `sendBeacon` pour les events, donc aucun impact perçu sur le LCP.

## Cross-sell : comment ça marche

1. **Précompute.** Pour chaque produit du catalogue, on calcule offline 4 à 6 picks. Heuristique : même catégorie ou catégorie complémentaire (ex : enceinte → pied d'enceinte), tranche de prix cohérente, marque, signaux d'achat conjoint si dispo.
2. **Rôle.** Chaque pick est typé (`complement`, `alternative`, `premium`, `accessory`). Le rôle dicte la phrase de justification.
3. **Justification.** Phrases variées par rôle, vocabulaire adapté au vertical (vins, luminaires, mode, etc.). Optionnellement réécrites par LLM pour le ton du marchand.
4. **Overrides marchand.** Le marchand peut forcer un pick, en exclure un, ou réécrire une raison via l'UI admin. Stocké dans `cross_sell_rules` de la config store.
5. **Attribution.** Au render : impression. Au clic : event + sauvegarde d'une intention en localStorage (TTL 30 min). À la vue du produit cible : event. À l'achat : on relit les intentions et on attribue le CA.

Détails dans [docs/CROSS-SELL.md](docs/CROSS-SELL.md).

## Structure du repo

```
shimmer/
├── apps/
│   ├── api/                 Express API (TypeScript)
│   └── showcase/            HTML statique (demo, dashboard, admin, docs)
├── packages/
│   ├── core/                Prisma, client LLM, Redis, types partagés
│   ├── smart-search/        Recherche 3 niveaux
│   ├── chatbot/             SAV / escalation
│   ├── mail-engine/         Classification emails
│   └── reviews/             Collecte et analyse d'avis
├── sdk/                     Widget JavaScript (esbuild)
├── embedding-sidecar/       FastAPI Python (embeddings ONNX)
├── docs/                    ARCHITECTURE, CROSS-SELL, QUICKSTART, openapi.yaml
├── onboarding-tests/        Audit modularité (frictions, P0/P1/P2)
└── n8n-workflows/           6 workflows d'automatisation
```

## Tests

121 tests Vitest passants, couvrant :

- Auto-extraction de catalogue (XSS, unicode, injection, duplications)
- Cross-sell : compactProduct, validateLLMResponse anti-hallucination, applyRules (force/exclude/reason override), detectVertical, fallback algorithmique
- Smart-search : 3 types (exact, qualification, similarité), gestion historique
- Brand voice et tone overrides
- Multi-tenant : isolation par store_id

```bash
pnpm test               # tous les tests
pnpm test --watch       # mode watch
```

## Roadmap

Voir [docs/ROADMAP.md](docs/ROADMAP.md). En cours :

- FSM 7 états avec persistance DB pour la session vendeur
- E2E Playwright sur les parcours critiques
- Auth dashboard admin durcie (actuellement gating simple)
- Bench cross-sell sur 3 verticaux supplémentaires

## Sécurité

Politique et processus de remontée dans [SECURITY.md](SECURITY.md).

## Contribuer

Workflow, conventions et review process dans [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Propriétaire. Voir [LICENSE](LICENSE).

Copyright (c) 2026 Tym Mercier.
