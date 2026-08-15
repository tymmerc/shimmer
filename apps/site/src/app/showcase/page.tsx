import type { Metadata } from 'next';
import { ShowcaseGallery } from '@/components/showcase/ShowcaseGallery';

export const metadata: Metadata = {
  title: 'Shimmer · Galerie des 4 directions',
};

export default function ShowcasePage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <ShowcaseGallery />
    </main>
  );
}
