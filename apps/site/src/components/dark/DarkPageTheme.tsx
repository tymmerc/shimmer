'use client';

// La landing est sombre mais le layout racine (partagé avec les pages
// claires) pose un fond paper sur html/body. Sans ce composant, l'overscroll
// (bounce macOS) et la zone de chargement flashent en BLANC au-dessus d'une
// page noire. On force le fond sombre au niveau du document tant que la
// landing est montée, et on restaure en quittant.

import { useEffect } from 'react';

export function DarkPageTheme() {
  useEffect(() => {
    const html = document.documentElement;
    const prevBg = html.style.background;
    const prevScheme = html.style.colorScheme;
    const prevBodyBg = document.body.style.background;
    html.style.background = '#0d0b14';
    html.style.colorScheme = 'dark';
    document.body.style.background = '#0d0b14';
    return () => {
      html.style.background = prevBg;
      html.style.colorScheme = prevScheme;
      document.body.style.background = prevBodyBg;
    };
  }, []);

  return null;
}
