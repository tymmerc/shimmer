import React from "react";
import { interpolate } from "remotion";
import { FONT, SHOP } from "./brand";

/**
 * Notification iOS (bannière) : « Caves Forty-Two · [Nom] est de retour ».
 * Largeur 760 px à l'échelle 1 (lisible en 1080p).
 */
export const PhoneNotif: React.FC<{
  /** 0..1 descente depuis le haut */
  p: number;
  app: string;
  title: string;
  body: string;
  time?: string;
  scale?: number;
}> = ({ p, app, title, body, time = "maintenant", scale = 1 }) => (
  <div
    style={{
      width: 760 * scale,
      padding: `${20 * scale}px ${24 * scale}px`,
      borderRadius: 30 * scale,
      background: "rgba(246,244,240,0.92)",
      boxShadow: "0 30px 70px -20px rgba(0,0,0,0.55)",
      fontFamily: FONT.shopSans,
      color: "#111",
      display: "flex",
      gap: 18 * scale,
      alignItems: "flex-start",
      opacity: interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
      transform: `translateY(${interpolate(p, [0, 1], [-140, 0])}px) scale(${interpolate(p, [0, 1], [0.96, 1])})`,
    }}
  >
    <div
      style={{
        width: 64 * scale,
        height: 64 * scale,
        borderRadius: 15 * scale,
        background: SHOP.primary,
        color: "#f3ede2",
        fontFamily: FONT.shopSerif,
        fontWeight: 700,
        fontSize: 30 * scale,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      42
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 22 * scale,
          color: "#6b6b6b",
        }}
      >
        <span
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            fontSize: 19 * scale,
          }}
        >
          {app}
        </span>
        <span style={{ fontSize: 19 * scale }}>{time}</span>
      </div>
      <div
        style={{ fontSize: 27 * scale, fontWeight: 700, marginTop: 4 * scale }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 25 * scale,
          color: "#333",
          marginTop: 2 * scale,
          lineHeight: 1.3,
        }}
      >
        {body}
      </div>
    </div>
  </div>
);

/**
 * Email ouvert, texte simple comme le vrai modèle (buildRestockEmail) :
 * envoyé au nom de la boutique, un lien, pas de Shimmer visible.
 */
export const MailOpen: React.FC<{
  from: string;
  fromAddr: string;
  subject: string;
  lines: string[];
  link: string;
  /** 0..1 survol / pression du lien */
  linkHover?: number;
  width?: number;
}> = ({ from, fromAddr, subject, lines, link, linkHover = 0, width = 980 }) => (
  <div
    style={{
      width,
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 50px 120px -30px rgba(0,0,0,0.6)",
      overflow: "hidden",
      fontFamily: FONT.shopSans,
      color: "#1b1b1b",
    }}
  >
    <div
      style={{ padding: "30px 40px 22px", borderBottom: "1px solid #ececec" }}
    >
      <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.01em" }}>
        {subject}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: 18,
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            background: SHOP.primary,
            color: "#f3ede2",
            fontFamily: FONT.shopSerif,
            fontWeight: 700,
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          42
        </div>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600 }}>{from}</div>
          <div style={{ fontSize: 16, color: "#777" }}>{fromAddr} · à moi</div>
        </div>
      </div>
    </div>
    <div style={{ padding: "28px 40px 36px", fontSize: 22, lineHeight: 1.6 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ minHeight: "1.6em" }}>
          {l}
        </div>
      ))}
      <div
        style={{
          color: "#1a56db",
          textDecoration: "underline",
          marginTop: 6,
          background: `rgba(26,86,219,${0.1 * linkHover})`,
          display: "inline-block",
          borderRadius: 4,
        }}
      >
        {link}
      </div>
    </div>
  </div>
);
