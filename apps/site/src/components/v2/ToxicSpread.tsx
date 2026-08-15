/**
 * La toxine — version FLUIDE, décrochée du scroll.
 *
 * Avant, la toxine était liée au scroll (ressort) : elle « courait après » le
 * doigt, d'où une sensation pas nette. Ici elle respire toute seule en boucle
 * lente (CSS, transform-only), indépendante du défilement. Le scroll reste
 * parfaitement propre. Deux couches fixes de radial-gradients doux, aucun
 * filtre blur, aucun JS.
 */
export function ToxicSpread() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-ink">
      <div
        className="toxic-a absolute left-1/2 top-[-14%] h-[85vh] w-[85vw] -translate-x-1/2 opacity-[0.13]"
        style={{
          background:
            'radial-gradient(38% 46% at 62% 30%, rgba(232,74,255,0.85), rgba(232,74,255,0) 70%),' +
            'radial-gradient(44% 52% at 44% 52%, rgba(139,77,255,0.8), rgba(139,77,255,0) 72%),' +
            'radial-gradient(26% 32% at 55% 48%, rgba(212,255,58,0.3), rgba(212,255,58,0) 68%)',
        }}
      />
      <div
        className="toxic-b absolute bottom-[-20%] right-[-14%] h-[75vh] w-[75vw] opacity-[0.11]"
        style={{
          background:
            'radial-gradient(46% 52% at 50% 50%, rgba(106,43,245,0.85), rgba(106,43,245,0) 72%),' +
            'radial-gradient(32% 38% at 62% 42%, rgba(255,102,236,0.55), rgba(255,102,236,0) 70%)',
        }}
      />
    </div>
  );
}
