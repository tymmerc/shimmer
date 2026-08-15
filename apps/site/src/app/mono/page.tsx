import type { Metadata } from 'next';
import { MonoHero } from '@/components/mono/MonoHero';
import { MonoModules } from '@/components/mono/MonoModules';
import { MonoMetrics } from '@/components/mono/MonoMetrics';
import { MonoVerticals } from '@/components/mono/MonoVerticals';
import { MonoTerminal } from '@/components/mono/MonoTerminal';
import { MonoFooter } from '@/components/mono/MonoFooter';

export const metadata: Metadata = {
  title: 'Shimmer · Mono · Conversational sales agent',
};

export default function MonoPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0a0a0a] font-mono text-zinc-200">
      <MonoHero />
      <MonoModules />
      <MonoMetrics />
      <MonoVerticals />
      <MonoTerminal />
      <MonoFooter />
    </main>
  );
}
