# Prospect pilote : Brouillon (brouillon.store)

Fiche établie le 7 août 2026. Prospect chaud via un ami de Tym : le gérant a dit "si t'avais été là 6 mois avant j'aurais vu avec toi" et a transmis le contact. Il a signé avec un presta il y a ~6 mois (vraisemblablement le site). Ce presta n'est PAS concurrent : Shimmer se branche par-dessus.

## Attention domaine

`brouillon.eu` est une page de PARKING ("this domain may be for sale", Above Domains). La vraie boutique est **https://brouillon.store** (l'Instagram est bien @brouillon.eu, d'où la confusion). Ne jamais mettre brouillon.eu dans un message.

## Ce qu'on a vu (audit technique du 7 août)

| | Constat |
|---|---|
| Plateforme | **Shopify** (`a4e696.myshopify.com`), thème "CREAPRENEURS.IO 2.0" (base FullStack, thème d'un presta/agence : c'est probablement lui le "presta signé il y a 6 mois") |
| Marque | Marque indépendante mère/fils, sérigraphie artisanale, vêtements uniques. Vend en drops. |
| Catalogue | 24 produits, 150 variantes, 16 collections. Prix 4 à 380 €, moyen ~63 €. Premier produit sept. 2024, dernier juin 2026 |
| Stock | 27 variantes dispo sur 150 : logique de drops, beaucoup d'épuisé |
| Recherche | Barre de recherche + recherche prédictive Shopify natives présentes → le vendeur Shimmer a un point d'accroche |
| Apps | Klaviyo (email marketing) + Shop Pay. Pas d'app SAV/chat/avis détectée |
| Réseaux | Instagram @brouillon.eu, TikTok, YouTube (marque orientée réseaux, trafic probablement en pics de drop) |
| Trafic / ventes | Pas de mesure directe (Shopify n'expose rien, IG bloque le comptage). Indices publics forts : **123 variantes épuisées sur 150**, ses 2 gros tirages (T-shirt Classique 20 var., T-Shirt 911 15 var.) écoulés à 100 %, drop Nuancier de mai quasi vidé en 2 mois, cadence passée de 1 produit/an (2025) à 3-5/mois (fév-mai 2026). Ordre de grandeur (à confirmer avec lui) : quelques centaines de pièces/an, ~15-40 k€ CA, en pics de drop |

## Bug repéré sur son site (à utiliser en ouverture)

Sur les produits épuisés (ex. Sweat Chromatique, 6 tailles barrées, bouton "Rupture de stock"), le thème affiche juste en dessous **"En stock ! Livré entre le [date] et le [date]"**. C'est le bloc "delivery estimator" du thème CREAPRENEURS/FullStack : il calcule une date depuis aujourd'hui sans jamais lire l'inventaire. Il ment sur tout le catalogue épuisé (82 %).

Pourquoi ça compte :
- Argument d'ouverture concret et vérifiable en 5 s sur son propre site : "ton site dit En stock sur un produit en rupture, ça fait fuir des gens qui auraient attendu"
- C'est exactement le trou que le module Retour de stock comble : ce visiteur repart ; avec Shimmer il laisse son email et on le rappelle au réassort
- Le presta n'a pas traité le sujet stock : on ne marche pas sur ses plates-bandes, on répare un trou
- Pour nous : le vendeur Shimmer lit TOUJOURS l'inventaire réel (webhooks inventaire), jamais un texte du thème

## Compatibilité Shimmer

Shimmer se branche **tel quel** :
- Shopify = notre intégration la plus complète (3 webhooks : panier abandonné, commande payée, commande expédiée + lien holdout via `note_attributes`)
- Widget vendeur = 1 ligne de script dans le thème (`shimmer.iife.js` + clé `pk_`), réversible en une minute
- On ne touche NI au thème du presta, NI au checkout, NI à Klaviyo. Aucun conflit d'outil : ils n'ont ni chat, ni SAV automatisé, ni collecte d'avis

Point d'attention : Klaviyo fait déjà de l'email marketing. Nos relances paniers pourraient doublonner avec un flow Klaviyo abandonment s'il existe. À vérifier en appel : soit on laisse Klaviyo faire les relances et Shimmer prend vendeur + SAV + avis, soit on bascule les relances sur Shimmer pour avoir la preuve par panier témoin.

## Bon candidat pilote ?

**Oui, mais pilote "produit" plus que pilote "chiffres".**

Pour :
- Shopify propre, install en 30 min, zéro friction technique
- Contact chaud, gérant déjà favorable, intro par un ami
- Petit catalogue avec un vrai besoin de conseil (couleurs, tailles, éditions uniques, "nuancier") → le vendeur a quelque chose à raconter
- Marque à forte identité → le ton du vendeur, ça compte pour lui, bon test de notre configuration de ton
- Aucun outil concurrent en place (SAV, avis, chat)

Contre / à cadrer :
- **Trafic faible et irrégulier** : la preuve statistique globale (holdout vendeur, MIN_GROUP_N=25 par groupe sur les chercheurs) mettra du temps. Il faut le dire d'entrée : les preuves directes (paniers récupérés un par un, tickets SAV traités) tomberont vite ; le verdict global vendeur, lui, dépendra de ses drops
- Panier moyen ~63 € : 5 % du prouvé = petit variable. Le pilote vaut par le retour d'expérience et la référence, pas par le revenu
- Beaucoup d'épuisé : le vendeur doit savoir dire "épuisé, mais voilà ce qui s'en rapproche" et pousser vers "Accès exclusif au drop". À configurer

Verdict : excellent **second** pilote (à côté du client de Marc-Antoine), fort en apprentissage produit et en référence "marque indé", faible en démonstration chiffrée. À prendre.

## Stratégie de contact

1. **Message 1 (WhatsApp/Insta/SMS, court)** : rebondir sur "6 mois avant", rassurer sur le presta, proposer 15 min. Voir ci-dessous
2. **Appel 15 min** : écouter d'abord (ce qu'il a signé exactement, ce qui le fatigue au quotidien : questions clients répétitives ? tailles ? SAV drops ?). Puis démo partage d'écran sur la boutique de démo Caves Forty-Two, PAS sur la sienne
3. **Cadrage honnête à l'appel** : "sur ton trafic, tu verras les paniers récupérés et le SAV traité dès les premières semaines ; le chiffre global de ce que le vendeur rapporte, lui, se prouvera au rythme de tes drops"
4. **Vérifier Klaviyo** : a-t-il un flow panier abandonné ? Décider qui relance
5. **Si GO** : offre beta écrite (`/opt/shimmer/pitch/offre-pilote-beta.md`), install en visio 30 min, semaine 1 en observation silencieuse, feu vert humain avant live

Questions à lui poser (dans l'ordre) :
- **Combien de commandes par mois, hors drop et pendant un drop ?** (LA question : dit si la preuve holdout est jouable ou si on vend "temps gagné + ventes sauvées")
- C'est quoi exactement ce que le presta t'a fait / te fait encore ? (pour être sûr qu'on marche pas sur ses plates-bandes)
- Combien de messages clients par semaine, sur quoi ? (tailles ? délais ? "il reste du stock ?")
- Tu fais quoi des paniers abandonnés aujourd'hui ? Klaviyo relance ?
- Ton prochain drop, c'est quand ? (pour caler l'install AVANT, et avoir du trafic pendant le pilote)
- Tu collectes des avis ? Comment ?

## Message 1 (à envoyer par Tym)

Version tutoiement, canal Insta/WhatsApp (adapter si l'ami vous a mis en relation par mail, passer au vous si le contact est plus formel) :

> Salut [Prénom], c'est Tym, le pote de [Ami]. Il m'a dit que tu lui avais glissé "6 mois plus tôt j'aurais vu avec lui". Franchement tant mieux que ce soit maintenant : mon outil apprend sur un vrai catalogue et de vraies visites, il y a 6 mois t'avais ni l'un ni l'autre, il aurait tourné à vide.
>
> Rassure-toi tout de suite : je ne touche ni à ton site ni à ce que ton presta a fait. Shimmer se pose par-dessus la boutique existante, une ligne de code, et ça s'enlève en une minute si ça te plaît pas.
>
> Concrètement c'est un vendeur IA dans ta barre de recherche qui connaît ton catalogue (tes nuanciers, tes tailles, ce qui est épuisé et ce qui le remplace), plus le SAV de base et les relances paniers, avec un tableau de bord qui te montre à l'euro ce que ça rapporte.
>
> Comme t'es dans les premiers : install et premier mois offerts, ensuite 89 €/mois et 5 % uniquement sur le chiffre en plus qu'on prouve sur tes propres commandes. Sans engagement.
>
> T'as 15 min cette semaine ou la prochaine pour que je te montre sur une boutique de démo ? Je te promets pas de slides.

Pourquoi ce message est construit comme ça :
- L'ouverture reprend SES mots ("6 mois plus tôt") et RETOURNE le regret : Shimmer n'est PAS fait pour une boutique qui se lance (rien à apprendre, rien à mesurer, compteur à zéro = churn assuré). Il a maintenant 2 ans de catalogue, du trafic en drops, des questions clients : c'est maintenant le bon moment. On n'arrive pas en retard, on arrive à l'heure. Ça désamorce aussi le "j'ai déjà un presta" : lui a construit la maison, nous on y met le vendeur
- La 2e phrase, c'est LA peur à tuer d'entrée : on ne touche à rien, réversible
- Les exemples (nuanciers, tailles, épuisé) sont tirés de SA boutique, pas génériques
- Le prix est dit tout de suite, sans détour : c'est notre force, pas un truc à cacher
- "sur une boutique de démo", pas la sienne : il n'a rien à installer pour voir

Relance unique après 5 jours si silence (règle outreach.md) : "Hello [Prénom], je te relance juste une fois : toujours partant pour 15 min ? Sinon pas de souci, je te laisse tranquille."

## Suivi

| Date | Action | Résultat |
|---|---|---|
| 07/08/2026 | Fiche créée, audit technique brouillon.store | Candidat validé (pilote produit/référence) |
| | Message 1 envoyé par Tym | |
