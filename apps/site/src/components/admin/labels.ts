// Libellés humains FR pour les valeurs techniques (statuts, types) affichées
// dans le dashboard. Un commerçant ne doit jamais voir "awaiting_customer".

const FR: Record<string, string> = {
  // SAV — statuts
  open: 'Ouvert',
  in_progress: 'En cours',
  awaiting_customer: 'En attente client',
  resolved: 'Résolu',
  closed: 'Fermé',
  escalated: 'Escaladé',
  // SAV — types
  refund: 'Remboursement',
  product_defect: 'Produit défectueux',
  return: 'Retour',
  delivery: 'Livraison',
  question: 'Question',
  other: 'Autre',
  damaged: 'Endommagé',
  wrong_item: 'Mauvais article',
  // Avis — statuts
  pending_moderation: 'En modération',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  published: 'Publié',
  // Paniers — statuts
  pending: 'En attente',
  abandoned: 'Abandonné',
  reminded_once: 'Relancé 1×',
  reminded_twice: 'Relancé 2×',
  recovered: 'Récupéré',
  holdout_control: 'Témoin',
};

/** "awaiting_customer" -> "En attente client" ; fallback : jolifie l'enum. */
export function humanize(v: string): string {
  if (!v) return v;
  const key = v.toLowerCase();
  if (FR[key]) return FR[key];
  return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
