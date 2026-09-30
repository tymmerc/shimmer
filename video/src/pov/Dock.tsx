import React from "react";
import { interpolate } from "remotion";
import { Bottle } from "./Bottle";
import { DOCK, FONT, SHOP } from "./brand";
import { euro, type Wine } from "./catalog";

/**
 * Réplique du dock du SDK (sdk/src/shimmer.ts, buildStyles + createOverlay),
 * aux couleurs de la boutique (primaryColor + fontFamily réglés à l'install).
 * Composant de pure présentation : la scène calcule les progressions.
 *
 * Ordre réel : résultats EN HAUT, puis filet, question du vendeur, puces,
 * pied « Voir les résultats classiques → » / « Fermer ».
 */

export interface DockItem {
  wine: Wine;
  /** 0..1 apparition de la ligne */
  p: number;
  /** 0..1 survol (fond #f3f4f6) */
  hover?: number;
}

export interface DockRestock {
  wine: Wine;
  /** 0..1 apparition de l'encart */
  p: number;
  /** email tapé jusqu'ici */
  email: string;
  /** caret visible */
  caret?: boolean;
  /** 0..1 bouton pressé */
  press?: number;
  /** 0..1 bascule vers « C'est noté. » */
  done: number;
}

export interface DockChip {
  label: string;
  /** 0..1 survol / pression (fond plein) */
  fill?: number;
}

export const Dock: React.FC<{
  width: number;
  /** 0..1 ouverture (fondu + glissement de 4 px, 0,18 s dans le SDK) */
  open: number;
  items: DockItem[];
  restock?: DockRestock;
  question?: { text: string; p: number };
  chips?: { list: DockChip[]; p: number };
  primary?: string;
  font?: string;
  /** facteur d'échelle global (le dock est dessiné à l'échelle 1 = px CSS réels) */
  scale?: number;
}> = ({
  width,
  open,
  items,
  restock,
  question,
  chips,
  primary = SHOP.primary,
  font = FONT.shopSans,
  scale = 1,
}) => {
  const hasResults = items.length > 0 || !!restock;
  return (
    <div
      style={{
        width,
        opacity: open,
        transform: `translateY(${interpolate(open, [0, 1], [-4, 0])}px)`,
        background: "#fff",
        border: DOCK.border,
        borderRadius: DOCK.radius,
        boxShadow: DOCK.shadow,
        overflow: "hidden",
        fontFamily: font,
        fontSize: 14 * scale,
        lineHeight: 1.5,
        color: DOCK.text,
        transformOrigin: "top center",
      }}
    >
      {hasResults && (
        <div style={{ padding: 6 * scale }}>
          {restock && <Restock r={restock} scale={scale} />}
          {items.map((it) => (
            <Row key={it.wine.id} it={it} primary={primary} scale={scale} />
          ))}
        </div>
      )}
      <div style={{ borderTop: hasResults ? `1px solid ${DOCK.sep}` : "none" }}>
        {question && question.p > 0 && (
          <div
            style={{
              padding: `${10 * scale}px ${14 * scale}px ${4 * scale}px`,
              fontSize: 14 * scale,
              lineHeight: 1.45,
              color: primary,
              opacity: question.p,
              transform: `translateY(${interpolate(question.p, [0, 1], [4, 0])}px)`,
            }}
          >
            <Bold text={question.text} />
          </div>
        )}
        {chips && chips.p > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8 * scale,
              padding: `${6 * scale}px ${14 * scale}px ${8 * scale}px`,
            }}
          >
            {chips.list.map((c, i) => {
              const cp = interpolate(
                chips.p,
                [i * 0.18, i * 0.18 + 0.5],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              );
              const f = c.fill ?? 0;
              return (
                <div
                  key={c.label}
                  style={{
                    border: `1px solid ${primary}`,
                    background: f > 0 ? mix(primary, f) : "transparent",
                    color: f > 0.5 ? "#fff" : primary,
                    borderRadius: 999,
                    padding: `${8 * scale}px ${14 * scale}px`,
                    fontSize: 14 * scale,
                    opacity: cp,
                    transform: `translateY(${interpolate(cp, [0, 1], [6, 0])}px) scale(${1 - 0.04 * (c.fill ?? 0) * (1 - (c.fill ?? 0)) * 4})`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.label}
                </div>
              );
            })}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: `${6 * scale}px ${10 * scale}px ${8 * scale}px`,
            fontSize: 12 * scale,
            color: DOCK.footer,
          }}
        >
          <span style={{ padding: `${4 * scale}px ${6 * scale}px` }}>
            Voir les résultats classiques →
          </span>
          <span style={{ padding: `${4 * scale}px ${6 * scale}px` }}>
            Fermer
          </span>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ it: DockItem; primary: string; scale: number }> = ({
  it,
  primary,
  scale,
}) => {
  const s = scale;
  return (
    <div
      style={{
        display: "flex",
        gap: 12 * s,
        padding: 12 * s,
        borderRadius: 8 * s,
        alignItems: "center",
        background: `rgba(243,244,246,${it.hover ?? 0})`,
        opacity: it.p,
        transform: `translateY(${interpolate(it.p, [0, 1], [8, 0])}px)`,
      }}
    >
      <div
        style={{
          width: 56 * s,
          height: 56 * s,
          borderRadius: 8 * s,
          background: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
          overflow: "hidden",
        }}
      >
        <Bottle look={it.wine.look} size={50 * s} id={`dock-${it.wine.id}`} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {it.wine.name}
        </div>
        <div
          style={{
            fontSize: 12 * s,
            color: DOCK.gray,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {it.wine.desc}
        </div>
      </div>
      <div style={{ fontWeight: 700, color: primary, whiteSpace: "nowrap" }}>
        {euro(it.wine.price)}
      </div>
    </div>
  );
};

const Restock: React.FC<{ r: DockRestock; scale: number }> = ({
  r,
  scale: s,
}) => (
  <div
    style={{
      margin: `${6 * s}px ${12 * s}px ${10 * s}px`,
      padding: `${12 * s}px ${14 * s}px`,
      border: "1px solid #e5e7eb",
      borderRadius: 12 * s,
      background: "#fafafa",
      opacity: r.p,
      transform: `translateY(${interpolate(r.p, [0, 1], [8, 0])}px)`,
      position: "relative",
      minHeight: 78 * s,
    }}
  >
    <div
      style={{
        opacity: 1 - r.done,
        position: r.done > 0.5 ? "absolute" : "relative",
        inset: r.done > 0.5 ? 0 : undefined,
      }}
    >
      <div style={{ fontSize: 13 * s, color: "#111827", marginBottom: 8 * s }}>
        <strong style={{ fontWeight: 600 }}>{r.wine.name}</strong> est épuisé.
        Je vous préviens dès qu'il revient ?
      </div>
      <div style={{ display: "flex", gap: 8 * s }}>
        <div
          style={{
            flex: 1,
            padding: `${9 * s}px ${12 * s}px`,
            border: `1px solid ${r.email ? "#111827" : "#d1d5db"}`,
            borderRadius: 999,
            fontSize: 13 * s,
            color: r.email ? "#111827" : "#9ca3af",
            background: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          {r.email || "votre@email.fr"}
          {r.caret && (
            <span
              style={{
                borderLeft: "1.5px solid #111827",
                marginLeft: 1,
                height: "1em",
                display: "inline-block",
                verticalAlign: "-2px",
              }}
            />
          )}
        </div>
        <div
          style={{
            padding: `${9 * s}px ${14 * s}px`,
            borderRadius: 999,
            background: "#111827",
            color: "#fff",
            fontSize: 13 * s,
            whiteSpace: "nowrap",
            transform: `scale(${1 - 0.06 * (r.press ?? 0)})`,
          }}
        >
          Prévenez-moi
        </div>
      </div>
    </div>
    {r.done > 0 && (
      <div
        style={{
          fontSize: 13 * s,
          color: "#047857",
          opacity: r.done,
          position: r.done > 0.5 ? "relative" : "absolute",
          top: r.done > 0.5 ? undefined : `${12 * s}px`,
          left: r.done > 0.5 ? undefined : `${14 * s}px`,
        }}
      >
        C'est noté. Vous serez prévenu dès le retour de {r.wine.name}.
      </div>
    )}
  </div>
);

/** Rend **gras** comme le SDK (esc + <strong>). */
export const Bold: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} style={{ fontWeight: 700 }}>
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
};

/** Mélange blanc -> couleur, pour le remplissage progressif d'une puce. */
function mix(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const m = (c: number) => Math.round(255 + (c - 255) * t);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
