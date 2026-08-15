import type { Metadata } from 'next';
import { ReviewForm } from '@/components/review/ReviewForm';

export const metadata: Metadata = {
  title: 'Donnez votre avis · Shimmer',
};

export default function ReviewPage() {
  return (
    <main className="min-h-screen bg-ink text-paper">
      <ReviewForm />
    </main>
  );
}
