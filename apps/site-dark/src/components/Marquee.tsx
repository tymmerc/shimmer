'use client';

const verticals = [
  'cave à vins',
  'luminaires',
  'mode féminine',
  'cosmétique',
  'parfumerie',
  'matériel hi-fi',
  'librairie indépendante',
  'épicerie fine',
  'bricolage',
  'puériculture',
  'maroquinerie',
  'sport outdoor',
  'fleuristerie',
  'jouets éducatifs',
];

export function Marquee() {
  const doubled = [...verticals, ...verticals];

  return (
    <section className="relative w-full overflow-hidden border-y border-ink/10 bg-paper py-10">
      <div className="mb-6 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-ink-mute">
        S'adapte à n'importe quel vertical e-commerce
      </div>
      <div className="relative">
        <div
          className="flex gap-12 animate-marquee whitespace-nowrap will-change-transform"
          style={{ width: 'max-content' }}
        >
          {doubled.map((v, i) => (
            <span key={i} className="flex items-center gap-12 font-display text-3xl font-normal italic tracking-editorial text-ink md:text-4xl">
              {v}
              <span className="text-toxic-600 opacity-70">·</span>
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-paper to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-paper to-transparent" />
      </div>
    </section>
  );
}
