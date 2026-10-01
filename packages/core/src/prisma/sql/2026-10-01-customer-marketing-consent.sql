-- Accord marketing par client, pour la newsletter (01/10/2026). PAS encore appliqué.
--
-- Avant ce lot, la newsletter partait à tous les clients de la boutique, sans
-- regarder s'ils avaient accepté les e-mails marketing.
--
--   marketing_consent  true : le client a accepté (Shopify « subscribed », case
--                      cochée, ou Mailchimp for WooCommerce) ; false : il n'a
--                      pas accepté ou s'est désinscrit ; null : la plateforme
--                      n'a rien dit (traité comme « non » par défaut).
--
-- Uniquement un ajout : le code en prod avant ce lot ignore cette colonne.
-- Le nouveau code la lit et l'écrit en SQL brut, et met la newsletter en pause
-- tant qu'elle manque (consent-schema.ts). La newsletter attend aussi
-- sql/2026-10-01-cart-reminders.sql (table email_suppressions, lien de
-- désinscription en pied d'e-mail) : appliquer les deux, dans cet ordre-là ou
-- l'autre, avant le redémarrage.
--
-- Colonne sans défaut : ajout instantané (rien n'est réécrit). lock_timeout :
-- si une longue transaction tient la table, on abandonne au lieu de bloquer
-- les webhooks derrière nous ; il suffit de relancer.

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_consent boolean;

COMMIT;

-- Retour arrière (seul, si besoin) : d'ici le redémarrage suivant de l'API,
-- une newsletter échoue avant le premier envoi ; après, elle reste en pause.
-- Dans les deux cas, personne ne la reçoit.
-- BEGIN;
-- ALTER TABLE customers DROP COLUMN IF EXISTS marketing_consent;
-- COMMIT;
