# Rapport de greffage Shimmer — Frictions et verdict modularité

**Date** : 2026-05-06
**Profils testés** : Caves Forty-Two (80 vins, store_id=4), L'Atelier Lumière (60 luminaires, store_id=5)
**Méthode** : parcours d'onboarding réel via API publique, sans modification du code core.

---

## TL;DR du verdict

| Critère de modularité | Verdict |
|---|---|
| Onboarding zéro-code | **Partiel** |
| Auto-config (universe-gen) | **Fonctionne mécaniquement, sort une config souvent inadaptée au métier** |
| Pertinence du moteur sur univers nouveau | **Cassé** |
| Tonalité personnalisée par store | **Impossible sans toucher au code** |
| Robustesse cross-univers (un nouveau store ne casse pas les anciens) | **OK** |

**Verdict global** : **NON modulable en l'état**. Le greffage technique d'un nouveau store fonctionne (créer store + importer catalogue + générer univers = 3 appels API qui passent), mais le moteur conversationnel (`search-assist`) embarque des hypothèses codées en dur qui rendent l'agent inutilisable sur tout univers hors des 5-6 univers natifs (Bricolage, Électroménager, Jardin, Parfum, Maquillage, etc.).

Le test a confirmé l'intuition : on est très loin du "branche ton catalogue et c'est parti".

---

## Parcours d'onboarding (les 4 étapes)

```
1. POST /api/stores              → 100ms,  sans auth, retourne api_key
2. POST /api/catalog/import      → 320ms (60 prod) à 440ms (80 prod)
3. POST /api/universe/generate   → 114s (Caves) à 151s (Atelier) — LLM par catégorie
4. POST /api/search/assist       → 50-200ms, conversationnel
```

Reproductible via `caves-forty-two/import.sh` et `atelier-lumiere/import.sh`. Les artefacts (réponses JSON) sont dans `*/results/`.

---

## Friction #1 — QUESTION_TEMPLATES hardcodés (BLOQUANT)

**Constat** : sur 13 scénarios joués (9 Caves + 4 Atelier), **11 finissent par la même question hardcodée** : « C'est pour un usage occasionnel ou plus régulier ? ». Cette question n'a aucun sens pour un caviste ou un magasin de luminaires.

**Cause** : [search-assist.ts:723-768](apps/api/src/routes/search-assist.ts#L723) contient un dictionnaire `QUESTION_TEMPLATES` codé en dur. Pour les univers connus (BRICOLAGE, ELECTROMENAGER, PARFUM...) il a une question adaptée. Pour tout univers inconnu (VIN_ROUGE, SUSPENSION...) il tombe sur le `default`.

**Aggravant** : la question générée par `universe-gen` (et stockée en DB dans `universe_criteria.question`) est **ignorée** par `search-assist` au profit du dictionnaire hardcodé. Tout le travail d'auto-config est perdu à ce niveau.

**Preuves** :
- [results/s01-magret.json](caves-forty-two/results/s01-magret.json) : "Je cherche un vin rouge pour magret de canard" → "C'est pour un usage occasionnel ou plus régulier ?"
- [results/s07-whisky.json](caves-forty-two/results/s07-whisky.json) : "Vous avez du whisky ?" → même question (hors scope non détecté)
- [atelier-lumiere/results/s01-suspension-scandinave.json](atelier-lumiere/results/s01-suspension-scandinave.json) : même question pour une suspension scandinave

**Sévérité** : critique. C'est LE bug bloquant.

**Fix proposé** : faire que `search-assist` consomme `universe_criteria.question` depuis la DB au lieu du dictionnaire en dur, ou laisser le dictionnaire comme fallback uniquement pour les univers natifs.

---

## Friction #2 — TYPE 1 (recherche exacte) ne fait pas son travail (BLOQUANT)

**Constat** : un client qui demande explicitement un produit par nom + marque devrait recevoir le produit immédiatement, sans qualification. C'est même la définition du TYPE 1 dans le PRD.

**Preuves** :
- Caves [s05-exact.json](caves-forty-two/results/s05-exact.json) : "Je veux le Chablis William Fèvre" → `searchType: "EXACT"` détecté, mais `products: []` et question "occasionnel/régulier"
- Atelier [s07-exact.json](atelier-lumiere/results/s07-exact.json) : "Je veux la lampe Bourgie de Kartell" → `searchType: "EXACT"` détecté, mais `products: []`

**Cause probable** : la branche TYPE 1 dans search-assist détecte bien le produit mais le pipeline de qualification s'exécute quand même par dessus et écrase la réponse. Inversion d'ordre des branches dans `searchAssistRouter.post`.

**Sévérité** : critique pour la démo.

---

## Friction #3 — Pas de critère COULEUR ni OCCASION pour les vins

**Constat** : sur Caves Forty-Two, l'univers VIN_ROUGE généré a 6 critères : ACCORD (poids 30, required), CEPAGE (13), GARDE (14), REGION (14), PROFIL (14), BUDGET (15). Aucune couleur ni occasion.

**Cause** :
- Le critère COULEUR est *invisible* car l'algo a séparé en 4 univers (rouge, blanc, rosé, doux). Dans VIN_ROUGE, tous les produits ont `couleur=rouge`, donc variance=0, l'algo skippe la spec.
- Le critère OCCASION n'apparaît que sur 6 produits du catalogue (`occasion: "cadeau"`). Variance trop faible, ignoré.

**Conséquence métier** : un client qui dit "je veux un rouge ou un blanc selon le plat" ne sera traité dans qu'un seul univers. Un client qui dit "c'est un cadeau" ne déclenche aucun signal de qualification.

**Sévérité** : haute. C'est une limite fondamentale de l'approche "auto-config par variance des specs". Le métier ne se déduit pas mécaniquement.

**Fix proposé** :
- Permettre une couche de configuration par store déposable en JSON pour ajouter/forcer des critères que l'algo ne devine pas.
- Ne pas découper les univers par valeur d'une spec mais par rayon métier.

---

## Friction #4 — Filtre région non strict

**Constat** : [s04-loire-mer.json](caves-forty-two/results/s04-loire-mer.json) : "Un blanc de Loire pour des fruits de mer" → recommandations Picpoul (Languedoc), Muscadet (Loire ✓), Verdejo (Espagne).

Le filtre "Loire" exprimé par le client est traité comme un signal mou, pas comme une contrainte. Le scoring laisse passer des candidats hors région.

**Sévérité** : moyenne. Côté métier ça fait amateur (le caviste sait que "blanc de Loire" est ferme).

**Fix proposé** : marquer certains critères comme "filter" (hard) vs "score" (soft) à la génération.

---

## Friction #5 — Spécifs en CSV concaténées prises pour une valeur unique

**Constat** : dans le catalogue Caves, j'ai mis `"accord": "poisson,fruits de mer,apero"` (string CSV pour qu'un produit ait plusieurs accords). Le générateur d'univers a interprété ça comme **une seule valeur** :

```json
"values": [
  "poisson,fruits de mer,apero",
  "poisson noble,saint-jacques",
  ...
]
```

**Conséquence** : la qualification ne pourra jamais matcher une valeur seule comme "poisson". Le critère est inutilisable.

**Sévérité** : moyenne. Documentation insuffisante du format de specs attendu.

**Fix proposé** :
- Documenter clairement : "les specs multi-valeurs doivent être un array JSON" — et le format CSV doit être éclaté côté importer.
- Améliorer `normalizeProduct` dans catalog-import pour splitter les CSV connus.

---

## Friction #6 — Génération univers : 1 univers par catégorie même si 1-2 produits

**Constat** : Caves a fait 7 univers, dont :
- CREMANT (2 produits)
- PROSECCO (1 produit)
- VIN_DOUX (4 produits)

Atelier a fait 5 univers. Pour Caves, ça segmente trop. CREMANT et PROSECCO devraient être dans CHAMPAGNE_EFFERVESCENT.

**Sévérité** : moyenne.

**Fix proposé** : seuil minimum (ex: 5 produits par univers) ou clustering sémantique des catégories en pré-traitement.

---

## Friction #7 — Détection univers parfois fausse

**Preuves** :
- Atelier [s01-suspension-scandinave.json](atelier-lumiere/results/s01-suspension-scandinave.json) : "Je cherche une suspension scandinave..." → `universe: "LAMPADAIRE"` (devrait être SUSPENSION)
- Caves [s09-cassoulet.json](caves-forty-two/results/s09-cassoulet.json) : "vins puissants et tanniques pour cassoulet" → `universe: "VIN_BLANC"` (devrait être VIN_ROUGE — un blanc tannique n'existe pas)

**Cause probable** : matching keywords sur tous les univers, le premier qui sort en tête gagne, sans vérifier la cohérence sémantique. "tannique" devrait exclure les blancs.

**Sévérité** : haute. Erreur de détection en amont = tout le pipeline derrière est faussé.

---

## Friction #8 — Aucun signal "cadeau / premium" détecté

**Constat** : [s06-cadeau.json](caves-forty-two/results/s06-cadeau.json) : "Je dois offrir une bouteille à mon patron, il aime le vin" → recommandation Picpoul à 11€. Pour un patron.

**Cause** : les patterns "offrir", "cadeau", "patron" ne sont pas dans les déductions générées (faute de variance sur la spec `occasion` dans le catalogue). Aucun signal premium n'est appliqué.

**Sévérité** : critique. C'est exactement le genre de fail démo qui ridiculise l'agent.

**Fix proposé** : avoir un set de déductions "transverses" pour des signaux universels (cadeau, urgent, première fois, débutant, pro, etc.) qui s'appliquent à tous les univers.

---

## Friction #9 — Pas de gestion du multi-tour

**Constat** : [s08-multitour-t1.json + t2](caves-forty-two/results/s08-multitour-t1.json) : "vin pour poulet rôti" → question. Tour 2 "finalement c'est plutôt pour des huîtres" → `universe: null`, score remis à 0, contexte perdu.

**Cause** : le signal "finalement" devrait déclencher une transition `need_change` dans la state machine. La FSM existe ([packages/smart-search/src/state-machine.ts](packages/smart-search/src/state-machine.ts)) mais n'est apparemment pas branchée à search-assist (à creuser).

**Sévérité** : haute pour un agent qui se veut conversationnel.

---

## Friction #10 — Ton de l'agent non-personnalisable

**Constat** : Caves veut tutoyer ses clients ("tu m'as bu un Châteauneuf"), Atelier veut vouvoyer ("vous avez quelle hauteur sous plafond ?"). Aucun mécanisme dans la config store ne permet de spécifier ce paramètre.

**Cause** : le ton est codé dans les prompts LLM ([search-assist.ts:513-568](apps/api/src/routes/search-assist.ts#L513) buildSystemPrompt) et dans QUESTION_TEMPLATES. Pas de variable lue depuis `stores.config`.

**Sévérité** : moyenne pour le greffage initial. Critique pour la commercialisation (chaque marchand veut sa marque de fabrique).

**Fix proposé** : `stores.config` lu et injecté dans le system prompt. Champs : `tone` (tu/vous), `brand_voice` (texte libre), `signature` (signature de fin).

---

## Friction #11 — Hors scope non géré

**Constat** : [s07-whisky.json](caves-forty-two/results/s07-whisky.json) : "Vous avez du whisky ?" sur un caviste qui ne fait que du vin → l'agent répond "C'est pour un usage occasionnel ou plus régulier ?" comme si de rien n'était. Il devrait dire "On ne fait que du vin chez Caves Forty-Two".

**Sévérité** : moyenne. Bug de robustesse.

---

## Friction #12 — Génération univers lente (mais OK pour onboarding)

- Caves : 114s pour 7 univers (~16s/univers)
- Atelier : 151s pour 5 univers (~30s/univers)

C'est lent mais acceptable pour un onboarding une-fois. Pas bloquant.

**Cause** : appel LLM séquentiel par catégorie pour enrichir keywords + déductions. Parallélisable.

---

## Friction #13 — Taxonomie d'usages globale, jamais étendue par univers nouveau

**Constat** : la table `usage_taxonomy` contient 20 entrées globales, partagées entre tous les stores. Pour les vins ou les luminaires, **rien**. Aucun outil dans l'onboarding ne déclenche la création d'usages métier.

Pourtant, le Tome 3 §3.6 décrit explicitement le process "construction de taxonomie pour un nouvel univers" en 5 étapes (SEED → CLUSTER → VALIDATE → NORMALIZE → ITERATE). Ce process n'a aucune implémentation côté code.

**Sévérité** : haute. Sans usages métier, le pipeline TYPE 2 est aveugle.

**Fix proposé** : intégrer dans `universe-gen` une étape supplémentaire qui scrape ou demande au LLM de générer une taxonomie d'usages pour la catégorie, et l'insère dans `usage_taxonomy` (avec un champ `store_id` pour scoper).

---

## Ce qui FONCTIONNE bien

Pour ne pas être que négatif :

1. **Création store / Import catalogue** : 100% fonctionnel, robuste, rapide.
2. **Multi-tenant + isolation** : un store nouveau ne casse pas les anciens (vérifié, le store legacy `test-api-key` continue de répondre normalement).
3. **Auto-extraction des specs** : les champs spec libres dans le catalogue sont auto-extraits et exposés au moteur. Bien pensé.
4. **Génération univers : la moitié du chemin** : structurellement, l'algo produit quelque chose d'exploitable (univers, critères, déductions, mots-clés), même si le contenu est imparfait.
5. **Performance** : 50-200ms par tour de conversation, c'est très bien.
6. **Quelques scénarios marchent partiellement** : S4 Caves (Loire/fruits de mer) sort bien Muscadet en tête. S10 Atelier (mid-century) trouve des suspensions plausibles.

---

## Plan de remédiation suggéré (par priorité)

| Priorité | Friction | Effort estimé | Impact |
|---|---|---|---|
| **P0** | #1 Questions hardcodées | 1-2h | Débloque 100% des univers nouveaux |
| **P0** | #2 TYPE 1 ne sort pas le produit | 1-2h | Cas le plus simple doit marcher |
| **P1** | #8 Signaux universels (cadeau, premium) | 2-4h | Fail démo |
| **P1** | #7 Détection univers cohérente | 4-8h | Fondation du pipeline |
| **P1** | #10 Ton personnalisable par store | 2-4h | Commercialisation |
| **P2** | #5 Format specs CSV | 1h | Documentation + parser |
| **P2** | #4 Filtres durs vs scores | 2-4h | Qualité reco |
| **P2** | #9 Multi-tour fonctionnel | 4-8h | Annexe B B1 du Tome 3 |
| **P3** | #3 Couche config marchand | 4-8h | Ergonomie onboarding |
| **P3** | #6 Cluster univers semantiquement | 2-4h | Cosmétique |
| **P3** | #11 Hors scope | 2-3h | Robustesse |
| **P3** | #13 Taxonomie d'usages par univers | 8-16h | Tome 3 §3.6 |

**Verdict actionnable** : avec ~20-30h de travail focalisé sur P0+P1, le greffage zéro-code devient viable pour une démo investisseur. Sans ça, chaque nouveau store nécessite une heure d'édition de `search-assist.ts` minimum.

---

## Annexe : artefacts pour rejouer

```
onboarding-tests/
├── README.md                              # Présentation
├── FRICTIONS.md                           # Ce document
├── caves-forty-two/
│   ├── profile.md                         # Persona, ton, catégories
│   ├── import.sh                          # Greffage reproductible
│   ├── .api-key                           # API key du store créé
│   ├── config/
│   │   ├── catalogue.json                 # 80 vins
│   │   ├── expected-taxonomy.json         # Usages métier attendus
│   │   └── test-scenarios.md              # 9 scénarios
│   └── results/
│       ├── _credentials.txt
│       ├── _universes-generated.json      # Réponse de POST /universe/generate
│       └── s01..s09-*.json                # Une réponse JSON par scénario
└── atelier-lumiere/
    └── (même structure, 60 luminaires, 4 scénarios joués)
```

Pour rejouer un scénario à la main :

```bash
KEY=$(cat onboarding-tests/caves-forty-two/.api-key)
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $KEY" \
  -d '{"message":"Je cherche un vin rouge pour accompagner un magret de canard"}' \
  http://localhost:3003/api/search/assist | jq
```
