// L'audit gratuit est l'accroche commerciale n°1 : tous les CTA "audit"
// pointent vers ce mailto pré-rempli (il n'existe pas encore de formulaire
// dédié ; le signup crée un store + clé API, ce n'est pas un audit).

const AUDIT_SUBJECT = 'Audit gratuit de ma boutique';

const AUDIT_BODY = [
  'Bonjour,',
  '',
  'Je veux bien un audit gratuit de ma boutique.',
  '',
  'URL de la boutique : ',
  'Plateforme (Shopify, WooCommerce, autre) : ',
  '',
  'Merci !',
].join('\n');

export const AUDIT_MAILTO = `mailto:tym.mercier@gmail.com?subject=${encodeURIComponent(
  AUDIT_SUBJECT,
)}&body=${encodeURIComponent(AUDIT_BODY)}`;
