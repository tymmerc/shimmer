import type { Metadata } from 'next';
import { BrutHero } from '@/components/brut/BrutHero';
import { BrutFeatures } from '@/components/brut/BrutFeatures';
import { BrutMoney } from '@/components/brut/BrutMoney';
import { BrutCTA } from '@/components/brut/BrutCTA';

export const metadata: Metadata = {
  title: 'SHIMMER · BRUT · VENDEUR. CROSS-SELL. ATTRIBUÉ.',
};

export default function BrutPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-acid font-sans text-ink">
      <BrutHero />
      <BrutFeatures />
      <BrutMoney />
      <BrutCTA />
    </main>
  );
}
