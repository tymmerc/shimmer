# Checklist onboarding pilote (côté Shimmer)

Pour chaque boutique acceptée, on suit ce squelette. Chaque ligne est une étape concrète, pas un voeu.

## J-0 : signature pilote

- [ ] Boutique créée via POST /api/stores → on note l'API key
- [ ] Phase initiale : `ingesting` (par défaut depuis le 10 juin 2026)
- [ ] Accès admin partagé : email de la boutique ajouté au dashboard
- [ ] Canal Slack/WhatsApp direct ouvert avec le marchand

## J+1 à J+3 : ingestion (Phase 1)

- [ ] Catalogue importé via /api/catalog/import (CSV ou Shopify)
- [ ] Avis Google/Trustpilot scrappés et nettoyés (PII scrubbing actif)
- [ ] Mails SAV des 30 derniers jours analysés
- [ ] Knowledge chunks générés : viser >= 100 chunks selon catalogue
- [ ] Gate ingestingComplete : true → on avance manuellement vers `observing`

## J+3 à J+10 : observation silencieuse (Phase 2)

- [ ] SDK collé sur 3 lignes des fiches produits
- [ ] Widget HIDDEN, /api/observation/log reçoit les requêtes
- [ ] Vérifier remontée quotidienne dans /api/observation/report
- [ ] Cibler >= 50 requêtes observées avant d'avancer
- [ ] Génération du rapport J+7 à présenter au marchand

## J+10 à J+14 : validation marchand (Phase 3)

- [ ] /api/preview/generate?count=15 sur les requêtes observées
- [ ] Marchand reçoit accès à l'écran de validation
- [ ] Cibler 10 approuvés + taux d'approbation >= 80%
- [ ] Si taux trop bas, retour Phase 2 avec ajustement du ton

## J+14 : passage live (Phase 4)

- [ ] POST /api/onboarding/advance to=live (gates verts auto-validés)
- [ ] Widget visible, holdout actif à 10% par défaut
- [ ] Webhooks Shopify/Woo branchés sur abandoned_checkout + orders_paid
- [ ] Premier reporting hebdo programmé

## Semaines 3 à 6 : monitoring + ajustements

- [ ] Lecture du dashboard 2x/semaine avec le marchand
- [ ] Ajustement des règles cross-sell si besoin
- [ ] Vérification attribution holdout : intervalle de confiance + p-uplift
- [ ] Décision continuité ou arrêt à S+6

## Risques connus à surveiller

- Vendeur trop lent à répondre si LLM_PROVIDER=ollama : vérifier latence p95 < 3s en live
- Webhook HMAC mismatch si secret pas matché entre Shopify et store.config.shopify.webhookSecret
- Holdout trop petit : minimum 200 visiteurs/jour pour intervalles utiles en 2 semaines
