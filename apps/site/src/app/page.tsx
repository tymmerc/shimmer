import type { Metadata } from 'next';
import { DarkPageTheme } from '@/components/dark/DarkPageTheme';
import { ToxicSpread } from '@/components/v2/ToxicSpread';
import { V3Hero } from '@/components/v3/V3Hero';
import { V3Modules } from '@/components/v3/V3Modules';
import { V3HowItWorks } from '@/components/v3/V3HowItWorks';
import { V3Proof } from '@/components/v3/V3Proof';
import { V3Pricing } from '@/components/v3/V3Pricing';
import { V3FAQ } from '@/components/v3/V3FAQ';
import { V3CTA } from '@/components/v3/V3CTA';
import { SiteFooter } from '@/components/v2/SiteFooter';

export const metadata: Metadata = {
  title: 'Shimmer — un vendeur IA dans la barre de recherche de votre boutique',
  description:
    'Shimmer met un vendeur IA dans votre barre de recherche, répond au SAV à votre place, relance les paniers abandonnés et prouve à l\'euro ce que ça rapporte. Shopify & WooCommerce, installé en 30 minutes, IA et données en France.',
};

export default function HomePage() {
  return (
    <>
      <DarkPageTheme />
      {/* La toxine ambiante : couche fixe discrète derrière toute la page. */}
      <ToxicSpread />

      <main className="relative z-10 min-h-screen overflow-x-clip text-paper">
        <V3Hero />
        <V3Modules />
        <V3HowItWorks />
        <V3Proof />
        <V3Pricing />
        <V3FAQ />
        <V3CTA />
        <SiteFooter />
      </main>
    </>
  );
}
