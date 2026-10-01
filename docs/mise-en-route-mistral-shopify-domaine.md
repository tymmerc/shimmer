# Mise en route : Mistral, boutique Shopify de test, domaine et e-mails

Trois chantiers, dans cet ordre. Chacun se fait sans les autres.

| Étape | Ce que ça débloque | Temps | Coût |
|---|---|---|---|
| 2. Clé Mistral | Le vendeur répond en quelques secondes au lieu de 20 à 40 s | 20 min | ~35 $/mois à 2 000 réponses/jour, quelques centimes en test |
| 3. Boutique de dev Shopify | Le premier vrai test de bout en bout (commande, preuve, catalogue, thème réel) | 1 h | 0 € |
| 4. Domaine + Resend | Les vrais e-mails (retour de stock, avis, relances) | 1 h + attente DNS | ~5 à 8 €/an le domaine, Resend gratuit au début |

**Règle pour toutes les clés** : tu les colles toi-même dans un fichier sur le VPS, jamais dans le chat ni dans un mail. Ensuite tu me dis « c'est posé », je redémarre et je vérifie. Je ne les affiche jamais.

Pour éditer un fichier sur le VPS : `nano /opt/shimmer/.env`, tu ajoutes la ligne à la fin, puis Ctrl+O, Entrée, Ctrl+X.

Vérifié le 01/10/2026 sur la doc officielle de chaque service. Les libellés de boutons peuvent être traduits en français à l'écran.

---

## Étape 2 : la clé Mistral

Le vendeur tourne aujourd'hui sur le petit modèle local du VPS : 18 s en médiane, 40 s à froid. Avec Mistral (`mistral-small-latest`, société française, données hébergées dans l'UE par défaut), on descend à quelques secondes. Tout est déjà codé, il manque juste la clé.

### 2.1 Créer le compte
Va sur https://console.mistral.ai et crée le compte. On te demande un nom d'organisation (mets « Shimmer »). L'organisation et un espace de travail par défaut se créent tout seuls.

Les anciens plans « Experiment » et « Scale » n'existent plus : tout compte démarre en **Free mode**. Pour la prod, on active le **Pay-as-you-go** (paiement à l'usage).

### 2.2 Activer le paiement à l'usage
1. Admin Panel › Subscriptions › **Billing** (admin.mistral.ai/organization/billing) › **Add payment method** : ta carte.
2. Remplis aussi **Billing information**. C'est ce qui sortira sur les factures.
3. Admin Panel › **Subscription** (admin.mistral.ai/subscription) : active **Pay-as-you-go**.
4. Compte 2 à 3 minutes avant que ce soit actif.

### 2.3 Mettre un plafond de dépense
Sur la page Billing, champ **Monthly spending limit** : mets **30 €** pour commencer. Ça laisse une bonne marge pour le pilote.

Attention, au plafond Mistral coupe net jusqu'au mois suivant. Le vendeur répond alors avec une simple liste de produits, sans phrase. Il n'y a pas d'alerte par e-mail chez Mistral, donc jette un œil de temps en temps à Admin Panel › API › **Usage**.

Shimmer a aussi son propre plafond : 10 € par mois et par boutique. Au-delà, la boutique repasse sur le modèle local, sans coupure.

### 2.4 Couper l'entraînement sur tes données
Admin Panel › API › **Privacy** (admin.mistral.ai/plateforme/privacy) › section **Anonymous improvement data** : désactive l'interrupteur.

C'est important pour le discours RGPD auprès des marchands. Les messages restent gardés 30 jours chez Mistral pour la lutte contre les abus, c'est la règle standard.

### 2.5 Créer la clé
Console › **API Keys** › **Create new key** :
- **Name** : `shimmer-prod-vendeur`
- **Expiration** : 12 mois. Mets-toi un rappel dans ton agenda un mois avant.
- Le reste par défaut, puis **Create new key**.

**La clé ne s'affiche qu'une fois.** Copie-la tout de suite dans ton gestionnaire de mots de passe.

### 2.6 La poser sur le VPS
Dans `/opt/shimmer/.env`, ajoute :

```
MISTRAL_API_KEY=la_cle_copiee
```

Option conseillée : ajoute aussi `MISTRAL_URL=https://api.eu.mistral.ai/v1`. Le calcul est alors garanti en Europe, pour 10 % de plus. C'est un vrai argument face à un marchand. Je vérifie d'abord que le modèle y est servi avant de le garder.

Puis dis-moi « clé Mistral posée ». De mon côté :
- je redémarre l'API ;
- je vérifie la ligne `Vendeur sur Mistral` au démarrage ;
- je lance une vraie recherche et je te donne le temps de réponse.

### Ce qu'il faut savoir
- Seul le vendeur passe par Mistral. Le SAV et les tâches de nuit restent sur le modèle local.
- Ce que le visiteur tape est nettoyé avant l'envoi : e-mail, téléphone, carte et IBAN sont masqués.
- **Coût estimé** à 2 000 réponses par jour : environ 33 $ par mois (0,15 $ par million de tokens en entrée, 0,60 $ en sortie). En pilote avec quelques dizaines de recherches par jour : moins de 1 $ par mois.
- **Pour couper** : retirer la ligne du `.env` et me demander un redémarrage.

---

## Étape 3 : une boutique de dev Shopify

Une boutique de dev est gratuite, sans limite de durée. Elle ne peut pas encaisser de vrais paiements, mais elle accepte des commandes de test. C'est exactement ce qu'il faut pour vérifier toute la chaîne : recherche, panier, commande, preuve, catalogue synchronisé, widget sur un vrai thème.

### 3.1 Compte Partner (gratuit)
1. Crée le compte sur https://app.shopify.com/services/partners/signup
2. Ouvre ensuite https://dev.shopify.com/dashboard avec le même identifiant. Depuis septembre 2025, les boutiques de dev se gèrent dans ce **Dev Dashboard**, plus dans l'ancien Partner Dashboard.

### 3.2 Créer la boutique
Dev Dashboard › **Stores** › **Create store**, puis :
- Type : **Dev**
- Nom : par exemple « Shimmer test »
- Plan : **Basic**. Tous les plans sont gratuits en dev.
- Laisse **Test a feature preview** décoché, sinon tu perds certaines fonctions.
- **Create store**, puis connecte-toi à la boutique.

Note l'adresse en `xxx.myshopify.com` et envoie-la-moi.

### 3.3 Le mot de passe de la vitrine
Sur une boutique de dev, la vitrine reste protégée par un mot de passe. On ne peut pas l'enlever.

Pour le voir : **Online Store** › **Preferences** › **Store access** › champ **Password**. Garde-le sous la main pour tes tests (et pour un prospect si tu lui montres).

### 3.4 Ce que je fais à ce moment-là
Quand tu m'as envoyé l'adresse `xxx.myshopify.com` :
- Je crée la boutique côté Shimmer (vin, pour reprendre le réglage de la cave de démo).
- Je mets sa clé admin dans `/opt/shimmer/.secrets.local` (ligne `SHIMMER_SHOPIFY_DEV_SK`). C'est avec elle que tu te connectes à l'admin Shimmer.
- Je te donne les 9 adresses de webhook exactes et la ligne de script à coller.
- Je te prépare un fichier CSV d'une vingtaine de vins de la cave de démo, au format Shopify.

### 3.5 Créer les webhooks
Fais-le **avant** d'importer les produits : chaque produit créé dans Shopify partira alors tout seul dans le catalogue Shimmer.

**Settings** › **Notifications** › tout en bas **Webhooks** › **Create webhook**. Pour chacun :
- **Format** : JSON
- **Webhook API version** : la dernière « stable » proposée
- **URL** : celle que je t'ai donnée. Elles ont toutes la forme `https://tymmerc.eu/shimmer/api/webhooks/shopify/<chemin>?store=<id>`
- **Save**

| Événement dans Shopify | Nom technique | Chemin |
|---|---|---|
| Order payment | orders/paid | `orders_paid` |
| Order fulfillment | orders/fulfilled | `orders_fulfilled` |
| Fulfillment creation | fulfillments/create | `fulfillments_update` |
| Fulfillment update | fulfillments/update | `fulfillments_update` |
| Product creation | products/create | `products_update` |
| Product update | products/update | `products_update` |
| Product deletion | products/delete | `products_delete` |
| Inventory level update | inventory_levels/update | `inventory_levels_update` |
| Checkout update | checkouts/update | `abandoned_checkout` |

L'événement ne se change plus après coup. En cas d'erreur, supprime le webhook et refais-le.

**Le secret de signature** : sur la page Webhooks, une phrase du genre « Your webhooks will be signed with … » affiche un code. Copie-le dans `/opt/shimmer/.secrets.local`, sur une ligne :

```
SHOPIFY_DEV_WEBHOOK_SECRET=le_code
```

Dis-le-moi : je le range dans la config de la boutique sans l'afficher. Sans lui, Shimmer refuse tous les webhooks, et c'est voulu.

### 3.6 Importer les produits
**Products** › **Import** › **Add file** › choisis mon CSV › **Upload and continue** › **Import products**.

Shopify t'envoie un e-mail à la fin. Chaque produit créé déclenche un webhook. Dans l'admin Shimmer, page **Catalogue**, les vins doivent apparaître dans la minute. Je relance ensuite l'index de recherche pour que le vendeur les connaisse tout de suite.

Ne trie jamais un CSV Shopify dans Excel : ça casse les variantes.

### 3.7 Coller le widget dans le thème
1. **Online Store** › **Themes** › menu « … » du thème › **Duplicate**. C'est ta sauvegarde.
2. Sur le thème actif : « … » › **Edit code**.
3. Ctrl+P (⌘P sur Mac), ouvre `layout/theme.liquid`.
4. Colle la ligne de script de l'admin Shimmer (page **Intégration**) juste avant `</body>`. Ne touche à rien d'autre.
5. **Save**. En cas de souci : vue **Timeline**, clic droit sur la version précédente › **Restore contents**.

Le widget prend tout seul le style du thème. Si un détail te gêne, page **Apparence** de l'admin Shimmer.

Les « script tags » automatiques que Shopify est en train de supprimer (création bloquée depuis aujourd'hui, arrêt complet le 01/03/2027) ne nous concernent pas : on colle la ligne à la main dans le thème. Pour une vraie appli installable plus tard, il faudra passer par un « app embed block ».

### 3.8 Activer le paiement de test
**Settings** › **Payments** :
1. Si un fournisseur de carte est actif, désactive-le. Pour Shopify Payments : **Manage** › **Switch to a third-party provider**.
2. Choisis **Test payment gateway** (l'ancien « Bogus Gateway »).
3. **Activate**, puis **Save**.

Au moment de payer :
- **Numéro de carte** : `1` pour un paiement accepté (`2` = refusé, `3` = erreur)
- **Date** : n'importe quelle date future
- **CVV** : 3 chiffres au hasard

### 3.9 Le test complet
1. Ouvre la vitrine dans une **fenêtre privée**, avec le mot de passe de la vitrine.
2. Attends 3 secondes. Sans bandeau cookies, Shimmer considère le consentement acquis.
3. Dans la barre de recherche du thème, tape « un rouge pour un barbecue », puis Entrée.
   - Si le dock n'apparaît pas, tu es tombé dans le groupe témoin (1 visiteur sur 10, c'est la mesure). Ferme la fenêtre privée et rouvre-en une.
4. Clique un vin proposé, ajoute-le au panier, va jusqu'au paiement avec la carte `1`.
5. Dans l'admin Shimmer :
   - **Preuve** : la commande est comptée côté groupe exposé.
   - **Accueil** : le chiffre bouge.
6. Envoie-moi l'heure de la commande : je vérifie les journaux (commande reçue, signature, attribution au visiteur, lignes de commande).

Ensuite on pourra tester le reste à la main :
- **Expédition** : expédie la commande avec un numéro de suivi. La demande d'avis se planifie 48 h après que Shopify signale la livraison. Sur une boutique de dev, la livraison ne se simule pas toujours : si besoin, je la déclenche de mon côté.
- **Retour de stock** : passe un produit en rupture, inscris-toi à l'alerte, puis remets du stock.
- **Panier abandonné** : remplis un panier avec un e-mail puis abandonne.

Tant que l'étape 4 n'est pas faite, aucun e-mail ne part pour de vrai, ils sont seulement enregistrés.

---

## Étape 4 : domaine et vrais e-mails (Resend)

Aujourd'hui, tous les e-mails sont simulés : enregistrés en base, jamais envoyés. Pour les envoyer, il faut un domaine à toi, vérifié chez Resend.

**Tu peux faire 4.1 à 4.4 tout de suite** (le DNS peut mettre du temps). **Par contre, ne pose pas la clé Resend dans le `.env` avant que j'aie corrigé trois choses**, sinon de vrais clients pourraient recevoir des e-mails faux ou en double :
1. **Relances de panier** :
   - chaque mise à jour d'un checkout Shopify crée un nouveau panier, donc plusieurs relances au même client, voire une relance après l'achat ;
   - le code promo de la 2ᵉ relance n'est jamais créé dans Shopify ;
   - pas de lien de désinscription ni de contrôle du consentement marketing.
2. **Le lien des demandes d'avis** est écrit en dur sur tymmerc.eu.
3. **L'adresse publique de l'API** sert de base aux liens des e-mails, et elle est lue de deux façons différentes dans le code. À remettre d'aplomb avant de changer de domaine.

### 4.1 Choisir et acheter le domaine
**Avant d'acheter, envoie-moi le nom** : je vérifie qu'il est libre et qu'il n'y a pas de conflit de marque.

Registrar conseillé : **OVHcloud**, en **.fr**. C'est le moins cher au renouvellement (environ 5 € la 1ʳᵉ année puis 8 €/an, à confirmer au panier), avec une zone DNS simple et une doc en français. Tu peux prendre un .fr ou un .eu puisque tu habites en France.

À éviter : Gandi (renouvellements chers), Cloudflare (ne vend ni .fr ni .eu).

### 4.2 Ajouter le domaine chez Resend
1. Crée le compte sur https://resend.com/signup
2. **Domains** › **Add Domain** › saisis un **sous-domaine d'envoi**, par exemple `mail.tondomaine.fr`. Resend le recommande : la réputation du domaine principal reste à l'abri.
3. **Région** : **Ireland (eu-west-1)**. Ça ne se change plus après, il faudrait tout refaire.
4. Return-Path (options avancées) : laisse `send`.
5. Onglet **Records** : c'est la liste des lignes DNS à créer. C'est elle qui fait foi.

### 4.3 Créer les lignes DNS chez OVH
Espace client OVH › **Web Cloud** › **Noms de domaine** › ton domaine › onglet **Zone DNS** › **Ajouter une entrée**. Pour chaque ligne : le type, le **sous-domaine** (sans ton domaine derrière), la valeur, TTL par défaut, **Ajouter**.

Exemple pour `mail.tondomaine.fr`. Recopie les valeurs exactes de l'onglet Records de Resend :

| Type | Sous-domaine | Valeur |
|---|---|---|
| MX (priorité 10) | `send.mail` | `feedback-smtp.eu-west-1.amazonses.com.` |
| TXT | `send.mail` | `v=spf1 include:amazonses.com ~all` |
| TXT | `resend._domainkey.mail` | la longue clé `p=MIGf…`, en entier |
| TXT | `_dmarc` | `v=DMARC1; p=none;` (à ajouter toi-même) |

Pièges :
- Une valeur MX ou CNAME doit **finir par un point**. Sinon OVH colle ton domaine derrière.
- Prends le type **TXT** simple, pas les assistants « SPF » ou « DKIM » d'OVH : tu colles la valeur exacte.
- Les domaines créés depuis août 2026 peuvent recevoir des **CNAME** à la place du MX et du SPF. Dans ce cas, mets uniquement les CNAME sur ces noms-là.
- Ne touche pas aux lignes MX ou SPF déjà présentes sur la racine du domaine.

Ensuite, attends. Souvent moins de 15 minutes, jusqu'à 72 h. Au-delà : bouton **Restart verification** chez Resend.

### 4.4 Créer la clé API
**API Keys** › **Create API Key** :
- **Nom** : `shimmer-prod`
- **Permission** : **Sending access**
- **Domaine** : restreinte à `mail.tondomaine.fr`

La clé (`re_…`) ne s'affiche qu'une fois. Range-la dans ton gestionnaire de mots de passe. **Ne la pose pas encore sur le VPS** (voir plus haut).

### 4.5 Quand je te dis que c'est prêt
Dans `/opt/shimmer/.env` :

```
RESEND_API_KEY=re_la_cle
EMAIL_FROM_DOMAIN=mail.tondomaine.fr
```

La 2ᵉ ligne est obligatoire : sans elle, chaque envoi échoue. Puis dis-moi « Resend posé ». De mon côté :
- je redémarre l'API ;
- je vérifie la ligne `provider: resend` ;
- j'envoie un test vers l'adresse de test de Resend, puis vers ta boîte Gmail. Dans « Afficher l'original », spf, dkim et dmarc doivent être à `pass`.

### Ce qu'il faut savoir
- **Gratuit chez Resend** : 100 e-mails par jour, 3 000 par mois. Au-delà, l'offre Pro coûte 20 $/mois pour 50 000 e-mails.
- **Ce qui partira pour de vrai** :
  - confirmation d'alerte de retour en stock (double validation) ;
  - e-mail « c'est revenu » ;
  - demande d'avis 48 h après la livraison ;
  - relances de panier ;
  - réponses SAV ;
  - suivi de commande quand tu changes le statut à la main.
- **Adresses bloquées** : les adresses de test (`example.com`, `test.com`, `*.test`…) ne reçoivent jamais rien.
- **Les seuils de Resend** : moins de 4 % de rebonds et moins de 0,08 % de signalements en spam. Au-delà, Resend met les envois en pause.
- **Plus tard** : DMARC passe de `p=none` à `quarantine` une fois que tout est à `pass`.

### Et le site sur le nouveau domaine ?
C'est facultatif, et c'est mon côté : nginx et certificat. On garderait le préfixe `/shimmer`. Il faudrait ensuite :
- mettre à jour les adresses des webhooks Shopify et la ligne de script ;
- ressaisir ta clé dans l'admin ;
- laisser tymmerc.eu/shimmer en ligne pendant la transition, pour les liens déjà envoyés.

---

## Qui fait quoi

| Toi | Moi |
|---|---|
| Compte et clé Mistral, plafond, interrupteur Privacy, clé dans `.env` | Redémarrage, vérification, URL européenne, mesure du temps de réponse |
| Compte Partner, boutique de dev, adresse `xxx.myshopify.com` | Boutique Shimmer, clé admin dans `.secrets.local`, URLs des webhooks, CSV des vins |
| 9 webhooks, secret dans `.secrets.local`, import du CSV, script dans le thème, paiement de test | Secret rangé dans la config, index de recherche relancé, lecture des journaux après ta commande |
| Nom de domaine (après ma vérification), Resend, DNS, clé de côté | Correction des relances, des liens et de l'adresse publique, puis activation et test d'envoi |

## Sources consultées
- **Mistral** :
  - docs.mistral.ai : activate-and-generate-api-key, admin/billing-usage (billing, subscriptions, usage-limits), inference/regional-inference ;
  - help.mistral.ai : données et entraînement, limites ;
  - mistral.ai/pricing/api.
- **Shopify** :
  - shopify.dev : development-stores, store-create-dev, changelog script tags, verify-deliveries ;
  - help.shopify.com : webhooks, test orders, password page, import/export CSV, edit theme code.
- **Resend** :
  - resend.com/docs : add-a-domain, regions, create-domain, domain not verifying, custom-return-path, dmarc, create-an-api-key, quotas and limits, email suppressions ;
  - resend.com/pricing.
- **OVHcloud** : docs.ovhcloud.com (dns-zone-edit), ovhcloud.com/fr/domains/tld.
- **Afnic et EURid** : règles d'éligibilité .fr et .eu.
