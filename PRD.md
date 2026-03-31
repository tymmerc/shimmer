# Shimmer — Product Requirements Document

**Version** : 1.0
**Date** : 2026-03-12
**Statut** : Approuvé

---

## 1. Vision produit

Shimmer est une plateforme SaaS d'assistant IA e-commerce qui reproduit le comportement d'un vendeur expert. Elle se connecte au catalogue d'un marchand et fournit 3 services via API + SDK embarquable :

1. **Recherche intelligente** (priorité) — Un moteur de recherche conversationnel qui comprend les besoins fonctionnels des clients, pas seulement les mots-clés
2. **Chatbot SAV** — Un assistant de service après-vente qui répond aux questions commandes, retours, suivi colis
3. **Triage email** — Un classificateur + générateur de brouillons pour les emails entrants du support

**Différenciation** : Shimmer ne fait pas de la recherche par mots-clés. Il qualifie le besoin client comme un vendeur en magasin, en posant les bonnes questions et en recommandant avec argumentation.

---

## 2. Utilisateurs cibles

| Utilisateur | Rôle | Interaction |
|-------------|------|-------------|
| Client final | Acheteur sur le site e-commerce | Recherche produits, chat SAV |
| Marchand | Propriétaire de la boutique | Dashboard analytics, config, gestion emails |
| Admin Shimmer | Nous | Gestion multi-tenant, monitoring |

---

## 3. Modules fonctionnels

### 3.1 Module Recherche Intelligente (Priorité #1)

#### 3 types de recherche + hybride

**TYPE 1 — Recherche exacte**
Le client sait ce qu'il veut (nom produit, SKU, EAN, "le même que d'habitude").
- Fuzzy matching : levenshtein×0.4 + jaro-winkler×0.3 + phonétique×0.2 + ngram×0.1
- Seuils : >80% confirmer, 50-79% proposer options, <50% reformuler
- Les chiffres doivent matcher exactement (V15 ≠ V12)
- Upsell seulement si modèle supérieur existe + écart prix raisonnable + bénéfice en 1 phrase

**TYPE 2 — Recherche par besoin fonctionnel (cœur du produit)**
Le client exprime un problème ou objectif ("aspirer les poils de mon chat", "sentir bon toute la journée").
- Pipeline 3 étapes :
  - Stage 1 (BM25, <10ms) : matching mots-clés → taxonomie d'usages
  - Stage 2 (embeddings sémantiques, <100ms) : vecteurs multilingues si Stage 1 insuffisant
  - Stage 3 (reformulation Claude) : si score trop bas, demander clarification au client
- Qualification : max 3 questions, chacune doit éliminer ≥30% des produits non pertinents
- Scoring multi-critères : usage × criteria × historique, poids configurables par univers

**TYPE 3 — Recherche par similarité**
Le client utilise un produit connu comme référence ("comme le Dyson mais moins cher").
- 5 sous-cas : similaire car aime, alternative budget, remplacement indisponible, découverte, équivalent concurrent
- Distance pondérée : catégoriel exact/proche, numérique normalisé, listes (intersection/union)
- Seuils : 0-15 très similaire, 15-35 même esprit, 35-60 exploration, >60 pas proposé

**HYBRIDE (15-20% des requêtes)**
Marque + besoin fonctionnel ("un Dyson pour les poils") : combiner TYPE 1 filtre + TYPE 2 scoring.

#### Moteur de qualification

- Poids par univers : Electroménager (usage 60%/criteria 30%/history 10%), Parfum (40/20/40), Bricolage (30/55/15), etc.
- Score ≥70% → recommander direct, 40-70% → 1-2 questions, <40% → qualification complète
- Règles de déduction : "appartement" → petit espace, "bureau" → sillage discret, "chantier" → usage intensif
- Gestion "je sais pas" : toujours avoir un plan B (polyvalent, 3 gammes de prix, etc.)

#### Machine à états conversationnelle (7 états)

INIT → DETECTION → QUALIFICATION → RECOMMENDATION → OBJECTION → PURCHASE → CLOSURE

Signaux de transition : "en fait" → changement besoin, "reviens au premier" → backtrack, "et aussi" → besoin additionnel, "trop cher" → objection, "je le prends" → achat.

#### Données produit (4 couches)

1. Identité (PIM) : catégorie, marque, SKU
2. Attributs techniques (PIM) : specs mesurables
3. Usages / jobs-to-be-done (extraction auto) : "à quoi ça sert"
4. Performance par usage (calcul multi-sources) : score 0-100 par usage

Score usage = Σ(score_source × poids × confiance) / Σ(poids × confiance)
- Data comportementale : poids 5
- Avis clients (>50) : poids 3
- Tests indépendants : poids 3
- Avis clients (<50) : poids 2
- Fiches produit : poids 1

#### Gestion du budget

- Signaux : montant explicite, qualitatif ("pas cher" = P25-P50), ancre ("moins cher que X")
- Plage alternatives : -20% / +10% (asymétrique)
- Budget conservé pendant toute la conversation

#### Niveau de confiance et discours adapté

- Très haute (3+ sources, >100 avis) : "Je te recommande..."
- Haute (2+ sources, >50 avis) : "Très bien noté pour..."
- Moyenne (1-2 sources) : "D'après ce que je sais..."
- Basse (<10 avis) : "Semble adapté, mais peu de retours"
- Très basse (PIM only) : "Indiqué dans sa fiche, pas de retours clients"
- Pas d'upsell en confiance moyenne ou inférieure

#### Boucle d'apprentissage

- Chaque interaction stocke : query, stage utilisé, usage mappé, validation client, conversion, retour
- Enrichissement quotidien : queries validées ajoutées aux corpus BM25 + embeddings
- Queries non mappées récurrentes (5+ occurrences) → alerte enrichissement taxonomie
- Cible : 60-70% Stage 1 au lancement → 90%+ à maturité

### 3.2 Module Chatbot SAV (Priorité #2)

- Claude avec system prompt dynamique (store context, order data, policies)
- Lookup commande par numéro, explication politique retour, initiation retour
- Escalade automatique : sentiment négatif, boucle détectée, demande explicite humain
- Streaming des réponses, max 3 phrases sauf explication process
- Jamais inventer d'info, escalader si incertain

### 3.3 Module Triage Email (Priorité #3)

- Classification Claude : ORDER_STATUS, RETURN_REQUEST, PRODUCT_QUESTION, COMPLAINT, DELIVERY_ISSUE, PAYMENT_ISSUE, SPAM, OTHER
- Extraction : catégorie, urgence, sentiment, numéro commande
- Génération de brouillon avec confidence
- **Jamais d'envoi automatique** — toujours revue humaine
- Workflow n8n exportable (IMAP trigger → classify → draft → queue)

---

## 4. Architecture multi-tenant

Chaque marchand = 1 store avec :
- API key propre
- Catalogue produit indépendant
- Configuration univers/paramétrage
- Analytics isolées
- Sessions recherche/chat/mail séparées

---

## 5. Dashboard API (pour frontend Lovable)

| Endpoint | Description |
|----------|-------------|
| `GET /api/analytics/search` | Sessions, top queries, distribution stages, taux conversion, heatmap intents |
| `GET /api/analytics/search/unmapped` | Queries non mappées récurrentes |
| `GET /api/analytics/mail` | Stats queue, breakdown par catégorie |
| `GET /api/analytics/chat` | Taux escalade, taux résolution |
| `GET /api/mail/queue` | Emails en attente de review |
| `POST /api/mail/approve` | Approuver envoi |
| `GET /api/chat/escalations` | Conversations escaladées |
| `GET /api/taxonomy` | Taxonomie complète par univers |
| `POST /api/taxonomy/:id/enrich` | Enrichir un usage (keywords/phrases) |
| `GET /api/pipeline/status` | Statut enrichissement par produit |

---

## 6. SDK embarquable

- Vanilla JS, <30kb gzip
- `Shimmer.init({ apiUrl, apiKey, containerId, searchSelector?, chatSelector? })`
- Détection auto : `input[type=search]` ou `data-shimmer-search`
- Widgets : barre de recherche conversationnelle + chat SAV
- API : `Shimmer.search(query)`, `Shimmer.chat(message)`, `Shimmer.destroy()`

---

## 7. Contraintes et exigences non fonctionnelles

| Exigence | Cible |
|----------|-------|
| Latence Stage 1 (BM25) | <10ms |
| Latence Stage 2 (embeddings) | <100ms |
| Latence totale recherche | <500ms (hors reformulation) |
| SDK taille | <30kb gzip |
| Uptime API | 99.5% |
| Données client | Jamais partagées entre stores |

---

## 8. Ce qui est hors scope v1

- Frontend (fait dans Lovable)
- Paiement / checkout
- Gestion catalogue / PIM (import via API)
- Envoi email automatique (toujours review humaine)
- App mobile native
- Multi-langue (français d'abord, extensible)

---

## 9. Métriques de succès

| Métrique | Cible lancement | Cible 3 mois |
|----------|----------------|--------------|
| Queries résolues Stage 1 | 60-70% | 85-90% |
| Taux conversion recherche | 35% | >50% |
| Taux upsell accepté | 10% | >18% |
| CSAT chatbot | >80% | >85% |
| Taux escalade humaine | <10% | <3% |
| NPS conversation | >40 | >50 |
