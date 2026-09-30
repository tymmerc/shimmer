/**
 * Profil public d'une boutique, pour GET /api/stores/:id (route sans
 * authentification). Liste blanche stricte : le config contient des secrets
 * (config.shopify.webhookSecret, clés WooCommerce, facturation), il ne doit
 * JAMAIS sortir par cette route. Le SDK et l'admin lisent le config par
 * /api/stores/me/config, qui exige la clé de la boutique.
 */
export interface PublicStoreProfile {
  id: number;
  name: string;
}

export function publicStoreProfile(store: { id: number; name: string }): PublicStoreProfile {
  return { id: store.id, name: store.name };
}
