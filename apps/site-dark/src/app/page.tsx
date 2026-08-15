import { Hero } from '@/components/Hero';
import { Marquee } from '@/components/Marquee';
import { PinnedJourney } from '@/components/PinnedJourney';
import { SectionVendeur } from '@/components/SectionVendeur';
import { SectionCrossSell } from '@/components/SectionCrossSell';
import { SectionAttribution } from '@/components/SectionAttribution';
import { SectionMailReviews } from '@/components/SectionMailReviews';
import { SectionStack } from '@/components/SectionStack';
import { Epilogue } from '@/components/Epilogue';

export default function Page() {
  return (
    <main className="overflow-hidden">
      <Hero />
      <Marquee />
      <PinnedJourney />
      <SectionVendeur />
      <SectionCrossSell />
      <SectionAttribution />
      <SectionMailReviews />
      <SectionStack />
      <Epilogue />
    </main>
  );
}
