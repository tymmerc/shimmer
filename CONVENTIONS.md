# Shimmer — Conventions de Code

**Version** : 1.0
**Date** : 2026-03-12

---

## 1. TypeScript

### 1.1 Configuration

- `strict: true` dans tous les tsconfig
- `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`
- Pas de `any` — utiliser `unknown` + type guards si nécessaire
- Pas de `as` casting sauf après validation Zod

### 1.2 Naming

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Fichiers | kebab-case | `hybrid-search.ts`, `claude-client.ts` |
| Classes | PascalCase | `ClaudeClient`, `SearchEngine` |
| Interfaces/Types | PascalCase | `SearchResult`, `ProductScore` |
| Fonctions | camelCase | `calculateScore`, `detectSearchType` |
| Constantes | UPPER_SNAKE_CASE | `MAX_QUESTIONS`, `BM25_K1` |
| Variables | camelCase | `queryScore`, `productUsages` |
| Enums Prisma | UPPER_SNAKE_CASE | `EXACT`, `FUNCTIONAL`, `SIMILARITY` |

### 1.3 Exports

- Chaque package exporte depuis `src/index.ts`
- Pas de `export default` — toujours des named exports
- Re-exporter les types depuis le barrel

### 1.4 Imports

- Imports internes au package : chemins relatifs `./`
- Imports entre packages : `@shimmer/core`, `@shimmer/smart-search`
- Imports externes : directement par nom de package

---

## 2. Structure des fichiers

### 2.1 Packages

Chaque package suit la structure :
```
packages/<name>/
├── package.json       # name: @shimmer/<name>
├── tsconfig.json      # extends: ../../tsconfig.base.json
└── src/
    ├── index.ts       # barrel exports
    └── ...
```

### 2.2 Routes API

Chaque fichier de route contient :
1. Le schéma Zod de validation (input + output)
2. Le handler Express
3. Le router exporté

```typescript
// routes/search.ts
import { Router } from 'express';
import { z } from 'zod';

const SearchInput = z.object({
  query: z.string().min(1).max(500),
  searchType: z.enum(['EXACT', 'FUNCTIONAL', 'SIMILARITY']).optional(),
  sessionToken: z.string().optional(),
});

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const input = SearchInput.parse(req.body);
    // ...
  } catch (err) {
    next(err);
  }
});

export { router as searchRouter };
```

---

## 3. Error Handling

### 3.1 Pattern

- Les packages retournent des `Result<T, E>` ou throw des erreurs typées
- L'API catch via le middleware `error-handler.ts`
- Jamais de try/catch silencieux
- Logger l'erreur avec Pino avant de répondre

### 3.2 Classes d'erreur

```typescript
class ShimmerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

// Exemples
class NotFoundError extends ShimmerError { /* 404 */ }
class ValidationError extends ShimmerError { /* 400 */ }
class AuthError extends ShimmerError { /* 401 */ }
class RateLimitError extends ShimmerError { /* 429 */ }
```

### 3.3 Réponses d'erreur API

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product with id 42 not found",
    "statusCode": 404
  }
}
```

---

## 4. Logging

- Logger : Pino (JSON structuré)
- Niveaux : `error`, `warn`, `info`, `debug`
- En production : `info` minimum
- Chaque requête loggée avec `requestId`, `storeId`, `duration`
- Les appels Claude loggés avec `model`, `tokens_in`, `tokens_out`, `duration_ms`

---

## 5. Tests

### 5.1 Framework

- Vitest pour tous les tests
- Fichiers de test : `*.test.ts` à côté du fichier testé
- Pas de dossier `__tests__` séparé

### 5.2 Priorité de test

1. **Smart Search** : BM25, scoring, qualification, state machine — tests unitaires obligatoires
2. **Claude Client** : retry, timeout, error handling — tests avec mock
3. **API routes** : tests d'intégration avec supertest
4. **Seed** : vérifier que le seed produit un état cohérent

### 5.3 Mocking

- Mocker les appels Claude API (pas d'appels réels en CI)
- Mocker le sidecar embedding (réponses pré-calculées)
- DB : utiliser la vraie DB Postgres en test (pas de mock DB)
- Redis : utiliser le vrai Redis en test

---

## 6. Git

### 6.1 Commits

Format : `type(scope): description`

Types : `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`

Scopes : `core`, `search`, `chatbot`, `mail`, `api`, `sdk`, `infra`

Exemples :
```
feat(search): implement BM25 custom indexer
fix(core): handle Claude API timeout correctly
docs: add ARCHITECTURE.md
```

### 6.2 Branches

- `main` : stable, déployable
- `feat/<name>` : nouvelles features
- `fix/<name>` : corrections

---

## 7. Variables d'environnement

Toutes les variables sont validées au démarrage par Zod dans `config.ts`. L'API refuse de démarrer si une variable obligatoire manque.

```env
# .env.example

# Database
DATABASE_URL=postgresql://ecommerce:PASSWORD@localhost:5434/ecommerce_db?schema=public

# Redis
REDIS_URL=redis://localhost:6381

# Claude API
CLAUDE_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-20250514

# Embedding sidecar
EMBEDDING_URL=http://localhost:8100

# API
API_PORT=3003
API_HOST=0.0.0.0
NODE_ENV=development

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

---

## 8. Prisma

- Schéma dans `packages/core/src/prisma/schema.prisma`
- Migrations : `pnpm -F core prisma migrate dev`
- Seed : `pnpm -F core prisma db seed`
- Client généré dans `node_modules/.prisma/client`
- Singleton Prisma exporté depuis `@shimmer/core`

---

## 9. Performances

### 9.1 Index

- BM25 : pré-calculer IDF au build, tokenizer avec stopwords FR/EN
- Vector : hnswlib avec `efConstruction=200`, `M=16`, `efSearch=50`
- Index persisté sur disque dans `data/indexes/`
- Checksum produits pour éviter rebuild inutile au démarrage

### 9.2 Cache Redis

| Clé | TTL | Usage |
|-----|-----|-------|
| `embed:<hash>` | 1h | Cache embeddings sidecar |
| `taxonomy:<storeId>` | 10min | Cache taxonomie en mémoire |
| `ratelimit:<storeId>:<ip>` | 1min | Rate limiting |

### 9.3 Requêtes DB

- Toujours `select` les champs nécessaires (pas de `select *`)
- Index sur tous les FK et champs de filtre fréquents
- Pagination cursor-based pour les listes (pas offset)

---

## 10. Packages npm internes

| Package | Nom npm | Description |
|---------|---------|-------------|
| `packages/core` | `@shimmer/core` | Claude client, Prisma, Redis, types |
| `packages/smart-search` | `@shimmer/smart-search` | Moteur de recherche |
| `packages/chatbot` | `@shimmer/chatbot` | Chatbot SAV |
| `packages/mail-engine` | `@shimmer/mail-engine` | Triage email |
