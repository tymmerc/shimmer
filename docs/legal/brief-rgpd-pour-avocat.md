# Shimmer — Brief RGPD pour avocat

Document interne destiné à l'avocat qui rédigera le DPA et la politique de confidentialité de Shimmer. Décrit factuellement les traitements, données, finalités, bases légales, sous-traitants et durées. Tym Mercier (éditeur de Shimmer).

---

## 1. Architecture de responsabilité

- **Responsable de traitement (data controller)** : le marchand (ex : un caviste en ligne). C'est lui qui a la relation client.
- **Sous-traitant (data processor)** : Shimmer (Tym Mercier, France). Traite uniquement pour le compte du marchand.
- **Sous-sous-traitants envisagés** :
  - Anthropic (US), pour Claude API, en option de production (le défaut est Ollama local en France, aucun transfert).
  - Mailgun (région UE), envoi d'emails sortants.
  - Twilio (région UE), envoi de SMS sortants.
  - OVH ou équivalent, hébergeur VPS France.

Aucun transfert hors UE n'a lieu dans la configuration par défaut. Le transfert vers Anthropic n'a lieu que si le marchand active `LLM_PROVIDER=claude` (à documenter dans le DPA en option, SCC à signer).

---

## 2. Catégories de données traitées

### 2.1 Données du marchand (B2B)
- Identifiants du compte marchand (email, nom de boutique).
- Clé API.
- Configuration boutique (ton, voix, vocabulaire).

### 2.2 Données du catalogue
- Fiches produit, descriptions, prix, stock. **Pas de donnée personnelle.**

### 2.3 Données des clients finaux du marchand
- Email, prénom, nom, téléphone (issus des commandes Shopify / WooCommerce).
- Historique de commandes, montants.
- Avis clients (texte, note, recommandation).
- Tickets SAV (description, résolution).
- Mails entrants classifiés (expéditeur, sujet, corps).
- Sessions de chat (messages échangés avec le vendeur IA, email client si fourni).
- Évènements cross-sell (impressions, clics, ajouts panier, par identifiant de session).

### 2.4 Données de visiteurs non identifiés
- Identifiant pseudonyme (cookie first-party) : `shimmer_vid`. UUID v4, durée 1 an.
- Bucket d'expérience holdout (0-99, déterministe à partir de l'identifiant + storeId).
- Évènements de session : pages vues, requêtes tapées, produits vus.
- Pas de croisement avec un email tant que le visiteur ne s'identifie pas.

### 2.5 Données ingérées dans la base de connaissance (table `knowledge_chunks`)
- **Textes pré-scrubbés**, jamais bruts. Le scrubber retire systématiquement avant insertion :
  - emails
  - téléphones (formats français)
  - codes postaux (5 chiffres)
  - dates au format DD/MM/YYYY
  - IBAN
  - prénoms et noms issus du roster client du magasin (matching exact insensible à la casse)
- Le SAV n'est **jamais stocké tel quel**. Un LLM extrait des "objections récurrentes" anonymes (ex : "Comment décanter le vin ?") et seules ces formulations agrégées sont conservées.

---

## 3. Finalités par traitement

| Traitement | Finalité | Base légale |
|---|---|---|
| Recommandation produit (vendeur IA) | Aider le visiteur à trouver un produit | Intérêt légitime du marchand |
| Suivi de commande par SMS/email | Information opérationnelle au client | Exécution du contrat |
| Relance panier abandonné (email) | Prospection auprès d'un client existant | Intérêt légitime (transactionnel ; opt-out à fournir) |
| Demande d'avis après livraison | Collecte de feedback | Intérêt légitime |
| Holdout (cookie + bucketing) | Mesure d'incrémentalité du produit | Consentement (analyse non strictement nécessaire) |
| Attribution chat → commande | Mesure d'efficacité | Intérêt légitime |
| Tri de mails entrants | Productivité du SAV | Intérêt légitime |
| Ingestion knowledge base | Enrichir le vendeur IA | Intérêt légitime, après scrubbing PII |

À valider par l'avocat. La base "consentement" pour le cookie holdout suit ePrivacy / loi Informatique et Libertés.

---

## 4. Durées de conservation

| Donnée | Durée proposée | Raison |
|---|---|---|
| Sessions de chat | 90 jours, puis anonymisation (suppression de l'email) | Mesure d'attribution court terme |
| Évènements cross-sell | 12 mois | Dashboard et reporting |
| Visiteurs holdout (cookie) | 12 mois | Stabilité du bucketing pour la mesure |
| Avis clients | Tant que publiés | Décision du marchand |
| Knowledge chunks (avis scrubbés) | Régénérables, durée indéfinie tant que la source existe | Effacés si l'avis source est effacé (article 17) |
| Knowledge chunks (objections SAV agrégées) | 24 mois | Agrégat anonyme, non rattachable |
| Logs API | 30 jours | Sécurité opérationnelle |
| Sauvegardes DB | 30 jours rolling | Continuité |

---

## 5. Droits des personnes — implémentation technique

### Article 15 (accès)
Endpoint `GET /api/customer/export` (à implémenter si demandé). Export JSON de toutes les données d'un client à partir de son storeId + email.

### Article 16 (rectification)
Le marchand modifie via son admin Shopify/WooCommerce. La donnée se propage à Shimmer aux prochains webhooks.

### Article 17 (effacement)
Endpoint `POST /api/erasure` (déjà implémenté). Cascade sur :
- chat_sessions (par email)
- reviews et review_requests (par customerId)
- knowledge_chunks issus des avis du client (par source_id)
- sav_requests (par customerId)
- abandoned_carts (par customerId et email)
- sent_emails (par destinataire)
- mail_queue (par expéditeur)
- orders (par customerId)
- customer (suppression finale)

Retourne un compte par table, traçabilité pour le registre du marchand.

### Article 20 (portabilité)
Couvert par l'export de l'article 15.

### Article 21 (opposition)
Le marchand désactive Shimmer pour un client donné en l'ajoutant à une liste d'opt-out (à implémenter).

---

## 6. Mesures techniques et organisationnelles

- HTTPS partout, certificats valides.
- Authentification API par clé Bearer par marchand. Pas d'accès cross-magasin possible par construction (filtrage `storeId` systématique).
- Webhooks Shopify/WooCommerce vérifiés par HMAC-SHA256.
- Mots de passe BDD non commités, dans `.env` versionné en `.env.example`.
- Logs application : Pino, sans données personnelles dans les messages d'info (uniquement IDs).
- PII scrubber appliqué AVANT toute insertion en base de connaissance et AVANT tout appel LLM enrichi.
- LLM local (Ollama qwen2.5) par défaut, aucune sortie de donnée.
- Pas de tracking publicitaire tiers (pas de Meta Pixel, Google Analytics, etc.).
- Sauvegardes BDD chiffrées.

---

## 7. AI Act (transparence)

- Le widget vendeur doit indiquer clairement qu'il s'agit d'une IA (« Vendeur IA » dans l'en-tête du widget).
- Le marchand doit pouvoir désactiver l'IA sur demande explicite d'un client (handover humain).

---

## 8. Ce qu'on demande à l'avocat

1. **Rédiger le DPA modèle** (article 28 RGPD) avec :
   - liste des sous-traitants par défaut et en option
   - SCC pour transfert vers Anthropic en option
   - clauses de durée, sécurité, audit, notification de breach
2. **Rédiger la politique de confidentialité Shimmer** publique.
3. **Mention type** que le marchand peut copier-coller dans sa propre politique pour mentionner Shimmer.
4. **Valider les bases légales** du tableau §3 et corriger si besoin.
5. **Confirmer les durées** du §4.
6. **Indiquer s'il faut une analyse d'impact (PIA / DPIA)** vu les volumes envisagés (estimation : 10 marchands × ~1000 visiteurs/mois la première année).
7. **Désigner ou pas un DPO** ? (Shimmer en SAS solo aujourd'hui.)

---

## 9. Contact

Tym Mercier — tym.mercier@gmail.com
