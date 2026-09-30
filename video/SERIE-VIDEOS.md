# Série vidéo Shimmer : plan final

30/09/2026. Remplace le plan de travail du matin et ses deux relectures (honnêteté, commercial). Tout a été revérifié en lecture seule dans le code, les chemins sont relatifs à `/opt/shimmer` sauf mention contraire. Aucun rendu, aucun appel LLM, rien touché dans `video/music` ni `video/out`.

Le film 1 (POV cave à vin, 62 s, `video/src/pov2`) est validé par Tym. Il en veut d'autres pour le reste des fonctions (HANDOFF.md:80). Ce document dit lesquelles on peut filmer sans mentir, dans quel ordre, et ce qu'il faut régler avant.

## 0. La musique (la demande de Tym)

**Film 1 : c'est fait, mais pas encore en ligne.**

- Une autre session l'a composée ce matin, entièrement par code (numpy, aucun échantillon), donc libre de droits (`video/music/README.md:3-4`). 112,3 BPM en demi-temps, l'accord de Fa n'arrive qu'à la révélation de « Shimmer. », une clochette sur le texto puis sur l'email. Les repères suivent le montage tout seuls : `video/music/cues.py` lit `src/pov2/timeline.ts`.
- Le film avec musique existe : `video/out/shimmer-pov-v6.mp4` (07:37, 61,97 s). Mesuré : niveau moyen -17,2 dB, crête -2,6 dB, après normalisation à -16 LUFS (`video/music/normalize.py:9`).
- Par contre `video/out/shimmer-pov.mp4` (02:24) et sa copie `apps/showcase-dev/film/shimmer-pov.mp4` (07:03) portent une piste audio muette (-91 dB mesuré). Donc dev.tymmerc.eu/shimmer/film/ ne joue encore aucune musique, même si HANDOFF.md:79 dit « avec musique ». La mise en ligne revient à la session musique, on ne touche à rien en parallèle.
- Côté Tym : écouter la v6. Il a demandé une « petite musique en fond ». Sans voix off, la musique est la seule piste, et -16 LUFS c'est le niveau courant sur le web (les plateformes renormalisent de toute façon vers -14). Si elle paraît trop présente, ça se règle en une ligne : la cible `I=-16` de `normalize.py:9` (passer à -19 ou -20), ou un arrangement plus dépouillé.

**Pour la série**

- Même moteur, un fichier de repères par film. `cues.py` est câblé sur `pov2/timeline.ts`, on le paramètre une fois la session musique terminée.
- Même signature pour que les films sonnent comme une famille : Fa à la révélation, clochette à chaque message reçu (réponse du chat dans le film 2, email dans le film 4).
- Texture par film : film 2 soir calme, film 3 plus sec, film 4 plus rythmé, film 5 léger.
- Premier accent musical sur le moment du gain, pas avant : vers 11 s dans le film 2, dès l'ouverture dans le film 4, au passage à « prouvé » dans le film 3.
- Chaque film doit se comprendre sans le son. Sur LinkedIn et Instagram la vidéo démarre muette, c'est la bande de pensées qui porte tout. Pas de voix off, comme le film 1 (l'ancien brief de juillet en prévoyait une, mais disait déjà « pas de musique forte », `pitch/video-script.md:3`).

## 1. Les fonctions : promis, codé, en prod, filmable

« Inventaire » = constat de l'inventaire du matin, pas revérifié ici.

| Fonction                                                             | Promis                                                                      | Codé                                                                               | En prod                                | Filmable                      | Pourquoi (fichier:ligne)                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vendeur dans la barre de recherche                                   | site, film 1                                                                | oui                                                                                | oui                                    | oui, c'est le film 1          | 8 s de réponse au calme, 20 à 60 s machine chargée (HANDOFF.md:81)                                                                                                                                                                                                           |
| Question d'affinage + puces                                          | site                                                                        | oui                                                                                | oui                                    | sur une cave seulement        | puces figées sur le vin (`sdk/src/shimmer.ts:918`), « Avec plaisir. » écrit en dur (:917)                                                                                                                                                                                    |
| Épuisé : encart + inscription                                        | film 1                                                                      | oui                                                                                | oui                                    | l'écran oui, la suite non     | inscription rangée sous `local:<id>` (shimmer.ts:1024) car aucun code n'écrit `Product.platformProductId` ; l'envoi ne cherche que la variante et `p:<id>` (`apps/api/src/lib/stock-alerts.ts:212-213`)                                                                      |
| Email « est de retour »                                              | film 1                                                                      | oui (stock-alerts.ts:109-123)                                                      | non, simulé                            | reconstitué seulement         | pas de `RESEND_API_KEY` (`packages/email-connector/src/index.ts:45`, :185-191)                                                                                                                                                                                               |
| Écran Réassort                                                       | admin                                                                       | oui (`apps/site/src/components/admin/AdminRestock.tsx:62-106`)                     | oui                                    | après E1 et E3                | « Prévenus » compte aussi les emails simulés ou échoués (stock-alerts.ts:234-244, email-connector :198-205)                                                                                                                                                                  |
| Stock lu par le vendeur                                              | site                                                                        | partiel                                                                            | partiel                                | ne jamais dire « temps réel » | lit `Product.stock` (`packages/chatbot/src/sales-assistant.ts:210-216`), rempli par l'import CSV, 999 par défaut (`apps/api/src/routes/catalog-import.ts:163`) ; les webhooks Shopify écrivent ailleurs (`apps/api/src/routes/webhooks-shopify.ts:439-466`)                  |
| Suivi de colis dans la bulle                                         | `Pillars.tsx:203`                                                           | oui, réponse écrite par le code (`packages/chatbot/src/order-tracking.ts:388-431`) | oui depuis le 29/09                    | oui, film 2                   | lien de suivi Shopify seulement ; sur Woo « a été expédiée » (:400-401) ; bulle en option                                                                                                                                                                                    |
| Autres questions SAV (retour, échange)                               | `Pillars.tsx:203` « répond seul »                                           | non                                                                                | non                                    | non                           | part à l'ancien assistant avec « Qualification: X% » (shimmer.ts:1207-1265, :1177)                                                                                                                                                                                           |
| Escalade vers un conseiller                                          | chat                                                                        | partiel                                                                            | promesse sans suite                    | non                           | « Un instant s'il vous plaît » (`packages/chatbot/src/sav-assistant.ts:148`), personne n'est prévenu                                                                                                                                                                         |
| Preuve du vendeur par groupe témoin                                  | site, admin                                                                 | oui (`apps/api/src/lib/holdout/lift.ts`, `proof.ts`)                               | oui, Shopify seulement                 | après D1                      | écran « 30 derniers jours » (`AdminOverview.tsx:173`) mais `/proof` appelé sans période, donc cumul depuis le début (AdminOverview.tsx:63, `apps/api/src/routes/holdout.ts:160-177`)                                                                                         |
| Facture 89 € + 5 %                                                   | offre pilote                                                                | oui (holdout.ts:220-227)                                                           | oui                                    | oui, `capEUR: null` posé      | sans réglage, plafond 267 € (holdout.ts:227) ; « Facture ce mois » faussé par D1                                                                                                                                                                                             |
| Retour de stock compté « prouvé »                                    | AdminRestock.tsx:106                                                        | oui (proof.ts:142-145)                                                             | oui                                    | pas comme « prouvé »          | ajouté au prouvé facturé sans groupe témoin, voir décision 7                                                                                                                                                                                                                 |
| Relances paniers                                                     | `Satellites.tsx:57` « dans votre ton »                                      | partiel                                                                            | simulé                                 | non                           | pas de lien vers le panier (`apps/api/src/lib/automations/cart-reminders.ts:69-87`), code SHIMMER10 jamais créé (:85), « Mail envoyé » même simulé (`AdminCarts.tsx:82`), « 189.00€ » (cart-reminders.ts:79, AdminCarts.tsx:110), textes fixes                               |
| Réglage du ton                                                       | admin                                                                       | partiel                                                                            | partiel                                | pas maintenant                | « Neutre » refusé en 400 (`apps/api/src/routes/stores.ts:79` contre AdminSettings.tsx:16, :27, :41) ; phrase d'intro facultative (sales-assistant.ts:561-562) ; cache 12 h qui ignore le ton (:240, :458-460) ; sous-titre qui promet les emails (AdminSettings.tsx:104-106) |
| Script en une ligne                                                  | `HowItWorks.tsx:20`                                                         | oui (`AdminIntegration.tsx:143-148`)                                               | oui                                    | oui, film 5                   | il faut aussi importer le catalogue et passer en phase `live` (`apps/api/src/routes/chat.ts:81-87`), c'est l'équipe qui le fait                                                                                                                                              |
| Consentement cookies                                                 | AdminIntegration.tsx:152                                                    | oui (shimmer.ts:40-52)                                                             | oui                                    | avec condition                | sans bandeau reconnu, consentement supposé au bout de 3 s, cookie 365 j (:1420)                                                                                                                                                                                              |
| « Voir les résultats classiques → »                                  |                                                                             | oui (shimmer.ts:893-895)                                                           | oui                                    | oui                           | seulement si la barre est dans un `<form>`                                                                                                                                                                                                                                   |
| Couleurs de la boutique                                              | film 1 (script.ts:95)                                                       | pas en automatique                                                                 |                                        | non                           | indigo #6366f1 par défaut (shimmer.ts:219), le script en une ligne ne passe aucun thème (:2313-2330)                                                                                                                                                                         |
| Semaine d'observation                                                | `HowItWorks.tsx:26`                                                         | non                                                                                | non                                    | non                           | absente du SDK                                                                                                                                                                                                                                                               |
| Avis                                                                 | `AdminReviews.tsx:103-106`                                                  | partiel                                                                            | non                                    | non                           | trier les avis avant Google : avis juridique d'abord ; lien email cassé (inventaire)                                                                                                                                                                                         |
| Tickets SAV                                                          | admin                                                                       | partiel                                                                            | partiel                                | non                           | statuts bruts en anglais (inventaire), le chat n'en crée aucun                                                                                                                                                                                                               |
| Reco sur fiches, campagnes, tri des mails, SMS, relance des inactifs | site                                                                        | non ou pas branché                                                                 | non                                    | non                           | inventaire                                                                                                                                                                                                                                                                   |
| Hébergement                                                          | site : « Données et IA en France » (`SiteFooter.tsx:13`, `app/page.tsx:15`) |                                                                                    | Falkenstein, Allemagne (HANDOFF.md:85) | dire « Europe »               | corriger le site avant de diffuser un film qui y renvoie                                                                                                                                                                                                                     |
| « Pas d'effet, pas de facture »                                      | pitch oral                                                                  |                                                                                    | faux                                   | jamais                        | le forfait est dû dans tous les cas                                                                                                                                                                                                                                          |

## 2. Les films retenus, dans l'ordre de production

Quatre films, plus le kit commun. Ordre de production : **kit, film 2, film 5, film 3, film 4**. On tourne d'abord ce qui marche déjà en prod, et on garde pour la fin ce qui attend des correctifs. La numérotation reste celle du plan du matin pour ne pas tout mélanger ; le film 6 (relances) est coupé, voir plus bas.

### Règles communes

- 1920x1080, 30 images/s (`video/src/Root.tsx`), même grammaire que le film 1 : fond sombre, shader violet, grain, bande de pensées, carton final (logo + accroche + mention démo en petit, comme après les retours de Tym, HANDOFF.md:80). URL vide tant que le domaine n'est pas choisi (script.ts:110).
- **Bande de pensées : 45 caractères max, une idée par ligne.** Elle tient sur une seule ligne en 48 px, `whiteSpace: nowrap` (`video/src/pov2/type.tsx:153`), avec la touche Entrée posée à x=1420 (`Band.tsx:100`). Le film 1 fait 35 caractères en moyenne. Ce qui explique une fonction va dans une annotation en capitales, pas dans la bande.
- Au carton, le verbe du film en italique acide, les autres en romain. Film 3 : pas de verbe mis en avant.
- Générique : « Disponible sur Shopify » pour les films 2, 3 et 4 (lien de suivi, liaison des commandes au groupe témoin et retour de stock passent par les webhooks Shopify). Le film 5 vaut pour Shopify et WooCommerce.
- Délai du vendeur : « Le vendeur réfléchit… » (shimmer.ts:980) reste visible au moins 2 à 3 s. Si on coupe l'attente, « attente raccourcie » au générique. Jamais « instantané ». Seule exception : le film 2, où la réponse vient du code, sans LLM, et peut être montrée en temps réel.
- Emails : tant que Resend et un domaine à nous (SPF/DKIM) ne sont pas en place, tout email montré porte « email reconstitué ». Sans `EMAIL_FROM_DOMAIN`, l'expéditeur serait `no-reply@shimmer.eu` (email-connector index.ts:56), un domaine qui n'est pas à Tym. La carte montre du texte brut, sans image ni bouton.
- « IA hébergée en Europe » : vrai aujourd'hui (Ollama sur le VPS). À retirer le jour où un modèle hors UE est branché.
- Groupe témoin : 10 % des visiteurs qui acceptent les cookies ne voient ni le vendeur ni la bulle (shimmer.ts:2084). Ne jamais dire « tous vos clients ».
- Données de démo : dev et prod passent par la même API et la même base (`/etc/nginx/sites-enabled/12-dev-https.conf:382-383` et `10-main.conf:264`, upstream `shimmer_app`). Les boutiques de tournage vivent donc en prod : identifiant à part, marquées démo, insertion en SQL direct, jamais `prisma db push` (base dérivée du schéma), et **aucun secret de webhook posé dessus** tant que la route `GET /api/stores/:id` n'est pas fermée (décision 1).
- Rendu : un seul à la fois, par tranches (`tools/render.mjs`), jamais en même temps qu'Ollama ou des tests. 15 à 50 min par film selon la charge (constaté sur le film 1).
- Ne jamais filmer : l'écran de connexion (il affiche l'indice `test-api-key`, AdminApp.tsx:257), le panneau « Clé API » (AdminIntegration.tsx:131), le code Liquid avec le secret `sid_` (:163-170), le bandeau Mailgun/Twilio (:83), le sélecteur de rôle.

### Kit commun (0,5 jour)

Rendre paramétrables les pièces du film 1 : Band (lignes), EndCard (verbe mis en avant, mention démo), Annotation, Toxic et Grain, formes de curseur (`ShopTake.tsx`), carte mail (`Life.tsx`), gestion du temps (`timeline.ts`). À créer une fois pour les films 3, 4 et 5 : un composant « capture d'écran + caméra + curseur + surlignage » pour filmer la vraie admin. Le moteur musical par film vient après, quand la session musique a fini.

### Film 2 · « Il arrive quand ? » (suivi de colis)

**Ce qu'il montre.** Une cliente non connectée demande où en est sa commande dans la bulle, donne son numéro et son email, les deux doivent désigner la même commande, et elle reçoit le statut avec le lien de suivi. Réponse écrite par le code, sans IA, sans personne côté boutique. C'est le « répond » de l'accroche, et la seule fonction SAV en prod visible côté client.

**Point de vue.** Client final, même grammaire que le film 1.

**Boutique.** « Grès & Lin », céramique et art de la table, Shopify. Une deuxième boutique montre que Shimmer ne sert pas qu'au vin (sinon tout se passerait chez Caves Forty-Two, voir décision 10).

**Déroulé (environ 36 s, le gain arrive à 11 s)**

1. **0-3 s.** Surtitre « VOTRE BOUTIQUE, CÔTÉ CLIENT ». Carte mail de confirmation générique : « Grès & Lin · Commande #1187 », datée de lundi. Dans un coin, jeudi 21:04.
   Pensée : « Commandé lundi, et aucune nouvelle. »
2. **3-7 s.** Page de la boutique, bulle en bas à droite, clic. La fenêtre s'ouvre sur « Bonjour ! Comment puis-je vous aider ? ». Elle tape « Bonjour, où en est ma commande ? ».
   Pensée : « Il y a une bulle, je tente. »
3. **7-11 s.** Trois points, puis la demande de numéro et d'email. Elle tape « #1187, lea.martin@example.com ».
   Pensée : « Le numéro est dans le mail, facile. »
4. **11-16 s.** Réponse : « Votre commande #1187 est partie hier avec Colissimo. Voici votre suivi. », avec le bouton « ↗ Suivre mon colis (Colissimo) ». Premier accent musical, clochette discrète.
   Pensée : « Partie hier, et j'ai le suivi. »
5. **16-21 s.** Survol du lien, sans clic (on ne montre pas le site du transporteur). Annotation : « LU DANS LA COMMANDE, RIEN D'INVENTÉ ».
6. **21-25 s.** Annotation : « LA BOUTIQUE N'A RIEN EU À FAIRE ».
   Pensée : « Pas besoin d'attendre demain matin. »
7. **25-36 s.** « C'était Shimmer. », puis le carton avec « répond » mis en avant.

On s'arrête sur la réponse de statut. Pas de « merci » de la cliente : le message suivant partirait à l'ancien assistant, avec sa barre « Qualification: X% » (shimmer.ts:1210-1265).

Pas de texto ni d'échéance de samedi : le film 1 a déjà « Barbecue samedi » et « SAMEDI, 20 H 15 » (script.ts:73, :97).

**Écrans et textes réels à reproduire** (`sdk/src/shimmer.ts` sauf mention)

- Bulle : :1112-1117. Fenêtre : :1120-1133. Titre de la fenêtre : :1125 (libellé « Vendeur IA », :238). Champ de saisie : :1131 (« Décrivez ce que vous cherchez... », :239). « Propulsé par Shimmer » : :1129 (:240). Accueil : :1148 (:231). « Envoyer » : :234.
- Aiguillage vers le SAV : :1206-1210. Trois points : :1219. Envoi et rendu de la réponse : :1295-1299. Bouton de suivi : :1365 (libellé :232).
- Détection de la question dans le navigateur : `sdk/src/order-intent.ts:18-27` (motif « où en est » :20).
- Demande de numéro et d'email : `packages/chatbot/src/order-tracking.ts:449`.
- Phrase de statut : order-tracking.ts:380-383 (statut `shipped`) et :355 (« Voici votre suivi. »). Si Shopify transmet l'état « en transit » du colis, c'est la variante « est en route avec Colissimo, elle est partie hier » (:376-377) ; sans info transporteur, c'est `shipped` (`apps/api/src/lib/shopify-fulfillments.ts:59-61`). On tourne `shipped`, le cas le plus courant.
- Couleur : indigo #6366f1 par défaut (shimmer.ts:219). Une autre couleur n'est vraie qu'avec `Shimmer.init({ theme })` sur la boutique de démo.

**Reconstitué.** La boutique, la commande, le mail de confirmation, l'interface (réplique React). Les textes du chat, eux, sont produits par `composeOrderStatusReply` (fonction pure, sans base) avec une date figée, via un petit script tsx qui écrit un fichier de données. Générique : « Boutique et commande de démo, textes du chat produits par le code de Shimmer, interface reconstituée. Suivi de colis sur Shopify, bulle de chat en option. »

**Prérequis avant tournage**

- **Pas de « Livraison prévue demain ».** La date prévue n'est remplie que par une saisie manuelle (`apps/api/src/routes/orders-tracking.ts:166`), jamais par la reprise des colis Shopify (shopify-fulfillments.ts:94-117). Aucun marchand ne l'aurait, donc on ne la met ni dans le fichier de données ni dans les maquettes.
- **Titre et champ de la bulle** (décision 2). Aujourd'hui « Vendeur IA » et « Décrivez ce que vous cherchez... » pour une question de colis.
- **La bulle est une option.** Le script public n'a pas `data-chat` (AdminIntegration.tsx:148), seul le snippet Liquid l'a (:163), et le SDK ne crée la bulle que si l'attribut est là (shimmer.ts:2323). On ne la présente pas comme comprise dans « une ligne ».
- **Mots à éviter dans ce que tape la cliente** : « service client », « conseiller » font partir vers l'escalade et sa fausse promesse (`packages/chatbot/src/escalation.ts`, sav-assistant.ts:148). Le script ci-dessus n'en contient aucun.
- **Une vérification sur dev, machine calme.** Boutique de démo en phase `live` (sinon le chat refuse, chat.ts:81-87), commande et colis insérés en SQL, puis contrôler que la vraie API renvoie exactement le texte du fichier de données. Pas de LLM dans cet appel. Attention aux limites : 3 essais par session, 10 échecs par heure (HANDOFF.md:87).
- **Nom « Grès & Lin »** : aucune occurrence exacte trouvée ce matin, reste l'INPI et le nom de domaine.

**Effort.** Environ 1,5 jour : réplique de la bulle et de la fenêtre (environ 250 lignes, sur le modèle de `ShimmerDock.tsx`), page boutique céramique (environ 400 lignes, comme `CavesPage.tsx`), 3 ou 4 pièces en SVG. Un jour si on reste chez Caves Forty-Two.

### Film 5 · « Une ligne » (branchement, retrait, cookies, Europe)

**Ce qu'il montre.** Le branchement tient en une ligne que l'équipe pose, la boutique garde sa recherche normale à un clic, on enlève la ligne et le vendeur disparaît, les cookies attendent le bandeau de la boutique, l'IA tourne en Europe. C'est le film « zéro risque » pour un petit commerçant qui a peur de casser sa boutique.

**Point de vue.** Marchande, puis quelques secondes côté client.

**Boutique.** Caves Forty-Two, celle du film 1 : on réutilise `CavesPage.tsx` et `ShimmerDock.tsx`, pas de nouveau nom ni de nouveau catalogue, et les puces figées sur le vin tombent juste.

**Déroulé (environ 32 s)**

1. **0-4 s.** Surtitre « VOTRE BOUTIQUE, LE JOUR DU BRANCHEMENT ». La caviste devant la page d'accueil de sa boutique.
   Pensée : « Je ne touche pas au code, moi. »
2. **4-10 s.** La ligne de script montrée comme un objet, en gros plan typographique sur fond sombre, avec la vraie forme du snippet public (AdminIntegration.tsx:148) et la clé publique tronquée (`pk_…`). Annotation : « UNE LIGNE, POSÉE PAR NOTRE ÉQUIPE ».
   Pensée : « Une ligne, et c'est eux qui la posent. »
3. **10-13 s.**
   Pensée : « Le catalogue aussi, c'est eux. »
4. **13-20 s.** Côté client : une recherche, « Le vendeur réfléchit… » pendant 2 à 3 s, 2 ou 3 bouteilles, et en pied de dock « Voir les résultats classiques → » et « Fermer ». Le curseur survole le lien.
   Pensée : « Et la recherche normale reste là. »
5. **20-25 s.** La ligne s'efface, la boutique revient à sa recherche native, le dock n'apparaît plus. Annotation : « SANS ELLE, LE VENDEUR DISPARAÎT ».
   Pensée : « Et si j'arrête, ils l'enlèvent. »
6. **25-28 s.** Annotations l'une après l'autre : « IL ATTEND VOTRE BANDEAU COOKIES », puis « IA HÉBERGÉE EN EUROPE ».
7. **28-32 s.** Carton, « toute seule. » mis en avant.

**Écrans et textes réels**

- Snippet public : AdminIntegration.tsx:143-148. Note RGPD : :152.
- Dock : placeholder « Précisez, ou demandez autre chose… » (shimmer.ts:970), « Le vendeur réfléchit… » (:980), bouton natif (:894-895), via `ShimmerDock.tsx` du film 1.
- Consentement : shimmer.ts:40-52 (mode `auto` : attend le signal du bandeau, TCF, Cookiebot, Axeptio ou tarteaucitron).

**Reconstitué.** La boutique (démo), la réponse du vendeur (sauf capture réelle), l'animation de retrait. Générique : « Boutique de démo, réponse du vendeur reconstituée, attente raccourcie. Consentement : avec un bandeau Axeptio, Cookiebot, tarteaucitron ou TCF. »

**Prérequis avant tournage**

- **Cookies.** Sans bandeau reconnu, le SDK considère le consentement acquis au bout de 3 s et pose son cookie pour 365 jours (shimmer.ts:40-43, :1420). L'annotation n'est vraie qu'avec un bandeau reconnu : en poser un sur la boutique de démo, ou `data-consent="strict"`, et le dire au générique. À vérifier au passage : le bandeau natif de Shopify ne figure pas dans la liste du commentaire (shimmer.ts:41-42).
- **« Tout redevient comme avant » va trop loin.** Les webhooks continuent de tourner tant qu'on ne les retire pas, et le cookie reste chez ceux qui l'ont accepté. D'où « SANS ELLE, LE VENDEUR DISPARAÎT ». Même nuance à porter dans `pitch/offre-pilote-beta.md:29`.
- **Pas de marchande qui colle du code dans un éditeur** : le site promet « 30 minutes, et rien à installer de votre côté » (HowItWorks.tsx:20) et l'offre pilote inclut l'installation.
- **Bouton « Voir les résultats classiques → »** : vérifier sur le thème de démo que la barre est bien dans un `<form>` (shimmer.ts:895), sinon il n'apparaît pas.
- **Le site doit dire Europe** avant diffusion (SiteFooter.tsx:13, app/page.tsx:15).
- **Le ton est sorti du film.** « Avec plaisir. » est écrit en dur dans le SDK (shimmer.ts:917) et déjà vu dans le film 1, la phrase d'intro n'est qu'une consigne facultative au modèle (sales-assistant.ts:561-562) alors que l'admin promet « ouvre ses recommandations avec une de ces phrases » (AdminSettings.tsx:154), et le cache de 12 h ignore le ton (sales-assistant.ts:240). On le remet (8 s de plus, écran Réglages) seulement si le code impose la phrase d'intro, ou si une vraie capture, machine calme, sur une requête jamais posée, montre une phrase propre à la marque et absente du SDK. Dans ce cas il faut aussi corriger « Neutre » (400) et le sous-titre des Réglages (AdminSettings.tsx:104-106), et rester en « Vous » : les textes fixes du SDK vouvoient tous (shimmer.ts:917, :1007, :1029).

**Effort.** Environ 1 jour (tout est réutilisé). Une demi-journée de plus si le segment ton revient avec une capture réelle.

### Film 3 · « Ce qu'il a ajouté » (preuve par groupe témoin, facture)

**Ce qu'il montre.** L'accueil de l'admin dans ses deux états : d'abord « pas encore prouvé, vous ne payez que le forfait », puis, quand il y a assez de visiteurs, ce que le vendeur a ajouté par rapport au groupe témoin et la facture qui en découle. C'est l'argument de prix de l'offre pilote.

**Point de vue.** Marchand.

**Boutique.** Une boutique de tournage dans l'univers Caves Forty-Two : catalogue recopié du store 4, identifiant à part, données propres. Pas le store 4 lui-même : il sert aux tests de fumée en prod et aux démos prospects, et on ne sait pas de quoi sont faits ses 408 € prouvés.

**Déroulé (environ 38 s)**

1. **0-4 s.** Surtitre « VOTRE BOUTIQUE, CÔTÉ COULISSES ». Accueil, état « en cours » : « Votre chiffre d'affaires », « xx % de certitude », puis « On a besoin d'un peu plus de trafic pour prouver l'effet à 95 % (…). En attendant, vous payez uniquement le forfait. »
   Pensée : « Pas encore assez de visites pour trancher. »
2. **4-8 s.** Gros plan sur « Facture ce mois · 89 € forfait · pas de variable tant que non prouvé ».
   Pensée : « Alors je paie le forfait, point. »
3. **8-10 s.** Surtitre « QUAND IL Y A ASSEZ DE VISITEURS ». Pas de durée : sur une petite boutique, ça peut prendre des mois.
4. **10-17 s.** Même écran, état prouvé : « Ce que Shimmer vous a rapporté », badge « Vérifié et prouvé », le gros chiffre. Premier accent musical.
   Pensée : « Ça, c'est ce qu'il a ajouté. »
5. **17-24 s.** Le dépliant « Comment on calcule ? » (une fois son texte corrigé, D4), ou à défaut un schéma dessiné. Annotation : « ON COMPARE CEUX QUI CHERCHENT ».
   Pensée : « Un visiteur sur dix ne le voit jamais. »
6. **24-30 s.** Ligne « Facture ce mois · 89 € forfait + X € sur les ventes prouvées ».
   Pensée : « Le forfait, plus 5 % de ça. »
7. **30-38 s.** Révélation, puis l'accroche, sans verbe mis en avant.

On ne filme pas la page Preuve : trop de jargon pour un commerçant (« Effet prouvé · P 97% » AdminPreuve.tsx:49, « IC 95% » :104, « par visiteur chercheur » :121), et le panneau Relances s'affiche toujours en haut (:87-104). On cadre sur la carte principale de l'accueil (AdminOverview.tsx:161-236) : les tuiles du dessous montrent des fonctions qui ne tournent pas (:127-128, :243), et la pastille « Vendeur » reste grise parce qu'elle dépend des affichages de ventes additionnelles, pas branchées (:275).

**Écrans et textes réels** (`apps/site/src/components/admin/AdminOverview.tsx`)

- Titre selon l'état : :170. Période : :173. Badge : :181. Gros chiffre et écart : :192 (pas de gros plan, voir D3). Phrase : :203-204. Facture : :211-217. Dépliant : :222-224.
- Méthode : capture de la vraie admin sur la boutique de tournage (Playwright dans `/opt/corsairaventure/node_modules`), puis caméra, curseur et surlignage par-dessus. Aucun chiffre tapé dans le film.

**Reconstitué.** Les chiffres (exemple), le schéma s'il remplace le dépliant. Générique : « Boutique de démonstration, chiffres d'exemple. Mesure sur Shopify. Offre pilote : 89 €/mois + 5 % du CA additionnel prouvé. »

**Prérequis avant tournage**

- **D1, bloquant : la période.** L'accueil et la page Preuve appellent `/proof` sans période (AdminOverview.tsx:63, AdminPreuve.tsx:69), la route renvoie alors le cumul depuis le début (holdout.ts:160-177), mais l'écran écrit « 30 derniers jours » et « Facture ce mois ». Correctif produit : passer `from` (J-30 ou début du mois) aux deux appels. C'est aussi un vrai bug de facturation pour le pilote (décision 3). À défaut, toutes les données de démo dans les 30 derniers jours.
- **D3 : « + X € par visiteur exposé »** (:192) est en fait l'écart par visiteur qui a cherché (la page Preuve dit bien « par visiteur chercheur », AdminPreuve.tsx:121). Changer le libellé ou ne pas zoomer.
- **D4 : le dépliant est inexact** (:224) : la comparaison ne porte pas sur « les 90 % qui voient le vendeur » mais sur les visiteurs qui ont cherché et accepté les cookies. Corriger le texte, sinon ne pas le lire à l'écran.
- **Le montant n'est pas exact au centime.** C'est une médiane (lift.ts:13), et ce qui est sûr à 95 %, c'est que l'effet dépasse le seuil (lift.ts:160). D'où le titre, et pas « à l'euro près ».
- **Données en SQL direct**, en deux temps pour les deux états : au moins 25 témoins qui ont cherché (lift.ts:29, :160), donc environ 250 chercheurs de l'autre côté, tous avec cookies acceptés ; facturation `{floorEUR:89, ratePct:5, capEUR:null}` (sinon plafond 267 €, holdout.ts:227) ; proportion du témoin à 10 %, puisque « 10 % » est écrit en dur (:224).
- **Seul le vendeur doit être prouvé.** Aucune conversion de retour de stock dans la période (sinon elle entre dans le prouvé sans témoin, proof.ts:142-145) : on capture le film 3 **avant** d'insérer les données du film 4. Pas de relances non plus.
- **Chiffres d'exemple réalistes** pour une petite cave (décision 8).

**Effort.** Environ 1,5 jour : données SQL 0,5 à 1 jour, captures 0,25, montage 0,75. Plus D1, D3, D4 côté produit (environ une demi-journée avec tests, déploiement sur GO).

### Film 4 · « Ceux qui attendent » (réassort, contrechamp du film 1)

**Ce qu'il montre.** Le geste de la cliente du film 1 (« Prévenez-moi » sur le Crozes épuisé) devient une information de stock pour le caviste : qui attend quoi, l'email parti au retour du stock, puis les commandes comptées dans les 7 jours.

**Point de vue.** Marchand.

**Boutique.** La même boutique de tournage Caves Forty-Two que le film 3, produit Crozes-Hermitage 2021. Le spectateur du film 1 comprend en une seconde, et le vin n'a pas de tailles (l'alerte est posée par produit, pas par taille).

**Déroulé (environ 32 s)**

1. **0-3 s.** Surtitre « VOTRE BOUTIQUE, CÔTÉ COULISSES ». On ouvre direct sur « Quoi réassortir en priorité » : « Crozes-Hermitage 2021 · 9 clients ». Premier accent musical. Au plus une vignette d'une seconde du dock du film 1.
   Pensée : « Neuf personnes attendent le Crozes ? »
2. **3-7 s.**
   Pensée : « J'en recommande deux cartons. »
3. **7-12 s.** Un stock générique (pas l'interface Shopify) passe de 0 à 24. Surtitre « LE STOCK REPASSE AU-DESSUS DE ZÉRO ».
   Pensée : « Je remets le stock, c'est tout. » (seulement si E2 est corrigé, sinon « Je remets le stock en ligne. »)
4. **12-15 s.** Carte email en texte brut, clochette : objet « Crozes-Hermitage 2021 est de retour », début du texte « Vous nous aviez demandé de vous prévenir : … Il en reste 24, premier arrivé premier servi. » Pas d'URL à l'écran.
   Pensée : « Ils sont prévenus tout de suite. »
5. **15-22 s.** L'admin une semaine plus tard : « Prévenus », « Ont commandé » (« xx% des prévenus »), « Ventes récupérées » (« comptées commande par commande »).
   Pensée : « Quatre l'ont pris dans la semaine. »
6. **22-25 s.** Annotation : « MÊME EMAIL, MÊME VIN, SOUS 7 JOURS ».
7. **25-32 s.** Révélation, puis le carton avec « relance » mis en avant.

**Écrans et textes réels**

- Écran Réassort : AdminRestock.tsx:65-68 (tuiles), :71 (titre du panneau), :80 (« Chaque ligne, c'est une vente qui attend. »), :92 (« clients »).
- Email : stock-alerts.ts:109-123. Fenêtre de 7 jours : :22. Règle de conversion (même email, prévenu, dans la fenêtre, produit présent dans la commande) : :60-72, avec les produits de la commande construits dans webhooks-shopify.ts:284-287.
- Encart épuisé côté client, si vignette : shimmer.ts:1007-1010 et :1029.

**Reconstitué.** L'écran de stock, la vignette du dock, et l'email tant que Resend n'est pas branché. Générique : « Boutique de démonstration, chiffres d'exemple, email reconstitué. Retour de stock sur Shopify. »

**Prérequis avant tournage** (c'est pour ça qu'il passe en dernier)

- **E1, bloquant : l'alerte ne partirait jamais chez un vrai marchand.** Aucun code n'écrit `Product.platformProductId` (il est seulement lu, sales-assistant.ts:450, webhooks-shopify.ts:449), l'import CSV ne le remplit pas, donc l'inscription part sous `local:<id>` (shimmer.ts:1024) alors que l'envoi cherche la variante Shopify ou `p:<id>` (stock-alerts.ts:212-213). Correctif : importer les identifiants produit Shopify.
- **E3, bloquant : le compteur « Prévenus » ment.** L'alerte passe en `notified` dès que `sendEmail` rend la main, que l'email soit simulé ou échoué (stock-alerts.ts:234-244 ; `sendEmail` renvoie `failed` sans lever d'erreur, email-connector :198-205). Ne compter que le statut `sent`.
- **Resend branché**, avec `RESEND_API_KEY` et `EMAIL_FROM_DOMAIN` sur un domaine à Tym (décision 5). Sinon l'email reste « reconstitué » et, surtout, la chaîne filmée ne marche pas en vrai.
- **E2 : après le réassort, le vendeur continue de dire « épuisé ».** Il lit `Product.stock` (sales-assistant.ts:210-216), que les webhooks ne mettent pas à jour (ils écrivent la table des variantes, webhooks-shopify.ts:439-466). Le corriger, ou garder la pensée neutre de l'étape 3.
- **Le montant compté est le total de la commande**, port et autres articles compris (webhooks-shopify.ts:283). Ne pas parler de « ventes du Crozes ».
- **Ne jamais dire « prouvé » ici**, et ne pas filmer le dépliant qui l'affirme (AdminRestock.tsx:106), ni l'état vide qui promet « par produit et par taille » (:75).
- **Pas d'URL dans l'email** : elle pointe vers le domaine `*.myshopify.com`, pas vers le domaine public de la boutique.
- **Après les captures du film 3**, jamais avant (voir film 3).

**Effort.** Environ 1 jour de film une fois les correctifs faits (mêmes données et même composant de capture que le film 3). Côté produit : E1, E2, E3, environ 1,5 à 2 jours avec tests.

### Coupé ou reporté

- **Film 6, relances paniers : coupé.** Shopify envoie déjà ses propres relances de panier abandonné, le prospect Brouillon a Klaviyo (`pilot/prospect-brouillon.md:18`, :39), WooCommerce n'a pas d'événement natif `cart.abandoned` (AdminIntegration.tsx:60), les mails ont des textes fixes, et il reste trois correctifs bloquants (lien vers le panier, code SHIMMER10 jamais créé, envoi réel). Le seul vrai différenciant, le panier témoin jamais relancé, s'explique déjà dans le film 3. Une fois corrigées, les relances valent un panneau du film 3, pas un film. En attendant, **la relance 2 doit être désactivée en prod** : elle partirait à +24 h avec un code qui ne marche pas (cart-reminders.ts:6, :85, :104-107).
- **Avis** : trier les avis avant Google ressemble à ce que Google interdit, et c'est sensible au regard des règles françaises sur l'information des avis en ligne. Avis juridique d'abord, et l'admin promet plus que le code (AdminReviews.tsx:103-106).
- **Autres questions SAV, escalade, tickets, tri des mails, recos sur fiches, campagnes, SMS, relance des inactifs, semaine d'observation, couleurs automatiques** : pas codés, pas branchés, ou promesse sans suite (tableau section 1).

### Ordre de diffusion (différent de l'ordre de production)

Pour un marchand qui découvre : **film 1** (vend), **film 2** (répond), **film 4** (relance, contrechamp du 1), **film 5** (zéro risque), **film 3** en dernier. Le film 3 est l'argument de prix, on l'envoie après un appel, pas en accroche.

### Récapitulatif d'effort

| Étape            | Film                      | Produit avant                                                 |
| ---------------- | ------------------------- | ------------------------------------------------------------- |
| Kit commun       | 0,5 j                     | aucun                                                         |
| Film 2 colis     | 1,5 j (1 j chez Caves)    | titre de la bulle, optionnellement la barre « Qualification » |
| Film 5 une ligne | 1 j (+0,5 si segment ton) | aucun, sauf si le ton revient                                 |
| Film 3 preuve    | 1,5 j                     | D1, D3, D4 (environ 0,5 j)                                    |
| Film 4 réassort  | 1 j                       | E1, E2, E3 (1,5 à 2 j) + Resend                               |
| **Total**        | **environ 5,5 jours**     | **environ 2,5 jours + Resend**                                |

## 3. Ce que Tym doit décider ou fournir

1. **Sécurité, avant tout le reste.** `GET /api/stores/:id` n'a aucune authentification et renvoie tout le `config` de la boutique (`apps/api/src/routes/stores.ts:190-216`, monté sans garde à `apps/api/src/index.ts:145`). C'est là que vivent les secrets de webhook Shopify et WooCommerce (webhooks-shopify.ts:119, webhooks-woocommerce.ts:73). Une tâche séparée est proposée pour la fermer et vérifier, sans afficher de valeur, si un secret a été exposé. En attendant, aucun secret de webhook sur les boutiques de tournage.
2. **La bulle de chat.** Garder « Vendeur IA » et « Décrivez ce que vous cherchez... » pour du SAV, ou corriger le SDK avant le film 2. Le SDK a déjà « Posez votre question... » (shimmer.ts:229) et « Assistant Shimmer » (:230) inutilisés. Et que fait-on de la barre « Qualification: X% » qui s'affiche sur tout message qui n'est pas une question de colis (:1177, :1265) ? Un marchand qui installe la bulle après le film la verra.
3. **GO pour les correctifs produit** : D1 (période de `/proof` : aujourd'hui « Facture ce mois » est calculée sur le cumul, un vrai souci pour facturer le pilote), D3, D4, E1, E2, E3, désactivation de la relance 2, et « France » devient « Europe » sur le site (SiteFooter.tsx:13, app/page.tsx:15). Déploiements sur GO, `git status` avant tout redémarrage de l'API (d'autres sessions travaillent sur la branche).
4. **Écouter la musique du film 1** (`video/out/shimmer-pov-v6.mp4`) : niveau et style OK ? La session musique publie ensuite, la version en ligne est encore muette.
5. **Resend et un domaine à soi** (SPF/DKIM) pour les emails : bloquant pour le film 4, et pour diffuser le film 1 hors du dev (voir annexe B). Le même choix de domaine remplit l'URL vide du carton final (script.ts:110).
6. **Le film 1 promet un email de retour de stock qui ne peut pas partir aujourd'hui** (E1 + emails simulés). « Séquence reconstituée » couvre les images, pas la fonction. Avant une diffusion publique : corriger E1 et brancher Resend, ou ajouter une mention.
7. **Le retour de stock facturé comme « prouvé ».** Ces ventes entrent dans le prouvé, donc dans les 5 %, sans groupe témoin (proof.ts:142-145, AdminRestock.tsx:106). Le client aurait peut-être acheté de toute façon. Les garder dans la part variable, ou les montrer à part sans les facturer ?
8. **Les chiffres du film 3.** Des chiffres réalistes pour une petite cave, marqués « exemple », pas choisis pour flatter l'offre. Si l'exemple honnête montre une marge mince (le jeu de démo du store 4 donne environ 408 € prouvés pour environ 109 € facturés), c'est une info pour le prix, pas un problème de montage.
9. **Le surtitre du film 1 « COULEURS ET POLICE RÉGLÉES À L'INSTALLATION »** (script.ts:95) : vrai seulement si l'équipe passe un thème via `Shimmer.init({ theme })` à chaque installation. Soit on l'ajoute à la procédure d'installation, soit on change le surtitre.
10. **Un seul univers ou deux.** Films 3, 4 et 5 chez Caves Forty-Two (réutilisation, continuité avec le film 1). Film 2 chez « Grès & Lin » pour montrer que ce n'est pas qu'un outil pour cavistes (1,5 j, nom à vérifier INPI et domaine), ou lui aussi chez Caves Forty-Two (1 j, zéro vérification).
11. **Pour le pitch Brouillon** : c'est une marque de mode avec 123 variantes épuisées sur 150 (prospect-brouillon.md:20). L'alerte de retour de stock est posée par produit, pas par taille : quelqu'un qui attend un M sera prévenu au retour du S. C'est la première limite qu'ils verront. Et leurs relances passent déjà par Klaviyo.
12. **Où les films seront diffusés** (LinkedIn, Instagram, site, email après appel), pour caler les durées et les versions muettes.

## Annexe A. Relectures : gardé, corrigé, écarté

**Gardé, vérifié dans le code.** Relecture honnêteté : T1 (Shopify seulement), T2 (délai du vendeur), T3 (emails simulés), T4 (Europe), T5 (10 % de témoin), T6 (stock non synchronisé), C1 à C7 (film 2 : pas de date prévue, `shipped` plutôt que « en route », bulle en option, fin sur la réponse, base partagée dev et prod, références), D1 à D10 (film 3 : période, filtre inexistant, libellé « exposé », dépliant, médiane, cadrage, panneau Relances, volume, plafond 267 €), E1 à E8 (film 4), F1 à F9 (film 5, dont le SDK en prod à jour : `apps/showcase-main/shimmer/sdk/shimmer.iife.js` est identique octet pour octet à `sdk/dist`, construit après la dernière modification de `shimmer.ts`, donc HANDOFF.md:84 est périmé), G1 à G4, H. Relecture commerciale : film 2 resserré avec le gain avant 12 s et sans le texto, prérequis sur les libellés de la bulle, film 3 en deux états et sans la page Preuve, film 4 en contrechamp exact du film 1, film 5 sans éditeur de code et sans le ton, film 6 coupé, bande à 45 caractères, ordre de diffusion distinct, accent musical sur le gain et films lisibles sans le son.

**Corrigé (les relectures se trompaient ou étaient dépassées).**

- « La musique du film 1 est posée » (les deux relectures) : à moitié. La v6 a bien la musique, mais `video/out/shimmer-pov.mp4` et la copie servie sur le dev ont une piste muette (mesuré à -91 dB). Rien n'est encore en ligne.
- `data-chat` est lu à shimmer.ts:2323, pas :2036 (qui est la création de la bulle). Les autres numéros de ligne de ce document ont été recalés sur le code actuel (shimmer.ts fait 2339 lignes, modifié à 01:18).
- Le détail sur la clé Claude refusée (T4) n'a pas été revérifié : on garde seulement la condition « à retirer si un modèle hors UE est branché ».

**Écarté.**

- _Commercial_ : « choisir un exemple où la marge couvre nettement la facture ». Choisir des chiffres pour que l'offre paraisse rentable, c'est ce que le film prétend justement éviter. On garde des chiffres réalistes et marqués (décision 8).
- _Commercial_ : reprendre la phrase du site « Vous savez, à l'euro, ce que ça vous rapporte. » (Satellites.tsx:76) au carton du film 3. Le montant est une médiane, pas un chiffre au centime ; la phrase du site mériterait d'ailleurs d'être adoucie.
- _Commercial_ : tourner le film 3 sur le store 4. Il sert aux tests de fumée en prod et aux démos, et ses 408 € prouvés ne sont pas décomposés. On prend une boutique de tournage dans le même univers.
- _Commercial_ : « le film 1 ne passe pas la règle des 10 s ». Juste, mais le film 1 est validé : la règle vaut pour les nouveaux films.
- _Honnêteté_ : garder le film 6 en conditionnel. Remplacé par la coupe, pour les raisons commerciales ci-dessus.
- _Honnêteté_ : titre « Contre un groupe témoin » pour le film 3. Juste sur le fond, mais froid ; « Ce qu'il a ajouté » reste honnête puisque le film montre d'abord l'état « pas encore prouvé ».
- _Plan du matin_ : Brûlerie Sémaphore, Mousse & Galet et Pluvier. Abandonnés : moins de noms à vérifier, plus de réutilisation, et les puces figées sur le vin collent à une cave.
- _Plan du matin_ : le segment ton du film 5, tant que l'effet n'est pas garanti (voir film 5).

## Annexe B. Film 1 : écarts à corriger au passage

- Surtitre `kicker2` (script.ts:95) : voir décision 9.
- La séquence « 8 JOURS PLUS TARD » montre un email de retour de stock qui ne peut pas partir aujourd'hui (E1, emails simulés) : voir décision 6.
- Numéros de ligne périmés dans les commentaires de `script.ts`. Les bons dans `sdk/src/shimmer.ts` : :894 (bouton natif), :917 (question d'affinage), :918 (puces), :970 (placeholder), :1007 (encart épuisé), :1029 (confirmation). Le renvoi à `sales-assistant.ts:301-318` (script.ts:45) est à recaler, la relecture indique le gabarit à :366-398. Les chaînes elles-mêmes sont toujours identiques à l'octet.
- Musique : faite, pas encore en ligne (section 0).
