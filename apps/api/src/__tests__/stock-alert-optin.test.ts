import { describe, it, expect, vi, beforeEach } from 'vitest';

// Double confirmation des alertes de retour de stock (RGPD, 30/09) : quand de
// vrais e-mails partent, l'alerte attend le clic sur le lien ; jeton à usage
// unique ; inscriptions non confirmées effacées au bout de 7 jours.
const rows: Array<Record<string, unknown>> = [];
let nextId = 1;
const matches = (r: Record<string, unknown>, where: Record<string, unknown>) => Object.entries(where).every(([k, v]) => {
  if (v && typeof v === 'object' && 'in' in (v as object)) return (v as { in: unknown[] }).in.includes(r[k]);
  if (v && typeof v === 'object' && 'lt' in (v as object)) return (r[k] as Date) < (v as { lt: Date }).lt;
  return r[k] === v;
});
vi.mock('@shimmer/core', () => ({
  getPrisma: () => ({
    stockAlert: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const r = rows.find((x) => matches(x, where));
        return r ? { ...r, store: { name: 'Caves Forty-Two' } } : null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { const r = { id: nextId++, createdAt: new Date(), ...data }; rows.push(r); return r; }),
      update: vi.fn(async ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => { Object.assign(rows.find((x) => x.id === where.id)!, data); return {}; }),
      deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i]!, where)) rows.splice(i, 1);
        return { count: before - rows.length };
      }),
    },
  }),
  logger: { info: vi.fn(), warn: vi.fn() },
}));
vi.mock('@shimmer/email-connector', () => ({ sendEmail: vi.fn() }));

const { subscribeStockAlert, confirmStockAlert, purgeUnconfirmedStockAlerts } = await import('../lib/stock-alerts.js');
beforeEach(() => { rows.length = 0; nextId = 1; });
const input = { storeId: 4, platformVariantId: 'p:111', email: 'Chloe@Mail.fr', variantLabel: 'Brouilly 2022' };

describe('double confirmation des alertes de retour de stock', () => {
  it('sans vrais e-mails (démo) : active tout de suite, sans jeton', async () => {
    const r = await subscribeStockAlert(input);
    expect(r.confirmToken).toBeNull();
    expect(rows[0]).toMatchObject({ status: 'waiting', email: 'chloe@mail.fr' });
  });
  it('avec vrais e-mails : en attente, jeton fort ; le clic l\'active une seule fois', async () => {
    const r = await subscribeStockAlert({ ...input, confirmRequired: true });
    expect(r.confirmToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(rows[0]!.status).toBe('pending');
    expect(await confirmStockAlert(r.confirmToken!)).toMatchObject({ confirmed: true, storeName: 'Caves Forty-Two', label: 'Brouilly 2022' });
    expect(rows[0]).toMatchObject({ status: 'waiting', confirmToken: null });
    expect((await confirmStockAlert(r.confirmToken!)).confirmed).toBe(false);
  });
  it('ré-inscription (même en attente) : pas de nouvel e-mail', async () => {
    await subscribeStockAlert({ ...input, confirmRequired: true });
    const again = await subscribeStockAlert({ ...input, confirmRequired: true });
    expect(again).toMatchObject({ created: false, confirmToken: null });
    expect(rows).toHaveLength(1);
  });
  it('non confirmée depuis 7 jours : effacée ; confirmée : gardée', async () => {
    rows.push({ id: 90, status: 'pending', createdAt: new Date('2026-09-01') }, { id: 91, status: 'waiting', createdAt: new Date('2026-09-01') });
    expect(await purgeUnconfirmedStockAlerts(new Date('2026-09-30'))).toBe(1);
    expect(rows.map((x) => x.id)).toEqual([91]);
  });
});
