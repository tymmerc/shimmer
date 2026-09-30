/**
 * Id d'un critère de qualification (BUDGET, SANS_FIL, PIECE...). Les ids
 * viennent en partie du config des boutiques (universe_overrides), donc d'un
 * tenant : on n'accepte que lettres, chiffres et soulignés, pour qu'un id ne
 * puisse jamais changer le sens d'une requête ou d'un motif.
 */
export const CRITERION_ID_RE = /^[A-Za-z0-9_]{1,64}$/;

export function isSafeCriterionId(id: unknown): id is string {
  return typeof id === 'string' && CRITERION_ID_RE.test(id);
}
