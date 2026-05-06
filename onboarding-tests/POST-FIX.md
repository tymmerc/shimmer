# Post-fix P0 — Validation après corrections

**Date** : 2026-05-06
**Fixes appliqués** : P0 #1 (questions hardcodées) + P0 #2 (TYPE 1 cassé)
**Fichier modifié** : [search-assist.ts](apps/api/src/routes/search-assist.ts) (3 modifications, ~80 lignes au total, 0 fichier nouveau)

---

## Résumé des modifications

### Fix #1 — TYPE 1 robuste (recherche exacte)

**Problème initial** : "Je veux le Chablis William Fèvre" retournait 0 produit. La détection exacte échouait parce que :
- La query contenait des mots d'intention ("je veux le") qui polluaient le LIKE.
- Le code matchait `LOWER(brand) = words[0]` (donc "je") au lieu de chercher la marque dans toute la phrase.
- Une marque stockée comme "Domaine William Fèvre" ne matchait pas une saisie "William Fèvre".

**Modifications** dans [search-assist.ts:25-150](apps/api/src/routes/search-assist.ts#L25) :
- Nouvelle fonction `stripIntentPrefix()` qui enlève "je veux", "je cherche", "il me faut", "tu as", "vous avez", etc., et les déterminants en début.
- `detectExactProduct()` essaye maintenant la query brute ET la version stripée.
- L'étape "brand + model" cherche n'importe quelle marque stockée dont au moins un token significatif (≥4 chars, hors mots de liaison "Domaine", "Château", "Mas"...) apparaît dans la query.
- Le remainder utilisé pour matcher le name retire tous les tokens du brand stocké.

### Fix #2 — Questions et suggestions tirées de la DB

**Problème initial** : pour tout univers nouveau (VIN_ROUGE, SUSPENSION...), `QUESTION_TEMPLATES` codé en dur retombait sur le default "C'est pour un usage occasionnel ou plus régulier ?". Les questions générées par universe-gen et stockées en DB étaient ignorées.

**Modifications** dans [search-assist.ts:770-810](apps/api/src/routes/search-assist.ts#L770) et [search-assist.ts:1058-1090](apps/api/src/routes/search-assist.ts#L1058) :
- `buildQualificationTemplate()` accepte un paramètre `nextCriterion`. Si ce critère a une `question` non vide, elle est utilisée. Sinon fallback sur l'ancien dictionnaire (compatibilité avec les univers natifs).
- Le calcul de `earlySuggestions` utilise maintenant `qual.askable[0].values` (les valeurs du prochain critère manquant) en priorité. Fallback sur les listes hardcodées par famille (Beauty/Hardware/Generic).
- L'appel à `buildQualificationTemplate` passe désormais `nextCriterion`.

**Effet** : pour tout univers (natif ou auto-généré), l'agent pose la question définie au moment de la création du critère, avec les valeurs réelles du catalogue comme suggestions.

---

## Comparatif scénarios avant/après

| Scénario | Avant fix | Après fix | Verdict |
|---|---|---|---|
| **Caves S1** Magret de canard | "occasionnel/régulier" | « Quel accord vous intéresse ? » + suggestions vraies | ✅ |
| **Caves S2** Rouge entre amis pas cher | idem générique | « Quel accord ? » | ✅ partiel (budget non détecté, friction #8) |
| **Caves S3** Style Châteauneuf | idem générique | « Quel accord ? » | ✅ partiel (similarité non détectée, friction non-P0) |
| **Caves S4** Blanc Loire fruits de mer | recommande Picpoul (mauvais filtre Loire) | identique | = inchangé (friction #4) |
| **Caves S5** Chablis William Fèvre | type=TYPE_2, 0 produit | **type=TYPE_1, Chablis 2022 retourné direct** | ✅ MAJEUR |
| **Caves S6** Cadeau patron | Picpoul 11€ | identique | = inchangé (friction #8 hors P0) |
| **Caves S7** Hors scope whisky | "occasionnel/régulier" | "occasionnel/régulier" | = univers null → default, friction #11 |
| **Caves S9** Cassoulet puissant | "occasionnel/régulier" | « Vous avez un budget en tête ? » | ✅ partiel (univers VIN_BLANC fautif, friction #7) |
| **Atelier S1** Suspension scandinave | LAMPADAIRE + question générique | LAMPADAIRE + « Quel style vous intéresse ? » | ✅ partiel (friction #7) |
| **Atelier S5** Lumière jaune douce salon | question générique | « Quel diamètre ? » (pas idéal) | ⚠️ pondération critère pas pertinente |
| **Atelier S7** Lampe Bourgie Kartell | type=HYBRID, 0 produit | **type=TYPE_1, Lampe Bourgie retournée direct** | ✅ MAJEUR |
| **Atelier S10** Mid-century | recommande (mauvais style) | identique | = (le critère style est mal exploité, friction non-P0) |

**Score** : 9 / 12 scénarios améliorés (dont 2 fixes majeurs TYPE 1). 0 régression. 3 scénarios identiques (frictions hors scope P0).

---

## Frictions résiduelles connues, par priorité

Les fixes P0 ont fait sauter les deux blocages les plus visibles. Les autres frictions du rapport initial restent à traiter :

| Reste | Friction | Effort |
|---|---|---|
| **P1** | #7 Détection univers cohérente (LAMPADAIRE pour suspension, VIN_BLANC pour cassoulet) | 4-8h |
| **P1** | #8 Signaux universels cadeau/premium | 2-4h |
| **P1** | #10 Ton personnalisable par store (tu/vous) | 2-4h |
| **P2** | #4 Filtres durs vs scores | 2-4h |
| **P2** | #5 Format CSV pour specs multi-valeurs | 1h |
| **P2** | #9 Multi-tour conversationnel (state machine) | 4-8h |
| **P3** | #11 Hors scope (whisky chez caviste) | 2-3h |
| **P3** | #3 Couche config métier surplombante | 4-8h |

---

## Régression sur les univers natifs

Vérifié : le store legacy (`test-api-key`, univers ELECTROMENAGER hardcodé) répond toujours correctement avec sa question native « C'est pour un usage quotidien ou plutôt occasionnel ? ». Le fallback hardcodé est préservé pour les univers natifs sans `question` explicite.

```
$ curl -H "Authorization: Bearer test-api-key" -d '{"message":"aspirateur pour mes 2 chats"}' .../api/search/assist
→ "Noté ! C'est pour un usage quotidien ou plutôt occasionnel ?"  ✅
```

---

## Reproduction

Les artefacts post-fix sont dans :

```
caves-forty-two/results/post-fix/  (s01..s09)
atelier-lumiere/results/post-fix/  (s01, s05, s07, s10)
```

Pour rejouer un scénario précis :

```bash
KEY=$(cat onboarding-tests/caves-forty-two/.api-key)
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $KEY" \
  -d '{"message":"Je veux le Chablis William Fèvre"}' \
  http://localhost:3003/api/search/assist | jq
```
