/**
 * Apparence du widget choisie par la boutique (clé `appearance` du config).
 *
 *   accent  couleur d'accent, '#rrggbb' seulement côté serveur
 *   font    liste de polices CSS, sans caractère capable de sortir de la
 *           déclaration (pas de ; { } < > \ ( ) :)
 *   radius  arrondi en px, entier de 0 à 24
 *   theme   'auto' | 'light' | 'dark'
 *   auto    true (par défaut) : le SDK copie le look de la boutique
 *
 * Ces valeurs finissent dans la feuille de style du widget, sur la vitrine :
 * on les revalide à la lecture, le config en base peut avoir été écrit par un
 * autre chemin (script, ancienne version, édition SQL).
 */

import { z } from 'zod';

const HEX6_RE = /^#[0-9a-fA-F]{6}$/;
const FONT_RE = /^[\p{L}\p{N} ,'"_.-]{1,120}$/u;
const CSS_WIDE_RE = /^(?:inherit|initial|unset|revert|revert-layer|default)$/i;

/**
 * Même règle que sanitizeFont du SDK (sdk/src/theme.ts), sinon l'admin
 * enregistre une police que la vitrine jette sans rien dire : guillemets
 * équilibrés, nom entre guillemets bien fermé, pas de guillemet dans un nom
 * nu, pas de mot-clé CSS global (inherit, initial...).
 */
export function isCleanFontList(s: string): boolean {
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
  return entries.every((raw) => {
    const e = raw.trim();
    if (!e || CSS_WIDE_RE.test(e)) return false;
    const q = e[0];
    if (q === '"' || q === "'") return e.length > 2 && e.endsWith(q) && !e.slice(1, -1).includes(q);
    return !/["']/.test(e);
  });
}

const fieldSchemas = {
  accent: z.string().regex(HEX6_RE),
  font: z.string().trim().min(1).max(120).regex(FONT_RE).refine(isCleanFontList),
  radius: z.number().int().min(0).max(24),
  theme: z.enum(['auto', 'light', 'dark']),
  auto: z.boolean(),
} as const;

type FieldName = keyof typeof fieldSchemas;
const FIELD_NAMES = Object.keys(fieldSchemas) as FieldName[];

export const appearanceSchema = z.object({
  accent: fieldSchemas.accent.optional(),
  font: fieldSchemas.font.optional(),
  radius: fieldSchemas.radius.optional(),
  theme: fieldSchemas.theme.optional(),
  auto: fieldSchemas.auto.optional(),
}).strict();

export type Appearance = z.infer<typeof appearanceSchema>;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Apparence publiable à partir du config d'une boutique : seuls les champs du
 * contrat, chacun revalidé à part (un champ invalide est retiré, les autres
 * restent). Ne lève jamais d'erreur, renvoie {} si rien n'est exploitable.
 */
export function publicAppearance(config: unknown): Appearance {
  if (!isPlainObject(config)) return {};
  const raw = config.appearance;
  if (!isPlainObject(raw)) return {};

  const entries = FIELD_NAMES.flatMap((name) => {
    if (!Object.prototype.hasOwnProperty.call(raw, name)) return [];
    const parsed = fieldSchemas[name].safeParse(raw[name]);
    return parsed.success ? [[name, parsed.data] as const] : [];
  });
  return Object.fromEntries(entries) as Appearance;
}
