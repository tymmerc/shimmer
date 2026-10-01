-- Images de démonstration des boutiques 4 (Caves Forty-Two) et 5 (L'Atelier Lumière).
-- Écrit le 01/10/2026, PAS encore appliqué.
--
-- Prérequis : le site doit être déployé en prod AVANT de lancer ce fichier,
-- sinon les URL pointent dans le vide (fichiers servis depuis
-- apps/site/public/demo-boutiques/img/, donc https://tymmerc.eu/shimmer/demo-boutiques/img/).
--
-- Illustration choisie par catégorie, variante déterministe tirée de l'id
-- (id % 3 pour les vins, id % 2 pour les luminaires). Ne touche que les
-- produits encore sans image : rejouable sans effet.
-- Attendu : 80 lignes pour la boutique 4, 60 pour la boutique 5.

BEGIN;

UPDATE products
SET image_url = 'https://tymmerc.eu/shimmer/demo-boutiques/img/'
      || CASE category
           WHEN 'Vin rouge' THEN 'rouge'
           WHEN 'Vin blanc' THEN 'blanc'
           WHEN 'Vin rosé'  THEN 'rose'
           WHEN 'Vin doux'  THEN 'doux'
           ELSE 'champagne'            -- Champagne, Crémant, Prosecco
         END
      || '-' || (id % 3 + 1) || '.svg',
    updated_at = now()
WHERE store_id = 4
  AND image_url IS NULL
  AND category IN ('Vin rouge', 'Vin blanc', 'Vin rosé', 'Vin doux', 'Champagne', 'Crémant', 'Prosecco');

UPDATE products
SET image_url = 'https://tymmerc.eu/shimmer/demo-boutiques/img/'
      || CASE category
           WHEN 'Suspension'   THEN 'suspension'
           WHEN 'Lampe table'  THEN 'lampe-table'
           WHEN 'Applique'     THEN 'applique'
           WHEN 'Lampadaire'   THEN 'lampadaire'
           WHEN 'Lampe bureau' THEN 'lampe-bureau'
         END
      || '-' || (id % 2 + 1) || '.svg',
    updated_at = now()
WHERE store_id = 5
  AND image_url IS NULL
  AND category IN ('Suspension', 'Lampe table', 'Applique', 'Lampadaire', 'Lampe bureau');

COMMIT;

-- Retour arrière (à lancer seul si besoin) :
-- UPDATE products SET image_url = NULL
--  WHERE store_id IN (4, 5)
--    AND image_url LIKE 'https://tymmerc.eu/shimmer/demo-boutiques/img/%';
