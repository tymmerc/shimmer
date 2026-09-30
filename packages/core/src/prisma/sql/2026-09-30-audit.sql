-- SQL appliqué en prod le 30/09/2026 (la base a dérivé du schema.prisma :
-- jamais `prisma db push`, toujours du SQL direct). Idempotent : peut être rejoué.

-- Attribution commande → conversation par identifiant visiteur.
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS visitor_id varchar(80);
CREATE INDEX IF NOT EXISTS chat_sessions_store_id_visitor_id_idx ON chat_sessions (store_id, visitor_id);
CREATE INDEX IF NOT EXISTS chat_sessions_store_id_attributed_order_id_idx ON chat_sessions (store_id, attributed_order_id);

-- Une demande d'avis par commande (les lignes <= 53 sont d'anciennes données de démo en double).
CREATE UNIQUE INDEX IF NOT EXISTS review_requests_order_id_new_uq ON review_requests (order_id) WHERE id > 53;

-- Preuve : une commande comptée une seule fois (webhooks renvoyés).
ALTER TABLE holdout_orders ADD COLUMN IF NOT EXISTS order_ref varchar(100);
CREATE UNIQUE INDEX IF NOT EXISTS holdout_orders_store_order_ref_uq ON holdout_orders (store_id, order_ref) WHERE order_ref IS NOT NULL;

-- Retour de stock : double confirmation (statut pending + jeton).
ALTER TABLE stock_alerts ADD COLUMN IF NOT EXISTS confirm_token varchar(64), ADD COLUMN IF NOT EXISTS confirmed_at timestamp(3);
CREATE UNIQUE INDEX IF NOT EXISTS stock_alerts_confirm_token_uq ON stock_alerts (confirm_token) WHERE confirm_token IS NOT NULL;
ALTER TABLE stock_alerts DROP CONSTRAINT IF EXISTS stock_alerts_status_chk;
ALTER TABLE stock_alerts ADD CONSTRAINT stock_alerts_status_chk CHECK (status IN ('pending', 'waiting', 'notified', 'converted', 'expired'));
DROP INDEX IF EXISTS stock_alerts_active_uniq;
CREATE UNIQUE INDEX stock_alerts_active_uniq ON stock_alerts (store_id, platform_variant_id, lower(email)) WHERE status IN ('pending', 'waiting', 'notified');

-- Numéro de commande unique PAR BOUTIQUE (la 2e boutique avec une commande n° 1001 plantait), et plus long.
ALTER TABLE orders ALTER COLUMN order_number TYPE varchar(40);
CREATE UNIQUE INDEX IF NOT EXISTS orders_store_id_order_number_key ON orders (store_id, order_number);
DROP INDEX IF EXISTS orders_order_number_key;
