/**
 * Apparence du widget : types, validations et jetons d'aperçu partagés par la
 * section admin « Apparence » et son aperçu. Mêmes règles que le serveur
 * (clé config.appearance) : accent en #rrggbb, police sans ; { } < > \ ( ) :,
 * arrondi entier de 0 à 24 px, thème auto | light | dark.
 */

export type AppearanceTheme = 'auto' | 'light' | 'dark';

export interface Appearance {
  accent?: string;
  font?: string;
  radius?: number;
  theme?: AppearanceTheme;
  auto?: boolean;
}

/** État du formulaire : null ou chaîne vide = valeur automatique. */
export interface AppearanceForm {
  auto: boolean;
  accent: string | null;
  font: string;
  radius: number | null;
  theme: AppearanceTheme;
}

export const FONT_RE = /^[\p{L}\p{N} ,'"_.-]{1,120}$/u;
export const RADIUS_MIN = 0;
export const RADIUS_MAX = 24;

export const DEFAULT_FORM: AppearanceForm = {
  auto: true,
  accent: null,
  font: '',
  radius: null,
  theme: 'auto',
};

// Valeurs neutres de l'aperçu quand un réglage reste automatique : on ne
// connaît pas le thème de la boutique depuis l'admin.
export const STANDIN_RADIUS = 12;
const STANDIN_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const STANDIN_ACCENT_LIGHT = '#525252';
const STANDIN_ACCENT_DARK = '#d4d4d4';

export function isTheme(v: unknown): v is AppearanceTheme {
  return v === 'auto' || v === 'light' || v === 'dark';
}

/** « 0055FF », « #05f » ou « #0055ff » donnent « #0055ff ». Sinon null. */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    const full = raw.split('').map(c => c + c).join('');
    return `#${full.toLowerCase()}`;
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`;
  return null;
}

const CSS_WIDE_RE = /^(?:inherit|initial|unset|revert|revert-layer|default)$/i;

/**
 * Même règle que l'API (isCleanFontList) et que le SDK (sanitizeFont) :
 * guillemets équilibrés, nom entre guillemets bien fermé, pas de guillemet
 * dans un nom nu, pas de mot-clé CSS global.
 */
function isCleanFontList(s: string): boolean {
  const entries: string[] = [];
  let cur = '';
  let quote: string | null = null;
  for (const ch of s) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === ',') {
      entries.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (quote) return false;
  entries.push(cur);
  return entries.every(raw => {
    const e = raw.trim();
    if (!e || CSS_WIDE_RE.test(e)) return false;
    const q = e[0];
    if (q === '"' || q === "'") return e.length > 2 && e.endsWith(q) && !e.slice(1, -1).includes(q);
    return !/["']/.test(e);
  });
}

/** Police vide = automatique, donc valide. */
export function isValidFont(input: string): boolean {
  const v = input.trim();
  return v === '' || (FONT_RE.test(v) && isCleanFontList(v));
}

export function isValidRadius(v: number): boolean {
  return Number.isInteger(v) && v >= RADIUS_MIN && v <= RADIUS_MAX;
}

/** Lit config.appearance sans faire confiance au contenu : on ne garde que les champs valides. */
export function parseAppearance(raw: unknown): Appearance {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const accent = typeof r.accent === 'string' ? normalizeHex(r.accent) : null;
  const font = typeof r.font === 'string' && r.font.trim() && isValidFont(r.font) ? r.font.trim() : null;
  const radius = typeof r.radius === 'number' && isValidRadius(r.radius) ? r.radius : null;
  return {
    ...(accent ? { accent } : {}),
    ...(font ? { font } : {}),
    ...(radius !== null ? { radius } : {}),
    ...(isTheme(r.theme) ? { theme: r.theme } : {}),
    ...(typeof r.auto === 'boolean' ? { auto: r.auto } : {}),
  };
}

export function formFromAppearance(a: Appearance): AppearanceForm {
  return {
    auto: a.auto ?? true,
    accent: a.accent ?? null,
    font: a.font ?? '',
    radius: a.radius ?? null,
    theme: a.theme ?? 'auto',
  };
}

/** Corps envoyé au serveur : seulement les champs réglés, plus auto et theme. */
export function payloadFromForm(f: AppearanceForm): Appearance {
  const accent = f.accent ? normalizeHex(f.accent) : null;
  const font = f.font.trim();
  return {
    ...(accent ? { accent } : {}),
    ...(font && isValidFont(font) ? { font } : {}),
    ...(f.radius !== null && isValidRadius(f.radius) ? { radius: f.radius } : {}),
    theme: f.theme,
    auto: f.auto,
  };
}

export function hasAutomaticValue(a: Appearance): boolean {
  return a.accent === undefined || a.font === undefined || a.radius === undefined || (a.theme ?? 'auto') === 'auto';
}

// ─── Jetons de l'aperçu ─────────────────────────────────────

export interface PreviewTokens {
  accent: string;
  accentText: string;
  accentLine: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  divider: string;
  placeholder: string;
  font: string;
  radius: number;
  radiusSm: number;
  radiusCtl: number;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const LIGHT = { surface: '#ffffff', text: '#1f2937', muted: '#6b7280', border: 'rgba(0,0,0,0.09)', divider: '#f1f2f4', placeholder: '#f3f4f6' };
// Mêmes fonds et textes que le SDK en mode sombre (#0a0a0a / #f5f5f5).
const DARK = { surface: '#0a0a0a', text: '#f5f5f5', muted: '#a3a3a3', border: 'rgba(255,255,255,0.14)', divider: '#1f1f1f', placeholder: '#1a1a1a' };
// Accent Shimmer quand la détection est coupée et qu'aucun accent n'est choisi.
const SHIMMER_ACCENT = '#111827';

export function previewTokens(a: Appearance): PreviewTokens {
  const dark = a.theme === 'dark';
  const base = dark ? DARK : LIGHT;
  const auto = a.auto ?? true;
  // Détection coupée : comme le SDK, l'ardoise Shimmer, ou la couleur du texte
  // si elle disparaît sur le fond sombre. Sinon un neutre en attendant le thème.
  const fallback = auto
    ? (dark ? STANDIN_ACCENT_DARK : STANDIN_ACCENT_LIGHT)
    : (contrastRatio(SHIMMER_ACCENT, base.surface) >= 3 ? SHIMMER_ACCENT : base.text);
  const accent = a.accent ?? fallback;
  const radius = a.radius ?? STANDIN_RADIUS;
  // Accent illisible sur le fond (jaune sur blanc, bleu nuit sur noir) : le
  // texte reprend la couleur du texte, l'accent reste sur les bordures.
  const accentText = contrastRatio(accent, base.surface) >= 3 ? accent : base.text;
  // Bordures : il suffit qu'elles se voient (même seuil que le SDK, 1,8:1).
  const accentLine = contrastRatio(accent, base.surface) >= 1.8 ? accent : base.text;
  return {
    ...base,
    accent,
    accentText,
    accentLine,
    font: a.font ? `${a.font}, ${STANDIN_FONT}` : STANDIN_FONT,
    radius,
    radiusSm: Math.min(radius, 8),
    // Arrondi choisi : pilule à partir de 12 px, comme le SDK. Automatique :
    // le SDK suit le bouton de la boutique, l'aperçu montre une pilule.
    radiusCtl: a.radius === undefined || radius >= 12 ? 999 : radius,
  };
}
