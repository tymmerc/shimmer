'use client';

import { useEffect, useRef, useState } from 'react';
import { AUDIT_EMAIL } from '@/lib/audit';

type CopyState = 'idle' | 'copied' | 'selected';

const LABELS: Record<CopyState, string> = {
  idle: 'Copier l’adresse',
  copied: 'Adresse copiée',
  selected: 'Adresse sélectionnée',
};

const RESET_MS = 2_200;

/** Sélectionne le lien mailto posé à côté du bouton (même parent). */
function selectSiblingLink(button: HTMLButtonElement | null): boolean {
  const link = button?.parentElement?.querySelector('a[href^="mailto:"]');
  const sel = window.getSelection();
  if (!link || !sel) return false;
  const range = document.createRange();
  range.selectNodeContents(link);
  sel.removeAllRanges();
  sel.addRange(range);
  return true;
}

/**
 * Copie l'adresse de l'audit. Sur un ordinateur sans logiciel de messagerie,
 * un mailto seul n'ouvre rien : l'adresse doit pouvoir partir ailleurs (01/10).
 * À poser dans le même parent que le lien mailto (repli : sélection du texte).
 */
export function CopyEmail() {
  const [state, setState] = useState<CopyState>('idle');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  async function copy() {
    let next: CopyState = 'copied';
    try {
      await navigator.clipboard.writeText(AUDIT_EMAIL);
    } catch {
      // Presse-papiers refusé (iframe, http, vieux navigateur) : on sélectionne le texte.
      next = selectSiblingLink(buttonRef.current) ? 'selected' : 'idle';
    }
    setState(next);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState('idle'), RESET_MS);
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={copy}
      aria-live="polite"
      className="rounded-full border border-paper/25 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper/80 transition-colors hover:border-paper/60 hover:text-paper"
    >
      {LABELS[state]}
    </button>
  );
}
