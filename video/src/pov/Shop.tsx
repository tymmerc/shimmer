import React from "react";
import { Bottle } from "./Bottle";
import { FONT, SHOP } from "./brand";
import { euro, WINES, type Wine } from "./catalog";

/**
 * Caves Forty-Two : le site du MARCHAND (pas Shimmer). Page d'accueil d'un
 * caviste indépendant sur un thème Shopify éditorial, dessinée en px CSS
 * pour une fenêtre de 1440 × 900. La scène la met à l'échelle.
 *
 * Géométrie exportée pour caler le dock (SDK : même bord gauche que la barre,
 * 6 px dessous, largeur = clamp(barre, 420, 640)).
 */
export const VW = 1440;
export const VH = 900;
export const BAR = { x: 460, y: 60, w: 520, h: 46 };
export const DOCK_POS = {
  x: BAR.x,
  y: BAR.y + BAR.h + 6,
  w: Math.min(Math.max(BAR.w, 420), 640),
};
export const CART = { x: 1373, y: 83 };
export const CHAT = { x: VW - 28 - 56, y: VH - 28 - 56, size: 56 };

export interface SearchState {
  /** texte tapé (vide = placeholder) */
  text: string;
  placeholder?: string;
  /** 0..1 focus (bordure foncée + halo) */
  focus: number;
  caret?: boolean;
  /** 0..1 pression de la touche Entrée (loupe qui s'enfonce) */
  enter?: number;
}

export const Shop: React.FC<{
  search: SearchState;
  cartCount?: number;
  /** 0..1 rebond du compteur panier */
  cartBump?: number;
  /** calque au-dessus de la page (dock, chat), en px CSS de la page */
  overlay?: React.ReactNode;
  /** 0..1 assombrissement léger de la page (focus caméra), 0 par défaut */
  dim?: number;
  /** bulle de chat : désactivée par défaut dans le SDK (le vendeur vit dans la barre) */
  chatBubble?: boolean;
}> = ({
  search,
  cartCount = 0,
  cartBump = 0,
  overlay,
  dim = 0,
  chatBubble = false,
}) => (
  <div
    style={{
      width: VW,
      height: VH,
      background: SHOP.bg,
      position: "relative",
      overflow: "hidden",
      fontFamily: FONT.shopSans,
      color: SHOP.ink,
    }}
  >
    {/* Bandeau d'annonce */}
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
      Livraison offerte dès 90 € · Expédié sous 48 h depuis Lyon
    </div>

    {/* En-tête : logo, barre de recherche du thème, compte, panier */}
    <div
      style={{
        height: 102,
        display: "flex",
        alignItems: "center",
        padding: "0 56px",
        position: "relative",
      }}
    >
      <div style={{ width: 360 }}>
        <div
          style={{
            fontFamily: FONT.shopSerif,
            fontWeight: 700,
            fontSize: 34,
            letterSpacing: "0.01em",
            lineHeight: 1,
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
      <SearchBar s={search} />
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: 26,
          alignItems: "center",
          color: SHOP.ink,
        }}
      >
        <IconUser />
        <div style={{ position: "relative" }}>
          <IconBag />
          {cartCount > 0 && (
            <div
              style={{
                position: "absolute",
                right: -9,
                top: -7,
                minWidth: 19,
                height: 19,
                borderRadius: 10,
                background: SHOP.primary,
                color: "#fff",
                fontSize: 11.5,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${1 + 0.35 * Math.sin(Math.PI * cartBump)})`,
              }}
            >
              {cartCount}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Navigation */}
    <div
      style={{
        height: 48,
        borderTop: `1px solid ${SHOP.line}`,
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

    {/* Hero éditorial */}
    <div
      style={{ display: "flex", padding: "44px 56px 0", gap: 48, height: 400 }}
    >
      <div style={{ flex: "0 0 560px", paddingTop: 34 }}>
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
          Plus de 300 références, toutes goûtées avant d'entrer en cave.
        </div>
        <div
          style={{
            marginTop: 28,
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
      <Shelf />
    </div>

    {/* Coups de cœur */}
    <div style={{ padding: "34px 56px 0" }}>
      <div
        style={{ fontFamily: FONT.shopSerif, fontSize: 30, fontWeight: 600 }}
      >
        Nos coups de cœur
      </div>
      <div style={{ display: "flex", gap: 22, marginTop: 18 }}>
        {[
          WINES.madiran,
          WINES.chablis,
          WINES.picpoul,
          WINES.champ,
          WINES.chinon,
        ].map((w) => (
          <Card key={w.id} w={w} />
        ))}
      </div>
    </div>

    {/* voile focus */}
    {dim > 0 && (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(31,26,23,${0.22 * dim})`,
        }}
      />
    )}

    {/* Bulle SAV (bas droite, couleur de la boutique) */}
    {chatBubble && (
      <div
        style={{
          position: "absolute",
          left: CHAT.x,
          top: CHAT.y,
          width: CHAT.size,
          height: CHAT.size,
          borderRadius: "50%",
          background: SHOP.primary,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a8 8 0 0 1-8 8H4l2.2-2.6A8 8 0 1 1 21 12z" />
        </svg>
      </div>
    )}

    {/* Calque SDK (dock, chat) : toujours au-dessus du thème. */}
    <div style={{ position: "absolute", inset: 0, zIndex: 20 }}>{overlay}</div>
  </div>
);

const SearchBar: React.FC<{ s: SearchState }> = ({ s }) => {
  const empty = !s.text;
  return (
    <div
      style={{
        position: "absolute",
        left: BAR.x,
        top: BAR.y - 32, // l'en-tête commence sous le bandeau (32 px)
        width: BAR.w,
        height: BAR.h,
        borderRadius: 999,
        background: "#fff",
        border: `1px solid ${s.focus > 0.5 ? SHOP.ink : SHOP.line}`,
        boxShadow: `0 0 0 ${4 * s.focus}px rgba(122,31,43,${0.12 * s.focus})`,
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        gap: 12,
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
        style={{ transform: `scale(${1 - 0.18 * (s.enter ?? 0)})` }}
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <div
        style={{
          fontSize: 16,
          color: empty ? "#a39a92" : SHOP.ink,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {empty
          ? (s.placeholder ?? "Rechercher un vin, un accord, une occasion")
          : s.text}
        {s.caret && (
          <span
            style={{
              display: "inline-block",
              width: 1.6,
              height: 19,
              background: SHOP.ink,
              marginLeft: empty ? -2 : 1,
              verticalAlign: "-4px",
              position: empty ? "relative" : undefined,
              left: empty ? undefined : undefined,
            }}
          />
        )}
      </div>
    </div>
  );
};

const Shelf: React.FC = () => (
  <div
    style={{
      flex: 1,
      height: 360,
      borderRadius: "220px 220px 6px 6px",
      background: "linear-gradient(180deg, #ede4d6 0%, #e4d8c6 100%)",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 26,
      paddingBottom: 30,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 28,
        height: 6,
        background: "#cdbb9f",
      }}
    />
    {[
      WINES.chinon,
      WINES.crozes,
      WINES.madiran,
      WINES.cahors,
      WINES.chablis,
      WINES.picpoul,
    ].map((w, i) => (
      <Bottle
        key={w.id}
        look={w.look}
        size={i === 2 ? 250 : i % 2 ? 222 : 236}
        id={`shelf-${w.id}`}
        style={{ position: "relative", zIndex: 1 }}
      />
    ))}
  </div>
);

const Card: React.FC<{ w: Wine }> = ({ w }) => (
  <div style={{ width: 246 }}>
    <div
      style={{
        height: 180,
        background: "#ede7dc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Bottle look={w.look} size={150} id={`card-${w.id}`} />
    </div>
    <div
      style={{
        fontSize: 14.5,
        fontWeight: 500,
        marginTop: 10,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {w.name}
    </div>
    <div style={{ fontSize: 14, color: SHOP.mute, marginTop: 2 }}>
      {euro(w.price)}
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
