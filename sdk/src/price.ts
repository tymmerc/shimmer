/**
 * Prix affiché dans le dock. La base renvoie un Decimal brut (« 13.9 »,
 * « 21 ») : on l'affiche à la française, « 13,90 € », « 21 € », avec une
 * espace insécable avant l'euro. Une valeur illisible est rendue telle quelle.
 */
export function formatPrice(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined || String(raw).trim() === '') return '';
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return `${raw ?? ''} €`.trim();
  const txt = Number.isInteger(n)
    ? String(n)
    : n.toFixed(2).replace('.', ',');
  return `${txt} €`;
}
