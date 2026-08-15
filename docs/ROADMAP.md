# Roadmap Shimmer

État au 2026-05-12. Cette roadmap est volontairement courte. Elle reflète ce qui est en cours, ce qui suit, et ce qui est exploré sans engagement.

## Légende

- **Now** : en chantier, code commencé.
- **Next** : décidé, prochain en file.
- **Later** : identifié, pas encore committé.
- **Maybe** : exploration, peut être abandonné.

---

## Now

### FSM 7 états persistante

Les conversations vendeur IA gèrent aujourd'hui un état partiel (need_change, ACCEPT, CLOSE). On passe à 7 états avec persistance DB pour reprendre une conversation interrompue.

États cibles : `OPEN`, `QUALIFYING`, `RECOMMENDING`, `OBJECTION`, `ALTERNATIVE`, `ACCEPT`, `CLOSE`.

Persiste dans table `Conversation` avec historique normalisé. Permet aussi l'analyse offline.

### E2E Playwright

Cover les parcours critiques :

1. Vendeur IA : requête floue → qualification → recommandation → ajout panier.
2. Cross-sell : impression → clic → ajout cible → achat → CA attribué.
3. Admin marchand : édition d'un override, save, vérification render.
4. Onboarding : import catalogue → génération univers → première requête.

Tourne en CI sur chaque PR.

---

## Next

### Auth dashboard admin durcie

Aujourd'hui : gating simple par mot de passe partagé. Cible : session cookies HttpOnly + 2FA optionnel pour les marchands. Pas de SSO entreprise prévu à ce stade.

### Bench cross-sell sur 3 verticaux supplémentaires

Ajouter parfum, cosmétique, hi-fi audio aux verticaux supportés (drinks, lighting, fashion, generic). Chacun apporte :

- Entrée dans `CATEGORY_ROLE_HINTS`
- Phrasings spécifiques dans `PHRASES_BY_ROLE`
- Catalogue de test
- 5+ tests par vertical

### A/B testing des raisons cross-sell

Permettre au marchand de tester deux phrasings pour un même pick. Mesure : take-rate sur 14 jours par variante.

Schema : `CrossSellEventVariant` (eventId, variantKey). Algo : assignation déterministe par sessionId hash.

---

## Later

### Multi-langue

Aujourd'hui : tout français. Cible : EN d'abord, ES ensuite. Implique :

- Champs `name`, `description`, `reason` localisés
- Détection langue côté client SDK
- Phrasings cross-sell par langue
- Embedding multilingue déjà OK (multilingual-e5)

### Webhooks sortants pour les events critiques

Permettre au marchand de recevoir des webhooks : `purchase.attributed`, `cart.abandoned.recovered`, `review.alert.created`, etc.

Signature HMAC. Retry exponentiel. Dashboard de delivery.

### Monitoring (Prometheus + Grafana)

Métriques exposées sur `/metrics` :

- Latence p50/p95/p99 par endpoint
- Taux d'erreur LLM
- Cache hit rate Redis
- Job queue depth BullMQ
- Cross-sell take-rate temps réel

### Self-serve onboarding marchand

Aujourd'hui : onboarding manuel via API. Cible : page d'inscription, génération API key, upload catalogue UI, preview vendeur IA en sandbox avant go-live.

---

## Maybe

### Réécriture LLM des raisons en temps réel

Aujourd'hui : précompute offline, optionnellement LLM. Exploration : LLM en runtime, edge cached, pour personnaliser au contexte client (panier en cours, historique). Trade-off latence/coût à valider.

### SDK React natif

Le SDK actuel est framework-agnostic (vanilla JS). Une version `@shimmer/react` avec hooks (`useAssistant`, `useCrossSell`) pourrait simplifier l'intégration sur les boutiques Next.js/Remix. À jauger selon demande.

### Cross-device attribution

Permettrait de rattacher un achat desktop à un clic mobile via login marchand. Implique un user-id partagé côté marchand, complexité auth/RGPD non négligeable.

### Mode "agent autonome" pour le SAV

Au-delà du brouillon validable, l'agent répond seul aux tickets de complexité faible (suivi commande, demande facture). Avec audit log et seuil de confiance. Question éthique et juridique non tranchée.

---

## Hors scope explicite

Choses parfois demandées qui ne sont **pas** prévues, à expliciter pour éviter la dérive :

- App mobile (le SDK couvre les sites mobiles, pas besoin d'app native côté marchand).
- Place de marché multi-vendeurs.
- Module BI/reporting au-delà du dashboard analytics actuel.
- Intégration directe Shopify/WooCommerce sous forme de plugin officiel (SDK suffit, le plugin viendra si la demande est là).
- Génération de contenu marketing (descriptions, emails de campagne). Ce n'est pas le métier de Shimmer.

---

## Historique des deliveries

Voir [CHANGELOG.md](../CHANGELOG.md).
