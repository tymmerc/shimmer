# Post-fix P2 — Cinq fixes structurels

**Date** : 2026-05-09
**Fixes appliqués** : P2 #5 (CSV multi-valeurs), P2 #4 (filtres durs), P3 #11 (hors-scope), P3 #6 (clustering univers), P2 #3 (couche overrides marchand)
**Fichiers modifiés** : `apps/api/src/routes/search-assist.ts`, `apps/api/src/routes/catalog-import.ts`, `apps/api/src/routes/universe-gen.ts`
**Régression sur store legacy** : 0

---

## Synthèse

Cette série porte la modularité au niveau commercialisable. Un marchand peut désormais : (a) importer un catalogue avec specs multi-valeurs, (b) recevoir des questions adaptées à son métier après un seul appel, (c) personnaliser fortement l'agent en JSON sans toucher au code.

Score global avant tous fixes : 2/13 scénarios pertinents.
Score post-P0+P1 : 11/13.
**Score post-P2 : 14/14** (avec scénarios élargis).

---

## Fix #1 — CSV multi-valeurs splittés (P2 #5)

**Problème** : `"accord": "magret,cassoulet,gibier"` était stocké comme une chaîne unique. L'analyse de variance dans `universe-gen` voyait 1 valeur au lieu de 3, et le critère ACCORD ne pouvait jamais matcher "magret" seul.

**Modifications** :
- [catalog-import.ts](apps/api/src/routes/catalog-import.ts) : `maybeSplitCsv()` détecte les valeurs CSV-like (≥2 parties courtes, sans phrases) et les transforme en arrays. Appliqué à toutes les specs en sortie de `normalizeProduct()`.
- [universe-gen.ts](apps/api/src/routes/universe-gen.ts) : `analyzeCatalog()` éclate les arrays ET les chaînes CSV legacy en valeurs distinctes pour le calcul de variance.

**Effet** : VIN_ROUGE.ACCORD passe de `["volaille,charcuterie", ...]` à `["volaille", "charcuterie", "gibier", "agneau", "viande rouge", ...]`. Pour "cassoulet" l'algorithme de détection a maintenant un vrai signal.

---

## Fix #2 — Filtres durs sur critères de l'univers (P2 #4)

**Problème** : `fetchMatchingProducts` n'avait que des filtres SQL hardcodés pour MATERIAUX/SANS_FIL/ANIMAUX. Quand `known.REGION = "Loire"` était détecté, le SQL ne filtrait rien sur la région, et Picpoul (Languedoc) sortait en tête sur "Un blanc de Loire pour des fruits de mer".

**Modifications** dans [search-assist.ts:fetchMatchingProducts](apps/api/src/routes/search-assist.ts) :

```typescript
// Soft filter generated for any closed criterion that has a known value.
// Skips products that have the spec but don't match. Handles both string and array specs.
for (const c of universe.criteria) {
  if (SKIP_FILTER_IDS.has(c.id) || ALREADY_HANDLED.has(c.id)) continue;
  if (c.type === 'open' || c.type === 'deduced') continue;
  const val = known[c.id];
  if (!val) continue;
  conditions.push(
    `(NOT specs ? '${specKey}' OR ` +
    `specs->>'${specKey}' = '${escVal}' OR ` +
    `specs->>'${specKey}' ILIKE '%${escVal}%' OR ` +
    `(jsonb_typeof(specs->'${specKey}') = 'array' AND specs->'${specKey}' @> '["${escVal}"]'::jsonb))`
  );
}
```

Skip set : `BUDGET, OCCASION, GARDE, MILLESIME` (poids ou type ne s'expriment pas en filtre direct). Already handled : `SANS_FIL, ANIMAUX, GENRE, MATERIAUX, PERC_MATERIAU, PERC_ALIM, ASP_FIL`.

**Effet** :

| Scénario | Avant | Après |
|---|---|---|
| "Un blanc de Loire pour des fruits de mer" | Picpoul (Languedoc) | **Muscadet de la Pépière (Loire)** |

---

## Fix #3 — Hors scope poli (P3 #11)

**Problème** : "Vous avez du whisky ?" sur Caves Forty-Two retournait "C'est pour un usage occasionnel ou plus régulier ?". L'agent ignorait que le store ne fait que du vin.

**Modifications** : ajout d'une branche `out_of_scope` juste après `detectUniverse`. Si :
- aucun univers ne matche
- pas de produit exact ni hybride
- premier message de la conversation
- la query contient au moins un mot ≥4 chars qui n'est pas un mot fonctionnel

Alors l'agent répond : « Désolé, on ne fait pas ça chez {storeName}. Dis-moi ce qui t'intéresse vraiment et je te trouve quelque chose ! »

**Effet** :

| Query | Réponse |
|---|---|
| "Vous avez du whisky ?" | « Désolé, on ne fait pas ça chez Caves Forty-Two... » |
| "Vous avez des aspirateurs ?" (Atelier) | « Désolé, on ne fait pas ça chez L'Atelier Lumière... » |
| "Bonjour" | (comportement normal — "bonjour" est un mot fonctionnel) |

---

## Fix #4 — Clustering sémantique des univers (P3 #6)

**Problème** : `universe-gen` créait un univers par catégorie, même celles à 1-2 produits (Crémant 2 prod, Prosecco 1 prod). 7 univers pour Caves dont 2 quasi vides.

**Modifications** dans `universe-gen.ts` : nouveau step 0 `clusterCategories()`. Quand au moins une catégorie a `< 3 produits`, on demande au LLM un mapping de regroupement (ex: "Prosecco" → "Champagne"). Les produits sont réassignés avant l'analyse de variance.

**Limite observée** : la qualité dépend du LLM. Sur Caves, il a mappé Prosecco → Vin doux (sémantiquement faux). Crémant n'a pas été fusionné. Néanmoins, on passe de 7 à 6 univers. Améliorable avec un prompt plus précis ou une intervention manuelle via overrides.

---

## Fix #5 — Couche d'overrides marchand (P2 #3) [le plus important]

**Problème** : l'auto-config rate les critères que les specs ne révèlent pas (variance trop faible). Ex : Caves catalogue n'expose `occasion` que sur 6 produits → universe-gen ignore le critère, alors qu'OCCASION est central pour un caviste. Pour fixer ça avant P2 #3, il fallait éditer `search-assist.ts` ou la base. Pas modulable.

**Modifications** dans [search-assist.ts](apps/api/src/routes/search-assist.ts) :

- Nouveau type `UniverseOverride` avec champs : `criteria_replace`, `criteria_add`, `criteria_remove`, `criteria_priority`, `keywords_add`, `deductions_add`.
- Fonction `applyStoreOverrides()` qui merge les overrides au-dessus des univers DB-loaded.
- Appelée dans la route après `getUniverses` et avant `detectUniverse`.
- `computeQualification` modifié : le tri respecte maintenant l'ordre déclaré par `universe.criteria` (donc le `criteria_priority` de l'override) en tiebreaker des critères required.

**Stockage** : `stores.config.universe_overrides` (JSONB).

**Exemple Caves** :

```sql
UPDATE stores SET config = jsonb_build_object(
  'tone', 'tu',
  'universe_overrides', jsonb_build_object(
    'VIN_ROUGE', jsonb_build_object(
      'criteria_add', jsonb_build_array(
        jsonb_build_object(
          'id', 'OCCASION', 'label', 'Occasion', 'weight', 30, 'required', true,
          'type', 'closed',
          'values', jsonb_build_array('Quotidien', 'Repas amis', 'Cadeau', 'Cave/garde'),
          'question', 'C''est pour quelle occasion ?', 'fallback', 'Repas amis'
        )
      ),
      'criteria_replace', jsonb_build_array(
        jsonb_build_object('id', 'ACCORD', 'label', 'Accord met-vin', 'weight', 25,
          'required', false, 'type', 'open',
          'question', 'C''est avec quel plat ?', 'fallback', 'flexible')
      ),
      'criteria_priority', jsonb_build_array('OCCASION', 'ACCORD', 'REGION', 'BUDGET'),
      'criteria_remove', jsonb_build_array('GARDE', 'MILLESIME'),
      'keywords_add', jsonb_build_array('rouge', 'rouges', 'tannique', 'puissant', 'corsé')
    ),
    -- VIN_BLANC similar
  )
) WHERE id = 4;
```

**Effet observable** :

| Scénario | Avant override | Après override |
|---|---|---|
| C1 « vin rouge pour magret » | « Quel accord t'intéresse ? » | « **C'est pour quelle occasion ?** » |
| C9 cassoulet (puissant tannique) | univers VIN_BLANC fautif (sans override OCCASION) | univers VIN_ROUGE + question OCCASION |
| Atelier A1 suspension scand SAM | « Quel diamètre ? » (tri par variance) | « **Pour quelle pièce ?** » + PIECE déduit |

Le marchand peut maintenant configurer son agent sans toucher au code Shimmer. Critères ajoutés/remplacés/priorisés/supprimés, déductions custom, keywords supplémentaires.

---

## Bilan complet

| Scénario | Pré-tous-fixes | Post-P0+P1 | Post-P2 |
|---|---|---|---|
| C1 magret | « occasionnel/régulier » | « Quel accord ? » | « C'est pour quelle occasion ? » |
| C2 amis pas cher | générique | Châteauneuf 38€ | Châteauneuf 38€ |
| C3 style Châteauneuf | générique | « Quel accord ? » | « Quelle occasion ? » |
| C4 blanc Loire mer | Picpoul (Languedoc) | Picpoul (idem) | **Muscadet (Loire)** |
| C5 Chablis exact | TYPE_2 0 produit | TYPE_1 Chablis 2022 | identique |
| C6 cadeau patron | Picpoul 11€ | Meursault 92€ | Meursault 92€ |
| C7 whisky hors scope | générique | générique | **OUT_OF_SCOPE** |
| C8 alsace apéro (nouveau) | — | — | Riesling Trimbach 16.50€ |
| C9 cassoulet | générique → VIN_BLANC | VIN_BLANC + budget Q | **VIN_ROUGE + occasion Q** |
| A1 suspension scand SAM | LAMPADAIRE | SUSPENSION + diamètre Q | SUSPENSION + **pièce Q + déduction** |
| A5 lumière jaune salon | générique | diamètre Q | **Mass Light recommandé direct** |
| A7 Bourgie | TYPE_HYBRID 0 produit | TYPE_1 Lampe Bourgie | identique |
| A11 aspirateurs (nouveau) | — | — | OUT_OF_SCOPE |
| Legacy aspi chats | « occasionnel/régulier » | « usage quotidien ou occasionnel » | identique (préservé) |
| Legacy perceuse béton | générique | « Tu bricoles... » | identique (préservé) |

Régression : **zéro** sur les 2 stores legacy testés.

---

## Reproduction

```bash
# Caves Forty-Two (tutoiement, override OCCASION)
curl -H "Authorization: Bearer $(cat onboarding-tests/caves-forty-two/.api-key)" \
  -d '{"message":"Je cherche un vin rouge pour accompagner un magret de canard"}' \
  http://localhost:3003/api/search/assist | jq

# L'Atelier Lumière (vouvoiement, override PIECE)
curl -H "Authorization: Bearer $(cat onboarding-tests/atelier-lumiere/.api-key)" \
  -d '{"message":"Je cherche une suspension scandinave pour ma salle à manger"}' \
  http://localhost:3003/api/search/assist | jq

# Hors scope
curl -H "Authorization: Bearer $(cat onboarding-tests/caves-forty-two/.api-key)" \
  -d '{"message":"Vous avez du whisky ?"}' \
  http://localhost:3003/api/search/assist | jq

# Legacy regression check
curl -H "Authorization: Bearer test-api-key" \
  -d '{"message":"aspirateur pour mes 2 chats"}' \
  http://localhost:3003/api/search/assist | jq
```

Les configs SQL d'overrides Caves+Atelier sont dans `onboarding-tests/store-overrides.sql`.

---

## Frictions restantes (toutes hors P2)

| Reste | Friction | Note |
|---|---|---|
| **P3** | #9 Multi-tour conversationnel (state machine) | FSM existe dans smart-search/state-machine.ts, à brancher à search-assist |
| **P3** | TYPE 3 similarité produit-référence | « j'ai aimé le Châteauneuf, t'as quelque chose dans le même style » |
| backlog | Brand voice avancé (signature, ton spécifique au-delà tu/vous) | nécessite couche prompt dédiée |
| backlog | Réponse LLM pour contextes ambigus | actuellement templates instant only |

Le greffage zéro-code est **commercialisable**. Un nouveau marchand peut :
1. POST /api/stores
2. POST /api/catalog/import
3. POST /api/universe/generate
4. UPDATE stores.config (overrides JSON pour personnaliser questions et critères métier)
5. UPDATE stores.config.tone

Et avoir un agent qui parle son métier, sans intervention dev sur le code Shimmer.
