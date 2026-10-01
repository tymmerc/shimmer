import { describe, it, expect } from 'vitest';
import {
  contrast, composite, DEFAULT_FONT, DEFAULT_TOKENS, mix, normalizeThemeInput, parseColor, parseRadius,
  resolveTokens, sanitizeFont, themeInputFromConfig, toCss, tokensCss, type Rgba, type ThemeTokens,
} from '../../../../sdk/src/theme.js';

// Le widget prend l'allure de la boutique (couleur, police, arrondis). Tout
// passe par theme.ts, pur : priorités, contrastes et sortie CSS sans échappée.

const hex = (s: string): Rgba => {
  const c = parseColor(s);
  if (!c) throw new Error(`couleur de test invalide : ${s}`);
  return c;
};
const css = (c: Rgba) => toCss(c);

describe('parseColor', () => {
  it('reads hex in 3, 4, 6 and 8 digits', () => {
    expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('#F008')).toEqual({ r: 255, g: 0, b: 0, a: 0.533 });
    expect(parseColor('#0a7f3c')).toEqual({ r: 10, g: 127, b: 60, a: 1 });
    expect(parseColor('#0a7f3c80')).toEqual({ r: 10, g: 127, b: 60, a: 0.502 });
  });

  it('reads rgb() and rgba() with commas', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('rgba(0,0,0,0.5)')).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(parseColor('RGBA( 10 , 20 , 30 , 50% )')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseColor('rgb(100%, 0%, 50%)')).toEqual({ r: 255, g: 0, b: 127.5, a: 1 });
  });

  it('reads the space syntax with an optional / alpha', () => {
    expect(parseColor('rgb(255 0 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('rgb(255 0 0 / 0.25)')).toEqual({ r: 255, g: 0, b: 0, a: 0.25 });
    expect(parseColor('rgba(1 2 3 / 40%)')).toEqual({ r: 1, g: 2, b: 3, a: 0.4 });
  });

  it('clamps out of range channels', () => {
    expect(parseColor('rgb(300, -5, 0, 2)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('knows transparent', () => {
    expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('returns null for anything else', () => {
    for (const bad of ['red', 'hsl(0 100% 50%)', '#12', '#12345', 'rgb(1, 2)', 'rgb(1 2 3 4)', 'rgb(1, 2, 3 / 1)',
      'rgb(a, b, c)', 'rgb(1 2 3 / )', '', '   ', 'rgb(1,2,3);}', 'url(x)']) {
      expect(parseColor(bad), bad).toBeNull();
    }
    expect(parseColor(undefined)).toBeNull();
    expect(parseColor(42)).toBeNull();
  });
});

describe('contrast, mix, composite, toCss', () => {
  it('computes WCAG contrast', () => {
    expect(contrast(hex('#000'), hex('#fff'))).toBeCloseTo(21, 5);
    expect(contrast(hex('#fff'), hex('#fff'))).toBeCloseTo(1, 5);
    expect(contrast(hex('#767676'), hex('#fff'))).toBeGreaterThanOrEqual(4.5);
  });

  it('mixes from a (t=0) to b (t=1)', () => {
    expect(mix(hex('#000'), hex('#fff'), 0)).toEqual(hex('#000'));
    expect(mix(hex('#000'), hex('#fff'), 1)).toEqual(hex('#fff'));
    expect(mix(hex('#000'), hex('#fff'), 0.5)).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('composites a translucent color over a background', () => {
    expect(composite(hex('rgba(0,0,0,0.5)'), hex('#fff'))).toEqual({ r: 128, g: 128, b: 128, a: 1 });
    expect(composite(hex('#f00'), hex('#fff'))).toEqual(hex('#f00'));
  });

  it('prints integer rgb() or rgba()', () => {
    expect(toCss({ r: 127.5, g: 0, b: 300, a: 1 })).toBe('rgb(128, 0, 255)');
    expect(toCss({ r: 1, g: 2, b: 3, a: 0.5 })).toBe('rgba(1, 2, 3, 0.5)');
    expect(toCss({ r: NaN, g: 2, b: 3, a: NaN })).toBe('rgb(0, 2, 3)');
  });
});

describe('sanitizeFont', () => {
  it('keeps a normal font list', () => {
    expect(sanitizeFont('Inter, sans-serif')).toBe('Inter, sans-serif');
    expect(sanitizeFont('  "Playfair Display",serif ')).toBe('"Playfair Display", serif');
    expect(sanitizeFont(DEFAULT_FONT)).toBe(DEFAULT_FONT);
    expect(sanitizeFont('Équipe Sans')).toBe('Équipe Sans');
  });

  it('quotes names that are not CSS identifiers and drops CSS-wide keywords', () => {
    expect(sanitizeFont('Font 3D, sans-serif')).toBe('"Font 3D", sans-serif');
    expect(sanitizeFont('inherit, Inter')).toBe('Inter');
  });

  it('rejects forbidden characters and unbalanced quotes', () => {
    for (const bad of ['x;}*{color:red', 'a{b}', 'Inter</style>', 'a\\b', 'x:y', 'url(x)', '"Inter', "L'Oreal", '', ' ', 'a'.repeat(201)]) {
      expect(sanitizeFont(bad), bad).toBeNull();
    }
    expect(sanitizeFont(12)).toBeNull();
  });
});

describe('parseRadius', () => {
  it('accepts numbers, px, rem and em', () => {
    expect(parseRadius(8)).toBe(8);
    expect(parseRadius('8')).toBe(8);
    expect(parseRadius('8px')).toBe(8);
    expect(parseRadius('0.5rem')).toBe(8);
    expect(parseRadius('.25em')).toBe(4);
  });

  it('clamps to 0..24', () => {
    expect(parseRadius(100)).toBe(24);
    expect(parseRadius(-3)).toBe(0);
    expect(parseRadius('3rem')).toBe(24);
  });

  it('rejects the rest', () => {
    for (const bad of ['8px;}', '50%', 'abc', '', '-2px', '8 px px', NaN, Infinity, null, {}]) {
      expect(parseRadius(bad), String(bad)).toBeNull();
    }
  });
});

describe('normalizeThemeInput', () => {
  it('keeps only valid fields', () => {
    expect(normalizeThemeInput({
      accent: '#0a7f3c', font: 'Inter', radius: '6px', theme: 'DARK', auto: false, surface: 'nope', text: 12,
      extra: 'ignored',
    })).toEqual({ accent: hex('#0a7f3c'), font: 'Inter', radius: 6, theme: 'dark', auto: false });
  });

  it('drops a fully transparent color and bad modes', () => {
    expect(normalizeThemeInput({ accent: 'transparent', theme: 'sepia', auto: 'yes' })).toEqual({});
  });

  it('survives garbage', () => {
    expect(normalizeThemeInput(null)).toEqual({});
    expect(normalizeThemeInput('x')).toEqual({});
    expect(normalizeThemeInput({ accent: 'red' }, () => { throw new Error('boom'); })).toEqual({});
  });

  it('uses the given color parser (named colors in the browser)', () => {
    const named = (s: string) => (s === 'rebeccapurple' ? { r: 102, g: 51, b: 153, a: 1 } : null);
    expect(normalizeThemeInput({ accent: 'rebeccapurple' }, named)).toEqual({ accent: { r: 102, g: 51, b: 153, a: 1 } });
  });

  it('maps the legacy config names', () => {
    expect(themeInputFromConfig({ primaryColor: '#f00', fontFamily: 'Inter', borderRadius: '4px', mode: 'light', auto: false }))
      .toEqual({ accent: '#f00', font: 'Inter', radius: '4px', theme: 'light', auto: false });
    expect(themeInputFromConfig({ accent: '#00f', primaryColor: '#f00' }).accent).toBe('#00f');
    expect(themeInputFromConfig(undefined)).toEqual({});
  });
});

describe('resolveTokens: priorities', () => {
  const A = hex('#c2410c'); // CSS de la boutique
  const B = hex('#1d4ed8'); // data-* / init
  const C = hex('#047857'); // admin
  const D = hex('#7c3aed'); // détection

  it('accent: css > explicit > remote > host', () => {
    expect(css(resolveTokens({ css: { accent: A }, explicit: { accent: B }, remote: { accent: C }, host: { accent: D } }).accent)).toBe(css(A));
    expect(css(resolveTokens({ explicit: { accent: B }, remote: { accent: C }, host: { accent: D } }).accent)).toBe(css(B));
    expect(css(resolveTokens({ remote: { accent: C }, host: { accent: D } }).accent)).toBe(css(C));
    expect(css(resolveTokens({ host: { accent: D } }).accent)).toBe(css(D));
  });

  it('accent falls back to the text color (monochrome) when nothing is known', () => {
    const t = resolveTokens({ host: { text: hex('#222222') } });
    expect(css(t.accent)).toBe(css(t.text));
    expect(css(t.text)).toBe('rgb(34, 34, 34)');
  });

  it('font: css > explicit > remote > host > default', () => {
    const all = { css: { font: 'Css' }, explicit: { font: 'Explicit' }, remote: { font: 'Remote' }, host: { font: 'Host, serif' } };
    expect(resolveTokens(all).font).toBe('Css, sans-serif');
    expect(resolveTokens({ ...all, css: {} }).font).toBe('Explicit, sans-serif');
    expect(resolveTokens({ ...all, css: {}, explicit: {} }).font).toBe('Remote, sans-serif');
    expect(resolveTokens({ host: { font: 'Host, serif' } }).font).toBe('Host, serif');
    expect(resolveTokens({}).font).toBe(DEFAULT_FONT);
  });

  it('radius: css > explicit > remote > host > 12', () => {
    const all = { css: { radius: 2 }, explicit: { radius: 4 }, remote: { radius: 6 }, host: { radius: 10 } };
    expect(resolveTokens(all).radius).toBe(2);
    expect(resolveTokens({ ...all, css: {} }).radius).toBe(4);
    expect(resolveTokens({ ...all, css: {}, explicit: {} }).radius).toBe(6);
    expect(resolveTokens({ host: { radius: 10 } }).radius).toBe(10);
    expect(resolveTokens({}).radius).toBe(12);
  });

  it('surface and text: css wins over everything', () => {
    const t = resolveTokens({
      css: { surface: hex('#fafaf5'), text: hex('#333333') },
      explicit: { theme: 'dark' },
      host: { surface: hex('#000'), text: hex('#fff') },
    });
    expect(css(t.surface)).toBe('rgb(250, 250, 245)');
    expect(css(t.text)).toBe('rgb(51, 51, 51)');
  });

  it('auto: false ignores everything detected on the page', () => {
    const host = { accent: D, font: 'Host', radius: 0, ctlRadius: 0, surface: hex('#000'), text: hex('#fff') };
    for (const t of [
      resolveTokens({ explicit: { auto: false }, host }),
      resolveTokens({ remote: { auto: false }, host }),
    ]) {
      expect(css(t.surface)).toBe('rgb(255, 255, 255)');
      expect(css(t.text)).toBe('rgb(17, 17, 17)');
      expect(css(t.accent)).toBe('rgb(17, 24, 39)');
      expect(t.font).toBe(DEFAULT_FONT);
      expect(t.radius).toBe(12);
      expect(t.radiusCtl).toBe(999);
    }
    // explicit l'emporte sur l'admin, dans les deux sens
    expect(css(resolveTokens({ explicit: { auto: true }, remote: { auto: false }, host }).accent)).toBe(css(D));
  });

  it('mode dark and light override the page surface', () => {
    const host = { surface: hex('#f4efe6'), text: hex('#2b2b2b') };
    const dark = resolveTokens({ explicit: { theme: 'dark' }, host });
    expect(css(dark.surface)).toBe('rgb(10, 10, 10)');
    expect(css(dark.text)).toBe('rgb(245, 245, 245)');
    expect(css(dark.success)).toBe('rgb(52, 211, 153)');
    const light = resolveTokens({ remote: { theme: 'light' }, host: { surface: hex('#111'), text: hex('#eee') } });
    expect(css(light.surface)).toBe('rgb(255, 255, 255)');
    expect(css(light.text)).toBe('rgb(31, 41, 55)');
    expect(css(light.success)).toBe('rgb(4, 120, 87)');
    // explicit > remote pour le mode
    expect(css(resolveTokens({ explicit: { theme: 'light' }, remote: { theme: 'dark' } }).surface)).toBe('rgb(255, 255, 255)');
  });

  it('mode auto copies the page surface (translucent composited over white)', () => {
    expect(css(resolveTokens({ host: { surface: hex('#f4efe6') } }).surface)).toBe('rgb(244, 239, 230)');
    expect(css(resolveTokens({ host: { surface: hex('rgba(0,0,0,0.5)') } }).surface)).toBe('rgb(128, 128, 128)');
  });

  it('host text is replaced when it does not read on the surface', () => {
    const t = resolveTokens({ host: { surface: hex('#ffffff'), text: hex('#dddddd') } });
    expect(css(t.text)).toBe('rgb(17, 17, 17)');
    const onDark = resolveTokens({ host: { surface: hex('#101010'), text: hex('#202020') } });
    expect(css(onDark.text)).toBe('rgb(255, 255, 255)');
  });
});

describe('resolveTokens: derived colors', () => {
  it('onAccent picks white or near black, whichever reads better', () => {
    expect(css(resolveTokens({ explicit: { accent: hex('#1d4ed8') } }).onAccent)).toBe('rgb(255, 255, 255)');
    expect(css(resolveTokens({ explicit: { accent: hex('#fde047') } }).onAccent)).toBe('rgb(17, 17, 17)');
  });

  it('accentText falls back to the text color when the accent is too pale', () => {
    const pale = resolveTokens({ explicit: { accent: hex('#fff59d') } });
    expect(contrast(pale.accent, pale.surface)).toBeLessThan(3);
    expect(css(pale.accentText)).toBe(css(pale.text));
    const strong = resolveTokens({ explicit: { accent: hex('#1d4ed8') } });
    expect(css(strong.accentText)).toBe(css(strong.accent));
  });

  it('accentLine keeps a brand pink on cream (borders only need to show)', () => {
    // Maison Pétale : bouton #e86f8a sur fond #fff7f3, 2,7:1. Le texte cède, le trait garde le rose.
    const pink = resolveTokens({ host: { accent: hex('#e86f8a'), surface: hex('#fff7f3'), text: hex('#3a2a2f') } });
    expect(css(pink.accentText)).toBe(css(pink.text));
    expect(css(pink.accentLine)).toBe('rgb(232, 111, 138)');
    // Presque invisible : le trait cède aussi.
    const ghost = resolveTokens({ explicit: { accent: hex('#fafafa') } });
    expect(css(ghost.accentLine)).toBe(css(ghost.text));
    expect(tokensCss(':host', pink)).toContain('--shm-accent-line:rgb(232, 111, 138)');
  });

  it('muted is the lightest grey that still reads at 4.5:1', () => {
    for (const surface of ['#ffffff', '#f4efe6', '#0a0a0a', '#1e3a8a']) {
      const t = resolveTokens({ css: { surface: hex(surface) } });
      expect(contrast(t.muted, t.surface), surface).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.muted, t.surface), surface).toBeLessThan(contrast(t.text, t.surface));
      const lighter = mix(t.muted, t.surface, 0.12);
      expect(contrast(lighter, t.surface), surface).toBeLessThan(4.5);
    }
  });

  it('border and hover are light mixes of the text over the surface', () => {
    const t = resolveTokens({});
    expect(css(t.border)).toBe(css(mix(t.surface, t.text, 0.14)));
    expect(css(t.hover)).toBe(css(mix(t.surface, t.text, 0.06)));
  });
});

describe('resolveTokens: radii', () => {
  it('a chosen radius of 12+ gives pill controls, below that the same radius', () => {
    expect(resolveTokens({ explicit: { radius: 16 } })).toMatchObject({ radius: 16, radiusSm: 8, radiusCtl: 999 });
    expect(resolveTokens({ remote: { radius: 4 } })).toMatchObject({ radius: 4, radiusSm: 4, radiusCtl: 4 });
    expect(resolveTokens({ css: { radius: 0 } })).toMatchObject({ radius: 0, radiusSm: 0, radiusCtl: 0 });
  });

  it('without a chosen radius, controls follow the shop button', () => {
    expect(resolveTokens({ host: { radius: 6, ctlRadius: 4 } })).toMatchObject({ radius: 6, radiusSm: 6, radiusCtl: 4 });
    expect(resolveTokens({ host: { radius: 16, ctlRadius: 999 } })).toMatchObject({ radius: 16, radiusSm: 8, radiusCtl: 999 });
    expect(resolveTokens({ host: { ctlRadius: 20 } }).radiusCtl).toBe(999);
    expect(resolveTokens({})).toMatchObject({ radius: 12, radiusSm: 8, radiusCtl: 999 });
  });

  it('a chosen radius wins over the shop button for controls too', () => {
    expect(resolveTokens({ explicit: { radius: 2 }, host: { ctlRadius: 999 } }).radiusCtl).toBe(2);
  });
});

describe('tokensCss', () => {
  const declarations = (out: string, selector: string) => {
    expect(out.startsWith(`${selector}{`)).toBe(true);
    expect(out.endsWith('}')).toBe(true);
    return out.slice(selector.length + 1, -1).split(';');
  };

  it('writes every token as a custom property', () => {
    const out = tokensCss(':host', DEFAULT_TOKENS);
    const decls = declarations(out, ':host');
    expect(decls.map((d) => d.split(':')[0])).toEqual([
      '--shm-accent', '--shm-on-accent', '--shm-accent-text', '--shm-accent-line', '--shm-surface', '--shm-text', '--shm-muted',
      '--shm-border', '--shm-hover', '--shm-success', '--shm-radius', '--shm-radius-sm', '--shm-radius-ctl', '--shm-font',
    ]);
    expect(out).toContain('--shm-surface:rgb(255, 255, 255)');
    expect(out).toContain('--shm-radius:12px');
    expect(out).toContain('--shm-radius-ctl:999px');
    expect(out).toContain(`--shm-font:${DEFAULT_FONT}`);
  });

  const injections = [
    { accent: 'red;}body{display:none', font: 'x;}*{color:red', radius: '8px;}' },
    { accent: '#fff;}</style><script>alert(1)</script>', font: 'Inter</style><img src=x onerror=alert(1)>', radius: '8px}{' },
    { accent: 'rgb(1,2,3)\\;', font: '"x;}"', radius: '1e999', surface: 'url(javascript:1)', text: 'expression(alert(1))' },
    { font: 'a\\7d b', theme: 'dark;}', auto: 'false;}' },
  ];

  it('never lets raw input out of the declaration block', () => {
    for (const raw of injections) {
      const n = normalizeThemeInput(raw);
      const tokens = resolveTokens({ css: n, explicit: n, remote: n });
      for (const selector of [':host', '.sx-wrap']) {
        const out = tokensCss(selector, tokens);
        for (const d of declarations(out, selector)) {
          expect(d).toMatch(/^--shm-[a-z-]+:[^;{}<>\\]+$/);
        }
      }
    }
  });

  it('falls back to defaults when handed broken tokens directly', () => {
    const evil = {
      ...DEFAULT_TOKENS,
      accent: 'red;}body{display:none' as unknown as Rgba,
      surface: { r: NaN, g: 0, b: 0, a: 1 },
      font: 'x;}*{color:red',
      radius: '8px;}' as unknown as number,
      radiusCtl: Infinity,
    } as ThemeTokens;
    const out = tokensCss(':host', evil);
    for (const d of declarations(out, ':host')) expect(d).toMatch(/^--shm-[a-z-]+:[^;{}<>\\]+$/);
    expect(out).toContain(`--shm-accent:${css(DEFAULT_TOKENS.accent)}`);
    expect(out).toContain(`--shm-surface:${css(DEFAULT_TOKENS.surface)}`);
    expect(out).toContain(`--shm-font:${DEFAULT_FONT}`);
    expect(out).toContain('--shm-radius:12px');
    expect(out).toContain('--shm-radius-ctl:999px');
  });

  it('refuses a selector that could open a new block', () => {
    expect(tokensCss('x{}body', DEFAULT_TOKENS).startsWith(':host{')).toBe(true);
    expect(tokensCss(null as unknown as string, null as unknown as ThemeTokens)).toBe(tokensCss(':host', DEFAULT_TOKENS));
  });
});

describe('retours de relecture (01/10)', () => {
  it('success stays readable on mid-tone surfaces, or falls back to the text color', () => {
    for (const surface of ['#8fa98f', '#f97316', '#9ca3af', '#a0a0a0', '#777777', '#b0b0b0', '#ffffff', '#0a0a0a']) {
      const t = resolveTokens({ css: { surface: hex(surface) } });
      const box = mix(t.surface, t.text, 0.06);
      const readable = Math.min(contrast(t.success, t.surface), contrast(t.success, box)) >= 4.5;
      expect(readable || css(t.success) === css(t.text)).toBe(true);
      // Sur un gris moyen (#777), même le meilleur texte plafonne à 4,48:1.
      expect(contrast(t.success, t.surface)).toBeGreaterThanOrEqual(Math.min(4.5, contrast(t.text, t.surface)));
    }
    expect(css(resolveTokens({}).success)).toBe('rgb(4, 120, 87)');
    expect(css(resolveTokens({ explicit: { theme: 'dark' } }).success)).toBe('rgb(52, 211, 153)');
  });

  it('a lone --shimmer-text must read on a surface that comes from elsewhere', () => {
    const dark = resolveTokens({ css: { text: hex('#222222') }, remote: { theme: 'dark' } });
    expect(contrast(dark.text, dark.surface)).toBeGreaterThanOrEqual(4.5);
    const fine = resolveTokens({ css: { text: hex('#222222') }, remote: { theme: 'light' } });
    expect(css(fine.text)).toBe('rgb(34, 34, 34)');
    // Fond et texte posés tous deux par l'intégrateur : on le suit.
    const both = resolveTokens({ css: { text: hex('#444444'), surface: hex('#333333') } });
    expect(css(both.text)).toBe('rgb(68, 68, 68)');
  });

  it('rem radii follow the page root font size (Dawn: 1rem = 10px)', () => {
    expect(parseRadius('0.8rem', 10)).toBe(8);
    expect(parseRadius('0.8rem')).toBe(12.8);
    expect(parseRadius('8px', 10)).toBe(8);
    expect(parseRadius('1rem', Number.NaN)).toBe(16);
    expect(normalizeThemeInput({ radius: '0.8rem' }, undefined, 10).radius).toBe(8);
    expect(resolveTokens({ explicit: normalizeThemeInput({ radius: '0.8rem' }, undefined, 10) }).radiusCtl).toBe(8);
  });
});
