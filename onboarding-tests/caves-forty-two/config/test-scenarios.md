# Scénarios de test - Caves Forty-Two

## Scénario 1 - TYPE 2 simple (besoin fonctionnel courant)

**Requête :** "Je cherche un vin rouge pour accompagner un magret de canard"

**Comportement attendu :**
- Détecte univers Vin rouge ou Vin
- Détecte usage "accord viande rouge" / "accord magret"
- Pose 1-2 questions max (budget ? occasion ?)
- Recommande des vins avec specs `accord` contenant "magret" ou "viande rouge"
- Candidats attendus : Cahors C42-R018, Madiran C42-R017, Saint-Émilion

## Scénario 2 - TYPE 2 avec budget implicite

**Requête :** "Un bon rouge pour un dîner entre amis, pas trop cher"

**Comportement attendu :**
- Détecte usage "vin repas amis"
- Détecte signal budget "pas trop cher" → P25-P50 de la catégorie
- Recommande des vins entre 12 et 25€
- Candidats attendus : Beaujolais Villages, Côtes-du-Rhône Villages, Brouilly, Corbières

## Scénario 3 - TYPE 3 (similarité)

**Requête :** "J'ai bu un Châteauneuf-du-Pape la semaine dernière, j'ai adoré, t'as quelque chose dans le même style ?"

**Comportement attendu :**
- Identifie le produit de référence (Châteauneuf C42-R008 dans le catalogue)
- Comprend le profil : grenache/syrah dominant, puissant, rhône sud
- Recommande des analogues : Gigondas C42-R031, Vacqueyras C42-R032, ou Bandol

## Scénario 4 - HYBRIDE (région + besoin)

**Requête :** "Un blanc de Loire pour des fruits de mer"

**Comportement attendu :**
- Filtre région Loire
- Filtre couleur blanc
- Détecte usage "accord fruits de mer"
- Recommande Sancerre Blanc, Pouilly-Fumé, Muscadet

## Scénario 5 - TYPE 1 (recherche exacte avec marque)

**Requête :** "Je veux le Chablis William Fèvre"

**Comportement attendu :**
- Détecte produit exact C42-B003
- Confiance haute, propose direct
- Pas de questions de qualification

## Scénario 6 - Cas piégé (cadeau, budget élevé implicite)

**Requête :** "Je dois offrir une bouteille à mon patron, il aime le vin"

**Comportement attendu :**
- Détecte usage "cadeau"
- Détecte signal budget "premium" implicite
- Recommande haut de gamme : Margaux, Hermitage, Côte-Rôtie, Champagne Bollinger
- Pas de bouteille à 12€

## Scénario 7 - Hors scope

**Requête :** "Vous avez du whisky ?"

**Comportement attendu :**
- L'agent doit dire qu'on est caviste vin uniquement
- Ne doit pas inventer un produit
- Doit rester serviable

## Scénario 8 - Multi-tour avec changement de besoin

**Tour 1 :** "Un vin pour un poulet rôti"
**Tour 2 :** "Finalement c'est plutôt pour des huîtres"

**Comportement attendu :**
- Tour 1 : recommande rouge léger ou blanc (Beaujolais Villages, Sancerre Rouge, Sancerre Blanc)
- Tour 2 : détecte changement de besoin ("finalement"), bascule sur fruits de mer, recommande Muscadet, Chablis, Picpoul

## Scénario 9 - Profil de goût + accord

**Requête :** "J'aime les vins puissants et tanniques, tu as quoi pour un cassoulet ?"

**Comportement attendu :**
- Détecte profil "puissant" + "tannique"
- Détecte accord "cassoulet" → cuisine du Sud-Ouest
- Recommande Cahors C42-R018, Madiran C42-R017
