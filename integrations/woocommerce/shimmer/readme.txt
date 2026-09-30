=== Shimmer ===
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Vendeur IA dans la barre de recherche de votre boutique WooCommerce.

== Installation ==

1. Extensions → Ajouter → Téléverser une extension : envoyez shimmer-woocommerce.zip, puis activez.
2. Réglages → Shimmer : numéro de boutique et clé publique (pk_…), indiqués dans l'admin Shimmer (Intégration).
3. Créez les webhooks listés sur la page Réglages → Shimmer (WooCommerce → Réglages → Avancé → Webhooks).

== Ce que fait l'extension ==

* Ajoute le widget Shimmer sur les pages de la boutique (rien dans l'administration).
* Recopie l'identifiant visiteur Shimmer (cookie posé seulement avec le consentement du visiteur) sur la commande, pour relier la vente au vendeur et à la mesure. Compatible avec le tunnel de commande classique et en blocs.
* N'utilise jamais la clé secrète de la boutique.
