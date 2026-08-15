'use client';

// SCROLL NATIF PARTOUT.
//
// On a retiré Lenis (smooth-scroll JS). Raison : Lenis interpole le
// défilement sur le thread principal ; dès que ce thread est occupé (shader
// WebGL, canvas de la constellation, animations), le lissage décroche et le
// scroll saccade — c'est la sensation « pas fluide » sur desktop. Le scroll
// natif du navigateur est piloté par le compositeur, hors thread principal :
// il reste fluide quelle que soit la charge, et il est crisp (1:1 avec la
// molette). Le site v2 n'a plus de scène pinnée, Lenis n'apportait donc plus
// rien d'indispensable.
//
// Ce composant reste un simple passe-plat pour ne pas toucher au layout.

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
