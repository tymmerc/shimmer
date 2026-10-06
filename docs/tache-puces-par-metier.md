# Tâche : puces de question guidée par métier (widget)

Écrite le 06/10/2026 en préparant les variantes vidéo par métier (`video/src/pov2/variants/`). À lancer dans une session à part. Rien ne part en prod sans le GO de Tym.

## Le problème

Dans le widget (`sdk/src/shimmer.ts`), une requête vague déclenche une question d'affinage décidée par le code, sans IA : `handleQuery` appelle `askToRefine(query)` si `isVagueQuery(query)`. Cette fonction (vers la ligne 1456) répond oui pour au plus 2 mots dont au moins un est dans une liste fixe : rouge, blanc, rosé, rose, vin, vins, champagne, crémant, cremant, bulle, bulles, cadeau, offrir, idée, idee, apéro, apero.

`askToRefine` (vers la ligne 948) affiche « Avec plaisir. Pour bien vous orienter sur « X », c'est pour quelle occasion ? » et toujours les mêmes puces : Apéritif, Un repas, Un cadeau, Découvrir, Petit budget. Un clic envoie `${pendingBase} pour ${puce}` au vendeur.

Conséquences aujourd'hui :
- sur une boutique de vêtements, « robe rouge » propose « Apéritif, Un repas » (le mot « rouge » est dans la liste) ;
- sur une boutique d'enfant ou de bijoux, « cadeau » aussi ;
- « pull », « collier » ou « crème » ne déclenchent rien.

Tym prospecte justement des épiceries, des boutiques de mode, d'enfant, de bijoux et de cosmétiques en Corse (`pilot/prospection.md`, local).

## À faire

1. **Préréglages dans le SDK.** Aucun texte libre venu de la base n'arrive dans le widget. Mêmes règles qu'aujourd'hui (au plus 2 mots, minuscules). Questions et puces au caractère près comme dans les vidéos :

| Préréglage | Mots qui déclenchent | Question | Puces |
|---|---|---|---|
| `vin` (défaut, inchangé) | liste actuelle | « c'est pour quelle occasion ? » | Apéritif, Un repas, Un cadeau, Découvrir, Petit budget |
| `epicerie` | apéro, apero, cadeau, offrir, idée, idee, panier, coffret, charcuterie, fromage, fromages, douceur, douceurs, spécialité, spécialités | quelle occasion | comme `vin` |
| `mode` | robe, robes, pull, pulls, haut, jean, veste, manteau, tenue, cadeau, offrir, idée, idee, sac, chaussures | quelle occasion | Tous les jours, Une soirée, Un mariage, Un cadeau, Petit budget |
| `enfant` | cadeau, offrir, idée, idee, naissance, bébé, bebe, doudou, jouet, jouets, fille, garçon, garcon, anniversaire | quelle occasion | Une naissance, Un anniversaire, Noël, Petit budget, Découvrir |
| `bijoux` | collier, colliers, bracelet, bague, boucles, bijou, bijoux, cadeau, offrir, idée, idee | quelle occasion | Un anniversaire, Un mariage, Tous les jours, Un cadeau, Petit budget |
| `cosmetique` | crème, creme, soin, soins, visage, peau, savon, huile, sérum, serum, parfum, cadeau, offrir, idée, idee | « c'est pour quel besoin ? » | Peau sèche, Peau sensible, Anti-âge, Un cadeau, Petit budget |

2. **Réglage par boutique.** Clé `guided: { preset: '<nom>' }` dans le config de la boutique, validée côté serveur par une énumération (zod, comme `apps/api/src/lib/appearance.ts`). L'endpoint public déjà appelé par le widget au démarrage, `GET /api/public/appearance?store=<id>` (`apps/api/src/routes/public-appearance.ts`), la renvoie à côté de `appearance`. Le SDK (`loadAppearance`, vers la ligne 2112) retient le préréglage ; absent, inconnu ou pas encore chargé : `vin`, donc rien ne change pour les boutiques actuelles. Si le PATCH de config boutique (`apps/api/src/routes/stores.ts`) filtre les clés, y ajouter `guided` avec la même validation.
3. **Optionnel** : un choix « Métier de la boutique » dans la section Apparence de l'admin.
4. **Tests** : unitaires SDK (mots et puces par préréglage, défaut inchangé, « robe rouge » en mode, « cadeau » en enfant), test API de l'endpoint public (préréglage valide renvoyé, valeur inconnue ignorée). Build du SDK via `heavy`, vérification sur https://dev.tymmerc.eu/shimmer/demo/boutiques/, puis rapport à Tym : ce qu'il faut déployer et la commande SQL qui pose le préréglage sur une boutique.

## Règles de la branche

Branche `claude/shimmer-mobile-experience-lne7ox`, partagée avec d'autres sessions : `git status` avant tout `systemctl restart shimmer-api`, jamais `prisma db push` (SQL direct), toute tâche lourde via `heavy`, une à la fois, déploiement prod seulement sur GO de Tym.

## Lien avec les vidéos

Les variantes vidéo `mode`, `enfant`, `bijoux` et `cosmetique` montrent ces puces. Elles ne doivent pas être envoyées à un prospect avant que ce réglage soit en prod. Les variantes `cave` et `epicerie` montrent le widget tel qu'il est.
