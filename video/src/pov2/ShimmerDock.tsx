import React from "react";
import { ArtView, ASPECT } from "./Art";
import { rgba, useVariant, type Product } from "./variant";

/**
 * Dock Shimmer, fidèle à buildStyles / createOverlay (sdk/src/shimmer.ts
 * 442-491) avec le thème de la boutique (couleur principale et police du site,
 * reprises par le widget ; arrondi 12 px).
 * AUCUNE animation inventée : seuls l'entrée (0,18 s), le remplissage des
 * puces (.15 s), le survol des lignes (.15 s) et le caret bougent. Le reste
 * est une bascule d'état instantanée, comme le innerHTML du SDK.
 */

export const DOCK_BOX = { x: 460, y: 80, w: 520, maxH: 403.8 };

export interface RestockUI {
  name: string;
  /** false = formulaire, true = « C'est noté. » */
  done: boolean;
  email: string;
  inputFocus: boolean;
  caret: boolean;
  btnDisabled: boolean;
  doneText: string;
  title: readonly [string, string];
  placeholder: string;
  btn: string;
}

export interface DockUI {
  /** 0..1 entrée (opacité + translateY −4 → 0) */
  enter: number;
  rows: Product[];
  /** index de la ligne survolée et progression 0..1 */
  rowHover?: { i: number; p: number };
  restock?: RestockUI;
  question: string;
  chips?: { labels: string[]; fill: number[] };
  footer: [string, string];
}

export const ShimmerDock: React.FC<{ ui: DockUI; probe?: string }> = ({
  ui,
  probe,
}) => {
  const { shop } = useVariant();
  const PRIMARY = shop.theme.primary;
  const hasResults = ui.rows.length > 0 || !!ui.restock;
  return (
    <div
      data-probe={probe}
      data-dock="1"
      style={{
        position: "absolute",
        left: DOCK_BOX.x,
        top: DOCK_BOX.y,
        width: DOCK_BOX.w,
        maxHeight: DOCK_BOX.maxH,
        boxSizing: "border-box",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.09)",
        borderRadius: 12,
        boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: shop.fonts.text,
        fontSize: 14,
        lineHeight: 1.5,
        color: "#1f2937",
        opacity: ui.enter,
        transform: `translateY(${-4 * (1 - ui.enter)}px)`,
      }}
    >
      {hasResults && (
        <div
          style={{
            flex: "1 1 auto",
            overflow: "hidden",
            padding: 6,
            minHeight: 0,
          }}
        >
          {ui.restock && <Restock r={ui.restock} />}
          {ui.rows.map((w, i) => (
            <Row
              key={w.id}
              w={w}
              primary={PRIMARY}
              hover={ui.rowHover && ui.rowHover.i === i ? ui.rowHover.p : 0}
            />
          ))}
        </div>
      )}
      <div
        style={{
          flex: "0 0 auto",
          borderTop: hasResults ? "1px solid #f1f2f4" : "none",
        }}
      >
        {ui.question && (
          <div
            style={{
              padding: "10px 14px 4px",
              fontSize: 14,
              lineHeight: 1.45,
              color: PRIMARY,
            }}
          >
            <Bold text={ui.question} />
          </div>
        )}
        {ui.chips && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              padding: "6px 14px 8px",
            }}
          >
            {ui.chips.labels.map((c, i) => {
              const f = ui.chips!.fill[i] ?? 0;
              return (
                <div
                  key={c}
                  data-chip={i}
                  style={{
                    border: `1px solid ${PRIMARY}`,
                    background: rgba(PRIMARY, f),
                    color: f > 0.5 ? "#fff" : PRIMARY,
                    borderRadius: 999,
                    padding: "8px 14px",
                    fontSize: 14,
                    lineHeight: 1.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c}
                </div>
              );
            })}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            padding: "6px 10px 8px",
          }}
        >
          {ui.footer.map((t) => (
            <span
              key={t}
              style={{ padding: "4px 6px", fontSize: 12, color: "#9ca3af" }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ w: Product; hover: number; primary: string }> = ({
  w,
  hover,
  primary,
}) => (
  <div
    style={{
      display: "flex",
      gap: 12,
      padding: 12,
      borderRadius: 8,
      background: `rgba(243,244,246,${hover})`,
    }}
  >
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 8,
        background: "#f3f4f6",
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <ArtView
        art={w.art}
        size={w.art.kind === "bottle" ? 50 : 46 / Math.max(1, ASPECT_OF(w))}
        id={`dock-${w.id}`}
      />
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
        {w.name}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {w.desc}
      </div>
    </div>
    <div style={{ fontWeight: 700, color: primary, whiteSpace: "nowrap" }}>
      {w.price} €
    </div>
  </div>
);

const Restock: React.FC<{ r: RestockUI }> = ({ r }) => (
  <div
    style={{
      margin: "6px 12px 10px",
      padding: "12px 14px",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      background: "#fafafa",
    }}
  >
    {r.done ? (
      <div style={{ fontSize: 13, color: "#047857" }}>{r.doneText}</div>
    ) : (
      <>
        <div style={{ fontSize: 13, color: "#111827", marginBottom: 8 }}>
          <strong style={{ fontWeight: 600 }}>{r.title[0]}</strong>
          {r.title[1]}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div
            data-restock-input="1"
            style={{
              flex: 1,
              minWidth: 0,
              padding: "9px 12px",
              border: `1px solid ${r.inputFocus ? "#111827" : "#d1d5db"}`,
              borderRadius: 999,
              fontSize: 13,
              lineHeight: 1.5,
              background: "#fff",
              whiteSpace: "pre",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
            }}
          >
            {r.email ? (
              <span style={{ color: "#111827" }}>{r.email}</span>
            ) : null}
            {r.caret && (
              <span
                style={{
                  display: "inline-block",
                  width: 1.4,
                  height: 16,
                  background: "#111827",
                  marginRight: -1.4,
                }}
              />
            )}
            {!r.email && (
              <span style={{ color: "#9ca3af" }}>{r.placeholder}</span>
            )}
          </div>
          <div
            data-restock-btn="1"
            style={{
              padding: "9px 14px",
              borderRadius: 999,
              background: "#111827",
              color: "#fff",
              fontSize: 13,
              lineHeight: 1.5,
              whiteSpace: "nowrap",
              opacity: r.btnDisabled ? 0.5 : 1,
            }}
          >
            {r.btn}
          </div>
        </div>
      </>
    )}
  </div>
);

/** **gras** comme le SDK (esc + <strong>). */
const Bold: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/\*\*(.+?)\*\*/g).map((p, i) =>
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

/** Rapport largeur/hauteur du dessin (vignette 56 px du dock). */
const ASPECT_OF = (p: Product) => ASPECT[p.art.kind];
