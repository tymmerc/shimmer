# Call Marc-Antoine · mardi 15/09 · 16h30 (Meet envoyé par mail juste avant)

À garder ouvert pendant le call. Une ligne = une munition.

---

## Le cadre : c'est un CLOSING, pas un pitch

- Juillet : son client a **validé le bot commercial**. La friction c'était les **500 € d'install**.
- Il est revenu motivé ("toujours partant bien sûr").
- **Ton ouverture, dans les 5 premières minutes** : "Depuis juillet j'ai simplifié : pour les premiers, **install offerte et premier mois offert**. Ensuite 89 €/mois gelé à vie + 5 % uniquement sur le chiffre en plus qu'on prouve." La friction n'existe plus.

## La phrase (si on te demande ce qu'est Shimmer)

> L'employé numérique des boutiques indépendantes : il vend, il répond, il relance et il dit quoi réassortir. Et il n'est payé que sur ce qu'il prouve avoir rapporté.

Le fil rouge à dire avec conviction : **on ne dit jamais un chiffre qu'on ne peut pas prouver.** 10 % de visiteurs témoins, on facture l'écart mesuré, commande par commande. Pas d'effet = juste le forfait.

Son angle à lui : sa signature dit "**IA sobre**". Place "IA locale, hébergée en France, sobre par construction". C'est son vocabulaire.

## L'offre beta (les chiffres exacts)

- Install + 1er mois : **offerts**
- Ensuite : **89 €/mois gelé à vie + 5 % du CA additionnel prouvé**, sans plafond
- Sans engagement, réversible en 1 minute
- En échange : 30 min pour brancher, un point tous les 15 jours, citation en référence à 90 j si les chiffres sont bons

## La démo (12 min max, onglets prêts AVANT)

1. `tymmerc.eu/shimmer/` (hard refresh avant)
2. `/shimmer/demo/` : presets scriptés, instantanés, zéro risque
3. `/shimmer/admin/` (connecté d'avance) : l'Accueil montre **472,88 € prouvés, facture 112,64 €**. C'est le modèle éco en une image. Puis Preuve et Réassort.
4. Vendeur live seulement si ça roule, avec UNE de ces 3 questions (préchauffées, réponse instantanée) :
   - "un rouge pour un barbecue"
   - "un vin pour offrir"
   - "un blanc pour des huîtres"

**À ne pas faire** : lancer les automatisations IA du /lab/ en direct (30-60 s de silence), prétendre avoir des clients payants, t'éparpiller sur les 9 modules.

## L'implémentation concrète (sa question probable)

La version 30 secondes :
> "Une visio de 30 minutes avec ton client, je fais tout devant lui. Un : je crée sa boutique et j'importe son catalogue (export CSV Shopify). Deux : il colle UNE ligne de code dans son thème, comme un Google Analytics. Trois : 4 webhooks en copier-coller dans son admin Shopify. Rien à coder de son côté, on ne touche ni au thème ni au checkout. Semaine 1 : le widget est invisible, il écoute. J+7 : on relit les réponses ensemble, on cale le ton, et c'est LUI qui allume."

Les détails si il creuse :
- **La ligne** : Admin Shopify → Boutique en ligne → Thèmes → Modifier le code → `layout/theme.liquid` → juste avant `</body>` → coller le script → Enregistrer. Retirer = supprimer 5 lignes.
- **Deux canaux séparés** : la ligne = le vendeur (le widget). Les webhooks = les données (commandes, paniers, stock) pour les relances et la preuve. Indépendants.
- **Sécurité** : si mon serveur tombe, sa recherche redevient la recherche classique automatiquement. Le script ne peut pas casser la page.

Si "c'est testé ?" :
> "La mécanique complète est testée de bout en bout sur mes boutiques de test, avec de vrais événements Shopify simulés. Ton client serait le premier branchement réel, et c'est exactement pour ça que c'est construit comme ça : j'installe moi-même, la première semaine est invisible pour ses clients pendant que je vérifie tout, et le premier mois est offert. Les plâtres, c'est moi qui les essuie, en silencieux."

## Cookies / RGPD (si ça vient)

- Le widget détecte sa bannière de consentement tout seul. Un visiteur qui refuse a quand même le vendeur, il sort juste de la mesure.
- Refuseur qui achète : sa vente compte dans le CA du marchand, on ne se l'attribue juste pas. **"Chaque vente qu'on ne peut pas s'attribuer, c'est MA facture qui baisse, pas la sienne. Le doute profite toujours au marchand."**
- Exception : s'il donne son email au vendeur (retour de stock, SAV), on retrouve sa commande par l'email, proprement.

## Objections éclair

- **Lemrock ?** "Eux t'amènent le client depuis ChatGPT, nous on fait performer ta boutique une fois qu'il y est. Complémentaires."
- **Combien de clients ?** "Tu serais le premier, c'est pour ça que l'offre est gelée à vie. Et le produit est prouvable de bout en bout, regarde." (jamais mentir)
- **Ça touche au site ?** "Une ligne, réversible en une minute, ni thème ni checkout, semaine 1 invisible."
- **Comment on sait que ça marche ?** "Tu ne me crois pas sur parole : groupe témoin, écart mesuré sur ses propres commandes, facture uniquement là-dessus."
- **Emails réels ?** "La mécanique est prête, j'active le fournisseur d'envoi le jour de l'install."

## L'ASK (ne raccroche pas sans)

> "On cale 30 minutes avec ton client cette semaine ou la prochaine ?"

Minimum vital si le client n'est pas dispo : son **nom**, sa **plateforme** (Shopify ?), et l'accord que Marc-Antoine fasse **l'intro par mail aujourd'hui**.

## Après le call

Me raconter. Si GO : je monte une vraie boutique Shopify de test (plan dev gratuit) pour essuyer les plâtres de thème AVANT d'aller chez son client, et je prépare l'install (store, clés, webhooks).
