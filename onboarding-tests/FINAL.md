# Récap final — modularisation Shimmer

**Période** : 2026-05-06 → 2026-05-09
**Méthode** : test de greffage sur deux stores fictifs (Caves Forty-Two, L'Atelier Lumière), 13 frictions identifiées, fix progressif vague par vague avec validation par scénarios.

---

## Verdict

| Étape | État | Score scénarios pertinents |
|---|---|---|
| Pré-fixes | « Cassé en pratique » : tout univers nouveau retombe sur des questions hardcodées de l'univers BRICOLAGE | 2/13 |
| Post-P0 | TYPE 1 robuste, questions DB-driven | 9/13 |
| Post-P1 | Ton par store, signaux universels (cadeau→premium), détection univers cohérente | 11/13 |
| Post-P2 | CSV éclatés, filtres SQL durs, hors-scope, cluster univers, overrides marchand | 14/14 |
| Post-TYPE 3 | Recherche par similarité produit-référence | **15/15** |

**Greffage zéro-code** : commercialisable. 4 appels API + 1 UPDATE SQL pour personnaliser → agent qui parle le métier du marchand.

---

## Pipeline d'onboarding (réplicable)

```bash
# 1. Création store
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Mon Magasin"}' \
  http://localhost:3003/api/stores
# → returns api_key

# 2. Import catalogue (JSON ou CSV)
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer <api_key>" \
  -d '{"products":[...]}' \
  http://localhost:3003/api/catalog/import

# 3. Auto-génération univers (60-150s, LLM)
curl -X POST -H "Authorization: Bearer <api_key>" \
  http://localhost:3003/api/universe/generate

# 4. Optionnel: personnaliser tone + overrides
psql -c "UPDATE stores SET config = '{\"tone\":\"vous\",\"universe_overrides\":{...}}'::jsonb WHERE api_key='...'"

# 5. Tester
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer <api_key>" \
  -d '{"message":"..."}' \
  http://localhost:3003/api/search/assist
```

---

## Capacités ajoutées (par ordre de commit)

### Vague P0 (bloquant)
- **TYPE 1 robuste** : strip d'intention ("je veux le X"), brand match par token significatif (« William Fèvre » trouve « Domaine William Fèvre »).
- **Questions DB-driven** : `nextCriterion.question` consommée en priorité, fallback hardcodé QUESTION_TEMPLATES préservé pour les univers natifs (allowlist `NATIVE_UNIVERSE_IDS`).

### Vague P1 (sortie de démo)
- **Ton par store** (`stores.config.tone` = "tu" ou "vous") : `applyTone()` avec gestion des conjugaisons (vous voulez↔tu veux) et élisions (vous intéresse→t'intéresse). Préserve la casse.
- **Signaux universels transverses** : "cadeau/offrir/patron" déduit OCCASION+BUDGET=premium → tri DESC. Fait passer C6 de Picpoul 11€ à Meursault 92€.
- **Détection univers cohérente** : boost label exact (+8), segments d'universe_id (+5 par segment), valeurs de critère du catalogue (+3 par hit, capé). "suspension scandinave" résout enfin SUSPENSION (au lieu de LAMPADAIRE).

### Vague P2 (commercialisable)
- **CSV multi-valeurs** : `maybeSplitCsv()` à l'import + éclatement à l'analyse de variance. ACCORD passe de 8 chaînes CSV à 25 tags distincts.
- **Filtres SQL durs** : pour chaque critère closed avec valeur connue, condition WHERE qui élimine les produits ayant une spec différente. Loire+fruits de mer → Muscadet (avant : Picpoul Languedoc).
- **Hors-scope poli** : « Vous avez du whisky ? » sur caviste → « Désolé, on ne fait pas ça chez Caves Forty-Two… ».
- **Clustering catégories** : LLM merge les catégories <3 produits dans des familles plus grosses (Prosecco + Crémant → Champagne, idéalement). Qualité dépend du LLM, fallback : overrides marchand.
- **Couche overrides marchand** : `stores.config.universe_overrides` JSON. Permet `criteria_replace`, `criteria_add`, `criteria_remove`, `criteria_priority`, `keywords_add`, `deductions_add`. Le marchand configure son agent en JSON, sans toucher au code.

### Vague TYPE 3 (Tome 2)
- **Similarité produit-référence** : 4 sub-cases (`like`, `budget_alt`, `replacement`, `competitor_equiv`). Détection d'intent par regex, extraction du produit référence par n-gramme tokens significatifs en accent-normalisé JS, scoring Jaccard sur les specs partagées (millesime/garde/puissance exclus). « Châteauneuf style » → Hermitage Rouge ; « Bandol moins cher » → Morgon Côte du Py.

---

## Frictions résiduelles (toutes hors scope mes vagues)

| Reste | Friction | Effort |
|---|---|---|
| backlog | FSM multi-tour (state-machine.ts existe dans smart-search/, à brancher à search-assist) | 6-12h |
| backlog | Brand voice avancé (signature, ton métier au-delà du tu/vous) | 4-6h |
| backlog | Réponses LLM pour cas ambigus (actuellement templates instant only) | 4-8h |
| backlog | Better universe-gen prompt (Prosecco→Vin doux est faux, devrait être Champagne) | 1-2h |

---

## Fichiers modifiés (cumul)

- `apps/api/src/routes/catalog-import.ts` (+18 lignes)
- `apps/api/src/routes/universe-gen.ts` (+82 lignes)
- `apps/api/src/routes/search-assist.ts` (+670 lignes — pivot du système)

Aucune migration DB. La table `stores.config` est en JSONB et accepte la nouvelle clé `universe_overrides` sans schéma.

---

## Commits de la session autonome

```
99b2768 feat(search-assist): TYPE 3 similarity to a reference product (Tome 2)
884e4e2 docs(onboarding-tests): P2 round
fa51c90 feat(search-assist): hard universe filters, out-of-scope, merchant overrides
4324706 feat(import,universe-gen): split CSV multi-value specs + cluster small categories
6b0e18d docs(onboarding-tests): grafting simulation on two fictional stores
dc0d363 feat(search-assist): make agent universe-agnostic + per-store tone
```

---

## Pour reprendre la main

1. État de prod : API tourne sur :3003, restart via `systemctl restart shimmer-api`.
2. Caves a `tone="tu"` + overrides VIN_ROUGE/VIN_BLANC. Atelier a `tone="vous"` + override SUSPENSION.
3. Replays : `onboarding-tests/store-overrides.sql` + `*/import.sh`.
4. Lecture : `POST-FIX.md` (P0), `POST-FIX-P1.md` (P1), `POST-FIX-P2.md` (P2), ce `FINAL.md`.
5. Specs collab : 6 docx à la racine (Tome 2 = TYPE 3 implémenté ; Tome 3 = TYPE 2 majoritairement implémenté ; FSM Annexe B B1 = pas branchée).

Tym bosse seul jusqu'au retour du collab. Le greffage zéro-code est viable pour démo investisseurs ET pour démarrer un client réel.
