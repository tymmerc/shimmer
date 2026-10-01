'use client';

import type { CSSProperties } from 'react';
import { type Appearance, hasAutomaticValue, previewTokens } from './appearance';

// Maquette statique du dock (pas de vrai widget ici) : mêmes blocs que le SDK,
// résultats en haut, question du vendeur et suggestions en bas.
const ITEMS = [
  { name: 'Sac cabas en lin', desc: 'Lin lavé, anses en cuir, 40 x 45 cm', price: '39,00 €' },
  { name: 'Pochette zippée', desc: 'Coton bio, doublure imprimée', price: '18,50 €' },
  { name: 'Tote bag brodé', desc: 'Broderie main, grandes anses', price: '24,00 €' },
] as const;

const CHIPS = ['Pour tous les jours', 'Pour offrir'] as const;

export function AppearancePreview({ appearance }: { appearance: Appearance }) {
  const t = previewTokens(appearance);
  const auto = appearance.auto ?? true;

  const dock: CSSProperties = {
    background: t.surface,
    color: t.text,
    fontFamily: t.font,
    fontSize: 14,
    lineHeight: 1.5,
    borderRadius: t.radius,
    border: `1px solid ${t.border}`,
    boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
    overflow: 'hidden',
  };
  const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

  return (
    <div>
      <div className="rounded-xl bg-neutral-100 p-4">
        <div className="mb-2 max-w-[420px] rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-400">
          sac en lin
        </div>
        <div className="max-w-[420px]" style={dock}>
          <div style={{ padding: 6 }}>
            {ITEMS.map(item => (
              <div key={item.name} style={{ display: 'flex', gap: 12, padding: 10, borderRadius: t.radiusSm, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: t.radiusSm, background: t.placeholder }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...ellipsis, fontWeight: 600 }}>{item.name}</div>
                  <div style={{ ...ellipsis, fontSize: 12, color: t.muted }}>{item.desc}</div>
                </div>
                <div style={{ fontWeight: 700, color: t.accentText, whiteSpace: 'nowrap' }}>{item.price}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${t.divider}` }}>
            <div style={{ padding: '10px 14px 4px', color: t.accentText }}>
              Plutôt pour vous ou pour offrir ?
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '6px 14px 8px' }}>
              {CHIPS.map(chip => (
                <span
                  key={chip}
                  style={{ border: `1px solid ${t.accentLine}`, color: t.accentText, borderRadius: t.radiusCtl, padding: '6px 12px', fontSize: 13 }}
                >
                  {chip}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 14px 10px', fontSize: 12, color: t.muted }}>
              <span>Voir les résultats classiques →</span>
              <span>Fermer</span>
            </div>
          </div>
        </div>
      </div>
      {hasAutomaticValue(appearance) && (
        <p className="mt-3 text-xs text-neutral-400">
          {auto
            ? 'Sur votre boutique, les valeurs automatiques viennent de votre thème.'
            : 'Style de la boutique désactivé : les valeurs automatiques prennent le style Shimmer par défaut.'}
        </p>
      )}
    </div>
  );
}
