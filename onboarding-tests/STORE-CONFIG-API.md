# Store config — API REST

Pour configurer un store sans toucher à la base, deux endpoints sous `/api/stores`.

## GET `/api/stores/me/config`

Renvoie la config courante du store authentifié.

```bash
curl -H "Authorization: Bearer $API_KEY" http://localhost:3003/api/stores/me/config
```

Réponse :

```json
{
  "id": 4,
  "name": "Caves Forty-Two",
  "config": {
    "tone": "tu",
    "voice": { "intro_phrases": [...], "signature": "Santé !", "vocabulary": {...} },
    "universe_overrides": { "VIN_ROUGE": {...}, "VIN_BLANC": {...} }
  },
  "updatedAt": "2026-05-10T18:50:00.000Z"
}
```

## PATCH `/api/stores/me/config`

Merge shallow des clés `tone`, `voice`, `universe_overrides` au top-level de la config. Les clés non envoyées restent inchangées. Envoyer `null` sur une clé supprime cette section.

Note : la fusion est shallow (par clé top-level). Si on envoie `universe_overrides`, on remplace l'objet entier — pas un deep-merge par univers. Pour ajouter un univers à un set existant, refaire un GET d'abord pour récupérer et merger côté client.

### Validation Zod

- `tone` : "tu" | "vous"
- `voice.intro_phrases` : array de string
- `voice.signature` : string
- `voice.vocabulary` : dict string→string
- `universe_overrides[X]` : { criteria_replace?, criteria_add?, criteria_remove?, criteria_priority?, keywords_add?, deductions_add? }

### Exemples

Changer juste le tone :

```bash
curl -X PATCH -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"tone":"vous"}' \
  http://localhost:3003/api/stores/me/config
```

Mettre à jour la voice :

```bash
curl -X PATCH -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "voice": {
      "intro_phrases": ["Tope !", "Joli choix !"],
      "signature": "Santé !",
      "vocabulary": {"produit": "bouteille"}
    }
  }' \
  http://localhost:3003/api/stores/me/config
```

Supprimer toute la voice (revenir aux templates standards) :

```bash
curl -X PATCH -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"voice": null}' \
  http://localhost:3003/api/stores/me/config
```

Ajouter un override d'univers :

```bash
curl -X PATCH -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "universe_overrides": {
      "VIN_ROUGE": {
        "criteria_priority": ["OCCASION", "ACCORD", "REGION", "BUDGET"],
        "criteria_remove": ["GARDE", "MILLESIME"],
        "keywords_add": ["rouge", "tannique", "puissant"]
      }
    }
  }' \
  http://localhost:3003/api/stores/me/config
```

### Erreurs

- `401 Unauthorized` : Authorization header manquant ou api_key invalide.
- `400 Validation error` : body invalide (mauvais type, valeur inconnue pour tone, etc.).
- `404 Store not found` : ne devrait pas arriver tant que l'api_key existe, défense en profondeur.

## Pipeline complet self-service

```bash
# 1. Create store (public)
POST /api/stores {"name":"Mon Magasin"}
# → 201 + api_key

# 2. Import catalog
POST /api/catalog/import (Bearer api_key) {"products":[...]}

# 3. Auto-generate universes
POST /api/universe/generate (Bearer api_key)

# 4. Personalize via API instead of SQL
PATCH /api/stores/me/config (Bearer api_key) {
  "tone": "tu",
  "voice": {...},
  "universe_overrides": {...}
}

# 5. Test
POST /api/search/assist (Bearer api_key) {"message":"..."}
```

Plus aucune commande SQL nécessaire pour personnaliser un store. Tout via REST.
