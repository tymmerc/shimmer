import type { Metadata } from 'next';
import { DemoHub } from '@/components/demo/DemoHub';

export const metadata: Metadata = {
  title: 'Shimmer · Démos interactives',
};

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-ink text-paper">
      <DemoHub />
    </main>
  );
}
