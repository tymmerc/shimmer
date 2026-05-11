# Cross-sell — Recommandations complémentaires LLM

Pour chaque produit d'un store, Shimmer pré-calcule 4 à 6 **produits complémentaires** (pas similaires) avec un rôle métier et une phrase d'explication naturelle, prêts à être affichés sur la fiche produit.

## Différence vs les autres types de recommandations

| Type | Question répondue | Quand |
|---|---|---|
| TYPE 1 exact | « Je veux le Chablis » | Search avec nom de produit |
| TYPE 2 qualification | « Un blanc pour des huîtres » | Conversation client |
| TYPE 3 similarité | « Comme ce que j'ai aimé » | Référence à un produit |
| **Cross-sell** | « Qu'est-ce qui va AVEC ce que je regarde ? » | **Fiche produit, sans conversation** |

## Architecture (3 couches)

```
                    ┌─────────────────────────────────────────────┐
                    │  COUCHE 1 — Pré-calcul (offline, on-demand) │
                    │  POST /api/catalog/cross-sell/generate      │
                    │                                             │
                    │  Pour chaque produit :                      │
                    │    • Catalogue échantillonné par catégorie  │
                    │    • LLM (Claude) → 4 picks                 │
                    │    • Anti-hallucination : validation IDs    │
                    │    • Stockage product_cross_sells           │
                    └─────────────────────────────────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────────────┐
                    │  COUCHE 2 — Lookup live (<20ms)             │
                    │  GET /api/catalog/cross-sell/product/:id    │
                    │                                             │
                    │  JOIN product_cross_sells + products        │
                    │  → JSON avec produit + role + reason        │
                    └─────────────────────────────────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────────────┐
                    │  COUCHE 3 — Overrides marchand (optional)   │
                    │  stores.config.cross_sell_rules             │
                    │                                             │
                    │  • exclude   — bloquer une paire            │
                    │  • force     — injecter une paire           │
                    │  • reason_overrides — réécrire la phrase    │
                    └─────────────────────────────────────────────┘
```

## Endpoints

### `POST /api/catalog/cross-sell/generate`

Déclenche le pré-calcul pour tout le store. Synchrone par défaut, ou async avec `{ "async": true }` dans le body.

```bash
# Synchrone (attend la fin, jusqu'à 10-15 min selon catalogue)
curl -X POST -H "Authorization: Bearer $API_KEY" \
  http://localhost:3003/api/catalog/cross-sell/generate
# → { "success": true, "products": 80, "pairs": 320, "ms": 487000 }

# Async (retourne immédiatement 202)
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"async":true}' \
  http://localhost:3003/api/catalog/cross-sell/generate
# → { "accepted": true, "message": "Generation running in background" }
```

Le générateur **efface puis recrée** toutes les paires du store (idempotent).

### `GET /api/catalog/cross-sell/product/:id?limit=N`

Lookup live pour un produit. Renvoie 1 à 12 cross-sells (défaut 4) triés par score.

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:3003/api/catalog/cross-sell/product/2035?limit=4"
```

Réponse :

```json
{
  "reference": {
    "id": 2053,
    "sku": "C42-R019",
    "name": "Languedoc Pic Saint-Loup 2021",
    "brand": "Mas Bruguière",
    "category": "Vin rouge",
    "price": "17.50"
  },
  "items": [
    {
      "product": { "id": 2102, "name": "Sancerre Blanc 2022", "brand": "Domaine Vacheron", ... },
      "role": "apero",
      "reason": "Pour ouvrir le repas en fraîcheur",
      "score": 0.92
    },
    {
      "product": { "id": 2087, "name": "Champagne Cuvée Spéciale Millésimé 2014", ... },
      "role": "repas",
      "reason": "Pour un grand repas spécial",
      "score": 0.95
    }
  ]
}
```

### `GET /api/catalog/cross-sell/stats`

```bash
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3003/api/catalog/cross-sell/stats
# → {
#     "total": 320,
#     "byRole": [
#       { "role": "apero", "count": 92 },
#       { "role": "repas", "count": 84 },
#       { "role": "dessert", "count": 56 },
#       { "role": "decouverte", "count": 48 },
#       { "role": "cadeau", "count": 28 },
#       { "role": "accessoire", "count": 12 }
#     ]
#   }
```

### `DELETE /api/catalog/cross-sell`

Vide toutes les paires du store. Pour reset clean avant regen.

## Rôles disponibles

| Rôle | Sens | Exemple côté client |
|---|---|---|
| `apero` | Avant le plat principal | « Pour ouvrir le repas en fraîcheur » |
| `repas` | Complète le plat principal | « Pour le plat de résistance » |
| `dessert` | Pour finir le repas | « Pour finir sur une note sucrée » |
| `decouverte` | Pour élargir le goût client | « Pour découvrir une autre région » |
| `cadeau` | Bundle cadeau | « À offrir avec une carte » |
| `accessoire` | Produit fonctionnel complémentaire | « Le tire-bouchon adapté » |
| `complement` | Générique | — |

## Anti-hallucination

Le LLM peut inventer des produits. Le module valide strictement chaque pick :

- Le `target_id` doit exister dans le catalogue du store.
- Le `target_id` ne peut pas être le produit de référence lui-même.
- Le `role` doit être dans la whitelist.
- La `reason` doit faire ≥3 caractères, tronquée à 280.
- Le `score` est clampé à `[0, 1]`.
- Déduplication par `target_id` au sein d'un pick set.

Si le LLM produit du bruit, les picks invalides sont silencieusement filtrés et le produit ressort avec moins de cross-sells (potentiellement zéro).

## Overrides marchand

Format `stores.config.cross_sell_rules` (JSONB) :

```json
{
  "cross_sell_rules": {
    "exclude": [
      { "from_sku": "C42-R019", "to_sku": "C42-D001" }
    ],
    "force": [
      {
        "from_category": "Vin rouge",
        "to_category": "Champagne",
        "role": "apero",
        "reason": "L'apéritif maison à ouvrir avant le repas"
      },
      {
        "from_sku": "C42-R035",
        "to_sku": "C42-D004",
        "role": "dessert",
        "reason": "Le mariage classique du restaurant"
      }
    ],
    "reason_overrides": {
      "C42-R035→C42-B005": "Pour ouvrir le repas par un Meursault d'exception"
    }
  }
}
```

Les overrides sont appliqués **au runtime** lors du lookup (pas au pré-calcul). Modifier les règles a un effet immédiat sans regénération.

## Coûts et performance

Mesures réelles sur Caves Forty-Two (80 produits, 7 catégories) avec Claude Sonnet 4 :

| Métrique | Valeur |
|---|---|
| Durée de génération | ~8-10 min |
| Appels LLM | 80 (un par produit) |
| Coût total | ~$0.10-0.20 |
| Paires créées | ~280-320 |
| Latence lookup | <20 ms |

À l'échelle :
- 500 produits → ~50 min, ~$0.80
- 5000 produits → utiliser embeddings + LLM re-rank (architecture V2)

## Sources scientifiques

Architecture inspirée du papier 2025 [LLM-Enhanced Reranking for Complementary Product Recommendation](https://arxiv.org/html/2507.16237v1). Variante : Shimmer fait du LLM-only (pas de GNN baseline) car les catalogues cibles sont petits et les data comportementales souvent absentes (cold-start).

## Cas d'usage côté marchand

```html
<!-- Sur la fiche produit -->
<div data-shimmer-cross-sell="2053" data-limit="4">
  <!-- SDK fetch + render -->
</div>

<script src="https://cdn.shimmer.com/sdk.js"></script>
<script>
  shimmer.init({ apiKey: 'sk_...' });
  shimmer.crossSell.render('[data-shimmer-cross-sell]');
</script>
```

Le SDK fetch `GET /cross-sell/product/:id`, render 4 cards avec le rôle en chip et la raison sous le nom. Click → fiche produit cible.

## Workflow recommandé

```
1. Onboarding du marchand :
   POST /api/stores
   POST /api/catalog/import
   POST /api/universe/generate
   POST /api/catalog/cross-sell/generate     ← nouveau

2. Ajustement métier (optionnel) :
   PATCH /api/stores/me/config
   { "voice": {...}, "cross_sell_rules": {...} }

3. Catalog change (nouveau produit, modif prix, etc.) :
   POST /api/catalog/cross-sell/generate    ← regen complète

4. Production :
   GET /api/catalog/cross-sell/product/:id  ← <20ms
```
