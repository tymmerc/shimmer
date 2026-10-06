import React from "react";
import { spring } from "remotion";
import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexSans";
import { FONT, S } from "../pov/brand";
import { ArtView, ASPECT } from "./Art";
import { BRAND } from "./script";
import { EZ, lerp, seg } from "./timeline";
import { Line, MonoLabel } from "./type";
import { restockMail, useVariant } from "./variant";
import { PHONE_T, PhoneChat } from "./Phone";

const plex = loadPlex("normal", {
  weights: ["400", "600"],
  subsets: ["latin", "latin-ext"],
});
const DEVICE = `${plex.fontFamily}, system-ui, sans-serif`;

/** Dégradés du calque « vie » : lisibilité à gauche, bande plate en bas. */
export const LifeGradients: React.FC<{ opacity?: number }> = ({
  opacity = 1,
}) => (
  <>
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        background:
          "linear-gradient(90deg, #0d0b14 0%, rgba(13,11,20,.8) 38%, rgba(13,11,20,0) 62%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 860,
        bottom: 0,
        opacity,
        background:
          "linear-gradient(180deg, rgba(13,11,20,0) 0px, #0d0b14 40px, #0d0b14 100%)",
      }}
    />
  </>
);

/** Carte « appareil » générique (ni iOS, ni Android, ni Gmail). */
const DeviceCard: React.FC<{
  children: React.ReactNode;
  w: number;
  h: number;
  style?: React.CSSProperties;
}> = ({ children, w, h, style }) => (
  <div
    style={{
      position: "absolute",
      width: w,
      minHeight: h,
      boxSizing: "border-box",
      padding: 34,
      borderRadius: 28,
      background: S.paper,
      boxShadow: "0 30px 70px -20px rgba(0,0,0,.55)",
      fontFamily: DEVICE,
      color: "#111",
      display: "flex",
      gap: 22,
      alignItems: "flex-start",
      ...style,
    }}
  >
    {children}
  </div>
);

// ── S01 · le texto, dans la messagerie du téléphone (Phone.tsx) ─────────────
export const S01: React.FC<{ f: number; fps: number }> = ({ f, fps }) => (
  <PhoneChat f={f} fps={fps} />
);

/**
 * Version voix off : « Je n'y connais rien. » reste en place, dans le calque
 * « vie », et la boutique la recouvre en descendant (même rideau que pour le
 * téléphone). Pas de trou à l'écran entre la pensée et la boutique.
 */
export const S01Thought: React.FC<{ f: number }> = ({ f }) => {
  const v = useVariant();
  const units = v.thought.words.map((w, i) => ({
    w: w.replace(/\*/g, ""),
    at: PHONE_T.thought + i * 3,
    em: w.startsWith("*"),
  }));
  return (
    <Line f={f} x={120} baseline={682} size={120} units={units} settle={18} />
  );
};

/**
 * Ligne 2 de S01, qui devient le premier sous-titre (crossfade à deux copies).
 * Sans sous-titres (version voix off), elle ne descend pas dans la bande :
 * elle monte un peu et s'efface avant que la boutique ne recouvre l'écran.
 */
export const S01Line2: React.FC<{ f: number; subtitles?: boolean }> = ({
  f,
  subtitles = true,
}) => {
  const v = useVariant();
  if (f > 140) return null;
  // Version voix off : la ligne vit dans le calque « vie » (S01Thought), balayée par la boutique.
  if (!subtitles) return null;
  const t = seg(f, 120, 138, EZ.INOUT);
  const fade = seg(f, 126, 132);
  // Trajet : (x120, ligne de base 682) → (x80, ligne de base 1030), 120 → 72 px
  const x = lerp(120, 80, t);
  const b = lerp(682, 1030, t);
  const fr = lerp(1, 0.6, t);
  const units = v.thought.words.map((w, i) => ({
    w: w.replace(/\*/g, ""),
    at: PHONE_T.thought + i * 3,
    em: w.startsWith("*"),
  }));
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transformOrigin: `${x}px ${b}px`,
          transform: `translate(${x - 120}px, ${b - 682}px) scale(${fr})`,
          opacity: 1 - fade,
        }}
      >
        <Line
          f={f}
          x={120}
          baseline={682}
          size={120}
          units={units}
          settle={18}
        />
      </div>
      {f >= 120 && (
        <div
          style={{
            position: "absolute",
            left: x,
            top: b - 72 * 0.8,
            transformOrigin: "0 80%",
            transform: `scale(${lerp(120 / 72, 1, t)})`,
            opacity: fade,
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: 72,
            lineHeight: 1,
            letterSpacing: "-0.005em",
            color: S.paper,
            whiteSpace: "nowrap",
          }}
        >
          {v.thought.line}
        </div>
      )}
    </>
  );
};

// ── S08 · 20 h 15 ───────────────────────────────────────────────────────────
export const S08: React.FC<{ f: number }> = ({ f }) => {
  const v = useVariant();
  const exit = seg(f, 1178, 1190, EZ.IN);
  const rise = seg(f, 1104, 1128, EZ.OUT);
  const sweep = seg(f, 1130, 1154, EZ.INOUT);
  const lab = seg(f, 1106, 1116, EZ.OUT);
  const a = BRAND.s08a.map((w, i) => ({ w, at: 1112 + i * 3 }));
  const b = BRAND.s08b.map((w, i) => ({
    w: w.replace(/\*/g, ""),
    at: 1124 + i * 3,
    em: w.startsWith("*"),
  }));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `translateX(${-160 * exit}px)`,
        opacity: 1 - exit,
      }}
    >
      <MonoLabel
        text={v.s08.label}
        x={120}
        baseline={400}
        opacity={lab}
        dy={10 * (1 - lab)}
      />
      <Line f={f} x={120} baseline={530} size={96} units={a} dur={18} />
      <Line f={f} x={120} baseline={628} size={96} units={b} dur={18} />
      {/* horizon + les objets de l'histoire (film 1 : « comptez 4 bouteilles ») */}
      <div
        style={{
          position: "absolute",
          left: 1080,
          width: 800,
          top: 800,
          height: 1,
          background: "rgba(251,249,244,0.10)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 1500 - 230,
          top: 800 - 30,
          width: 460,
          height: 34,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.55)",
          filter: "blur(16px)",
          opacity: rise,
        }}
      />
      {v.s08.items.map((it, i, all) => {
        const r = seg(f, 1104 + it.d, 1128 + it.d, EZ.OUT);
        const w = it.h * ASPECT[it.p.art.kind];
        const last = i === all.length - 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: it.x - w / 2,
              top: 800 - it.h,
              opacity: r,
              transform: `translateY(${90 * (1 - r)}px)`,
              filter: it.dim !== undefined ? `brightness(${it.dim})` : undefined,
            }}
          >
            <ArtView art={it.p.art} size={it.h} id={`s08-${i}`} sweep={last ? sweep : undefined} />
          </div>
        );
      })}
    </div>
  );
};

// ── S09 · 8 jours plus tard ─────────────────────────────────────────────────
export const S09: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const v = useVariant();
  const mail = restockMail(v.replies.soldOut);
  const sp = spring({
    frame: f - 1190,
    fps,
    config: { damping: 20, stiffness: 170 },
  });
  const exit = seg(f, 1284, 1294, EZ.IN);
  const lab = seg(f, 1186, 1196, EZ.OUT);
  const units = BRAND.s09line.map((w, i) => ({
    w: w.replace(/\*/g, ""),
    at: 1232 + i * 3,
    em: w.startsWith("*"),
  }));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `translateY(${16 * exit}px)`,
        opacity: 1 - exit,
      }}
    >
      <MonoLabel
        text={v.s09.label}
        x={120}
        baseline={250}
        opacity={lab}
        dy={10 * (1 - lab)}
      />
      <DeviceCard
        w={1100}
        h={200}
        style={{
          left: 120,
          top: 300,
          opacity: seg(f, 1190, 1196),
          transform: `translateX(${140 * (1 - sp)}px)`,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: v.shop.theme.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          {/* enveloppe : c'est un email (stock-alerts.ts), pas un SMS */}
          <svg
            width="38"
            height="30"
            viewBox="0 0 38 30"
            fill="none"
            stroke={v.shop.theme.onPrimary}
            strokeWidth="2.4"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="34" height="26" rx="4" />
            <path d="M3 4l16 12L35 4" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 32 }}>
              {v.shop.name}{" "}
              <span style={{ fontWeight: 400, opacity: 0.55 }}>· e-mail</span>
            </span>
            <span style={{ fontSize: 24, opacity: 0.5 }}>{v.s09.time}</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 38, marginTop: 4 }}>
            {mail.subject}
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#4b4b4b",
              marginTop: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {mail.preview}
          </div>
        </div>
      </DeviceCard>
      <Line f={f} x={120} baseline={690} size={96} units={units} dur={18} />
    </div>
  );
};
