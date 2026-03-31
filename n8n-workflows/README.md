# Shimmer — n8n Workflows E-Commerce

6 workflows d'automatisation pour n8n, conçus pour le e-commerce, le SAV et le service client.

**Connectés directement à PostgreSQL** + **Ollama local** (qwen2.5:3b) pour l'IA — aucune dépendance externe obligatoire.

## Workflows

| # | Fichier | Description | Triggers | DB Tables |
|---|---------|-------------|----------|-----------|
| 01 | `01-email-classification-auto-response.json` | Classification IA des emails + routage par priorité | Webhook POST | `mail_queue`, `alerts`, `sav_requests` |
| 02 | `02-review-collector.json` | Collecte d'avis post-livraison + résumé IA + auto-publish/SAV | Webhook POST ×2 | `review_requests`, `reviews`, `alerts` |
| 03 | `03-sav-alert-ticketing.json` | Création tickets SAV + escalade par sévérité | Webhook POST | `sav_requests`, `alerts` |
| 04 | `04-order-status-notifications.json` | Mise à jour statut commande + déclenchement review/alerte | Webhook POST | `orders`, `review_requests`, `alerts` |
| 05 | `05-abandoned-cart-recovery.json` | Séquence 2 emails relance panier (rappel + promo -10%) | Webhook POST | `analytics_events`, `mail_queue` |
| 06 | `06-daily-reporting.json` | Rapport quotidien avec résumé IA | Schedule 8h + Webhook manual | `analytics_events` (lecture toutes tables) |

## Stack technique

| Composant | Détail |
|-----------|--------|
| **DB** | PostgreSQL via nodes `n8n-nodes-base.postgres` — lecture/écriture directe |
| **LLM** | Ollama local (`http://host.docker.internal:11434/api/generate`, modèle `qwen2.5:3b`) |
| **Retry** | 2-3 tentatives automatiques sur les appels Ollama (timeout 20-30s) |
| **Error handling** | `onError: continueRegularOutput` sur les nodes DB critiques |
| **Validation** | Champs LLM validés contre des listes autorisées (catégories, urgence, sentiment) |

## Setup rapide

### 1. Configurer la credential PostgreSQL dans n8n

Aller dans **Settings** → **Credentials** → **Add Credential** → **Postgres**:
- Host: `host.docker.internal` (ou IP du serveur)
- Port: `5434`
- Database: `ecommerce_db`
- User: `ecommerce`
- Password: (voir `/root/.shimmer-db-creds` ou variable d'env)
- SSL: off

**Important**: noter l'ID de la credential et mettre à jour `POSTGRES_CRED_ID` dans chaque workflow.

### 2. Vérifier Ollama

```bash
curl http://localhost:11434/api/generate -d '{"model":"qwen2.5:3b","prompt":"test","stream":false}'
```

### 3. Importer les workflows

Via CLI:
```bash
docker exec n8n n8n import:workflow --input=/path/to/01-email-classification-auto-response.json
```

Ou via l'UI: **Workflows** → **Import from File**

### 4. Activer

Chaque workflow est importé en mode **inactif**. Activer individuellement après vérification.

## Architecture

```
                    ┌──────────────────┐
                    │  E-commerce Site  │
                    │ (Shopify/Woo/...) │
                    └────────┬─────────┘
                             │ Webhooks
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ 01 Email     │ │ 04 Order     │ │ 05 Cart      │
    │ Classifier   │ │ Status       │ │ Recovery     │
    │  → mail_queue│ │  → orders    │ │  → mail_queue│
    └──────┬───────┘ └──────┬───────┘ └──────────────┘
           │                │
    COMPLAINT           DELIVERED
           │                │
           ▼                ▼
    ┌──────────────┐ ┌──────────────┐
    │ 03 SAV       │ │ 02 Review    │
    │ → sav_requests│ │ → reviews   │
    └──────────────┘ └──────┬───────┘
                       rating ≤ 2
                            │
                            ▼
                    ┌──────────────┐
                    │ 03 SAV Alert │
                    │ → alerts     │
                    └──────────────┘

    ┌──────────────┐
    │ 06 Daily     │ ← Agrège toutes les tables
    │ Reporting    │ → analytics_events
    └──────────────┘
```

## Webhook endpoints

Une fois activés, les webhooks sont disponibles à:

| Workflow | Endpoint | Méthode |
|----------|----------|---------|
| 01 | `/webhook/incoming-email` | POST |
| 02 | `/webhook/order-delivered` | POST |
| 02 | `/webhook/review-submitted` | POST |
| 03 | `/webhook/sav-alert` | POST |
| 04 | `/webhook/order-status` | POST |
| 05 | `/webhook/cart-abandoned` | POST |
| 06 | `/webhook/generate-report` | POST |

## Payload examples

### Email classification (01)
```json
POST /webhook/incoming-email
{
  "from": "client@email.com",
  "subject": "Ma commande n'est pas arrivée",
  "body": "Bonjour, j'ai commandé il y a 2 semaines...",
  "orderId": 123
}
```

### Order delivered (02/04)
```json
POST /webhook/order-delivered
{ "order_id": 5 }

POST /webhook/order-status
{ "order_id": 5, "status": "delivered" }
```

### Review submitted (02)
```json
POST /webhook/review-submitted
{
  "token": "abc123...",
  "overall_rating": 5,
  "title": "Super produit",
  "comment": "Exactement ce qu'il me fallait",
  "would_recommend": true
}
```

### SAV alert (03)
```json
POST /webhook/sav-alert
{
  "customer_id": 1,
  "order_id": 5,
  "type": "COMPLAINT",
  "severity": "critical",
  "description": "Produit cassé à la réception"
}
```

### Cart abandoned (05)
```json
POST /webhook/cart-abandoned
{
  "email": "client@email.com",
  "first_name": "Jean",
  "total": 149.99,
  "items": [{"name": "Perceuse Bosch", "quantity": 1}]
}
```

## Adaptabilité

Chaque workflow a un **node "Normalize"** qui accepte différents formats de payload (Shopify, WooCommerce, Prestashop, API custom). Les champs sont mappés via `item.orderId || item.order_id || item.id`.

## Pour ajouter un service email

Remplacer les insertions `mail_queue` par des appels HTTP vers votre provider:
- **SendGrid**: `https://api.sendgrid.com/v3/mail/send`
- **Mailgun**: `https://api.mailgun.net/v3/domain/messages`
- **Amazon SES**: SDK ou API HTTP
- **SMTP**: node "Send Email" natif n8n
