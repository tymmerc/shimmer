import { describe, it, expect, vi } from 'vitest';

vi.mock('@shimmer/core', () => ({ getPrisma: () => ({}), logger: { info: vi.fn(), warn: vi.fn() } }));
const { listUnsubscribeHeaders } = await import('../index.js');

// Désinscription en un clic (RFC 8058) affichée par Gmail et Outlook, sur les
// e-mails non transactionnels (relances, newsletter, demandes d'avis).
describe('en-têtes List-Unsubscribe', () => {
  it('lien https : les deux en-têtes', () => {
    expect(listUnsubscribeHeaders('https://tymmerc.eu/shimmer/api/public/unsubscribe?t=abc')).toEqual({
      'List-Unsubscribe': '<https://tymmerc.eu/shimmer/api/public/unsubscribe?t=abc>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });
  it('rien pour un lien absent, non https, ou qui casserait l\'en-tête', () => {
    for (const url of [undefined, '', 'http://x.fr/u', 'https://x.fr/u\r\nBcc: a@b.fr', 'https://x.fr/<u>', 'https://x.fr/a b', 'pas une url']) {
      expect(listUnsubscribeHeaders(url)).toBeUndefined();
    }
  });
});
