# Design Brief - Shimmer Showcase

## Identite
- Mood : soft-toxique (doux avec des rappels discrets de l'effet poison/violet du hero)
- Nom / Marque : Shimmer
- Objectif principal : demo + branding (montrer ce que fait la plateforme, pas vendre)
- Cible : e-commercants, investisseurs, collaborateurs

## Contraintes visuelles
- Palette : hero = dark violet toxique (existant, on touche pas). Sections suivantes = fond clair/off-white qui s'eclaircit progressivement, avec des accents violet subtils
- Font : Space Grotesk (titres) + Inter (corps) - deja en place
- Motion : subtile (reveals au scroll, pas de fade-in sur chaque element)
- Dark mode : hero only. Le reste passe en clair

## Structure souhaitee
- Hero (EXISTANT - NE PAS TOUCHER) : titre SHIMMER + canvas toxique + boutons
- Numbers : stats cles (transition dark -> clair)
- Modules : 4 cartes (recherche, chatbot, mail, avis)
- Pipeline : les 3 niveaux de recherche
- Chatbot : mock de conversation
- Mail : mock de triage
- Reviews : mock d'avis
- Architecture : stack technique
- Demo : le faux e-commerce avec le vendeur IA
- Footer

## Ce projet ne ressemble surtout pas a...
- Les landing pages AI startup generiques (fond noir, gradients bleu-violet, cartes avec shadow partout)
- Material Design / Bootstrap vibes
- Trop de sections identiques empilees

## Ce qui existe et fonctionne
- Le hero avec le canvas WebGL toxique (on garde tel quel)
- La section demo e-commerce (on garde le fonctionnel, on peut revoir le style)
- Le script.js avec les animations et le SDK

## Stack
- Framework : vanilla HTML/CSS/JS (pas de React, pas de build)
- Styling : CSS custom (pas de Tailwind)
- Contrainte : un seul fichier HTML + un CSS + un JS
