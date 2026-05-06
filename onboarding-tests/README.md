# Simulation de greffage Shimmer

Test de modularité : on greffe Shimmer sur deux entreprises fictives pour valider que la plateforme s'intègre sans toucher au code core, juste via API + config.

## Profils testés

| Profil | Univers | Catalogue | Spécificité |
|--------|---------|-----------|-------------|
| Caves Forty-Two | Vins (caviste indépendant) | 80 références | Jargon technique (cépage, millésime), critères très différents (occasion, accord met-vin) |
| L'Atelier Lumière | Luminaires d'intérieur | 60 références | Critères dimensionnels (taille pièce, hauteur plafond), styles esthétiques (scandinave, industriel) |

Les deux univers n'existent pas dans Shimmer. Ils forcent le test du process "construction de taxonomie depuis zéro" du Tome 3 §3.6.

## Méthodologie

Pour chaque profil, on suit le parcours d'onboarding tel qu'un client réel le ferait :

1. **Création du store** : `POST /api/stores`
2. **Import du catalogue** : `POST /api/catalog/import`
3. **Génération auto des univers** : `POST /api/universe/generate`
4. **Sessions de test** : `POST /api/search/assist` avec scénarios prédéfinis
5. **Documentation des frictions** : tout ce qui n'est pas évident, tout ce qui demande du sur-mesure code

Chaque profil contient :
- `profile.md` : persona, ton, contexte business
- `config/catalogue.json` : produits avec specs réalistes
- `config/expected-taxonomy.json` : usages qu'on s'attend à voir détectés
- `config/test-scenarios.md` : les conversations à tester
- `import.sh` : script reproductible de greffage
- `results/` : transcripts JSON des sessions, captures de friction

## Critères de modularité (verdict)

À la fin du test, on évalue :

- **Onboarding zéro-code** : peut-on greffer un nouvel univers sans modifier le code ?
- **Qualité de l'auto-config** : `POST /api/universe/generate` produit-il une config exploitable ?
- **Pertinence taxonomie** : les usages détectés correspondent-ils aux requêtes clients ?
- **Tonalité personnalisée** : peut-on adapter le ton de l'agent au store ?
- **Robustesse cross-univers** : un store nouveau ne casse pas les stores existants ?

Verdict final dans [FRICTIONS.md](./FRICTIONS.md).
