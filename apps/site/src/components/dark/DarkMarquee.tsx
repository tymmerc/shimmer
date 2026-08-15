// Marquee des verticaux. Animation CSS native (zéro JS, zéro Framer, pas de
// rAF qui occupe le main thread). Respecte prefers-reduced-motion : sur les
// devices où l'utilisateur a coché "moins d'animations", le défilement
// s'arrête, on lit la liste à plat.

const verticals = [
  'cave à vins',
  'luminaires',
  'mode féminine',
  'cosmétique',
  'parfumerie',
  'matériel hi-fi',
  'librairie',
  'épicerie fine',
  'bricolage',
  'puériculture',
  'sport outdoor',
  'fleuristerie',
];

export function DarkMarquee() {
  // On duplique la liste pour que la boucle CSS soit sans couture.
  const doubled = [...verticals, ...verticals];

  return (
    <section
      aria-label="Verticaux compatibles"
      className="relative w-full overflow-hidden border-y border-paper/10 bg-ink py-10"
    >
      <div className="mb-5 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-paper/55">
        Une seule plateforme, n'importe quel e-commerce
      </div>
      <div className="relative">
        {/* Pas de gap sur le conteneur : chaque item porte son propre espacement
            (gap interne + séparateur). Les deux moitiés font donc exactement la
            même largeur et le translate(-50%) boucle sans à-coup (c'était le
            "glitch" du carrousel : un demi-gap d'écart à la couture). */}
        <div
          className="marquee-row flex whitespace-nowrap will-change-transform"
          style={{ width: 'max-content' }}
        >
          {doubled.map((v, i) => (
            <span
              key={i}
              className="flex items-center gap-12 pr-12 font-display text-3xl italic tracking-editorial text-paper md:text-4xl"
            >
              {v}
              <span className="text-acid opacity-80">·</span>
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-ink to-transparent" />
      </div>

      <style>{`
        @keyframes marquee-translate {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
        .marquee-row {
          animation: marquee-translate 60s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-row { animation: none; }
        }
      `}</style>
    </section>
  );
}
