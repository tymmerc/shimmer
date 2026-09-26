import type { Metadata } from 'next';
import { DarkPageTheme } from '@/components/dark/DarkPageTheme';
import { ToxicSpread } from '@/components/v2/ToxicSpread';
import { ShimmerHero } from '@/components/v2/ShimmerHero';
import { Pillars } from '@/components/v2/Pillars';
import { Satellites } from '@/components/v2/Satellites';
import { HowItWorks } from '@/components/v2/HowItWorks';
import { ProofSimple } from '@/components/v2/ProofSimple';
import { AuditCTA } from '@/components/v2/AuditCTA';
import { SiteFooter } from '@/components/v2/SiteFooter';

export const metadata: Metadata = {
  title: 'Shimmer, l\'outil qui fait gagner du temps et des clients à votre boutique',
  description:
    'Un vendeur en ligne et un SAV qui répondent à votre place, plus les relances paniers, les avis, les campagnes. Vous gagnez du temps et des ventes. IA locale, données en France.',
};

export default function HomePage() {
  return (
    <>
      <DarkPageTheme />
      {/* La toxine : couche fixe derrière toute la page. */}
      <ToxicSpread />

      {/* Contenu au-dessus de la toxine (fond transparent, elle transparaît). */}
      <main className="relative z-10 min-h-screen overflow-x-clip text-paper">
        <ShimmerHero />
        <Pillars />
        <Satellites />
        <HowItWorks />
        <ProofSimple />
        <AuditCTA />
        <SiteFooter />
      </main>
    </>
  );
}
