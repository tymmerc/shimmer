// L'audit gratuit est l'accroche commerciale n°1. Les CTA de la landing
// mènent au bloc #audit, où l'adresse est affichée en clair (copiable) en plus
// du mailto : sur un ordinateur sans logiciel de messagerie, un simple mailto
// n'ouvre rien et la demande se perd sans qu'on le sache (01/10).

export const AUDIT_EMAIL = 'tym.mercier@gmail.com';
/** Le bloc audit de la landing, depuis n'importe quelle page du site. */
export const AUDIT_ANCHOR = '/shimmer/#audit';

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

export const AUDIT_MAILTO = `mailto:${AUDIT_EMAIL}?subject=${encodeURIComponent(
  AUDIT_SUBJECT,
)}&body=${encodeURIComponent(AUDIT_BODY)}`;
