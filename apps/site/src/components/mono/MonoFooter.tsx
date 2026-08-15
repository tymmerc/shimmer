'use client';

export function MonoFooter() {
  return (
    <footer className="relative w-full border-t border-white/5 bg-[#0a0a0a] py-16 md:py-24">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-6">
            <h2 className="text-3xl tracking-tight text-zinc-100 md:text-5xl">
              ~/shimmer is operational.
            </h2>
            <p className="mt-4 max-w-[44ch] text-sm text-zinc-400">
              30 min to plug. 1 view to start counting. Tested across drinks, lighting, fashion, cosmetics, hi-fi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/shimmer/cross-sell-demo.html" className="rounded-md bg-zinc-100 px-5 py-3 text-xs uppercase tracking-[0.18em] text-zinc-900 transition hover:bg-white">
                Demo →
              </a>
              <a href="/shimmer/cross-sell-dashboard.html" className="rounded-md border border-white/15 px-5 py-3 text-xs uppercase tracking-[0.18em] text-zinc-200 transition hover:bg-white/5">
                Dashboard
              </a>
              <a href="/shimmer/docs.html" className="rounded-md border border-white/15 px-5 py-3 text-xs uppercase tracking-[0.18em] text-zinc-200 transition hover:bg-white/5">
                API ref
              </a>
            </div>
          </div>

          <div className="col-span-6 md:col-span-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Variantes</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="/shimmer/" className="text-zinc-300 hover:text-zinc-100">→ light · éditorial</a></li>
              <li><a href="/shimmer/dark/" className="text-zinc-300 hover:text-zinc-100">→ dark · acid</a></li>
              <li><span className="text-zinc-500">→ mono · tech (current)</span></li>
            </ul>
          </div>

          <div className="col-span-6 md:col-span-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Stack</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="text-zinc-300">Express + TypeScript 5.7</li>
              <li className="text-zinc-300">Prisma 6.4 · PostgreSQL</li>
              <li className="text-zinc-300">Redis · BullMQ</li>
              <li className="text-zinc-300">Claude / Ollama / e5 ONNX</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          <span>shimmer · vendeur ia · v0.4 · 2026</span>
          <a href="mailto:tym.mercier@gmail.com" className="hover:text-zinc-200">tym.mercier@gmail.com</a>
        </div>
      </div>
    </footer>
  );
}
