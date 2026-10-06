import { setDefaultVariant, soldOutReply, type Variant } from "../variant";
import { BIJOUX } from "./bijoux";
import { CAVE } from "./cave";
import { COSMETIQUE } from "./cosmetique";
import { ENFANT } from "./enfant";
import { EPICERIE } from "./epicerie";
import { MODE } from "./mode";

/** Toutes les variantes, dans l'ordre de la page de visionnage. */
export const VARIANTS: Variant[] = [
  CAVE,
  EPICERIE,
  MODE,
  ENFANT,
  BIJOUX,
  COSMETIQUE,
];

export const variantById = (id: string): Variant =>
  VARIANTS.find((v) => v.id === id) ?? CAVE;

setDefaultVariant(CAVE);

// ── Garde-fous (au chargement du bundle : un rendu faux échoue tout de suite) ──
const CAVE_REPLY3 =
  "Crozes-Hermitage 2021 est épuisé pour le moment. Je peux vous prévenir dès qu'il revient. En attendant, regardez Vacqueyras 2021 (21 €), c'est ce qui s'en rapproche le plus en vin rouge.";
if (soldOutReply(CAVE.replies.soldOut, CAVE.replies.alt) !== CAVE_REPLY3)
  throw new Error(
    "gabarit « épuisé » : la cave ne retombe plus sur le film validé",
  );

for (const v of VARIANTS) {
  const all = JSON.stringify(v, (_k, val) =>
    typeof val === "function" ? val("x") : val,
  );
  if (/[–—]/.test(all))
    throw new Error(`${v.id} : tiret cadratin/demi-cadratin interdit`);
  const { typed, typing, replies, guided, captions } = v;
  if (typing.q1.length !== typed.q1.length)
    throw new Error(`${v.id} : frappe q1`);
  if (typing.q2.length !== typed.q2.length)
    throw new Error(`${v.id} : frappe q2`);
  if (typing.q3.length !== typed.q3.length)
    throw new Error(`${v.id} : frappe q3`);
  if (typing.q1[typing.q1.length - 1] > 284)
    throw new Error(`${v.id} : q1 trop longue`);
  if (!replies.soldOut.soldOut)
    throw new Error(`${v.id} : le produit demandé doit être épuisé`);
  if (replies.alt.soldOut || replies.alt.desc !== replies.soldOut.desc)
    throw new Error(`${v.id} : redirection = même catégorie, en stock`);
  if (guided.pick < 0 || guided.pick >= guided.chips.length)
    throw new Error(`${v.id} : puce`);
  if (v.shop.section.items.length !== 5 || !v.shop.section.items[2].soldOut)
    throw new Error(`${v.id} : 5 vignettes, l'épuisée au centre`);
  for (const [t] of captions)
    if (t.length > 45) throw new Error(`${v.id} : sous-titre trop long (${t})`);
}
