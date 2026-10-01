'use client';

// Noms ::part() exposés par le dock et le chat (contrat SDK, ne pas renommer).
const PARTS = [
  'dock', 'results', 'item', 'item-image', 'item-name', 'item-desc', 'item-price', 'question', 'chips', 'chip',
  'footer', 'native-link', 'close', 'empty', 'restock', 'restock-input', 'restock-button', 'bubble', 'chat',
  'chat-header', 'chat-messages', 'message', 'message-user', 'message-assistant', 'product-card', 'chat-input',
  'chat-send', 'track-link',
] as const;

const EXAMPLE = `/* Dans le CSS de votre thème */
:root { --shimmer-accent: #0055ff; --shimmer-radius: 6px; }
#shimmer-root::part(chip) { text-transform: uppercase; }
.sx-wrap .sx-add { border-radius: 0; }`;

const code = 'rounded bg-neutral-50 px-1';

export function AppearanceIntegrators() {
  return (
    <details className="rounded-xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <summary className="cursor-pointer select-none text-sm font-medium text-neutral-700 hover:text-neutral-900">
        Pour les intégrateurs
      </summary>
      <div className="mt-4 space-y-2 text-xs leading-relaxed text-neutral-500">
        <p>
          Les attributs <code className={code}>data-accent</code>, <code className={code}>data-font</code>,{' '}
          <code className={code}>data-radius</code> et <code className={code}>data-theme</code> de la balise script
          (ou <code className={code}>Shimmer.init</code>) passent avant les réglages de cette page.
        </p>
        <p>
          Les variables <code className={code}>--shimmer-accent</code>, <code className={code}>--shimmer-font</code>,{' '}
          <code className={code}>--shimmer-radius</code>, <code className={code}>--shimmer-surface</code> et{' '}
          <code className={code}>--shimmer-text</code> posées dans le CSS de la boutique passent avant tout le reste.
        </p>
        <p>
          Le dock et le chat vivent dans <code className={code}>#shimmer-root</code> (Shadow DOM) : on les cible avec{' '}
          <code className={code}>::part()</code>. Les cartes de cross-sell sont dans la page, avec des classes{' '}
          <code className={code}>.sx-*</code> stables (<code className={code}>.sx-card</code>,{' '}
          <code className={code}>.sx-name</code>, <code className={code}>.sx-price</code>,{' '}
          <code className={code}>.sx-add</code>).
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {PARTS.map(p => (
          <code key={p} className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-xs text-neutral-600">
            {p}
          </code>
        ))}
      </div>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-700">
        {EXAMPLE}
      </pre>
    </details>
  );
}
