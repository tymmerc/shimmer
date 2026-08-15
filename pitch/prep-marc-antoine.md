# Prep visio Marc-Antoine — 30 juin 15h00 (30 min)

## Qui est en face
Marc-Antoine Bouteille-Torre, fondateur de **The Impacters** (podcast + newsletter). Plus un **connecteur** qu'un VC classique. Il t'aide déjà sur des pistes emploi (IGESA, Wennhack, Orsini) ET il a un **client e-commerce** intéressé par Shimmer. Il a demandé une démo et comment Shimmer se positionne vs **lemrock.com**.

**La vraie opportunité concrète de ce call : transformer SON client e-commerce en premier pilote.** Garde ça en tête, c'est ça l'ask.

---

## 1. Positionnement vs Lemrock (la question piège)

**Lemrock = agentic commerce.** Ils rendent ton catalogue visible et vendable DANS les IA externes (ChatGPT, Perplexity, Gemini, Mistral). C'est un canal d'**acquisition** : être trouvé quand le consommateur shoppe via une IA. Jeu de volume mondial (10M produits, 1B requêtes/an, « 10x ROAS »).

**Shimmer = le cerveau opérationnel de TA boutique.** Une fois le visiteur chez toi : vendeur conversationnel, SAV, relances paniers, avis, campagnes, et mesure honnête.

**La phrase à dire :**
> « Lemrock t'amène le client depuis ChatGPT. Shimmer fait performer ta boutique une fois qu'il y est, et prouve à l'euro ce que ça rapporte. Eux, canal d'acquisition agentique ; nous, le cerveau de ta propre boutique. On est complémentaires, on peut même être en aval d'eux. »

**3 différenciateurs (qui parlent à un investisseur français/impact) :**
1. **Souveraineté** — données + IA en France, LLM local, zéro dépendance OpenAI. Lemrock te branche sur l'écosystème US.
2. **Mesure honnête** — le holdout. On ne facture que l'effet prouvé. Personne ne fait ça, surtout pas ceux qui claironnent « 10x ROAS ».
3. **Cible** — PME/ETI françaises qui veulent mieux opérer leur boutique, pas le scale mondial.

---

## 2. Runbook démo (≈ 30 min, partage d'écran Mac)

### Pré-vol (à faire AVANT le call, onglets prêts)
- [ ] Hard refresh `tymmerc.eu/shimmer/` (cache 5 min) pour le hero à jour.
- [ ] Onglet **/shimmer/demo/** ouvert.
- [ ] Onglet **/shimmer/admin/** : déjà connecté avec la clé démo (Caves Forty-Two). Sinon tu perds 1 min à te logger en live.
- [ ] Onglet **/shimmer/lab/** : la clé démo est préremplie, vérifie que les pastilles d'état sont vertes/oranges (pas « API injoignable »).
- [ ] Vérifier que l'API tourne : `systemctl is-active shimmer-api` doit dire `active`.
- [ ] Fermer Slack/mail/notifs. Tester le partage d'écran 5 min avant.

### Déroulé minute par minute
**0-2 min — Cadre.** « Je te montre Shimmer en live 12 min, puis je réponds à tout. »

**2-5 min — Problème + positionnement.** Le marchand jongle avec 8 outils (vendeur, SAV, avis, mails, relances) et ne sait pas ce qui rapporte. Puis la phrase Lemrock ci-dessus.

**5-15 min — Démo (récit "côté client / côté marchand")**
1. **/shimmer/** : 20s sur le hero, le pitch visuel.
2. **/shimmer/demo/** : clique un preset du **vendeur** (« rouge barbecue ») → réponse + bouteilles **instantanées**. Puis montre cross-sell, avis, SAV, mesure. C'est le récit.
3. **/shimmer/admin/** : le back-office. Bascule le **rôle** (Vente / Relation client / Marketing) → « chaque équipe voit sa vue ». C'est ce que vit le marchand.

**15-20 min — "C'est pas un mockup" → /shimmer/lab/.** LE moment preuve.
- Lance **Holdout · Visiteur A** puis **Visiteur B** → le bloc bascule TÉMOIN / TRAITÉ en direct. Visuel, instantané, ça prouve la mesure.
- Lance **Panier abandonné** → vraie donnée créée + 2 relances programmées (regarde la file en haut passer à « planifiés +2 »).
- Lance **Ticket SAV** → fiche ticket instantanée.
- ⚠️ **NE LANCE PAS** Vendeur IA / Triage mail / Campagne dans le lab en live : ils passent par l'IA locale, 30-60s de silence. Si tu veux les montrer, lance-les 1 min AVANT le call et laisse le résultat à l'écran.

**20-25 min — La mesure honnête (ton arme).** Le holdout : 10% des visiteurs ne voient jamais Shimmer, on compare, on facture sur l'écart prouvé. Modèle éco : un fixe plancher + % du CA additionnel mesuré, capé. Pas d'effet = pas de facture. C'est l'anti-bullshit, c'est ce qui crée la confiance.

**25-30 min — Souveraineté + l'ask.** Données/LLM en France. Puis : « Ton client e-commerce, on en fait le premier pilote ? 30 min pour brancher, 6 semaines, gratuit tant qu'on n'a pas prouvé l'effet. »

---

## 3. Q&A investisseur (les 8 questions)

**« Lemrock ne fait pas déjà ça ? »**
Non, canal différent (acquisition dans les IA externes vs cerveau de ta boutique). Complémentaires.

**« Combien de clients ? »** (assume, ne mens pas)
Zéro pour l'instant, je suis en phase pilote. Le produit est prêt, mes boutiques de démo prouvent chaque brique de bout en bout, et je monte mon pipeline de pilotes (j'ai déjà sondé des boîtes à Ajaccio). Je cherche mes 3 premiers pilotes — ton client e-commerce serait parfait.

**« Comment tu gagnes de l'argent ? »**
Facturation sur l'incrémental prouvé par holdout : un fixe plancher + un % du CA additionnel mesuré, plafonné. Pas d'effet prouvé = pas de facture. Aligné sur le résultat du marchand.

**« Pourquoi local / France ? »**
Souveraineté des données (RGPD natif), pas de dépendance à OpenAI, coût maîtrisé. Argument fort pour les PME françaises et pour un fonds impact.

**« C'est défendable ? un dev peut copier en un week-end ? »**
La barrière, c'est la donnée accumulée par boutique (base de connaissance + holdout + corrections du marchand qui affinent le ton) et la mesure rigoureuse. Le code se copie, pas la boucle de données ni la confiance qu'elle crée.

**« Pourquoi toi ? »**
J'ai tout construit seul : full-stack, IA, infra (serveur, LLM local, SDK navigateur). Vélocité d'exécution, je livre vite.

**« C'est quoi ton marché ? »**
PME/ETI e-commerce françaises qui jonglent avec une pile d'outils et ne savent pas ce qui convertit. Je remplace la pile par un seul cerveau, et je mesure.

**« Tu lèves ? combien ? »**
(à clarifier avec toi — ce call ressemble plus à une intro/feedback + opportunité de pilote qu'à une vraie levée. Cadre l'ask sur : intro à des e-commerçants + son client comme pilote. Si lui pousse vers l'investissement, écoute, mais ne sur-vends pas un tour que tu ne prépares pas.)

---

## 4. Ce qu'il NE faut PAS faire / montrer
- Ne pas lancer les automatisations IA du /lab/ en direct (lenteur).
- Ne pas prétendre avoir des clients payants.
- Ne pas promettre l'envoi d'emails réels en prod : aujourd'hui c'est en mode démo (mock) tant que la clé Resend n'est pas posée. Si on te demande, dis « la mécanique d'envoi est prête, je branche le provider au premier pilote ».
- Ne pas t'éparpiller sur les 9 modules : montre 3-4 briques à fond plutôt que tout survoler.
