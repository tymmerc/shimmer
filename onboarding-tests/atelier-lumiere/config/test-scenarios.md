# Scénarios de test - L'Atelier Lumière

## Scénario 1 - TYPE 2 simple (besoin pièce + style)

**Requête :** "Je cherche une suspension scandinave pour ma salle à manger"

**Comportement attendu :**
- Détecte univers Suspension
- Détecte style "scandinave"
- Détecte pièce "salle à manger"
- Pose 1-2 questions (taille de la table ? hauteur sous plafond ?)
- Recommande PH 5, Caravaggio, Multi-Lite, Mass Light

## Scénario 2 - TYPE 2 avec critères dimensionnels

**Requête :** "Une suspension pour au-dessus d'une grande table à manger 8 personnes, hauteur sous plafond 2m70"

**Comportement attendu :**
- Filtre type=suspension
- Filtre piece="salle à manger" + diamètre adapté à grande table (60cm+)
- Recommande PH 5 (50cm), Tolomeo Mega (100cm), Artichoke (60cm), Vertigo (140cm)
- Ne propose pas les petites compactes (Nut, Plug-In)

## Scénario 3 - TYPE 3 (similarité, vocabulaire amateur)

**Requête :** "J'ai vu une lampe en marbre avec un grand arc, c'est pour quoi ?"

**Comportement attendu :**
- Identifie référence implicite : Arco (Flos)
- Confirme et propose le produit Arco C42-FLR-001
- Propose alternatives plus accessibles : IC F2, Mantis

## Scénario 4 - HYBRIDE (marque + besoin)

**Requête :** "Une lampe Flos pour mon bureau"

**Comportement attendu :**
- Filtre brand=Flos
- Filtre type=lampe bureau ou intent bureau
- Recommande lampes bureau Flos (s'il y en a) ou autres lampes Flos adaptées : Tab F (lampadaire bureau), Bellhop

## Scénario 5 - Vocabulaire amateur (lumière jaune)

**Requête :** "Une suspension qui fait une lumière jaune douce, pour le salon"

**Comportement attendu :**
- Comprend "lumière jaune douce" → ambiance chaude / 2700K
- Filtre piece=salon
- Recommande des suspensions ambiance chaude

## Scénario 6 - Cas piégé (ne sait pas formuler)

**Requête :** "J'aménage un studio de 25m², il me faut un truc qui éclaire bien sans prendre de place"

**Comportement attendu :**
- Détecte petit espace
- Comprend besoin d'éclairage efficace + compact
- Pose questions : déjà un éclairage central ? c'est plutôt salon ou espace nuit ?
- Recommande lampadaire compact, applique plug & play, ou suspension compacte

## Scénario 7 - TYPE 1 (recherche exacte)

**Requête :** "Je veux la lampe Bourgie de Kartell"

**Comportement attendu :**
- Match exact AL-TBL-004
- Confiance haute, propose direct
- Pas de qualification

## Scénario 8 - Multi-tour avec budget évolutif

**Tour 1 :** "Une jolie suspension pour mon salon"
**Tour 2 :** "Ah c'est trop cher la première, t'as moins cher ?"

**Comportement attendu :**
- Tour 1 : recommande sans contrainte budget
- Tour 2 : détecte objection budget, baisse la fourchette, propose des alternatives moins chères du même style

## Scénario 9 - Critère technique (ampoule)

**Requête :** "Je cherche un lampadaire LED pour mon salon, je veux pas avoir à changer d'ampoule"

**Comportement attendu :**
- Filtre source="LED integree"
- Filtre type=lampadaire, piece=salon
- Recommande Tab F, Bellhop Floor

## Scénario 10 - Style vintage (dans le jargon)

**Requête :** "J'aime bien le style années 60, mid-century, vous avez quoi ?"

**Comportement attendu :**
- Détecte style "vintage" / "mid-century"
- Présente plusieurs catégories : Snoopy, Mushroom, AJ Table, Arco, Mantis, Akari
- Demande peut-être quelle pièce
