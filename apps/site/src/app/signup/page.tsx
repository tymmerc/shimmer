import type { Metadata } from 'next';
import { SignupFlow } from '@/components/signup/SignupFlow';

export const metadata: Metadata = {
  title: 'Shimmer · Inscription marchand',
};

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-ink text-paper">
      <SignupFlow />
    </main>
  );
}
