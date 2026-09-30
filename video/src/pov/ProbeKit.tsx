import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { S } from "./brand";
import { Kinetic, Mono } from "./Kinetic";
import { MailOpen, PhoneNotif } from "./Mail";
import { Toxic } from "./Toxic";

/** Planche de contrôle : typo cinétique, notification, email. Pas dans le film. */
export const ProbeKit: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Toxic intensity={0.8} />
      <AbsoluteFill style={{ padding: "110px 120px" }}>
        <Mono frame={frame} at={0}>
          Caves Forty-Two · 12 jours plus tard
        </Mono>
        <div style={{ height: 26 }} />
        <Kinetic
          frame={frame}
          at={4}
          size={96}
          text="Il est *de retour.* Elle est prévenue."
          maxWidth={900}
        />
      </AbsoluteFill>
      <div style={{ position: "absolute", right: 120, top: 110 }}>
        <PhoneNotif
          p={1}
          app="Mail"
          title="Crozes-Hermitage 2021 est de retour"
          body="Vous nous aviez demandé de vous prévenir : il est de nouveau disponible."
          scale={0.8}
        />
      </div>
      <div
        style={{
          position: "absolute",
          right: 120,
          bottom: 80,
          transform: "scale(0.72)",
          transformOrigin: "bottom right",
        }}
      >
        <MailOpen
          from="Caves Forty-Two"
          fromAddr="bonjour@cavesfortytwo.fr"
          subject="Crozes-Hermitage 2021 est de retour"
          lines={[
            "Bonjour,",
            "",
            "Vous nous aviez demandé de vous prévenir : Crozes-Hermitage 2021 est de nouveau disponible. Il en reste 6, premier arrivé premier servi.",
            "",
          ]}
          link="cavesfortytwo.fr/products/crozes-hermitage-2021"
          linkHover={1}
        />
      </div>
      <div
        style={{ position: "absolute", left: 120, bottom: 90, color: S.paper }}
      />
    </AbsoluteFill>
  );
};
