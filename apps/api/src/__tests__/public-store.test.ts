import { describe, it, expect } from 'vitest';
import { publicStoreProfile } from '../lib/public-store.js';

// GET /api/stores/:id est public (sans authentification). Il renvoyait tout le
// config de la boutique, dont config.shopify.webhookSecret : n'importe qui
// pouvait forger des webhooks Shopify (commandes, colis) en énumérant les id.
describe('publicStoreProfile', () => {
  const store = {
    id: 4,
    name: 'Caves Forty-Two',
    apiKey: 'sk_test_should_never_leak',
    config: {
      shopify: { shopDomain: 'caves-forty-two.myshopify.com', webhookSecret: 'whsec_should_never_leak' },
      woocommerce: { consumerKey: 'ck_should_never_leak', consumerSecret: 'cs_should_never_leak' },
      billing: { floorEUR: 89, ratePct: 5, capEUR: null },
      inboundAlias: 'caves@inbound.example',
    },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-09-30T00:00:00Z'),
  };

  it('ne garde que id et name', () => {
    expect(publicStoreProfile(store)).toEqual({ id: 4, name: 'Caves Forty-Two' });
  });

  it('ne laisse passer aucun secret ni aucun champ du config', () => {
    const json = JSON.stringify(publicStoreProfile(store));
    for (const leak of ['never_leak', 'webhookSecret', 'consumer', 'billing', 'inboundAlias', 'config', 'apiKey']) {
      expect(json).not.toContain(leak);
    }
  });
});
