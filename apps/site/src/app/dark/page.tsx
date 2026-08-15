import type { Metadata } from 'next';
import { DarkHero } from '@/components/dark/DarkHero';
import { DarkMarquee } from '@/components/dark/DarkMarquee';
import { DarkJourney } from '@/components/dark/DarkJourney';
import { DarkFeatures } from '@/components/dark/DarkFeatures';
import { DarkAttribution } from '@/components/dark/DarkAttribution';
import { DarkVerticals } from '@/components/dark/DarkVerticals';
import { DarkIntegration } from '@/components/dark/DarkIntegration';
import { DarkEpilogue } from '@/components/dark/DarkEpilogue';

export const metadata: Metadata = {
  title: 'Shimmer · Un vendeur sur votre boutique en ligne',
};

export default function DarkPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-paper">
      <DarkHero />
      <DarkMarquee />
      <DarkJourney />
      <DarkFeatures />
      <DarkAttribution />
      <DarkVerticals />
      <DarkIntegration />
      <DarkEpilogue />
    </main>
  );
}
