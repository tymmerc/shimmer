# Quickstart Shimmer — Greffer un nouveau marchand

Onboarder un store de zéro à conversationnel en ~3 minutes via API.

API : `http://localhost:3003` en dev, `https://tymmerc.eu/shimmer/api` en prod.

---

## 1. Créer le store (public, pas d'auth)

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Ma Boutique"}' \
  http://localhost:3003/api/stores
```

Réponse :
```json
{
  "id": 6,
  "name": "Ma Boutique",
  "apiKey": "sk_abc123...",
  "config": {},
  "createdAt": "..."
}
```

**Notez l'apiKey**, vous en aurez besoin pour toutes les requêtes suivantes (header `Authorization: Bearer <apiKey>`).

---

## 2. Importer le catalogue

Format JSON minimum : un array de produits avec `name`, `price`, et autant de champs descriptifs que vous voulez. Tout champ non-standard finit dans `specs` automatiquement, et les valeurs CSV (`"rouge,blanc,rosé"`) sont éclatées en tableaux.

```bash
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "products": [
      {
        "name": "Chablis 2022",
        "sku": "C-001",
        "brand": "Domaine William Fèvre",
        "category": "Vin blanc",
        "price": 24,
        "description": "Chablis classique, chardonnay sur Kimméridgien.",
        "specs": {
          "couleur": "blanc",
          "region": "Bourgogne",
          "cepage": "Chardonnay",
          "millesime": "2022",
          "profil": "frais",
          "accord": "huitres,fruits de mer,poisson"
        }
      }
    ]
  }' \
  http://localhost:3003/api/catalog/import
```

Réponse :
```json
{ "success": true, "imported": 1, "updated": 0, "skipped": 0, "total": 1, "totalMs": 12 }
```

Formats supportés : JSON array, Shopify CSV export, WooCommerce.

---

## 3. Générer les univers automatiquement

L'API analyse le catalogue, détecte les catégories, calcule la variance des specs et propose un univers de qualification par catégorie (avec critères, valeurs possibles, et déductions).

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  http://localhost:3003/api/universe/generate
```

Durée : 60s à 3min selon le nombre de catégories (1 appel LLM par catégorie pour enrichissement).

Réponse :
```json
{
  "success": true,
  "totalMs": 89234,
  "universes": [
    { "universe_id": "VIN_BLANC", "criteria_count": 6, "deductions_count": 22 }
  ]
}
```

Pour relire les univers générés :
```bash
curl -H "Authorization: Bearer $API_KEY" http://localhost:3003/api/universe
```

---

## 4. Personnaliser via PATCH

L'auto-config est rarement parfaite. Pour adapter au métier :

```bash
curl -X PATCH -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "tone": "tu",
    "voice": {
      "intro_phrases": ["Tope !", "Bonne idée !"],
      "signature": "Santé !",
      "vocabulary": { "produit": "bouteille" }
    },
    "universe_overrides": {
      "VIN_BLANC": {
        "criteria_add": [{
          "id": "OCCASION", "label": "Occasion", "weight": 30,
          "required": true, "type": "closed",
          "values": ["Quotidien", "Repas amis", "Cadeau", "Apéro"],
          "question": "C'\''est pour quelle occasion ?",
          "fallback": "Apéro"
        }],
        "criteria_priority": ["OCCASION", "ACCORD", "REGION", "BUDGET"],
        "criteria_remove": ["GARDE", "MILLESIME"]
      }
    }
  }' \
  http://localhost:3003/api/stores/me/config
```

Tous les champs sont optionnels. Voir [docs/STORE-CONFIG-API.md](../onboarding-tests/STORE-CONFIG-API.md) pour le détail des overrides disponibles.

---

## 5. Tester la conversation

```bash
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"message":"Un blanc pour des huîtres"}' \
  http://localhost:3003/api/search/assist
```

Réponse :
```json
{
  "message": "Tope ! C'est pour quelle occasion ? Santé !",
  "suggestedQuestions": ["Quotidien", "Repas amis", "Cadeau"],
  "highlightedProducts": [],
  "needsMoreInfo": true,
  "qualificationStep": "qualifying",
  "sessionToken": "...",
  "knownCriteria": { "ACCORD": "huitres" },
  "qualification": {
    "universe": "VIN_BLANC",
    "score": 42,
    "missingRequired": true,
    "type": "TYPE_2"
  },
  "searchMeta": { "totalProducts": 5, "stageUsed": "hybrid", "searchType": "HYBRID", "totalMs": 34 }
}
```

Deuxième tour, en renvoyant `sessionToken`, `history`, et `knownCriteria` :

```bash
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "message": "Repas amis",
    "sessionToken": "...",
    "history": [{"role":"user","content":"Un blanc pour des huîtres"}],
    "knownCriteria": {"ACCORD":"huitres"}
  }' \
  http://localhost:3003/api/search/assist
```

L'agent recommande un produit dès que `qualification.score >= 65`.

---

## Les 3 types de recherche supportés

L'agent route automatiquement selon la requête :

- **TYPE 1 — Recherche exacte** : « Je veux le Chablis William Fèvre » → renvoie le produit direct.
- **TYPE 2 — Besoin fonctionnel** : « Un blanc pour des huîtres » → qualifie puis recommande.
- **TYPE 3 — Similarité** : « J'ai aimé le Châteauneuf, t'as similaire ? » → recommande dans le même style (4 sub-cases : like, budget_alt, replacement, competitor_equiv).

Hors scope géré : « Vous avez du whisky ? » sur caviste → message poli avec le nom du store.

---

## CRUD inventaire

```bash
GET    /api/catalog/products?category=Vin%20blanc&limit=50
GET    /api/catalog/products/:id
PATCH  /api/catalog/products/:id           # update price/stock/specs
DELETE /api/catalog/products/:id           # soft delete (isActive=false)
GET    /api/catalog/stats                  # totals, top categories, top brands
POST   /api/catalog/normalize-specs        # migrate legacy CSV specs → arrays (idempotent)
```

---

## Healthchecks

- `GET /health` — liveness rapide (toujours 200 si le process tourne)
- `GET /health/ready` — readiness : DB, Redis, embedding sidecar. Renvoie 503 si l'un échoue avec le détail.

```bash
curl http://localhost:3003/health/ready
# { "status": "ready", "totalMs": 16, "checks": [{ "name": "database", "ok": true, "ms": 4 }, ...] }
```

---

## Comportements remarquables

- **Multi-tour avec changement** : « Finalement, plutôt pour des huîtres » → reset propre du contexte précédent.
- **Signaux universels** : « offrir », « patron », « cadeau » → bascule automatique sur premium. « pas trop cher » → tri prix ASC.
- **Filtres durs** : si l'agent détecte « Loire » comme valeur de critère REGION, il filtre strictement en SQL — Picpoul (Languedoc) ne remontera pas.
- **Tone tu/vous** : transformation conjugaison incluse (« vous voulez » ↔ « tu veux », « vous intéresse » → « t'intéresse »).
- **Brand voice** : intros aléatoires, vocabulaire métier substitué, signature de marque.

---

## Pour aller plus loin

- [onboarding-tests/FRICTIONS.md](../onboarding-tests/FRICTIONS.md) — 13 frictions identifiées pendant le greffage initial, toutes traitées
- [onboarding-tests/store-overrides.sql](../onboarding-tests/store-overrides.sql) — exemples de configs Caves Forty-Two + L'Atelier Lumière
- [onboarding-tests/POST-FIX-P3.md](../onboarding-tests/POST-FIX-P3.md) — dernier état des fixes
- Tests unitaires : `pnpm test` (80 tests passent, ~1s)
