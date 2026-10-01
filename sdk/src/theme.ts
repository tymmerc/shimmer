/**
 * Apparence du widget : couleurs, police et arrondis calqués sur la boutique.
 *
 * Module PUR (aucun accès au DOM), testable sous Node. Tout ce qui finit dans
 * une balise <style> (y compris celle posée dans le <head> du marchand) sort
 * d'ici, et seulement à partir de valeurs normalisées : couleurs réécrites en
 * rgb(), police filtrée, arrondis en nombres.
 *
 * Priorité, champ par champ (du plus fort au plus faible) :
 *   variables CSS de la boutique (--shimmer-*)
 *   > attributs data-* du script ou Shimmer.init({ theme })
 *   > apparence réglée dans l'admin (endpoint public)
 *   > détection sur la page de la boutique (sauf si auto === false)
 *   > valeurs Shimmer par défaut.
 */

export interface Rgba { r: number; g: number; b: number; a: number }

export type ThemeMode = 'auto' | 'light' | 'dark';

/** Entrée brute (attributs, config, réponse API, variables CSS) : rien n'est garanti. */
export interface ThemeInput {
  accent?: unknown;
  font?: unknown;
  radius?: unknown;
  theme?: unknown;
  auto?: unknown;
  surface?: unknown;
  text?: unknown;
}

/** Entrée validée : un champ absent veut dire « pas d'avis à ce niveau ». */
export interface NormalizedTheme {
  accent?: Rgba;
  font?: string;
  radius?: number;
  theme?: ThemeMode;
  auto?: boolean;
  surface?: Rgba;
  text?: Rgba;
}

/** Ce que la détection a lu sur la page de la boutique (tout est facultatif). */
export interface HostStyle {
  surface?: Rgba;
  text?: Rgba;
  accent?: Rgba;
  font?: string;
  /** Arrondi des conteneurs (px, 16 au plus). */
  radius?: number;
  /** Arrondi du bouton d'action de la boutique (px, 999 = pilule). */
  ctlRadius?: number;
}

export interface ThemeTokens {
  accent: Rgba;
  onAccent: Rgba;
  accentText: Rgba;
  /** Accent des traits (bordures, contours) : il suffit qu'il se voie. */
  accentLine: Rgba;
  surface: Rgba;
  text: Rgba;
  muted: Rgba;
  border: Rgba;
  hover: Rgba;
  success: Rgba;
  font: string;
  radius: number;
  radiusSm: number;
  radiusCtl: number;
}

export interface ResolveInput {
  css?: NormalizedTheme;
  explicit?: NormalizedTheme;
  remote?: NormalizedTheme;
  host?: HostStyle;
}

// ─── Couleurs ────────────────────────────────────────────────────────────────

const rgb = (r: number, g: number, b: number, a = 1): Rgba => ({ r, g, b, a });

export const WHITE = rgb(255, 255, 255);
const NEAR_BLACK = rgb(17, 17, 17);        // #111111
const DARK_SURFACE = rgb(10, 10, 10);      // #0a0a0a
const DARK_MODE_TEXT = rgb(245, 245, 245); // #f5f5f5
const LIGHT_MODE_TEXT = rgb(31, 41, 55);   // #1f2937
const SLATE = rgb(17, 24, 39);             // #111827
const SUCCESS_ON_DARK = rgb(52, 211, 153); // #34d399
const SUCCESS_ON_LIGHT = rgb(4, 120, 87);  // #047857

export const DEFAULT_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const DEFAULT_RADIUS = 12;
const PILL = 999;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;

const HEX_RE = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_FN_RE = /^rgba?\(([^()]*)\)$/i;
const NUM_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?%?$/i;

export function isRgba(c: unknown): c is Rgba {
  if (!c || typeof c !== 'object') return false;
  const o = c as Record<string, unknown>;
  return ['r', 'g', 'b', 'a'].every((k) => typeof o[k] === 'number' && Number.isFinite(o[k]));
}

/**
 * Lit #rgb, #rgba, #rrggbb, #rrggbbaa, rgb()/rgba() (virgules OU espaces, avec
 * « / alpha » éventuel, alpha en nombre ou en %) et « transparent ». Tout le
 * reste (noms de couleur, hsl, oklch…) renvoie null : c'est theme-dom qui
 * prend le relais dans le navigateur.
 */
export function parseColor(input: unknown): Rgba | null {
  if (typeof input !== 'string') return null;
  const s = input.trim().toLowerCase();
  if (!s || s.length > 100) return null;
  if (s === 'transparent') return rgb(0, 0, 0, 0);
  const hex = HEX_RE.exec(s);
  if (hex) return parseHex(hex[1]!);
  const fn = RGB_FN_RE.exec(s);
  return fn ? parseRgbArgs(fn[1]!) : null;
}

function parseHex(h: string): Rgba {
  const full = h.length <= 4 ? h.split('').map((c) => c + c).join('') : h;
  const byte = (i: number) => parseInt(full.slice(i, i + 2), 16);
  return rgb(byte(0), byte(2), byte(4), full.length === 8 ? round3(byte(6) / 255) : 1);
}

function parseRgbArgs(body: string): Rgba | null {
  const inner = body.trim();
  let channels: string[];
  let alpha: string | undefined;
  if (inner.includes(',')) {
    if (inner.includes('/')) return null;
    channels = inner.split(',').map((p) => p.trim());
    if (channels.length === 4) alpha = channels.pop();
  } else {
    const pieces = inner.split('/');
    if (pieces.length > 2) return null;
    channels = pieces[0]!.trim().split(/\s+/);
    if (pieces.length === 2) alpha = pieces[1]!.trim();
  }
  if (channels.length !== 3) return null;
  const values = channels.map(channelValue);
  const a = alpha === undefined ? 1 : alphaValue(alpha);
  if (a === null || values.some((v) => v === null)) return null;
  return rgb(values[0]!, values[1]!, values[2]!, a);
}

function channelValue(p: string): number | null {
  if (!NUM_RE.test(p)) return null;
  const v = parseFloat(p);
  return clamp(p.endsWith('%') ? (v * 255) / 100 : v, 0, 255);
}

function alphaValue(p: string): number | null {
  if (!NUM_RE.test(p)) return null;
  const v = parseFloat(p);
  return round3(clamp(p.endsWith('%') ? v / 100 : v, 0, 1));
}

const linear = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

/** Luminance relative WCAG (l'alpha est ignoré : composer avant si besoin). */
export function luminance(c: Rgba): number {
  return 0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
}

/** Rapport de contraste WCAG, de 1 à 21. */
export function contrast(a: Rgba, b: Rgba): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mélange : t = 0 donne a, t = 1 donne b. Canaux arrondis à l'entier. */
export function mix(a: Rgba, b: Rgba, t: number): Rgba {
  const k = clamp(Number.isFinite(t) ? t : 0, 0, 1);
  const at = (x: number, y: number) => x + (y - x) * k;
  return rgb(Math.round(at(a.r, b.r)), Math.round(at(a.g, b.g)), Math.round(at(a.b, b.b)), round3(at(a.a, b.a)));
}

/** Pose fg (éventuellement translucide) sur bg : ce que l'œil voit vraiment. */
export function composite(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a <= 0) return rgb(0, 0, 0, 0);
  const ch = (f: number, b: number) => Math.round((f * fg.a + b * bg.a * (1 - fg.a)) / a);
  return rgb(ch(fg.r, bg.r), ch(fg.g, bg.g), ch(fg.b, bg.b), round3(a));
}

/** rgb(r, g, b) ou rgba(r, g, b, a), canaux entiers. Jamais autre chose. */
export function toCss(c: Rgba): string {
  const ch = (v: number) => Math.round(clamp(Number.isFinite(v) ? v : 0, 0, 255));
  const a = clamp(Number.isFinite(c.a) ? c.a : 1, 0, 1);
  return a >= 1
    ? `rgb(${ch(c.r)}, ${ch(c.g)}, ${ch(c.b)})`
    : `rgba(${ch(c.r)}, ${ch(c.g)}, ${ch(c.b)}, ${round3(a)})`;
}

// ─── Police et arrondis ──────────────────────────────────────────────────────

const FONT_RE = /^[\p{L}\p{N} ,'"_.-]{1,200}$/u;
const IDENT_RE = /^-?[\p{L}_-][\p{L}\p{N}_-]*$/u;
const CSS_WIDE = /^(?:inherit|initial|unset|revert|revert-layer|default)$/i;
const GENERIC_FAMILY = /^(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong)$/i;

/** Découpe une liste de polices sur les virgules hors guillemets ; null si un guillemet reste ouvert. */
function splitFamilies(s: string): string[] | null {
  const out: string[] = [];
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
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (quote) return null;
  out.push(cur);
  return out;
}

/** Une entrée de la liste, réécrite proprement ; null si elle est à jeter. */
function familyEntry(raw: string): string | null {
  const e = raw.trim().replace(/\s+/g, ' ');
  if (!e || CSS_WIDE.test(e)) return null;
  const q = e[0];
  if (q === '"' || q === "'") {
    const inner = e.slice(1, -1);
    return e.length > 2 && e.endsWith(q) && !inner.includes(q) ? e : null;
  }
  if (/["']/.test(e)) return null;
  return e.split(' ').every((w) => IDENT_RE.test(w)) ? e : `"${e}"`;
}

/**
 * Liste de polices sûre à poser dans une déclaration CSS : lettres, chiffres,
 * espaces, virgules, guillemets (équilibrés), _ . - et rien d'autre. Les
 * noms qui ne sont pas des identifiants CSS valides sont mis entre guillemets.
 */
export function sanitizeFont(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (!FONT_RE.test(s)) return null;
  const families = splitFamilies(s);
  if (!families) return null;
  const kept = families.map(familyEntry).filter((f): f is string => f !== null);
  return kept.length ? kept.join(', ') : null;
}

/** Ajoute une famille générique si la liste n'en a pas (police absente = pas de Times). */
function withGenericFallback(font: string): string {
  const families = splitFamilies(font) ?? [];
  return families.some((f) => GENERIC_FAMILY.test(f.trim())) ? font : `${font}, sans-serif`;
}

/**
 * 8, "8", "8px", "0.5rem", "0.5em" : en px, borné 0..24. Sinon null. `remPx`
 * vaut la taille de police racine de la page (10 sur Dawn, html à 62,5 %),
 * 16 hors navigateur.
 */
export function parseRadius(v: unknown, remPx = 16): number | null {
  let px: number;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    px = v;
  } else if (typeof v === 'string') {
    const m = /^(\d+(?:\.\d+)?|\.\d+)\s*(px|rem|em)?$/i.exec(v.trim());
    if (!m) return null;
    const unit = Number.isFinite(remPx) && remPx > 0 ? remPx : 16;
    px = parseFloat(m[1]!) * (m[2] && m[2].toLowerCase() !== 'px' ? unit : 1);
  } else {
    return null;
  }
  return Math.round(clamp(px, 0, 24) * 10) / 10;
}

// ─── Normalisation des entrées ───────────────────────────────────────────────

const MODES: readonly ThemeMode[] = ['auto', 'light', 'dark'];

function colorField(v: unknown, parse: (s: string) => Rgba | null): Rgba | undefined {
  if (typeof v !== 'string' || !v.trim() || v.length > 120) return undefined;
  try {
    const c = parse(v.trim());
    // Une couleur entièrement transparente n'est pas un choix de thème.
    return c && isRgba(c) && c.a > 0 ? c : undefined;
  } catch {
    return undefined;
  }
}

function boolField(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

function modeField(v: unknown): ThemeMode | undefined {
  if (typeof v !== 'string') return undefined;
  const m = v.trim().toLowerCase() as ThemeMode;
  return MODES.includes(m) ? m : undefined;
}

/** Ne garde que les clés dont la valeur est définie (objet neuf). */
function defined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as T;
}

/**
 * Valide une entrée brute. Les valeurs inconnues ou invalides disparaissent
 * sans bruit. `parse` permet au navigateur d'accepter aussi les couleurs
 * nommées, hsl() ou oklch() (voir parseColorDom).
 */
export function normalizeThemeInput(raw: unknown, parse: (s: string) => Rgba | null = parseColor, remPx = 16): NormalizedTheme {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as ThemeInput;
  return defined<NormalizedTheme>({
    accent: colorField(r.accent, parse),
    surface: colorField(r.surface, parse),
    text: colorField(r.text, parse),
    font: sanitizeFont(r.font) ?? undefined,
    radius: parseRadius(r.radius, remPx) ?? undefined,
    theme: modeField(r.theme),
    auto: boolField(r.auto),
  });
}

/** Forme acceptée par Shimmer.init({ theme }), noms historiques compris. */
export interface ThemeConfigLike {
  accent?: unknown;
  primaryColor?: unknown;
  font?: unknown;
  fontFamily?: unknown;
  radius?: unknown;
  borderRadius?: unknown;
  mode?: unknown;
  auto?: unknown;
}

/** primaryColor → accent, fontFamily → font, borderRadius → radius, mode → theme. */
export function themeInputFromConfig(t: ThemeConfigLike | null | undefined): ThemeInput {
  if (!t || typeof t !== 'object') return {};
  return {
    accent: t.accent ?? t.primaryColor,
    font: t.font ?? t.fontFamily,
    radius: t.radius ?? t.borderRadius,
    theme: t.mode,
    auto: t.auto,
  };
}

// ─── Résolution ──────────────────────────────────────────────────────────────

function readableOn(surface: Rgba): Rgba {
  return contrast(NEAR_BLACK, surface) >= contrast(WHITE, surface) ? NEAR_BLACK : WHITE;
}

function resolveSurface(cssSurface: Rgba | undefined, mode: ThemeMode, hostSurface: Rgba | undefined): Rgba {
  if (cssSurface) return composite(cssSurface, WHITE);
  if (mode === 'dark') return DARK_SURFACE;
  if (mode === 'light') return WHITE;
  return hostSurface ? composite(hostSurface, WHITE) : WHITE;
}

/** Le texte voulu s'il se lit (4,5:1), sinon noir ou blanc selon le fond. */
function resolveText(mode: ThemeMode, hostText: Rgba | undefined, surface: Rgba): Rgba {
  const wanted = mode === 'dark' ? DARK_MODE_TEXT : mode === 'light' ? LIGHT_MODE_TEXT : hostText;
  if (wanted) {
    const solid = composite(wanted, surface);
    if (contrast(solid, surface) >= 4.5) return solid;
  }
  return readableOn(surface);
}

/** Le gris le plus léger (texte fondu vers le fond) qui se lit encore à 4,5:1. */
function mutedText(text: Rgba, surface: Rgba): Rgba {
  let best = text;
  for (let i = 1; i <= 18; i++) {
    const candidate = mix(text, surface, i / 20);
    if (contrast(candidate, surface) < 4.5) break;
    best = candidate;
  }
  return best;
}

/**
 * Vert de confirmation lisible sur le fond du dock ET sur l'encart du retour
 * de stock (fond hover) ; sur un fond moyen (sauge, gris, orange) où aucun
 * vert ne passe, la couleur du texte.
 */
function successColor(text: Rgba, surface: Rgba): Rgba {
  const box = mix(surface, text, 0.06);
  const score = (c: Rgba) => Math.min(contrast(c, surface), contrast(c, box));
  const best = [SUCCESS_ON_LIGHT, SUCCESS_ON_DARK].reduce((a, b) => (score(b) > score(a) ? b : a));
  return score(best) >= 4.5 ? best : text;
}

function finiteRadius(v: unknown, max: number): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? clamp(v, 0, max) : undefined;
}

function resolveRadii(fixed: number | undefined, host: HostStyle): Pick<ThemeTokens, 'radius' | 'radiusSm' | 'radiusCtl'> {
  const chosen = finiteRadius(fixed, 24);
  const radius = chosen ?? finiteRadius(host.radius, 24) ?? DEFAULT_RADIUS;
  const hostCtl = finiteRadius(host.ctlRadius, PILL);
  const radiusCtl = chosen !== undefined
    ? (radius >= 12 ? PILL : radius)
    : hostCtl !== undefined ? (hostCtl >= 16 ? PILL : hostCtl) : PILL;
  return { radius, radiusSm: Math.min(radius, 8), radiusCtl };
}

/**
 * Calcule les jetons finaux à partir des quatre sources (voir l'en-tête pour
 * la priorité). Pur : mêmes entrées, mêmes jetons.
 */
export function resolveTokens(input: ResolveInput = {}): ThemeTokens {
  const css = input.css ?? {};
  const explicit = input.explicit ?? {};
  const remote = input.remote ?? {};
  const autoOn = explicit.auto ?? remote.auto ?? true;
  const host: HostStyle = autoOn ? input.host ?? {} : {};
  const mode: ThemeMode = explicit.theme ?? remote.theme ?? 'auto';

  const surface = resolveSurface(css.surface, mode, host.surface);
  // --shimmer-text seul tombe sur un fond venu d'ailleurs (mode, détection) :
  // il doit s'y lire. Avec --shimmer-surface, l'intégrateur tient les deux.
  const cssText = css.text ? composite(css.text, surface) : undefined;
  const text = cssText && (css.surface || contrast(cssText, surface) >= 4.5)
    ? cssText
    : resolveText(mode, host.text, surface);
  // Sans accent connu : sobre, la couleur du texte (look monochrome). Hors
  // détection, l'ardoise #111827, sauf si elle disparaît sur un fond sombre.
  const fallbackAccent = autoOn || contrast(SLATE, surface) < 3 ? text : SLATE;
  const accent = composite(css.accent ?? explicit.accent ?? remote.accent ?? host.accent ?? fallbackAccent, surface);
  const font = sanitizeFont(css.font ?? explicit.font ?? remote.font ?? host.font) ?? DEFAULT_FONT;

  return {
    accent,
    onAccent: contrast(WHITE, accent) >= contrast(NEAR_BLACK, accent) ? WHITE : NEAR_BLACK,
    accentText: contrast(accent, surface) >= 3 ? accent : text,
    // Un trait n'a pas à être lu : le rose d'un bouton sur fond crème (2,7:1)
    // reste la marque de la boutique. Seul un accent presque invisible cède.
    accentLine: contrast(accent, surface) >= 1.8 ? accent : text,
    surface,
    text,
    muted: mutedText(text, surface),
    border: mix(surface, text, 0.14),
    hover: mix(surface, text, 0.06),
    success: successColor(text, surface),
    font: withGenericFallback(font),
    ...resolveRadii(css.radius ?? explicit.radius ?? remote.radius, host),
  };
}

// ─── Sortie CSS ──────────────────────────────────────────────────────────────

type TokenName = keyof ThemeTokens;

/** Ordre de sortie : la police en dernier (la seule valeur textuelle). */
const TOKEN_VARS: readonly [TokenName, string][] = [
  ['accent', '--shm-accent'],
  ['onAccent', '--shm-on-accent'],
  ['accentText', '--shm-accent-text'],
  ['accentLine', '--shm-accent-line'],
  ['surface', '--shm-surface'],
  ['text', '--shm-text'],
  ['muted', '--shm-muted'],
  ['border', '--shm-border'],
  ['hover', '--shm-hover'],
  ['success', '--shm-success'],
  ['radius', '--shm-radius'],
  ['radiusSm', '--shm-radius-sm'],
  ['radiusCtl', '--shm-radius-ctl'],
  ['font', '--shm-font'],
];

const FORBIDDEN = /[;{}<>\\]/;
const SELECTOR_RE = /^[\w .#:()-]{1,60}$/;

function tokenValue(name: TokenName, v: unknown): string | null {
  if (name === 'font') return sanitizeFont(v);
  if (name === 'radius' || name === 'radiusSm' || name === 'radiusCtl') {
    const n = finiteRadius(v, name === 'radiusCtl' ? PILL : 24);
    return n === undefined ? null : `${Math.round(n * 10) / 10}px`;
  }
  return isRgba(v) ? toCss(v) : null;
}

export const DEFAULT_TOKENS: ThemeTokens = resolveTokens();

/**
 * « selector{--shm-accent:…;…} ». Chaque valeur est reconstruite depuis le
 * jeton normalisé (rgb(), nombre + px, police filtrée), puis un dernier
 * contrôle remplace par le défaut toute valeur contenant ; { } < > ou \ :
 * aucune entrée ne peut sortir du bloc de déclarations ni de la balise.
 */
export function tokensCss(selector: string, tokens: ThemeTokens): string {
  const sel = typeof selector === 'string' && SELECTOR_RE.test(selector) ? selector.trim() : ':host';
  const source = (tokens && typeof tokens === 'object' ? tokens : DEFAULT_TOKENS) as unknown as Record<string, unknown>;
  const decls = TOKEN_VARS.map(([name, cssVar]) => {
    const value = tokenValue(name, source[name]);
    const safe = value && !FORBIDDEN.test(value) ? value : tokenValue(name, DEFAULT_TOKENS[name]);
    return `${cssVar}:${safe}`;
  });
  return `${sel}{${decls.join(';')}}`;
}
