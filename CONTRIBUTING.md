# Contribuer à Shimmer

Merci d'envisager de contribuer. Ce document décrit le workflow attendu pour proposer du code, signaler un bug ou suggérer une feature.

## Code de conduite

Soyez respectueux, factuel, et concis. Les revues sont sur le code, pas sur les personnes.

## Prérequis

- Node 22+
- pnpm 9+
- PostgreSQL local ou accès à une instance dédiée
- Redis local
- Ollama avec `qwen2.5:3b` ou clé Claude API

## Setup

```bash
git clone <repo> shimmer && cd shimmer
pnpm install
cp .env.example .env
# Renseigner DATABASE_URL, REDIS_URL, LLM_PROVIDER, CLAUDE_API_KEY si besoin
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Workflow

1. **Branche** : à partir de `main`, créer `feat/<topic>`, `fix/<topic>`, `refactor/<topic>`, `docs/<topic>`.
2. **TDD** : test d'abord, implémentation ensuite. Couverture cible 80%.
3. **Commit** : conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`). Une intention par commit.
4. **PR** : décrit le problème, la solution, et le test plan. Lier l'issue.

## Conventions

### TypeScript

- Mode strict obligatoire (pas de `any` sans justification commentée).
- Préférer les fonctions pures et le pattern immuable (jamais muter un objet, retourner une nouvelle copie).
- Pas de mutation in-place. `update(obj, k, v)` plutôt que `obj[k] = v`.

### Organisation fichiers

- Beaucoup de petits fichiers > peu de gros. 200 à 400 lignes typique, 800 max.
- Découpe par feature/domaine, pas par type.

### Erreurs

- Gérer explicitement à chaque niveau.
- Messages utilisateur lisibles côté UI, logs détaillés côté serveur.
- Jamais avaler une erreur en silence.

### Sécurité

Avant chaque commit, vérifier que :

- Aucun secret dans le code (clés API, mots de passe, tokens).
- Toute entrée utilisateur est validée (schema-based).
- Requêtes SQL paramétrées (Prisma le fait pour vous).
- Rate limiting sur les endpoints publics.
- Les messages d'erreur ne fuitent pas d'info sensible.

Vulnérabilité ? Voir [SECURITY.md](SECURITY.md).

### Style

- Pas de tiret cadratin (em dash) dans le contenu rédigé.
- Pas d'emoji dans le code ou les docs sauf demande explicite.
- Commentaires uniquement quand le *pourquoi* n'est pas évident. Le *quoi* doit ressortir des noms.

## Tests

```bash
pnpm test                 # vitest run
pnpm test --watch         # watch mode
pnpm test cross-sell      # filtrer par nom
```

Tout PR qui touche du code métier doit ajouter ou mettre à jour des tests.

## Type-check et lint

```bash
pnpm -r typecheck         # tsc --noEmit dans tous les packages
pnpm lint                 # eslint
```

## Review

- Toute PR passe par une review.
- Issues CRITICAL et HIGH bloquent le merge.
- Issues MEDIUM à corriger si possible avant merge.
- LOW et NIT en suivi.

## Signaler un bug

Ouvrir une issue avec :

- Étapes pour reproduire (minimal repro idéalement).
- Comportement attendu vs observé.
- Version (commit SHA), OS, version Node.
- Logs pertinents (caviarder les secrets).

## Proposer une feature

Ouvrir une issue `feature request` qui décrit :

- Le problème utilisateur (pas la solution).
- Pourquoi maintenant.
- Alternatives envisagées.
- Impact estimé sur l'architecture existante.

Pour les features majeures, ouvrir une discussion en amont avant d'écrire du code.

## Documentation

Si votre PR change le comportement public (API, SDK, config), mettre à jour :

- `docs/openapi.yaml` pour les endpoints
- `README.md` si la surface visible change
- `CHANGELOG.md` sous `[Unreleased]`
- Le doc pertinent dans `docs/` (ARCHITECTURE, CROSS-SELL, QUICKSTART)
