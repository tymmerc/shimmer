import type { Metadata } from 'next';
import { DemoBoutiques } from '@/components/demo/DemoBoutiques';

export const metadata: Metadata = {
  title: 'Shimmer · Le vendeur chez vous',
};

export default function DemoBoutiquesPage() {
  return (
    <main className="min-h-screen bg-ink text-paper">
      <DemoBoutiques />
    </main>
  );
}
