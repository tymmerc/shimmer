-- Suivi de commande dans le chat SAV (29/09/2026).
-- Additif et nullable : sans effet sur le code déjà déployé. À appliquer en SQL
-- direct (psql), jamais via prisma db push (la base a dérivé du schéma).

-- Lien de suivi transporteur fourni par Shopify, montré dans le chat.
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "tracking_url" VARCHAR(500);

-- Id du colis Shopify : clé de mise à jour des webhooks fulfillments.
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "platform_fulfillment_id" VARCHAR(64);
CREATE INDEX IF NOT EXISTS "shipments_order_id_platform_fulfillment_id_idx"
  ON "shipments" ("order_id", "platform_fulfillment_id");
