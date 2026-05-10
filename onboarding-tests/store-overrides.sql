-- Store overrides used during the P2 + P3 grafting validation.
-- Replays of these overrides reproduce the post-P3 results documented in POST-FIX-P3.md.
-- Add the `voice` block (P3) at the same level as `tone` and `universe_overrides`.

-- Caves Forty-Two: tutoiement + brand voice + force OCCASION as required, drop GARDE/MILLESIME
UPDATE stores SET config = jsonb_build_object(
  'tone', 'tu',
  'voice', jsonb_build_object(
    'intro_phrases', jsonb_build_array('Tope !', 'Bonne idée !', 'Pile poil pour ça !', 'Joli choix !'),
    'signature', 'Santé !',
    'vocabulary', jsonb_build_object('produit', 'bouteille', 'produits', 'bouteilles', 'article', 'cuvée')
  ),
  'universe_overrides', jsonb_build_object(
    'VIN_ROUGE', jsonb_build_object(
      'criteria_add', jsonb_build_array(
        jsonb_build_object(
          'id', 'OCCASION', 'label', 'Occasion', 'weight', 30, 'required', true,
          'type', 'closed',
          'values', jsonb_build_array('Quotidien', 'Repas amis', 'Cadeau', 'Cave/garde'),
          'question', 'C''est pour quelle occasion ?', 'fallback', 'Repas amis'
        )
      ),
      'criteria_replace', jsonb_build_array(
        jsonb_build_object(
          'id', 'ACCORD', 'label', 'Accord met-vin', 'weight', 25, 'required', false,
          'type', 'open',
          'question', 'C''est avec quel plat ?', 'fallback', 'flexible'
        )
      ),
      'criteria_priority', jsonb_build_array('OCCASION', 'ACCORD', 'REGION', 'BUDGET'),
      'criteria_remove', jsonb_build_array('GARDE', 'MILLESIME'),
      'keywords_add', jsonb_build_array('rouge', 'rouges', 'tannique', 'puissant', 'corsé')
    ),
    'VIN_BLANC', jsonb_build_object(
      'criteria_add', jsonb_build_array(
        jsonb_build_object(
          'id', 'OCCASION', 'label', 'Occasion', 'weight', 30, 'required', true,
          'type', 'closed',
          'values', jsonb_build_array('Quotidien', 'Repas amis', 'Cadeau', 'Apéro'),
          'question', 'C''est pour quelle occasion ?', 'fallback', 'Apéro'
        )
      ),
      'criteria_replace', jsonb_build_array(
        jsonb_build_object(
          'id', 'ACCORD', 'label', 'Accord met-vin', 'weight', 25, 'required', false,
          'type', 'open',
          'question', 'C''est avec quel plat ?', 'fallback', 'flexible'
        )
      ),
      'criteria_priority', jsonb_build_array('OCCASION', 'ACCORD', 'REGION', 'BUDGET'),
      'criteria_remove', jsonb_build_array('GARDE', 'MILLESIME'),
      'keywords_add', jsonb_build_array('blanc', 'blancs', 'frais', 'minéral')
    )
  )
)::jsonb
WHERE name = 'Caves Forty-Two';

-- L'Atelier Lumière: vouvoiement + brand voice + replace PIECE with curated values & deductions
UPDATE stores SET config = jsonb_build_object(
  'tone', 'vous',
  'voice', jsonb_build_object(
    'intro_phrases', jsonb_build_array('Avec plaisir.', 'Bien noté.', 'Excellent point.'),
    'signature', 'À très vite chez L''Atelier.',
    'vocabulary', jsonb_build_object('produit', 'luminaire', 'produits', 'luminaires')
  ),
  'universe_overrides', jsonb_build_object(
    'SUSPENSION', jsonb_build_object(
      'criteria_replace', jsonb_build_array(
        jsonb_build_object(
          'id', 'PIECE', 'label', 'Pièce', 'weight', 30, 'required', true,
          'type', 'closed',
          'values', jsonb_build_array('salon', 'salle a manger', 'chambre', 'cuisine', 'bureau', 'couloir'),
          'question', 'Pour quelle pièce ?', 'fallback', 'salon'
        )
      ),
      'criteria_priority', jsonb_build_array('PIECE', 'COULEUR', 'BUDGET'),
      'criteria_remove', jsonb_build_array('DIAMETRE_CM', 'PUISSANCE_MAX', 'MATIERE'),
      'keywords_add', jsonb_build_array('suspension', 'lustre', 'plafond'),
      'deductions_add', jsonb_build_array(
        jsonb_build_object('patterns', jsonb_build_array('salon', 'séjour', 'sejour'),
                          'criterion', 'PIECE', 'value', 'salon'),
        jsonb_build_object('patterns', jsonb_build_array('salle à manger', 'salle a manger', 'table à manger'),
                          'criterion', 'PIECE', 'value', 'salle a manger'),
        jsonb_build_object('patterns', jsonb_build_array('chambre', 'lit', 'chevet'),
                          'criterion', 'PIECE', 'value', 'chambre'),
        jsonb_build_object('patterns', jsonb_build_array('bureau', 'travail'),
                          'criterion', 'PIECE', 'value', 'bureau'),
        jsonb_build_object('patterns', jsonb_build_array('cuisine', 'plan de travail'),
                          'criterion', 'PIECE', 'value', 'cuisine')
      )
    )
  )
)::jsonb
WHERE name = 'L''Atelier Lumière';
