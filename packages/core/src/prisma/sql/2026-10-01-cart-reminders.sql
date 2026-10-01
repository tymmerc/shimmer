-- Relances de panier remises d'aplomb (01/10/2026). PAS encore appliqué.
--
-- Uniquement des ajouts : le code en prod avant ce lot ignore ces colonnes et
-- cette table. À appliquer AVANT le redémarrage qui met le nouveau code en
-- ligne (le nouveau code les lit en SQL brut).
--
--   platform_ref       un panier par checkout Shopify (« shopify:<token> ») ou
--                      panier Woo (« woo:<id> ») : les mises à jour du même
--                      checkout ne créent plus de nouveau panier.
--   marketing_consent  le client a accepté les e-mails marketing (null : on ne
--                      sait pas, traité comme non par défaut).
--   checkout_url       lien « reprendre ma commande » fourni par Shopify.
--   email_suppressions adresses désinscrites, par boutique (lien de
--                      désinscription des relances, de la newsletter et des
--                      demandes d'avis).

BEGIN;

ALTER TABLE abandoned_carts ADD COLUMN IF NOT EXISTS platform_ref varchar(120);
ALTER TABLE abandoned_carts ADD COLUMN IF NOT EXISTS marketing_consent boolean;
ALTER TABLE abandoned_carts ADD COLUMN IF NOT EXISTS checkout_url varchar(1000);

CREATE UNIQUE INDEX IF NOT EXISTS abandoned_carts_store_platform_ref_key
  ON abandoned_carts (store_id, platform_ref)
  WHERE platform_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS email_suppressions (
  id         serial PRIMARY KEY,
  store_id   integer NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email      varchar(255) NOT NULL,
  reason     varchar(40) NOT NULL DEFAULT 'unsubscribe',
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_suppressions_store_email_key
  ON email_suppressions (store_id, lower(email));

COMMIT;

-- Retour arrière (seul, si besoin ; le code de ce lot ne marche plus sans) :
-- BEGIN;
-- DROP TABLE IF EXISTS email_suppressions;
-- DROP INDEX IF EXISTS abandoned_carts_store_platform_ref_key;
-- ALTER TABLE abandoned_carts DROP COLUMN IF EXISTS checkout_url,
--   DROP COLUMN IF EXISTS marketing_consent, DROP COLUMN IF EXISTS platform_ref;
-- COMMIT;
