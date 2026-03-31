# Shimmer

Plateforme modulaire d'automatisation e-commerce par IA. Shimmer fournit aux marchands des modules autonomes qui prennent en charge la recherche produit, le triage des emails, la collecte d'avis, le suivi des commandes et la relance des paniers abandonnes.

**Demo live** : [tymmerc.eu/shimmer](https://tymmerc.eu/shimmer/)

## Ce que ca fait

**Vendeur IA** - Le client tape "un truc pour les poils de mon chat", le systeme comprend que c'est de l'electromenager, detecte qu'il a un animal, pose 1-2 questions (fil ou sans fil ? budget ?) et recommande le bon produit. Gere aussi les objections ("trop cher" propose moins cher).

**Triage mail** - Chaque email client est analyse par l'IA : categorie, urgence, sentiment. Les reclamations creent un ticket SAV automatiquement. Les brouillons de reponse ne partent jamais sans validation humaine.

**Collecte d'avis** - Apres chaque livraison, demande d'avis automatique. L'IA publie les bons (4-5 etoiles), modere les moyens, et alerte le SAV sur les mauvais.

**6 automatisations** - Classification email, collecte d'avis, alertes SAV, suivi commandes, relance paniers abandonnes, rapport quotidien. Tous interconnectes.

**Auto-apprentissage** - Le marchand importe son catalogue (CSV/JSON), le systeme genere les categories, les questions a poser et les mots-cles en moins d'une seconde.

## Stack

```
shimmer/
├── apps/api/              Express API (TypeScript)
├── apps/showcase/         Page de demo
├── packages/
│   ├── core/              Prisma, client LLM, Redis, types
│   ├── smart-search/      Recherche 3 niveaux (exact, full-text, vendeur IA)
│   ├── chatbot/           Assistant SAV
│   ├── mail-engine/       Classification emails
│   └── reviews/           Collecte et analyse d'avis
├── sdk/                   Widget JavaScript (<30kb)
├── embedding-sidecar/     FastAPI Python (embeddings ONNX)
└── n8n-workflows/         6 workflows d'automatisation
```

## Demarrage rapide

```bash
# Prerequis : Node 22+, pnpm 9+, PostgreSQL, Redis, Ollama

# Install
pnpm install

# Config
cp .env.example .env
# Editer .env avec les credentials DB/Redis/Ollama

# DB
pnpm prisma migrate deploy
pnpm prisma db seed

# Build
pnpm build

# Lancer
pnpm start        # API sur :3003
```

## API

Toutes les routes requierent un header `Authorization: Bearer <api-key>`.

| Route | Description |
|-------|-------------|
| `POST /api/search/assist` | Recherche conversationnelle (vendeur IA) |
| `POST /api/catalog/import` | Import catalogue JSON ou CSV |
| `POST /api/universe/generate` | Auto-generation d'univers depuis le catalogue |
| `GET /api/universe` | Liste des univers actifs |
| `GET /api/catalog/stats` | Stats du catalogue (categories, marques) |
| `POST /api/mail/classify` | Classification d'un email |
| `POST /api/reviews/submit` | Soumission d'un avis client |

### Exemple : recherche conversationnelle

```bash
# Tour 1 : le client cherche
curl -X POST https://tymmerc.eu/shimmer/api/search/assist \
  -H "Authorization: Bearer test-api-key" \
  -H "Content-Type: application/json" \
  -d '{"message": "aspirateur poils de chat"}'

# Tour 2 : le client repond a la question du vendeur
curl -X POST https://tymmerc.eu/shimmer/api/search/assist \
  -H "Authorization: Bearer test-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "sans fil",
    "history": [
      {"role": "user", "content": "aspirateur poils de chat"},
      {"role": "assistant", "content": "Pour les poils de chat ! Avec fil ou sans fil ?"}
    ],
    "knownCriteria": {"ANIMAUX": "true"}
  }'
```

### Exemple : import catalogue

```bash
curl -X POST https://tymmerc.eu/shimmer/api/catalog/import \
  -H "Authorization: Bearer test-api-key" \
  -H "Content-Type: application/json" \
  -d '[
    {"name": "Parfum Femme Rose", "brand": "Dior", "category": "Parfum", "price": 89.90},
    {"name": "Creme Hydratante", "brand": "Clinique", "category": "Soin", "price": 45.00}
  ]'
```

## SDK

```html
<script src="https://tymmerc.eu/shimmer/sdk/shimmer-sdk.min.js"></script>
<script>
  Shimmer.init({ apiUrl: 'https://tymmerc.eu/shimmer', apiKey: 'sk_...', storeId: 1 })
  const result = await Shimmer.assistant.chat("aspirateur poils de chat")
</script>
```

## Workflows n8n

| # | Workflow | Declencheur | Action |
|---|----------|-------------|--------|
| 1 | Classification email | Webhook email entrant | Categorie + urgence + ticket SAV si reclamation |
| 2 | Collecte d'avis | Webhook review-submitted | Publication, moderation, ou alerte SAV |
| 3 | Alertes SAV | Webhook sav-alert | Ticket numerote + alerte si urgent |
| 4 | Suivi commandes | Webhook order-status | Mise a jour + demande d'avis si livree |
| 5 | Relance paniers | Webhook cart-abandoned | 2 emails personnalises + code promo |
| 6 | Rapport quotidien | Cron chaque matin | Stats + resume IA |

## Architecture

```
Client (SDK) → Nginx → API Express :3003 → Packages metier
                                          → PostgreSQL :5434 (20 tables, multi-tenant)
                                          → Redis :6381 (cache, queues)
                                          → Ollama :11434 (LLM local)
                                          → n8n :5678 (6 workflows Docker)
```

Multi-tenant : chaque marchand a ses donnees isolees par `store_id`.

## Tests

Teste sur deux catalogues (bricolage 57 produits + Sephora 1000 produits cosmetiques) :
- 250+ tests automatises
- 55/55 mots-cles produit correctement detectes
- 18/19 scenarios beaute passes
- 0 crash sur inputs adversariaux (XSS, unicode, injection)
- 0 cross-contamination entre requetes simultanees

## Licence

Projet prive - CUB / Lycee Laetitia, Ajaccio.
