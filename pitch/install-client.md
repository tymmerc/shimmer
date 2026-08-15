# Brancher un vrai client — état réel (25 juin 2026)

Les 3 trous d'intégration sont bouchés. Voici ce qui marche maintenant et ce qu'il te reste à faire.

## ✅ Ce qui est prêt

### 1. Le widget s'installe en UNE ligne
Le marchand colle ça avant `</body>`, c'est tout :
```html
<script src="https://tymmerc.eu/shimmer/sdk/shimmer.iife.js"
        data-shimmer
        data-store="ID_DE_LA_BOUTIQUE"
        data-key="pk_LA_CLE_PUBLIQUE"
        defer></script>
```
Le widget démarre tout seul (lit les attributs, monte le vendeur + la recherche).

### 2. Clé publique vs clé secrète
- La **clé secrète** (`sk_…`) reste chez toi : accès total (catalogue, config, analytics). Jamais dans une page.
- La **clé publique** (`pk_…`) va dans le snippet : elle ne déverrouille QUE le widget (vendeur, recherche), jamais l'admin. Vérifié : une `pk_` sur `/api/catalog` ou `/api/admin-stats` → refusée (401).
- Tu récupères la `pk_` d'une boutique dans l'admin (page Intégration) ou via `/api/integration/status`.

### 3. Preuve visuelle
Fausse boutique de test, le widget branché en une ligne :
**https://tymmerc.eu/shimmer/lab/boutique-test.html**
(à montrer à un prospect : « je colle une ligne sur une page vierge, le vendeur apparaît »)

## ⚠️ Ce qu'il te reste à faire pour les emails réels

Aujourd'hui les relances panier et demandes d'avis sont en **mode démo** (rien n'est envoyé, statut `mock`). Pour envoyer pour de vrai, ajoute ta clé Resend dans `/opt/shimmer/.env` :

```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM_DOMAIN=tondomaine.fr      # domaine vérifié dans Resend
```
Puis `systemctl restart shimmer-api`. Le code bascule automatiquement de `mock` à `Resend` (vérifiable sur la page Intégration de l'admin : le badge email passe au vert).

Tant que tu n'as pas de client, pas besoin de le faire. À activer au premier pilote.

## Récap de la séquence d'install chez un client (rappel)
1. Créer sa boutique → tu obtiens `storeId` + `sk_` + `pk_`.
2. Importer son catalogue (CSV).
3. Coller le snippet (avec sa `pk_`) sur sa boutique.
4. Cocher les 3 webhooks Shopify/Woo.
5. Onboarding 4 phases (ingestion → observation → validation → live).

## Notes techniques (pour toi)
- Secret serveur des clés publiques : `SHIMMER_PK_SECRET` dans `.env`. **Ne jamais le changer** une fois des clients en prod (ça invaliderait toutes les `pk_` distribuées).
- Connecteurs e-commerce branchés : Shopify, WooCommerce. PrestaShop = à coder si besoin.
