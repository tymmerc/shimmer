'use client';

export function BrutCTA() {
  return (
    <section className="w-full bg-acid">
      <div className="border-t-[3px] border-ink px-6 py-24 md:px-12 md:py-32">
        <div className="mx-auto max-w-[1480px]">
          <h2 className="font-sans text-[clamp(56px,11vw,200px)] font-black uppercase leading-[0.85] tracking-[-0.045em] text-ink">
            ON Y VA ?
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-px bg-ink md:grid-cols-3">
            <a href="/shimmer/cross-sell-demo.html" className="group block bg-acid p-10 transition hover:bg-ink hover:text-acid">
              <div className="text-xs font-bold uppercase tracking-widest">01</div>
              <div className="mt-4 text-4xl font-black uppercase leading-tight">VOIR<br/>LA DÉMO</div>
              <div className="mt-8 text-sm transition group-hover:translate-x-2">→</div>
            </a>
            <a href="/shimmer/cross-sell-dashboard.html" className="group block bg-acid p-10 transition hover:bg-ink hover:text-acid">
              <div className="text-xs font-bold uppercase tracking-widest">02</div>
              <div className="mt-4 text-4xl font-black uppercase leading-tight">LE<br/>DASHBOARD</div>
              <div className="mt-8 text-sm transition group-hover:translate-x-2">→</div>
            </a>
            <a href="/shimmer/docs.html" className="group block bg-acid p-10 transition hover:bg-ink hover:text-acid">
              <div className="text-xs font-bold uppercase tracking-widest">03</div>
              <div className="mt-4 text-4xl font-black uppercase leading-tight">API<br/>REFERENCE</div>
              <div className="mt-8 text-sm transition group-hover:translate-x-2">→</div>
            </a>
          </div>

          <div className="mt-16 border-t-[3px] border-ink pt-6 font-mono text-xs uppercase tracking-widest text-ink">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span>SHIMMER · VENDEUR IA · V0.4.0</span>
              <span>2026 · TYM.MERCIER@GMAIL.COM</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
