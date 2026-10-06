import React from "react";
import { spring } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { EZ, lerp, seg, typed } from "./timeline";
import { useVariant, type Variant } from "./variant";

/**
 * S01 : la conversation de Camille avec Julien, dans une messagerie de
 * téléphone générique (pas de logo ni de nom d'application). Le téléphone est
 * cadré serré : le haut de l'écran jusqu'au champ de saisie, le clavier passe
 * sous la bande de sous-titres.
 *
 * Temps en frames HISTOIRE (S01 est étiré dans timeline.ts).
 */

const inter = loadInter("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin", "latin-ext"],
});
const UI = `${inter.fontFamily}, system-ui, sans-serif`;

// Miroir : music/cues.py relit typingIn, message, send et thought ici.
export const PHONE_T = {
  enter: 2,
  typingIn: 10,
  message: 28,
  focus: 40,
  reply: [46, 48, 50, 53, 55, 57, 59, 62, 64],
  send: 70,
  delivered: 78,
  recede: [84, 100] as const,
  gone: [116, 124] as const,
  /** « Je n'y connais rien. » (S01Line2) */
  thought: 90,
};

const C = {
  blue: "#0a7cff",
  inBubble: "#e9e9eb",
  text: "#0b0b0c",
  mute: "#8a8a8f",
  hair: "#dcdce0",
  bar: "#f6f6f7",
  kbd: "#d2d4da",
};

// Géométrie (px composition). Écran 624 px de large : téléphone ×1,6.
const SW = 624;
const BEZEL = 18;
const TOP = 64;
const SH = 1350;
const STATUS_H = 92;
const HEADER_B = 236;
const INPUT_T = 672;
const INPUT_B = 772;
const FS = 36;
const LH = 48;
const PAD_Y = 14;
const PAD_X = 24;
const bubbleH = (lines: number) => lines * LH + 2 * PAD_Y;

const linesOf = (v: Variant) => v.chat.msg.split(/(?<=\.) /);

export const PhoneChat: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const v = useVariant();
  const T = PHONE_T;
  const enter = spring({
    frame: f - T.enter,
    fps,
    config: { damping: 18, stiffness: 120, mass: 1 },
  });
  const recede = seg(f, T.recede[0], T.recede[1], EZ.INOUT);
  const gone = seg(f, T.gone[0], T.gone[1], EZ.IN);
  // Recul assez loin pour laisser de l'air après « rien. » (bord gauche ≈ 1230).
  const cx = lerp(960, 1510, recede);
  const scale = lerp(1, 0.86, recede);
  const dy = lerp(140, 0, enter) + lerp(0, 40, recede);
  const opacity = seg(f, 0, 8) * (1 - gone);
  const dim = lerp(1, 0.4, recede);
  return (
    // Le téléphone s'arrête au-dessus de la bande de sous-titres (fondu 850-895).
    <div
      style={{
        position: "absolute",
        inset: 0,
        WebkitMaskImage:
          "linear-gradient(180deg, #000 0, #000 850px, transparent 895px)",
        maskImage:
          "linear-gradient(180deg, #000 0, #000 850px, transparent 895px)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: cx - SW / 2 - BEZEL,
          top: TOP,
          width: SW + 2 * BEZEL,
          height: SH + 2 * BEZEL,
          opacity,
          transformOrigin: "50% 30%",
          transform: `translateY(${dy}px) rotate(${lerp(-2.5, 0, enter)}deg) scale(${scale})`,
          filter:
            dim < 0.999
              ? `brightness(${dim}) saturate(${lerp(1, 0.7, recede)})`
              : undefined,
        }}
      >
        <Frame />
        <div
          style={{
            position: "absolute",
            left: BEZEL,
            top: BEZEL,
            width: SW,
            height: SH,
            borderRadius: 78,
            overflow: "hidden",
            background: "#fff",
            fontFamily: UI,
            color: C.text,
          }}
        >
          <Thread v={v} f={f} fps={fps} />
          <Header v={v} />
          <StatusBar v={v} />
          <InputBar v={v} f={f} />
          <Keyboard />
          {/* capteur photo */}
          <div
            style={{
              position: "absolute",
              left: SW / 2 - 14,
              top: 22,
              width: 28,
              height: 28,
              borderRadius: 14,
              background: "#050506",
            }}
          />
        </div>
      </div>
    </div>
  );
};

const Frame: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: 96,
      background:
        "linear-gradient(135deg, #2a2a30 0%, #0c0c0f 40%, #1c1c21 100%)",
      boxShadow:
        "0 70px 140px -40px rgba(0,0,0,.75), inset 0 0 0 2px rgba(255,255,255,.14), inset 0 0 0 7px #050506",
    }}
  />
);

const StatusBar: React.FC<{ v: Variant }> = ({ v }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: SW,
      height: STATUS_H,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 58px 0 70px",
      boxSizing: "border-box",
      fontSize: 30,
      fontWeight: 600,
      letterSpacing: "-0.01em",
    }}
  >
    <span>{v.chat.time}</span>
    <svg width="150" height="30" viewBox="0 0 150 30">
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 11}
          y={22 - i * 6}
          width={7}
          height={8 + i * 6}
          rx={2}
          fill={C.text}
        />
      ))}
      <g
        transform="translate(62 4)"
        fill="none"
        stroke={C.text}
        strokeWidth="3.4"
        strokeLinecap="round"
      >
        <path d="M2 9.5a19 19 0 0 1 26 0" />
        <path d="M7 14.5a12 12 0 0 1 16 0" />
        <circle cx="15" cy="20" r="2.6" fill={C.text} stroke="none" />
      </g>
      <g transform="translate(100 5)">
        <rect
          x="0"
          y="0"
          width="40"
          height="20"
          rx="6"
          fill="none"
          stroke={C.text}
          strokeOpacity="0.4"
          strokeWidth="2.2"
        />
        <rect x="3" y="3" width="28" height="14" rx="3.5" fill={C.text} />
        <rect
          x="42"
          y="6.5"
          width="3"
          height="7"
          rx="1.5"
          fill={C.text}
          fillOpacity="0.45"
        />
      </g>
    </svg>
  </div>
);

const Header: React.FC<{ v: Variant }> = ({ v }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: SW,
      height: HEADER_B,
      background: "#f8f8f9",
      borderBottom: `1.5px solid ${C.hair}`,
    }}
  >
    <svg
      width="24"
      height="40"
      viewBox="0 0 24 40"
      style={{ position: "absolute", left: 30, top: 130 }}
      fill="none"
      stroke={C.blue}
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 4L4 20l16 16" />
    </svg>
    <svg
      width="46"
      height="30"
      viewBox="0 0 46 30"
      style={{ position: "absolute", right: 34, top: 136 }}
      fill="none"
      stroke={C.blue}
      strokeWidth="3.4"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="28" height="24" rx="6" />
      <path d="M31 12l12-7v20l-12-7z" />
    </svg>
    <div
      style={{
        position: "absolute",
        left: SW / 2 - 38,
        top: 100,
        width: 76,
        height: 76,
        borderRadius: 38,
        background: "linear-gradient(180deg, #a9afbb, #868c98)",
        color: "#fff",
        fontSize: 36,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {v.chat.from[0]}
    </div>
    <div
      style={{
        position: "absolute",
        left: 0,
        width: SW,
        top: 184,
        textAlign: "center",
        fontSize: 24,
        fontWeight: 500,
        color: C.text,
      }}
    >
      {v.chat.from}
      <span style={{ color: C.mute, marginLeft: 6, fontSize: 20 }}>›</span>
    </div>
  </div>
);

// ── Fil de la conversation, ancré en bas au-dessus du champ de saisie ───────

interface Item {
  key: string;
  h: number;
  /** 0..1 : hauteur réservée dans le fil */
  grow: number;
  gapTop: number;
  node: React.ReactNode;
}

const Thread: React.FC<{ v: Variant; f: number; fps: number }> = ({ v, f, fps }) => {
  const T = PHONE_T;
  const msgLines = linesOf(v);
  const sp = (at: number, stiff = 170) =>
    spring({
      frame: f - at,
      fps,
      config: { damping: 17, stiffness: stiff, mass: 0.8 },
    });
  const typingIn = sp(T.typingIn);
  const msgIn = sp(T.message);
  const replyIn = sp(T.send);
  const deliveredIn = seg(f, T.delivered, T.delivered + 6);

  const typingH = bubbleH(1);
  const msgH = bubbleH(msgLines.length);
  const slotH = f < T.message ? typingH * typingIn : lerp(typingH, msgH, msgIn);

  const dateSep = (
    key: string,
    day: string,
    time: string,
    gapTop: number,
  ): Item => ({
    key,
    h: 40,
    grow: 1,
    gapTop,
    node: (
      <div
        style={{
          textAlign: "center",
          fontSize: 22,
          color: C.mute,
          lineHeight: "40px",
        }}
      >
        <span style={{ fontWeight: 600 }}>{day}</span> {time}
      </div>
    ),
  });
  const items: Item[] = [
    dateSep("yday", v.chat.ydayDay, v.chat.ydayTime, 0),
    {
      key: "out0",
      h: bubbleH(1),
      grow: 1,
      gapTop: 20,
      node: <Bubble side="out" lines={[v.chat.out0]} />,
    },
    {
      key: "date",
      h: 40,
      grow: 1,
      gapTop: 24,
      node: (
        <div
          style={{
            textAlign: "center",
            fontSize: 22,
            color: C.mute,
            lineHeight: "40px",
          }}
        >
          <span style={{ fontWeight: 600 }}>{v.chat.day}</span>{" "}
          {v.chat.dayTime}
        </div>
      ),
    },
    {
      key: "in1",
      h: bubbleH(1),
      grow: 1,
      gapTop: 20,
      node: <Bubble side="in" lines={[v.chat.in1]} />,
    },
    {
      key: "out1",
      h: bubbleH(1),
      grow: 1,
      gapTop: 20,
      node: <Bubble side="out" lines={[v.chat.out1]} />,
    },
    {
      key: "in2",
      h: slotH,
      grow: 1,
      gapTop: 20 * Math.min(1, typingIn),
      node:
        f < T.message ? (
          <Typing f={f} pop={typingIn} />
        ) : (
          <Bubble side="in" lines={msgLines} pop={msgIn} />
        ),
    },
    {
      key: "out2",
      h: bubbleH(1),
      grow: replyIn,
      gapTop: 20,
      node: <Bubble side="out" lines={[v.chat.reply]} pop={replyIn} />,
    },
    {
      key: "delivered",
      h: 30,
      grow: replyIn,
      gapTop: 6,
      node: (
        <div
          style={{
            textAlign: "right",
            fontSize: 20,
            color: C.mute,
            opacity: deliveredIn,
            lineHeight: "30px",
          }}
        >
          {v.chat.delivered}
        </div>
      ),
    },
  ];

  const visible = items.filter((it) => it.grow > 0.001);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: SW,
        height: INPUT_T - 16,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "0 26px",
        boxSizing: "border-box",
      }}
    >
      {visible.map((it) => (
        <div
          key={it.key}
          style={{
            flex: "0 0 auto",
            height: (it.h + it.gapTop) * Math.min(1, Math.max(0, it.grow)),
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
            {it.node}
          </div>
        </div>
      ))}
    </div>
  );
};

const Bubble: React.FC<{
  side: "in" | "out";
  lines: string[];
  pop?: number;
}> = ({ side, lines, pop = 1 }) => {
  const out = side === "out";
  const s = lerp(0.72, 1, Math.min(1, Math.max(0, pop)));
  return (
    <div
      style={{
        display: "flex",
        justifyContent: out ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          background: out ? C.blue : C.inBubble,
          color: out ? "#fff" : C.text,
          fontSize: FS,
          lineHeight: `${LH}px`,
          padding: `${PAD_Y}px ${PAD_X}px`,
          borderRadius: 34,
          borderBottomRightRadius: out ? 10 : 34,
          borderBottomLeftRadius: out ? 34 : 10,
          letterSpacing: "-0.012em",
          opacity: Math.min(1, pop * 1.6),
          transformOrigin: out ? "100% 100%" : "0 100%",
          transform: `scale(${s})`,
        }}
      >
        {lines.map((l) => (
          <div key={l} style={{ whiteSpace: "nowrap" }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};

const Typing: React.FC<{ f: number; pop: number }> = ({ f, pop }) => (
  <div style={{ display: "flex" }}>
    <div
      style={{
        height: bubbleH(1),
        width: 118,
        borderRadius: 34,
        borderBottomLeftRadius: 10,
        background: C.inBubble,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        transformOrigin: "0 100%",
        transform: `scale(${lerp(0.6, 1, Math.min(1, pop))})`,
        opacity: Math.min(1, pop * 1.6),
      }}
    >
      {[0, 1, 2].map((i) => {
        const ph = ((f - i * 4) % 18) / 18;
        const up = Math.max(0, Math.sin(ph * Math.PI * 2));
        return (
          <div
            key={i}
            style={{
              width: 15,
              height: 15,
              borderRadius: 8,
              background: C.mute,
              opacity: 0.45 + 0.5 * up,
              transform: `translateY(${-5 * up}px)`,
            }}
          />
        );
      })}
    </div>
  </div>
);

const InputBar: React.FC<{ v: Variant; f: number }> = ({ v, f }) => {
  const T = PHONE_T;
  const text = f < T.send ? typed(f, v.chat.reply, T.reply) : "";
  const focused = f >= T.focus;
  const caretOn = focused && Math.floor((f - T.focus) / 8) % 2 === 0;
  const hasText = text.length > 0;
  const press =
    seg(f, T.send - 3, T.send, EZ.IN) *
    (1 - seg(f, T.send, T.send + 4, EZ.OUT));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: INPUT_T,
        width: SW,
        height: INPUT_B - INPUT_T,
        background: C.bar,
        borderTop: `1.5px solid ${C.hair}`,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 22px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          background: "#e4e4e8",
          color: "#7b7b80",
          fontSize: 40,
          lineHeight: "58px",
          textAlign: "center",
          flex: "0 0 auto",
        }}
      >
        +
      </div>
      <div
        style={{
          flex: 1,
          height: 60,
          borderRadius: 30,
          border: `2px solid ${C.hair}`,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          padding: "0 8px 0 24px",
          boxSizing: "border-box",
          fontSize: 30,
          position: "relative",
        }}
      >
        {hasText ? <span style={{ whiteSpace: "pre" }}>{text}</span> : null}
        {caretOn && (
          <span
            style={{
              display: "inline-block",
              width: 3,
              height: 36,
              background: C.blue,
              marginLeft: 1,
            }}
          />
        )}
        {!hasText && (
          <span style={{ color: "#a3a3a8", marginLeft: caretOn ? 2 : 0 }}>
            Message
          </span>
        )}
        <div style={{ flex: 1 }} />
        {hasText && (
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              background: C.blue,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${1 - 0.14 * press})`,
            }}
          >
            <svg
              width="22"
              height="26"
              viewBox="0 0 22 26"
              fill="none"
              stroke="#fff"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 23V4M3 11l8-8 8 8" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

const KEYS = ["a", "z", "e", "r", "t", "y", "u", "i", "o", "p"];
const Keyboard: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: INPUT_B,
      width: SW,
      height: SH - INPUT_B,
      background: C.kbd,
      // Touches sous l'aplat de la bande : seul le bac gris passe dans le fondu.
      padding: "64px 8px",
      boxSizing: "border-box",
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
    }}
  >
    {KEYS.map((k) => (
      <div
        key={k}
        style={{
          flex: 1,
          height: 76,
          borderRadius: 10,
          background: "#fff",
          boxShadow: "0 2px 0 rgba(0,0,0,.25)",
          fontSize: 34,
          textAlign: "center",
          lineHeight: "76px",
        }}
      >
        {k}
      </div>
    ))}
  </div>
);
