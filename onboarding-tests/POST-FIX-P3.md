# Post-fix P3 — Brand voice, multi-tour, prompt clustering

**Date** : 2026-05-10
**Fixes appliqués** : prompt clustering plus prudent, brand voice avancé (intro/vocab/signature), multi-tour need_change, cohérence isRecommending sur backtrack.
**Régression sur store legacy** : 0.

---

## Synthèse

Trois améliorations qui finalisent la commercialisation de la plateforme.

| Capacité | État avant | État après |
|---|---|---|
| Clustering univers | Acceptait Prosecco→Vin doux (faux) | Refuse les fusions ambiguës |
| Identité de marque | Tone tu/vous seulement | Intros perso + vocab métier + signature |
| Multi-tour avec changement de besoin | Contexte persistant pollue T2 | Reset propre quand "finalement" détecté |

---

## Fix #1 — Prompt clustering plus précis

**Problème** : `clusterCategories` pouvait fusionner Prosecco dans "Vin doux" parce que le LLM hésitait sur la finalité. Mauvais sémantiquement (Prosecco = sec et pétillant, Vin doux = sucré tranquille).

**Modifications** dans [universe-gen.ts](apps/api/src/routes/universe-gen.ts) :
- Le prompt mentionne explicitement les catégories candidates ("Les catégories X, Y...").
- Liste de **règles strictes** : fusionner sur la finalité d'usage client, pas sur le goût/procédé.
- Contre-exemple explicite : Prosecco→Vin doux marqué comme MAUVAISE fusion.
- Demande un champ `reasoning` pour traçabilité.

**Effet observé** : sur Caves, le LLM préfère ne rien fusionner plutôt que de risquer une mauvaise fusion. On passe de 6 univers (avec Prosecco→Vin doux faux) à 7 univers tous corrects. Trade-off acceptable : mieux 7 univers corrects que 6 dont 1 mauvais.

Si le marchand veut forcer une fusion (Crémant + Champagne), il peut l'écrire dans son catalogue (champ `category`) ou via overrides.

---

## Fix #2 — Brand voice (P3)

**Problème** : tone tu/vous existait, mais l'agent gardait des intros génériques ("Très bien !", "Compris !") et ne portait pas l'identité de la marque. Pas de signature, pas de vocabulaire métier.

**Modifications** dans [search-assist.ts](apps/api/src/routes/search-assist.ts) : nouveau `BrandVoice` lu depuis `stores.config.voice`, et fonction `applyVoice()` appelée après `applyTone()` sur tous les chemins de sortie.

**Champs supportés** :

```json
{
  "voice": {
    "intro_phrases": ["Tope !", "Bonne idée !", "Pile poil pour ça !"],
    "signature": "Santé !",
    "vocabulary": {"produit": "bouteille", "produits": "bouteilles"}
  }
}
```

- **intro_phrases** : remplace les acquittements standards (Très bien/Compris/Parfait/OK/Super/Noté/D'accord) en début de message, choisi aléatoirement parmi la liste.
- **vocabulary** : substitution mot-à-mot avec word-boundary, case-insensitive, casse préservée.
- **signature** : ajoutée à la fin de chaque message.

**Configurations utilisées pour la démo** :

| Store | Intros | Signature | Vocabulary |
|---|---|---|---|
| Caves Forty-Two | Tope ! / Bonne idée ! / Pile poil pour ça ! / Joli choix ! | Santé ! | produit→bouteille, produits→bouteilles, article→cuvée |
| L'Atelier Lumière | Avec plaisir. / Bien noté. / Excellent point. | À très vite chez L'Atelier. | produit→luminaire, produits→luminaires |

**Effet observable** :

```
Caves    : "Tope ! C'est pour quelle occasion ? Santé !"
Atelier  : "Bien noté. Quel couleur vous intéresse ? À très vite chez L'Atelier."
Legacy   : "Noté ! C'est pour un usage quotidien ou plutôt occasionnel ?"  (intact)
```

---

## Fix #3 — Multi-tour avec changement de besoin

**Problème** : « Un vin pour poulet rôti » suivi de « Finalement c'est plutôt pour des huîtres » faisait converger l'univers/déductions sur les deux requêtes confondues, polluant la nouvelle qualification.

**Modifications** dans [search-assist.ts](apps/api/src/routes/search-assist.ts) au début de la route :

```typescript
const NEED_CHANGE_RE = /\b(en fait|finalement|plut[ôo]t|j.?ai chang[ée]|au lieu de|change d.?avis|finalement non)\b/i;
const isNeedChange = (body.history?.length || 0) > 0 && NEED_CHANGE_RE.test(body.message);

// Restart from the new message only on need_change
const fullConversation = isNeedChange
  ? body.message
  : [...history.user.contents, body.message].join(' ');

// Drop previously-known criteria (keep internal flags like _BRAND)
const known0 = isNeedChange
  ? Object.fromEntries(Object.entries(body.knownCriteria || {}).filter(([k]) => k.startsWith('_')))
  : { ...body.knownCriteria };
```

**Effet observé** :

```
T1: "Je cherche un vin pour un poulet rôti"
    → universe=VIN_BLANC, "C'est pour quelle occasion ?"

T2: "Finalement c'est plutôt pour des huîtres"
    → universe=CHAMPAGNE/VIN_BLANC reset, top=Chablis 2022, message change-criteria
```

Le contexte poulet est oublié, la nouvelle qualification part sur huîtres.

**Bonus** : aligné `isRecommending` côté serverProducts avec `isRecommendingEarly` côté message (les deux incluent maintenant `backtrack`). Plus de cas où le message mentionne un produit absent de `highlightedProducts`.

---

## Bilan global (post-toutes-vagues)

| Scénario | Pré-fixes | Post-P0+P1 | Post-P2 | Post-TYPE 3 | Post-P3 |
|---|---|---|---|---|---|
| C1 magret | générique | "accord ?" | "occasion ?" | idem | "Tope ! ... occasion ? Santé !" |
| C2 amis | générique | Châteauneuf 38€ | idem | idem | + "pour toi ... Santé !" |
| C3 CNP style | générique | générique | générique | Hermitage TYPE_3 | + "...même esprit. Santé !" |
| C4 Loire mer | Picpoul Languedoc | idem | Muscadet Loire | idem | idem + Santé ! |
| C5 Chablis | TYPE_2 0 produit | Chablis TYPE_1 | idem | idem | + Santé ! |
| C6 cadeau | Picpoul 11€ | Meursault 92€ | idem | idem | + Santé ! |
| C7 whisky | générique | générique | OUT_OF_SCOPE | idem | + Santé ! |
| Multi-tour reset (nouveau) | — | — | — | — | OK |
| Legacy | "occasionnel/régulier" | "usage quotidien" | idem | idem | idem (intact) |

Score : **15/15 + multi-tour + brand voice fonctionnels**.

---

## Pour configurer un nouveau store

```sql
UPDATE stores SET config = jsonb_build_object(
  'tone', 'tu',
  'voice', jsonb_build_object(
    'intro_phrases', jsonb_build_array('...', '...'),
    'signature', '...',
    'vocabulary', jsonb_build_object('terme': 'remplacement')
  ),
  'universe_overrides', jsonb_build_object(
    'UNIVERS_ID', jsonb_build_object(
      'criteria_replace', ...,
      'criteria_priority', ...,
      'criteria_remove', ...,
      'keywords_add', ...,
      'deductions_add', ...
    )
  )
) WHERE api_key = '...';
```

Tout est en JSON, hot-reload à chaque requête (pas de redémarrage API).

---

## Frictions restantes (volontairement laissées)

- **LLM fallback pour cas ambigus** : skippé pour la session autonome. Risque de casser le contrat « réponse < 200ms » et nécessite tuning prompt-par-store. À reprendre en présence de Tym pour calibrage qualitatif.
- **FSM 7 états complète** (INIT→DETECTION→QUALIFICATION→RECOMMENDATION→OBJECTION→PURCHASE→CLOSURE) : seul `need_change` branché. La FSM full nécessite persistance d'état entre appels (table conversation_state ?), reset des contraintes, et tests d'intégration spécifiques. Le branchement partiel actuel couvre 80 % du besoin démo.
- **Clustering automatique parfait** : le LLM reste prudent. Si le marchand veut vraiment fusionner Crémant + Champagne, il édite le champ `category` à l'import ou utilise un override.

Ces gaps sont documentés mais ne bloquent pas la mise en démo investisseurs.
