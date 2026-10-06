# Le film POV, une variante par métier

06/10/2026. Demande de Tym : « la vidéo qu'on a faite, il faudrait une variante pour chaque boutique / domaine de vente ». Le film 1 (`src/pov2`, 62 s) est devenu un gabarit : même histoire, même ligne de temps, même caméra, même musique ; seuls la boutique, les produits et les textes changent.

## Les six variantes

| Composition      | Boutique fictive                  | Requête vague | Puce cliquée    | Produit épuisé        | Fidèle au widget actuel ?           |
| ---------------- | --------------------------------- | ------------- | --------------- | --------------------- | ----------------------------------- |
| `POV-cave`       | Caves Forty-Two (démo, magasin 4) | rouge         | Un repas        | Crozes-Hermitage 2021 | oui (film 1 validé, accent « duo ») |
| `POV-epicerie`   | Comptoir Capanna                  | apéro         | Découvrir       | Figatellu fermier     | oui                                 |
| `POV-mode`       | Maison Anela                      | pull          | Un cadeau       | Pull marin rayé       | non, après les puces par métier     |
| `POV-enfant`     | Nidu                              | cadeau        | Une naissance   | Coffret naissance     | non, après les puces par métier     |
| `POV-bijoux`     | Maison Albore                     | collier       | Un anniversaire | Collier lune          | non, après les puces par métier     |
| `POV-cosmetique` | Atelier Linfa                     | crème         | Un cadeau       | Sérum à l'immortelle  | non, après les puces par métier     |

**Pourquoi « non » pour quatre d'entre elles.** La question guidée du widget est décidée par le code, pas par l'IA, et elle est écrite pour le vin : les mots qui la déclenchent sont ceux du vin (plus cadeau, offrir, idée, apéro) et les puces sont toujours Apéritif, Un repas, Un cadeau, Découvrir, Petit budget. Ces quatre films montrent des puces adaptées au métier. La tâche qui les ajoute au widget est décrite dans `docs/tache-puces-par-metier.md`. Tant qu'elle n'est pas en prod, ne pas envoyer ces quatre films à un prospect.

Les noms des boutiques fictives ont été cherchés sur le web le 06/10 (aucune boutique connue sous ce nom dans le même métier). Le carton final dit « Boutique fictive, séquence reconstituée. » ; la cave garde « Boutique de démo Shopify ».

Ce qui reste vrai pour toutes : les chaînes du dock et de l'encart « épuisé » sont celles du SDK au caractère près ; la réponse « épuisé » suit le gabarit du code (`soldOutReply`, même catégorie, en stock) ; les autres réponses du vendeur sont écrites dans les règles du prompt réel (vouvoiement, prix cités, une question à la fois, 3 phrases au plus). L'email de retour de stock reste « reconstitué » : sans `RESEND_API_KEY` dans `.env`, il ne part pas aujourd'hui (même réserve que le film 1).

## Où est quoi

- `src/pov2/variants/*.ts` : une fiche par métier (boutique, produits, texto, requêtes, réponses, sous-titres, scène du soir). Les garde-fous de `variants/index.ts` cassent le rendu si une fiche sort des clous (tiret long, frappe trop longue, redirection hors catégorie…).
- `src/pov2/variant.ts` : le type, la frappe générée (`typeQ1/2/3`), la question du SDK (`refineQuestion`), le gabarit « épuisé », l'email de retour de stock.
- `src/pov2/Art.tsx` : les dessins de produits (pots, meule, charcuterie, pulls, robe, doudou, bijoux sur buste, flacons…), dans le style des bouteilles.
- `src/pov2/ShopPage.tsx` : la page boutique générique (géométrie identique pour toutes, la caméra en dépend). Le logo est plafonné à 255 px de large : au-delà, sa fin dépassait au bord gauche des gros plans (vu sur l'épicerie au premier rendu, refaite).
- `src/pov2/targets.tsx` : le curseur vise des positions MESURÉES sur le dock (puce choisie, champ email, bouton), les libellés changeant d'un métier à l'autre. La cave garde les cibles du film 1 au pixel près (la mesure retombe à 3 px près).
- Planches de contrôle : compositions `ProbeArt` (tous les dessins) et `ProbeTargets` (positions mesurées).

## Refaire un rendu

```bash
cd /opt/shimmer/video
heavy node tools/stills.mjs POV-mode /tmp/stills-mode "200,330,560,1000,1320,1800" 0.5   # contrôle
rm -rf out/chunks-shimmer-pov-mode-silent   # sinon les tranches déjà rendues sont reprises telles quelles
heavy node tools/render.mjs POV-mode out/shimmer-pov-mode-silent.mp4 300 1              # 5 à 8 min
bash tools/mux.sh out/shimmer-pov-mode-silent.mp4 out/music/music.wav out/shimmer-pov-mode.mp4
bash tools/publish-metiers.sh                                                            # page de visionnage dev
```

Rendus du 06/10 : six films de 61,97 s, 15 à 17 Mo, publiés sur https://dev.tymmerc.eu/shimmer/film/metiers/ (planche des affiches : `out/films-metiers-planche.jpg`). La page https://dev.tymmerc.eu/shimmer/film/ montre désormais la cave en « duo » (l'ancienne version jaune reste dans `out/shimmer-pov.mp4`).

La musique est la même pour toutes : la ligne de temps (`timeline.ts`) n'a pas bougé, donc ses repères tombent juste. Toujours via `heavy`, un rendu à la fois (règles VPS).

## Ajouter un métier ou une boutique précise

Copier une fiche de `variants/`, changer la boutique et les produits, l'ajouter à `VARIANTS` (`variants/index.ts`). Une version au nom d'une vraie boutique (prospect) est possible techniquement, mais elle mettrait son nom et ses produits dans une vidéo qui n'est pas la sienne : à ne faire qu'avec l'accord de la boutique, par exemple après un premier rendez-vous.
