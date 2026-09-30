import { describe, it, expect, vi, beforeEach } from 'vitest';

// Une commande payée se rattache à la conversation du vendeur par l'e-mail
// (client connecté) ou, depuis le 30/09, par l'identifiant du panier
// (visiteur anonyme). Ses recherches passent alors en « converties ».
const findFirst = vi.fn();
const update = vi.fn(async () => ({}));
const updateMany = vi.fn(async () => ({ count: 2 }));
vi.mock('@shimmer/core', () => ({
  getPrisma: () => ({ chatSession: { findFirst, update }, searchSession: { updateMany } }),
  logger: { info: vi.fn(), warn: vi.fn() },
}));
const { attributeOrderToChat } = await import('../lib/attribution.js');

beforeEach(() => { findFirst.mockReset(); update.mockClear(); updateMany.mockClear(); });

describe('attributeOrderToChat', () => {
  it('visiteur anonyme : rattaché par l\'identifiant du panier, recherches converties', async () => {
    // 1re lecture : la commande n'est encore rattachée à rien ; 2e : la conversation.
    findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 7, sessionToken: 'tok-7', visitorId: 'v_123456' });
    const r = await attributeOrderToChat(4, 900, '', 'v_123456');
    expect(r).toEqual({ attributed: true, sessionId: 7 });
    const where = findFirst.mock.calls[1]![0].where;
    expect(where.storeId).toBe(4);
    expect(where.OR).toEqual([{ visitorId: 'v_123456' }]);
    expect(update).toHaveBeenCalledWith({ where: { id: 7 }, data: { attributedOrderId: 900 } });
    expect(updateMany).toHaveBeenCalledWith({ where: { storeId: 4, sessionToken: 'tok-7', converted: false }, data: { converted: true } });
  });
  it('e-mail et identifiant : les deux pistes sont cherchées', async () => {
    findFirst.mockResolvedValue(null);
    await attributeOrderToChat(4, 900, 'a@b.fr', 'v_123456');
    expect(findFirst.mock.calls[1]![0].where.OR).toEqual([{ customerEmail: 'a@b.fr' }, { visitorId: 'v_123456' }]);
  });
  it('ni e-mail ni identifiant : rien, sans requête', async () => {
    expect(await attributeOrderToChat(4, 900, '', null)).toEqual({ attributed: false });
    expect(findFirst).not.toHaveBeenCalled();
  });
});
