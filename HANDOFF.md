# Shimmer — Passation (état au 15 août 2026)

Document de reprise pour une nouvelle session Claude Code (connectée en SSH sur le VPS). Lis-le en entier avant d'agir. Les détails techniques stables sont dans `CLAUDE.md`, les faits opérationnels dans la mémoire (`~/.claude/projects/-opt/memory/`).

## 1. Ce qu'est Shimmer
Plateforme IA e-commerce : un vendeur conversationnel dans la barre de recherche du marchand + SAV, relances paniers, avis, campagnes, et mesure honnête par holdout (on ne facture que l'effet prouvé). Souverain : IA locale (Ollama) et données en France par défaut ; Claude en option pour la performance.

## 2. URLs clés (toutes live)
- Site PROD (V2 depuis le 6 août) : https://tymmerc.eu/shimmer/
- Site DEV (miroir de travail) : https://dev.tymmerc.eu/shimmer/
- Admin (login clé store) : https://tymmerc.eu/shimmer/admin/ (idem sur dev)
- Démos scriptées : https://tymmerc.eu/shimmer/demo/
- Banc d'essai automatisations : https://tymmerc.eu/shimmer/lab/
- Fausse boutique (vendeur barre de recherche) : https://tymmerc.eu/shimmer/lab/boutique-test.html
- Vidéo de présentation (Remotion) : https://tymmerc.eu/shimmer/lab/shimmer-video.mp4
- n8n : https://tymmerc.eu/n8n/ — owner `admin@tymmerc.eu` / mot de passe temporaire `ShimmerN8n2026` (à changer)

## 3. Accès / secrets (où ils sont)
- DB password : dans `/opt/shimmer/.env` (`DATABASE_URL`, Postgres port 5434, base `ecommerce_db`, user `ecommerce`).
- Clé API boutique démo (Caves Forty-Two, store 4) : dans `/opt/shimmer/.secrets.local` (fichier ignoré par git, jamais dans le repo).
- Clé publique widget store 4 : `pk_uUrPNXjew9_HENo4ZkS5k2iLu77sKjWCpn7hd8e5` (dérivée de `SHIMMER_PK_SECRET` dans `.env`, NE JAMAIS changer ce secret après prod).
- Ne jamais committer `.env`.

## 4. Services (systemd) + ports
- `shimmer-api` (Express, port 3003) — lancé par `start-api.sh` via **tsx sur le SOURCE** (pas dist). Modifier le TS + `systemctl restart shimmer-api` suffit.
- `shimmer-workers` (BullMQ), `shimmer-embedding` (FastAPI 8100).
- Postgres 5434, Redis 6381, Ollama 11434 (modèle `qwen2.5:3b`), n8n Docker 5678.

## 5. Build / déploiement (et les PIÈGES)
- **API** : tsx lit le source → `systemctl restart shimmer-api`. `pnpm -r build` échoue sur la génération DTS (erreurs préexistantes) mais le JS est émis ; NON bloquant.
- **Site (Next.js export)** : `cd apps/site && unset __NEXT_PRIVATE_STANDALONE_CONFIG && unset NODE_ENV && pnpm build` puis :
  - DEV : `rsync -a --delete out/ /opt/shimmer/apps/showcase-dev/`
  - PROD (uniquement sur GO explicite de Tym) : `rsync -a --delete --exclude='/shimmer/' out/ /opt/shimmer/apps/showcase-main/`. **Toujours `--exclude='/shimmer/'`** sinon on efface le SDK. Backup rollback : `/opt/shimmer/apps/showcase-main.bak-20260806.tar.gz`.
- **SDK widget** : `cd sdk && pnpm build` puis `cp dist/shimmer.iife.js dist/shimmer.js dist/shimmer.esm.js /opt/shimmer/apps/showcase-main/shimmer/sdk/`. Servi en no-cache (dev), partagé par dev ET prod.
- **Vidéo** : `cd /opt/shimmer/video && npx remotion render ShimmerStory out/shimmer.mp4 --concurrency=3` puis `cp out/shimmer.mp4 /opt/shimmer/apps/lab/shimmer-video.mp4`.
- **PIÈGE nginx** : après modif de `/etc/nginx/sites-enabled/10-main.conf`, `reload` ne prend pas toujours → `systemctl restart nginx`. Tester en CDN-bypass : `curl --resolve tymmerc.eu:443:127.0.0.1 -k https://tymmerc.eu/...`.
- **PIÈGE base** : la base a drifté vs schema.prisma → JAMAIS `prisma db push` (il DROPperait des tables). Migrations additives = SQL direct via psql.

## 6. Ce qui a été fait en juillet-août 2026
- **Preuve v2 (juillet)** : holdout PAR PANIER pour les relances (~10% `holdout_control`, jamais relancés, 409 sur relance manuelle d'un témoin), enrôlement vendeur au premier usage de la recherche (les deux groupes), `GET /api/holdout/proof?from&to` (preuve par module + facturation fenêtrable), garde-fou `MIN_GROUP_N=25`, section "Preuve" dans l'admin.
- **Site marketing V2 (poussé en PROD le 6 août)** : hero WebGL toxique conservé, 2 piliers animés (Vendeur + Chatbot SAV), satellites d'automatisations (SVG), "comment ça marche", preuve simplifiée, CTA audit gratuit. Copy honnête ("on mesure à l'euro", pas "on ne facture que l'écart" ; chiffres démo étiquetés "Exemple"). Perf : plus de blur/backdrop-blur/Lenis, scroll natif, WebGL coupé sur tactile.
- **Dashboard admin refait en clair (type Shopify, août)** : 7 sections (Accueil/Preuve/SAV/Avis/Paniers/Réglages/Intégration), l'argent prouvé en star sur l'Accueil, libellés techniques humanisés (`labels.ts` : "En attente client", "Produit défectueux"…), badges de provenance partout (vert = natif Shopify via webhooks, ambre = nécessite widget Shimmer), header affiche le vrai nom du store.
- **Facturation unifiée (6 août)** : `/report` ET `/proof` lisent `store.config.billing` (plus de cap 267 en dur) ; l'Accueil admin fetch `/proof` → une seule source pour "prouvé" + facture, aucune divergence entre pages. `estimateLift` DÉTERMINISTE (mulberry32 seedé sur les données) : le chiffre prouvé ne bouge plus au refresh.
- **Données de démo store 4 nettoyées (SQL)** : SAV 24 clients distincts, statuts réalistes, types alignés sur les descriptions ; paniers avec chronologie cohérente (abandon → relances → récupération, rien dans le futur, témoins jamais relancés) ; ~70% des holdout_visitors enrôlés → module vendeur significatif en démo (~408€ prouvés, facture ~109€).
- **Notion HQ** : Clearpath HQ étendu (fiche prospection, page "Shimmer expliqué", tâches avec colonne Projet, clients Cors'Air + client de Marc-Antoine).
- **Module Retour de stock (15 août)** : un visiteur demande un produit épuisé au vendeur → accroche "je peux vous prévenir dès qu'il revient" (SDK, champ email) → `POST /api/stock-alerts` (clé pk_, Zod, rate-limit 10/min/IP, idempotent) → au réassort (webhooks Shopify `products/update` [auto-apprend le mapping variante↔inventory_item] ou `inventory_levels/update`, transition 0→>0 uniquement, idempotent) → email "il est de retour, il en reste N" (canal existant, `shimmer_vid` dans le lien) → si commande dans les 7 j (`orders/paid`, même email + variante ou produit) → `converted`, comptée dans `/proof` (module `retourStock`) et dans le CA prouvé (étiquette `retourStock` dans `modulesProven`). Admin : section **Réassort** (quoi refaire par variante + prévenus/commandés/euros), panneau dans Preuve, 2 webhooks ajoutés dans Intégration. Tables : `stock_alerts`, `platform_variant_stock`, colonne `product_variants.platform_variant_id`. Code : `apps/api/src/lib/stock-alerts.ts` (logique pure testable), `routes/stock-alerts.ts`, handlers dans `webhooks-shopify.ts`.
- **Vendeur conscient du stock (15 août)** : `isSoldOut()` dans le chatbot ; un épuisé n'est jamais en carte de reco ; un produit NOMMÉ par le visiteur est toujours dans le pool de candidats (indépendant du score moteur) ; si le visiteur demande un épuisé, le code décide (pas le LLM) : `outOfStock[]` dans la réponse + réponse déterministe si le LLM se contredit ("est épuisé, je peux te prévenir, en attendant regarde X"). Pas de cache Redis sur une réponse qui parle d'un épuisé.
- Tests API : 185/185 verts (12 fichiers).

## 7. Ce qui reste à faire (par priorité)
1. **Répondre à Marc-Antoine** (ACTION TYM) : vidéo + projection 90j + offre beta. Vidéo V3 avec voix off en cours.
2. **Recruter le 1er pilote** : client e-commerce de Marc-Antoine + **Brouillon** (brouillon.store, Shopify, prospect chaud via un ami, fiche + message prêt dans `pilot/prospect-brouillon.md`). Kit dans `/opt/shimmer/pilot/`.
3. **Poser `RESEND_API_KEY`** (+ `EMAIL_FROM_DOMAIN`) dans `.env` pour activer les vrais emails (aujourd'hui mock). Optionnel : `CLAUDE_API_KEY`, `TWILIO_*`.
4. **WooCommerce → holdout + retour de stock** : le webhook Woo ne lie pas les commandes au holdout et n'a pas de détection de réassort (Shopify seulement).
4b. **Retour de stock v2** (une fois la donnée en prod) : relances paniers qui attendent le réassort d'un article du panier au lieu de relancer à vide ; SAV auto "il revient quand ?" ; campagnes vers la liste d'attente ; import Shopify des `variant_id` dans `product_variants` pour ancrer sur la taille exacte (aujourd'hui l'accroche vendeur ancre sur le produit `p:<id>` / `local:<id>`).
5. **LLM du pilote (PRIORITAIRE)** : qwen2.5:3b local ignore les consignes (recommande un épuisé, hallucine des produits hors catalogue) ; le code compense par du déterministe mais un pilote réel doit tourner sur Claude (`CLAUDE_API_KEY`) ou un modèle plus gros. Puis plan coûts : Porte B (cache sémantique) + Porte C (escalade Ollama→Claude) + prompt caching.
6. **Puces de qualification** générées par l'IA + éditables dans l'admin (aujourd'hui hardcodées dans le SDK).
7. **Connecteur PrestaShop** ; puis **app Shopify officielle** (OAuth + sync auto) pour le scaling.
8. **Question ouverte** : wording souveraineté (footer "données et IA en France" vs option Claude US) — jamais tranché par Tym.

## 8. Contexte business / pricing
- **Client beta (pilote)** : install + 1er mois offerts, puis **89€/mois + 5% du CA additionnel prouvé, SANS plafond** — gelé à vie pour le pilote. Codé : `store.config.billing = {floorEUR, ratePct, capEUR}` (`capEUR: null` = sans plafond ; store 4 configuré ainsi).
- **Grille standard (validée juillet)** : audit gratuit → setup 490€ (socle) / ~990€ (pack) → **149€/mois** (pack 5 modules) → **10% du CA additionnel prouvé**.
- Positionnement vs lemrock.com : eux = vendre DANS ChatGPT ; Shimmer = cerveau de la boutique. Complémentaires.
- Docs : `/opt/shimmer/pitch/` (prep-marc-antoine.md, install-client.md, video-script.md, plan-90-jours.md, projection-90-jours-client.md).

## 9. Où trouver le reste
- Détails techniques stables : `/opt/shimmer/CLAUDE.md`.
- Faits opérationnels (pièges nginx, tsx, pk, deploy paths) : `~/.claude/projects/-opt/memory/` et `~/.claude/projects/-root/memory/` (shimmer-preuve-v2.md, shimmer-offre-beta-pilote.md).
- Kit pilote : `/opt/shimmer/pilot/`.
