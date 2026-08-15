# Politique de sécurité

## Versions supportées

Seule la branche `main` reçoit les correctifs de sécurité. Les versions taggées antérieures ne sont pas maintenues.

## Signaler une vulnérabilité

**Ne pas ouvrir d'issue publique pour une faille de sécurité.**

Envoyer un mail à `tym.mercier@gmail.com` avec :

- Description de la vulnérabilité
- Étapes pour reproduire
- Impact estimé
- Version concernée (commit SHA si possible)
- Proof-of-concept minimal si pertinent

Vous recevez un accusé sous 72h. Un correctif est planifié sous 30 jours pour les vulnérabilités critiques, 90 jours pour le reste.

Une fois la faille corrigée et déployée, vous êtes crédité dans le CHANGELOG si vous le souhaitez.

## Périmètre

Dans le périmètre :

- API Express et tous ses endpoints (`/api/*`)
- SDK navigateur (`sdk/dist/*`)
- Embedding sidecar FastAPI
- Workers BullMQ
- Schéma de base de données (escalation de privilèges multi-tenant, leak cross-store)
- Pages admin et dashboard

Hors périmètre :

- DoS volumétrique (rate-limit applicatif présent, pas de protection L3/L4 prévue ici)
- Vulnérabilités dans les dépendances tierces sans démonstration d'impact exploitable sur Shimmer
- Auto-XSS nécessitant que l'utilisateur colle du JS dans la console
- Versions de Node, pnpm, PostgreSQL non supportées

## Bonnes pratiques internes

### Secrets

- Aucun secret dans le code source.
- `.env` jamais commité (présent dans `.gitignore`).
- Clés API marchand stockées hashées en DB (jamais en clair).
- Token Claude lu depuis `CLAUDE_API_KEY` à l'exécution, jamais loggé.

### Multi-tenant

- Toute requête est gated par `Authorization: Bearer <api-key>`.
- Le middleware `requireStore` résout le `store_id` et l'injecte dans la requête.
- Aucune route ne doit accepter un `store_id` en paramètre URL ou body sans recouper avec celui résolu par l'auth.
- Toute requête Prisma sur des tables tenant-scoped (Product, ProductCrossSell, CrossSellEvent, etc.) doit filtrer par `storeId`.

### Inputs

- Validation via schemas (zod ou équivalent) à chaque entrée d'endpoint.
- Aucune concaténation SQL : Prisma uniquement, ou `$queryRaw` paramétré.
- Catalogue importé : filtrage XSS, normalisation unicode, dédup IDs, troncature des champs longs.

### LLM

- Output validé (`validateLLMResponse` côté cross-sell) avant d'être utilisé.
- Pas d'exécution d'instructions issues d'un output LLM.
- Prompt injection : les inputs marchands/clients sont préfixés et délimités.

### Rate-limiting

- Endpoints publics protégés via middleware express-rate-limit.
- Endpoints lourds (`/precompute`, `/import`) à appel restreint par store.

### Logs

- Pas de PII en clair dans les logs : email, téléphone, noms hashés ou tronqués.
- Pas de secret loggé (clé API, token, password).
- Logs structurés JSON pour faciliter le grep ciblé.

### Dépendances

- `pnpm audit` lancé en CI.
- Mise à jour mensuelle des minor et patch.
- Major updates testés sur branche dédiée.

## Réponse à incident

Si une faille exploitée est détectée :

1. **Stop** : ne pas tenter de fix à chaud sans investigation.
2. **Snapshot** : sauvegarder logs, état DB, traces.
3. **Contenir** : désactiver la route ou l'API key compromise.
4. **Corriger** : patch + tests de non-régression.
5. **Rotation** : régénérer tous les secrets exposés.
6. **Communication** : notifier les marchands impactés sous 72h.
7. **Post-mortem** : documenter la cause racine et les actions correctives.
