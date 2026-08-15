import type { Metadata } from 'next';
import { AdminApp } from '@/components/admin/AdminApp';

export const metadata: Metadata = {
  title: 'Shimmer — Admin',
};

export default function AdminPage() {
  // Dashboard CLAIR (type Shopify) : outil quotidien, pas vitrine. Fond warm
  // off-white, texte sombre. Rien à voir avec l'esthétique sombre du site.
  return (
    <main className="min-h-screen bg-[#f6f5f2] text-neutral-900">
      <AdminApp />
    </main>
  );
}
