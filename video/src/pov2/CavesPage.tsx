import React from "react";
import { Bottle } from "../pov/Bottle";
import { FONT, SHOP } from "../pov/brand";
import { REDS, SHELF } from "./wines";

/**
 * Caves Forty-Two, le site du MARCHAND. Rendu du viewport 1440 × 673 (px CSS) :
 * le document défile (scrollY), l'en-tête est collant (top = max(32 − scrollY, 0)).
 * Rien n'est aux couleurs de Shimmer ici.
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

export const CavesPage: React.FC<{
  scrollY: number;
  bar: NativeState;
  children?: React.ReactNode;
}> = ({ scrollY, bar, children }) => {
  const top = headerTop(scrollY);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: 1440,
        height: 673,
        overflow: "hidden",
        background: SHOP.bg,
        fontFamily: FONT.shopSans,
        color: SHOP.ink,
      }}
    >
      {/* Document qui défile */}
      <div
        style={{ position: "absolute", left: 0, top: -scrollY, width: 1440 }}
      >
        <div
          style={{
            height: 32,
            background: SHOP.primary,
            color: "#f3ede2",
            fontSize: 12.5,
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Livraison offerte dès 90 € · Expédié sous 48 h
        </div>
        <div style={{ height: 102 }} />
        <Nav />
        <Hero />
        <Reds />
        <div style={{ height: 200 }} />
      </div>

      {/* En-tête collant, au-dessus du document */}
      <Header top={top} bar={bar} />

      {/* Calque du SDK (dock), fixe dans le viewport */}
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
};

const Header: React.FC<{ top: number; bar: NativeState }> = ({ top, bar }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top,
      width: 1440,
      height: 102,
      background: SHOP.bg,
      borderBottom: `1px solid ${SHOP.line}`,
      display: "flex",
      alignItems: "center",
      padding: "0 56px",
      boxSizing: "border-box",
    }}
  >
    <div>
      <div
        style={{
          fontFamily: FONT.shopSerif,
          fontWeight: 700,
          fontSize: 34,
          lineHeight: 1,
          letterSpacing: "0.01em",
        }}
      >
        Caves Forty-Two
      </div>
      <div
        style={{
          fontFamily: FONT.shopSerif,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 16,
          color: SHOP.mute,
          marginTop: 4,
        }}
      >
        caviste indépendant, depuis 2011
      </div>
    </div>
    <NativeSearch s={bar} />
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
const NativeSearch: React.FC<{ s: NativeState }> = ({ s }) => {
  const empty = !s.value;
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
        border: `1px solid ${s.focus ? SHOP.ink : SHOP.line}`,
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
        stroke={SHOP.ink}
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
        {s.caret && empty && <Caret />}
        <span style={{ color: empty ? "#a39a92" : SHOP.ink }}>
          {empty ? s.placeholder : s.value}
        </span>
        {s.caret && !empty && <Caret />}
      </div>
    </div>
  );
};

const Caret: React.FC = () => (
  <span
    style={{
      display: "inline-block",
      width: 1.6,
      height: 19,
      background: SHOP.ink,
      marginRight: -1.6,
      flex: "0 0 auto",
    }}
  />
);

const Nav: React.FC = () => (
  <div
    style={{
      height: 48,
      borderBottom: `1px solid ${SHOP.line}`,
      display: "flex",
      alignItems: "center",
      gap: 40,
      padding: "0 56px",
      fontSize: 14.5,
      color: "#3d3530",
    }}
  >
    {[
      "Rouges",
      "Blancs",
      "Bulles",
      "Rosés",
      "Coffrets",
      "Accords mets et vins",
      "Le caviste",
    ].map((n) => (
      <span key={n}>{n}</span>
    ))}
  </div>
);

const Hero: React.FC = () => (
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
          color: SHOP.gold,
          fontWeight: 600,
        }}
      >
        Sélection d'automne
      </div>
      <div
        style={{
          fontFamily: FONT.shopSerif,
          fontWeight: 600,
          fontSize: 64,
          lineHeight: 1.02,
          marginTop: 14,
        }}
      >
        Des vins de vignerons,{" "}
        <span style={{ fontStyle: "italic", fontWeight: 500 }}>
          choisis un par un.
        </span>
      </div>
      <div
        style={{
          fontSize: 17,
          color: SHOP.mute,
          marginTop: 18,
          lineHeight: 1.55,
          maxWidth: 470,
        }}
      >
        Des vins de petits domaines, tous goûtés avant d’entrer en cave.
      </div>
      <div
        style={{
          marginTop: 26,
          display: "inline-block",
          padding: "14px 26px",
          background: SHOP.ink,
          color: "#f7f3ec",
          fontSize: 14.5,
          letterSpacing: "0.04em",
        }}
      >
        Découvrir la sélection
      </div>
    </div>
    <div
      style={{
        flex: 1,
        height: 372,
        borderRadius: "220px 220px 6px 6px",
        background: "linear-gradient(180deg, #ede4d6 0%, #e4d8c6 100%)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 30,
        paddingBottom: 32,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 30,
          height: 6,
          background: "#cdbb9f",
        }}
      />
      {SHELF.map((w, i) => (
        <Bottle
          key={w.id}
          look={w.look}
          size={[226, 238, 252, 236, 226, 240][i]}
          id={`shelf-${w.id}`}
          style={{ position: "relative" }}
        />
      ))}
    </div>
  </div>
);

const Reds: React.FC = () => (
  <div style={{ padding: "16px 56px 0" }}>
    <div
      style={{
        fontFamily: FONT.shopSerif,
        fontSize: 30,
        fontWeight: 600,
        height: 36,
        lineHeight: "36px",
      }}
    >
      Nos rouges du moment
    </div>
    <div style={{ display: "flex", gap: 22, marginTop: 18 }}>
      {REDS.map((w) => (
        <div key={w.id} style={{ width: 246 }}>
          <div
            style={{
              width: 246,
              height: 246,
              borderRadius: 4,
              background: "#efe8dc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bottle look={w.look} size={190} id={`red-${w.id}`} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>
            {w.name}
          </div>
          <div style={{ fontSize: 13, color: SHOP.mute, marginTop: 2 }}>
            {w.desc}
          </div>
          {w.soldOut ? (
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: SHOP.mute,
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
                color: SHOP.primary,
                marginTop: 4,
              }}
            >
              {w.price} €
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

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
