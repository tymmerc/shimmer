import React from "react";
import { ArtView, ASPECT, fitHeight } from "./Art";
import { useVariant, type HeroItem, type Shop } from "./variant";

/**
 * Le site du MARCHAND (boutique fictive de la variante). Rendu du viewport
 * 1440 × 673 (px CSS) : le document défile (scrollY), l'en-tête est collant
 * (top = max(32 − scrollY, 0)). Rien n'est aux couleurs de Shimmer ici.
 * Géométrie identique pour toutes les boutiques (la caméra et le dock en
 * dépendent) : bandeau 32, en-tête 102, menu 48, hero 444, section.
 */

export const BAR = { x: 460, w: 520, h: 46, yInHeader: 28 };
/** y viewport du haut de la barre pour un scroll donné. */
export const headerTop = (scrollY: number) => Math.max(32 - scrollY, 0);

export interface NativeState {
  value: string;
  placeholder: string;
  focus: boolean;
  caret: boolean;
}

export const ShopPage: React.FC<{
  scrollY: number;
  bar: NativeState;
  children?: React.ReactNode;
}> = ({ scrollY, bar, children }) => {
  const { shop } = useVariant();
  const t = shop.theme;
  const top = headerTop(scrollY);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: 1440,
        height: 673,
        overflow: "hidden",
        background: t.bg,
        fontFamily: shop.fonts.text,
        color: t.ink,
      }}
    >
      {/* Document qui défile */}
      <div
        style={{ position: "absolute", left: 0, top: -scrollY, width: 1440 }}
      >
        <div
          style={{
            height: 32,
            background: t.primary,
            color: t.onPrimary,
            fontSize: 12.5,
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {shop.banner}
        </div>
        <div style={{ height: 102 }} />
        <Nav shop={shop} />
        <Hero shop={shop} />
        <Section shop={shop} />
        <div style={{ height: 200 }} />
      </div>

      {/* En-tête collant, au-dessus du document */}
      <Header shop={shop} top={top} bar={bar} />

      {/* Calque du SDK (dock), fixe dans le viewport */}
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
};

const Header: React.FC<{ shop: Shop; top: number; bar: NativeState }> = ({
  shop,
  top,
  bar,
}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top,
      width: 1440,
      height: 102,
      background: shop.theme.bg,
      borderBottom: `1px solid ${shop.theme.line}`,
      display: "flex",
      alignItems: "center",
      padding: "0 56px",
      boxSizing: "border-box",
    }}
  >
    <div>
      <div
        style={{
          fontFamily: shop.fonts.title,
          fontWeight: shop.fonts.logoWeight,
          fontSize: 34,
          lineHeight: 1,
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
        }}
      >
        {shop.name}
      </div>
      <div
        style={{
          fontFamily: shop.fonts.italic ? shop.fonts.title : shop.fonts.text,
          fontStyle: shop.fonts.italic ? "italic" : "normal",
          fontWeight: shop.fonts.italic ? 500 : 400,
          fontSize: shop.fonts.italic ? 16 : 14,
          color: shop.theme.mute,
          marginTop: 4,
          whiteSpace: "nowrap",
        }}
      >
        {shop.tagline}
      </div>
    </div>
    <NativeSearch shop={shop} s={bar} />
    <div
      style={{
        marginLeft: "auto",
        display: "flex",
        gap: 26,
        alignItems: "center",
      }}
    >
      <IconUser />
      <IconBag />
    </div>
  </div>
);

/** <form role="search"><input type="search"> du thème, avec sa loupe. */
const NativeSearch: React.FC<{ shop: Shop; s: NativeState }> = ({
  shop,
  s,
}) => {
  const empty = !s.value;
  const ink = shop.theme.ink;
  return (
    <div
      style={{
        position: "absolute",
        left: BAR.x,
        top: BAR.yInHeader,
        width: BAR.w,
        height: BAR.h,
        boxSizing: "border-box",
        borderRadius: 999,
        background: "#fff",
        border: `1px solid ${s.focus ? ink : shop.theme.line}`,
        display: "flex",
        alignItems: "center",
        paddingLeft: 18,
      }}
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke={ink}
        strokeWidth="1.9"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 49,
          right: 18,
          top: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          fontSize: 16,
          whiteSpace: "pre",
          overflow: "hidden",
        }}
      >
        {s.caret && empty && <Caret c={ink} />}
        <span style={{ color: empty ? shop.theme.placeholder : ink }}>
          {empty ? s.placeholder : s.value}
        </span>
        {s.caret && !empty && <Caret c={ink} />}
      </div>
    </div>
  );
};

const Caret: React.FC<{ c: string }> = ({ c }) => (
  <span
    style={{
      display: "inline-block",
      width: 1.6,
      height: 19,
      background: c,
      marginRight: -1.6,
      flex: "0 0 auto",
    }}
  />
);

const Nav: React.FC<{ shop: Shop }> = ({ shop }) => (
  <div
    style={{
      height: 48,
      borderBottom: `1px solid ${shop.theme.line}`,
      display: "flex",
      alignItems: "center",
      gap: 40,
      padding: "0 56px",
      fontSize: 14.5,
      color: shop.theme.ink,
      opacity: 0.88,
    }}
  >
    {shop.nav.map((n) => (
      <span key={n}>{n}</span>
    ))}
  </div>
);

const Hero: React.FC<{ shop: Shop }> = ({ shop }) => {
  const t = shop.theme;
  const f = shop.fonts;
  return (
    <div
      style={{
        height: 444,
        display: "flex",
        padding: "44px 56px 0",
        gap: 48,
        boxSizing: "border-box",
      }}
    >
      <div style={{ flex: "0 0 560px", paddingTop: 30 }}>
        <div
          style={{
            fontSize: 12.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: t.accent,
            fontWeight: 600,
          }}
        >
          {shop.hero.kicker}
        </div>
        <div
          style={{
            fontFamily: f.title,
            fontWeight: f.titleWeight,
            fontSize: shop.hero.size ?? 64,
            lineHeight: 1.02,
            marginTop: 14,
          }}
        >
          {shop.hero.title}{" "}
          <span
            style={
              f.italic
                ? {
                    fontStyle: "italic",
                    fontWeight: Math.max(400, f.titleWeight - 100),
                  }
                : { color: t.accent }
            }
          >
            {shop.hero.em}
          </span>
        </div>
        <div
          style={{
            fontSize: 17,
            color: t.mute,
            marginTop: 18,
            lineHeight: 1.55,
            maxWidth: 470,
          }}
        >
          {shop.hero.sub}
        </div>
        <div
          style={{
            marginTop: 26,
            display: "inline-block",
            padding: "14px 26px",
            background: t.cta[0],
            color: t.cta[1],
            fontSize: 14.5,
            letterSpacing: "0.04em",
          }}
        >
          {shop.hero.cta}
        </div>
      </div>
      <Display shop={shop} />
    </div>
  );
};

/** Vitrine du hero : étagère (objets posés) ou tringle (vêtements suspendus). */
const Display: React.FC<{ shop: Shop }> = ({ shop }) => {
  const t = shop.theme;
  const rail = shop.hero.layout === "rail";
  return (
    <div
      style={{
        flex: 1,
        height: 372,
        borderRadius: "220px 220px 6px 6px",
        background: `linear-gradient(180deg, ${t.heroFrom} 0%, ${t.heroTo} 100%)`,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: rail ? "flex-start" : "flex-end",
        justifyContent: "center",
        gap: shop.hero.gap,
        padding: rail ? "70px 0 0" : "0 0 32px",
        boxSizing: "border-box",
      }}
    >
      {rail ? (
        <div
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            top: 70,
            height: 5,
            borderRadius: 3,
            background: t.shelf,
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 30,
            height: 6,
            background: t.shelf,
          }}
        />
      )}
      {shop.hero.items.map((it: HeroItem, i) => (
        <ArtView
          key={`${it.p.id}-${i}`}
          art={it.p.art}
          size={it.h}
          id={`hero-${it.p.id}-${i}`}
          style={{ position: "relative", flex: "0 0 auto" }}
        />
      ))}
    </div>
  );
};

const Section: React.FC<{ shop: Shop }> = ({ shop }) => {
  const t = shop.theme;
  return (
    <div style={{ padding: "16px 56px 0" }}>
      <div
        style={{
          fontFamily: shop.fonts.title,
          fontSize: 30,
          fontWeight: shop.fonts.titleWeight,
          height: 36,
          lineHeight: "36px",
        }}
      >
        {shop.section.title}
      </div>
      <div style={{ display: "flex", gap: 22, marginTop: 18 }}>
        {shop.section.items.map((p) => {
          const h =
            p.art.kind === "bottle"
              ? shop.tileArt
              : fitHeight(p.art.kind, shop.tileArt);
          return (
            <div key={p.id} style={{ width: 246 }}>
              <div
                style={{
                  width: 246,
                  height: 246,
                  borderRadius: 4,
                  background: t.tile,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArtView art={p.art} size={h} id={`tile-${p.id}`} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>
                {p.name}
              </div>
              <div style={{ fontSize: 13, color: t.mute, marginTop: 2 }}>
                {p.desc}
              </div>
              {p.soldOut ? (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    color: t.mute,
                    marginTop: 6,
                  }}
                >
                  ÉPUISÉ
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: t.primary,
                    marginTop: 4,
                  }}
                >
                  {p.price} €
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Largeur d'un dessin à une hauteur donnée (mise en page de la vitrine S08). */
export const artWidth = (it: {
  p: { art: { kind: keyof typeof ASPECT } };
  h: number;
}) => it.h * ASPECT[it.p.art.kind];

const IconUser = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);
const IconBag = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 8h14l-1 13H6L5 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);
