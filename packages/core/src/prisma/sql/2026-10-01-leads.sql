-- Demandes d'audit gratuit envoyées depuis la landing (01/10/2026). PAS encore appliqué.
--
-- Le formulaire de la landing appelle POST /api/public/leads. Chaque demande
-- est gardée ici, puis un e-mail part au fondateur (lib/lead-notify.ts) ;
-- notified_at dit si cet e-mail est bien parti.
--
--   shop_url     adresse de la boutique, normalisée par l'API
--   email        adresse du visiteur, pour lui répondre
--   platform     shopify, woocommerce, prestashop, autre (ou rien)
--   source       d'où vient la demande ('landing-audit' pour l'instant)
--   notified_at  heure d'envoi de l'e-mail au fondateur, null s'il n'est pas parti
--   user_agent   navigateur, et referer : page d'où le formulaire a été envoyé
--
-- Pas d'adresse IP : elle ne sert à rien ici (le limiteur de débit la lit
-- dans Redis, sans la garder).
--
-- Uniquement un ajout : le code en prod avant ce lot ignore cette table. Le
-- nouveau code la cherche (revérifié chaque minute) ; tant qu'elle manque, la
-- demande part seulement par e-mail et dans les logs. On peut donc passer ce
-- SQL avant ou après le redémarrage. lock_timeout par prudence, comme les
-- autres lots ; il suffit de relancer s'il abandonne.

BEGIN;

SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS leads (
  id          serial PRIMARY KEY,
  created_at  timestamp without time zone NOT NULL DEFAULT now(),
  shop_url    varchar(300) NOT NULL,
  email       varchar(255) NOT NULL,
  platform    varchar(20),
  message     text,
  source      varchar(40) NOT NULL DEFAULT 'landing-audit',
  notified_at timestamp without time zone,
  user_agent  varchar(300),
  referer     varchar(500)
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at);

COMMIT;

-- Retour arrière (seul, si besoin ; les demandes déjà reçues sont perdues, le
-- formulaire continue d'envoyer l'e-mail et de tout écrire dans les logs) :
-- BEGIN;
-- DROP TABLE IF EXISTS leads;
-- COMMIT;
