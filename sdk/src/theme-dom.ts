/**
 * Côté navigateur de l'apparence : lecture des couleurs que seul le moteur
 * CSS sait interpréter, détection du style de la boutique, et pose des jetons
 * dans les deux feuilles (Shadow DOM du dock et <head> pour le cross-sell).
 * Rien ici ne doit casser la page : chaque lecture est protégée, un résultat
 * partiel est accepté.
 */

import {
  composite, contrast, normalizeThemeInput, parseColor, resolveTokens, sanitizeFont, tokensCss, WHITE,
  type HostStyle, type NormalizedTheme, type Rgba, type ThemeInput,
} from './theme';

export type { HostStyle } from './theme';

const SHADOW_STYLE_ID = 'shimmer-theme';
const HEAD_STYLE_ID = 'shimmer-sdk-theme';
const PILL = 999;

/** Boutons d'action typiques (Shopify, WooCommerce, thèmes courants), du plus sûr au plus vague. */
const CTA_SELECTORS = [
  '[name="add"]', '.product-form__submit', '.single_add_to_cart_button', '.add_to_cart_button',
  'button.button--primary', '.btn--primary', '.btn-primary', '.button.alt', '.wp-element-button',
  '.shopify-payment-button__button', 'button[type="submit"]', '.button', 'a.button',
];
const MAX_CTA_SCAN = 40;
const MAX_LINK_SCAN = 20;
/** Police par défaut du navigateur : la boutique n'en a pas choisi, on garde la nôtre. */
const UA_DEFAULT_FONT = /^(?:serif|"?times new roman"?|times|-webkit-standard)$/i;
/** Ce qui est à nous dans la page : ne jamais le prendre pour le style de la boutique. */
const OWN_UI = '#shimmer-root, .sx-wrap';

function attempt<T>(fn: () => T): T | undefined {
  try { return fn(); } catch { return undefined; }
}

// ─── Couleurs ────────────────────────────────────────────────────────────────

let ctx2d: CanvasRenderingContext2D | null | undefined;

function canvas2d(): CanvasRenderingContext2D | null {
  if (ctx2d !== undefined) return ctx2d;
  ctx2d = attempt(() => {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    return c.getContext('2d', { willReadFrequently: true });
  }) ?? null;
  return ctx2d;
}

/**
 * parseColor d'abord ; sinon le moteur du navigateur via un canvas 1x1
 * (couleurs nommées, hsl(), oklch(), color()…). Une chaîne invalide laisse
 * fillStyle inchangé : deux sentinelles différentes le révèlent. Ne lève jamais.
 */
export function parseColorDom(input: unknown): Rgba | null {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (!s || s.length > 100) return null;
  const direct = parseColor(s);
  if (direct) return direct;
  return attempt(() => {
    const ctx = canvas2d();
    if (!ctx) return null;
    ctx.fillStyle = '#000001';
    ctx.fillStyle = s;
    const first = String(ctx.fillStyle);
    ctx.fillStyle = '#000002';
    ctx.fillStyle = s;
    if (String(ctx.fillStyle) !== first) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return { r: d[0]!, g: d[1]!, b: d[2]!, a: Math.round((d[3]! / 255) * 1000) / 1000 };
  }) ?? null;
}

/** Variables publiques posées par la boutique (sur :root ou #shimmer-root). */
export function readCssOverrides(el: Element | null | undefined): ThemeInput {
  if (!el) return {};
  return attempt(() => {
    const cs = getComputedStyle(el);
    const read = (name: string) => cs.getPropertyValue(name).trim() || undefined;
    return {
      accent: read('--shimmer-accent'),
      font: read('--shimmer-font'),
      radius: read('--shimmer-radius'),
      surface: read('--shimmer-surface'),
      text: read('--shimmer-text'),
    };
  }) ?? {};
}

// ─── Détection du style de la boutique ───────────────────────────────────────

function isShown(el: Element, cs: CSSStyleDeclaration): boolean {
  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function isDisabled(el: Element): boolean {
  return (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true';
}

/** Rayon du coin haut gauche en px (999 = pilule), ou undefined si illisible. */
function cornerPx(el: Element, cs: CSSStyleDeclaration): number | undefined {
  const first = (cs.borderTopLeftRadius || '').trim().split(/\s+/)[0] ?? '';
  const n = parseFloat(first);
  if (!Number.isFinite(n) || n < 0) return undefined;
  if (first.endsWith('%')) return n > 0 ? PILL : 0;
  const h = el.getBoundingClientRect().height;
  return h > 0 && n >= h / 2 ? PILL : n;
}

function detectSurface(doc: Document, win: Window): Rgba {
  for (const el of [doc.body, doc.documentElement]) {
    if (!el) continue;
    const bg = parseColorDom(win.getComputedStyle(el).backgroundColor);
    if (bg && bg.a >= 0.5) return composite(bg, WHITE);
  }
  return WHITE;
}

/** Le bouton d'action principal : sa couleur devient l'accent, son arrondi celui des contrôles. */
function detectCta(doc: Document, win: Window, surface: Rgba): { accent: Rgba; ctlRadius?: number } | undefined {
  const seen = new Set<Element>();
  let budget = MAX_CTA_SCAN;
  for (const sel of CTA_SELECTORS) {
    const list = attempt(() => doc.querySelectorAll(sel));
    if (!list) continue;
    for (let i = 0; i < list.length; i++) {
      const el = list[i]!;
      if (seen.has(el)) continue;
      if (budget-- <= 0) return undefined;
      seen.add(el);
      if (el.closest(OWN_UI) || isDisabled(el)) continue;
      const cs = win.getComputedStyle(el);
      if (!isShown(el, cs)) continue;
      const bg = parseColorDom(cs.backgroundColor);
      if (!bg || bg.a < 0.5) continue;
      const solid = composite(bg, surface);
      if (contrast(solid, surface) < 1.3) continue;
      return { accent: solid, ctlRadius: cornerPx(el, cs) };
    }
  }
  return undefined;
}

/** Repli : une couleur de lien qui tranche avec le texte et se lit sur le fond. */
function detectLinkAccent(doc: Document, win: Window, surface: Rgba, text: Rgba | undefined): Rgba | undefined {
  const ref = text ?? { r: 17, g: 17, b: 17, a: 1 };
  const seen = new Set<Element>();
  let budget = MAX_LINK_SCAN;
  for (const sel of ['main a[href]', 'a[href]']) {
    const list = doc.querySelectorAll(sel);
    for (let i = 0; i < list.length; i++) {
      const el = list[i]!;
      if (seen.has(el)) continue;
      if (budget-- <= 0) return undefined;
      seen.add(el);
      if (el.closest(OWN_UI)) continue;
      const cs = win.getComputedStyle(el);
      if (!isShown(el, cs)) continue;
      const c = parseColorDom(cs.color);
      if (!c || c.a < 0.5) continue;
      const solid = composite(c, surface);
      if (contrast(solid, ref) > 1.5 && contrast(solid, surface) >= 3) return solid;
    }
  }
  return undefined;
}

/**
 * Arrondi de la barre de recherche. Beaucoup de thèmes posent un champ nu
 * (sans fond ni bordure) dans une boîte arrondie : on remonte alors de deux
 * parents au plus, tant que la boîte reste de la taille du champ.
 */
function anchorRadius(anchor: Element, win: Window): number | undefined {
  const h0 = anchor.getBoundingClientRect().height;
  let el: Element | null = anchor;
  for (let depth = 0; el && depth < 3; depth++, el = el.parentElement) {
    if (depth > 0 && el.getBoundingClientRect().height > h0 * 2.5) break;
    const cs = win.getComputedStyle(el);
    const bg = parseColorDom(cs.backgroundColor);
    const bordered = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
    if ((bg && bg.a >= 0.5) || bordered) {
      const r = cornerPx(el, cs);
      return r === undefined ? undefined : Math.min(r, 16);
    }
  }
  const r = cornerPx(anchor, win.getComputedStyle(anchor));
  return r === undefined ? undefined : Math.min(r, 16);
}

/**
 * Lit l'allure de la boutique : fond, texte, police, accent (bouton d'action
 * ou, à défaut, couleur des liens) et arrondis. Chaque morceau est isolé.
 */
export function detectHostStyle(doc: Document, anchor?: Element | null): HostStyle {
  const win = doc.defaultView;
  if (!win || !doc.body) return {};
  const surface = attempt(() => detectSurface(doc, win)) ?? WHITE;
  const bodyStyle = attempt(() => win.getComputedStyle(doc.body));
  const textRaw = bodyStyle ? parseColorDom(bodyStyle.color) : null;
  const text = textRaw ? composite(textRaw, surface) : undefined;
  const fontRaw = bodyStyle?.fontFamily?.trim() ?? '';
  const font = fontRaw && !UA_DEFAULT_FONT.test(fontRaw) ? sanitizeFont(fontRaw) ?? undefined : undefined;
  const cta = attempt(() => detectCta(doc, win, surface));
  const accent = cta?.accent ?? attempt(() => detectLinkAccent(doc, win, surface, text));
  const ctaRadius = cta?.ctlRadius === undefined ? undefined : Math.min(cta.ctlRadius, 16);
  const radius = (anchor ? attempt(() => anchorRadius(anchor, win)) : undefined) ?? ctaRadius;
  const out: HostStyle = { surface, text, accent, font, radius, ctlRadius: cta?.ctlRadius };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as HostStyle;
}

// ─── Pose des jetons ─────────────────────────────────────────────────────────

function writeStyle(parent: Node & ParentNode, existing: HTMLStyleElement | null, id: string, css: string): HTMLStyleElement {
  if (existing && existing.isConnected && existing.parentNode === parent) {
    if (existing.textContent !== css) existing.textContent = css;
    return existing;
  }
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  parent.appendChild(style);
  return style;
}

/**
 * Tient les trois sources du thème (config, admin, page) et réécrit les deux
 * balises de jetons. Réappliquer ne coûte qu'une comparaison de chaînes quand
 * rien n'a changé.
 */
/** Taille de police racine de la page, pour les arrondis en rem (10 px sur Dawn). */
function rootFontPx(): number {
  const px = attempt(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  return px && Number.isFinite(px) && px > 0 ? px : 16;
}

export class ThemeController {
  private explicit: NormalizedTheme;
  private remote: NormalizedTheme = {};
  private host: HostStyle = {};
  private anchor: Element | null = null;
  /** Balises posées par ce contrôleur : retirées telles quelles au destroy(). */
  private shadowStyle: HTMLStyleElement | null = null;
  private headStyle: HTMLStyleElement | null = null;

  constructor(private readonly getRoot: () => ShadowRoot, explicit: ThemeInput = {}) {
    this.explicit = normalizeThemeInput(explicit, parseColorDom, rootFontPx());
  }

  /** Thème venu du script ou de Shimmer.init({ theme }). */
  setExplicit(raw: ThemeInput): void {
    this.explicit = normalizeThemeInput(raw, parseColorDom, rootFontPx());
    this.refresh();
  }

  /** Apparence réglée dans l'admin (endpoint public, hex et police déjà filtrés côté API). */
  setRemote(raw: unknown): void {
    this.remote = normalizeThemeInput(raw, parseColor);
    this.apply();
    this.markReady();
  }

  /**
   * L'apparence de l'admin est arrivée (ou ne viendra pas) : la bulle du chat
   * peut se montrer sans changer de couleur sous les yeux du visiteur.
   */
  markReady(): void {
    attempt(() => this.getRoot().host.setAttribute('data-shm-ready', ''));
  }

  /** Relit la page (avec la barre de recherche réellement utilisée) puis réapplique. */
  refresh(anchor?: Element | null): void {
    if (anchor) this.anchor = anchor;
    const autoOn = this.explicit.auto ?? this.remote.auto ?? true;
    this.host = autoOn ? attempt(() => detectHostStyle(document, this.anchor)) ?? {} : {};
    this.apply();
  }

  apply(): void {
    try {
      const root = this.getRoot();
      const css = normalizeThemeInput(readCssOverrides(root.host), parseColorDom, rootFontPx());
      const tokens = resolveTokens({ css, explicit: this.explicit, remote: this.remote, host: this.host });
      this.shadowStyle = writeStyle(root, this.shadowStyle, SHADOW_STYLE_ID, tokensCss(':host', tokens));
      this.headStyle = writeStyle(document.head, this.headStyle, HEAD_STYLE_ID, tokensCss('.sx-wrap', tokens));
    } catch (e) {
      console.warn('[shimmer] thème', e);
    }
  }

  destroy(): void {
    this.shadowStyle?.remove();
    this.headStyle?.remove();
    this.shadowStyle = null;
    this.headStyle = null;
  }
}
