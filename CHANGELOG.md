# Changelog

Toutes les modifications notables du projet sont documentées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
versionnage [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

### Added
- FSM 7 états avec persistance DB pour les sessions vendeur (en cours)
- E2E Playwright sur les parcours critiques (en cours)

## [0.4.0] - 2026-05-12

### Added
- **Cross-sell narratif**. Précompute par store, 4 à 6 picks par produit avec rôle (`complement`, `alternative`, `premium`, `accessory`) et justification rédigée.
- **Algorithme de fallback** sans LLM : détection de vertical (drinks, lighting, fashion, generic), hints de rôle par catégorie, phrasings variés. LLM optionnel via `CROSS_SELL_USE_LLM`.
- **Validation anti-hallucination** : `validateLLMResponse` rejette les IDs inventés par le LLM.
- **Attribution loop complète** : impression → clic → vue cible → ajout panier → achat. Intentions stockées en localStorage avec TTL 30 min, rattachées au paiement.
- **Dashboard analytics** (`/shimmer/cross-sell-dashboard.html`) : 5 KPI (impressions, clics, view-throughs, achats, CA attribué €).
- **Admin marchand** (`/shimmer/cross-sell-admin.html`) : UI pour overrides cross-sell (force, exclude, reason rewrite), liste produits, sticky save bar.
- **Demo cross-sell** (`/shimmer/cross-sell-demo.html`) : page produit mockée avec widget + bouton simulate purchase.
- **OpenAPI 3.0.3** : spec complète dans `docs/openapi.yaml`, rendu ReDoc sur `/shimmer/docs.html`.
- **SDK cross-sell** : `Shimmer.crossSell.{render, renderInto, fetch, trackProductView, trackPurchase}`. `IntersectionObserver` pour les impressions, `sendBeacon` pour les events.
- Endpoints : `POST /api/cross-sell/precompute`, `GET /api/cross-sell/:productId`, `POST /api/cross-sell/events`, `GET /api/cross-sell/analytics`.
- Models Prisma : `ProductCrossSell`, `CrossSellEvent`.
- Config store étendue : `cross_sell_rules` dans `PATCH /api/stores/me/config`.

### Fixed
- Bug `specs.specs` : la boucle d'auto-extract incluait la clé `specs`. Ajout aux `knownFields` + SQL cleanup sur 1128 produits.
- Tests cross-sell : "caps at 6 picks" (passer un rule no-op), "deduplicates same target_id" (raisons > 3 chars), "detects fashion vertical" (regex `\b(robe|jean)` au lieu de `\b(robe|jean)\b` pour matcher les pluriels).

### Tests
- +30 tests Vitest sur cross-sell (`compactProduct`, `validateLLMResponse`, `applyRules`, `detectVertical`, `algorithmicFallback`). Total 121 tests passants.

## [0.3.0] - 2026-04

### Added
- **Showcase rewrite V2** : éditorial minimaliste, PP Editorial New + Inter Tight + JetBrains Mono, Lenis smooth scroll + GSAP ScrollTrigger.
- **Brand voice overrides** : tone et voice par store, appliqués aux justifications.
- **Universe overrides** : un marchand peut réécrire les questions de qualification.

### Fixed
- P0/P1/P2 onboarding frictions : 13 frictions corrigées, score modularité 15/15 scénarios.

## [0.2.0] - 2026-03

### Added
- **Vendeur IA** : 3 types de recherche (exact, qualification, similarité).
- **Triage mail** : classification catégorie + urgence + sentiment, création ticket SAV.
- **Collecte d'avis** : demande post-livraison, publication automatique, modération.
- **6 workflows n8n** automatisés.
- **Auto-apprentissage catalogue** : génération univers + questions + mots-clés depuis CSV/JSON.

### Stack
- Express 4.21 + TypeScript 5.7 strict.
- Prisma 6.4 + PostgreSQL multi-tenant.
- BullMQ + Redis pour les jobs.
- Embedding sidecar FastAPI ONNX (multilingual-e5).
- Vitest 2.x.

## [0.1.0] - 2026-02

Premier prototype interne.

[Unreleased]: https://github.com/tymmercier/shimmer/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/tymmercier/shimmer/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/tymmercier/shimmer/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/tymmercier/shimmer/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/tymmercier/shimmer/releases/tag/v0.1.0
