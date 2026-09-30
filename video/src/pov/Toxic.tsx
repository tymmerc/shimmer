import React, { useLayoutEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Le shader « toxine » du site (ToxicCanvas.tsx), piloté par la frame au lieu
// de l'horloge : rendu déterministe. La souris est remplacée par un point de
// lueur qui dérive (glow), éventuellement piloté par la scène.
const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`;
const FS = `precision highp float;
uniform vec2 R;uniform float T;uniform vec2 M;uniform float K;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f*=f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){return n(p)*.5+n(p*2.1)*.28+n(p*4.4)*.14;}
void main(){
  vec2 uv=gl_FragCoord.xy/R; float ar=R.x/R.y;
  vec2 S=ar>=1.?vec2(ar,1.):vec2(1.,1./ar);
  vec2 p=(uv-.5)*S; float t=T*.10;
  vec2 m=(M/R-.5)*S; float md=length(p-m); float mi=smoothstep(.55,.0,md);
  float n1=fb(p*2.6+vec2(t*.6,t*.25));
  float n2=fb(p*3.0-vec2(t*.4,-t*.35)+m*.25);
  float nw=fb(p*2.0+vec2(n1*.6,n2*.4)+m*mi*.6);
  vec3 c=vec3(.030,.012,.060);
  c+=vec3(.13,.045,.24)*smoothstep(.18,.65,n1)*.70;
  c+=vec3(.26,.09,.52)*smoothstep(.30,.72,nw)*.60;
  float v=smoothstep(.43,.48,nw)*smoothstep(.53,.48,nw);
  c+=vec3(.56,.22,.98)*v*2.;
  c+=vec3(.34,.12,.66)*mi*.55;
  c+=vec3(.66,.16,.58)*mi*smoothstep(.35,.6,n2)*.60;
  c+=vec3(.10,.55,.66)*mi*smoothstep(.5,.68,n1)*.28;
  c+=vec3(.60,.28,1.00)*smoothstep(.25,.0,md)*.22;
  float vig=1.-length((uv-.5)*vec2(1.25,1.40));
  vec3 INK=vec3(0.051,0.043,0.078);
  c=mix(INK,c,smoothstep(0.,.55,vig));
  c=mix(INK,c,K);
  gl_FragColor=vec4(c,1);
}`;

/** Échelle de rendu interne : le shader est flou par nature, 0.5 suffit. */
const SC = 0.5;

export const Toxic: React.FC<{
  /** intensité 0..1 (0 = fond ink uni) */
  intensity?: number;
  /** point de lueur en coordonnées composition, sinon dérive automatique */
  glow?: [number, number];
  /** décalage de temps (s) pour ne pas avoir deux fois le même motif */
  timeOffset?: number;
  speed?: number;
}> = ({ intensity = 1, glow, timeOffset = 0, speed = 1 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<{
    gl: WebGLRenderingContext;
    uR: WebGLUniformLocation | null;
    uT: WebGLUniformLocation | null;
    uM: WebGLUniformLocation | null;
    uK: WebGLUniformLocation | null;
  } | null>(null);
  const [handle] = useState(() => delayRender("toxic-shader"));

  const W = Math.round(width * SC);
  const H = Math.round(height * SC);

  useLayoutEffect(() => {
    const c = ref.current;
    if (!c || glRef.current) return;
    const gl = c.getContext("webgl", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) return;
    const mk = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const pg = gl.createProgram()!;
    gl.attachShader(pg, mk(gl.VERTEX_SHADER, VS));
    gl.attachShader(pg, mk(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pg);
    gl.useProgram(pg);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const a = gl.getAttribLocation(pg, "a");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, W, H);
    glRef.current = {
      gl,
      uR: gl.getUniformLocation(pg, "R"),
      uT: gl.getUniformLocation(pg, "T"),
      uM: gl.getUniformLocation(pg, "M"),
      uK: gl.getUniformLocation(pg, "K"),
    };
  }, [W, H]);

  useLayoutEffect(() => {
    const g = glRef.current;
    if (!g) {
      continueRender(handle);
      return;
    }
    const t = (frame / fps) * speed + timeOffset;
    // Dérive de la lueur : lente, en huit.
    const gx = glow ? glow[0] / width : 0.5 + 0.3 * Math.sin(t * 0.23);
    const gy = glow
      ? 1 - glow[1] / height
      : 0.5 + 0.26 * Math.sin(t * 0.15 + 1.2);
    g.gl.uniform2f(g.uR, W, H);
    g.gl.uniform1f(g.uT, t);
    g.gl.uniform2f(g.uM, gx * W, gy * H);
    g.gl.uniform1f(g.uK, Math.max(0, Math.min(1, intensity)));
    g.gl.drawArrays(g.gl.TRIANGLE_STRIP, 0, 4);
    continueRender(handle);
  }, [
    frame,
    fps,
    speed,
    timeOffset,
    glow,
    intensity,
    width,
    height,
    W,
    H,
    handle,
  ]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0b14" }}>
      <canvas
        ref={ref}
        width={W}
        height={H}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </AbsoluteFill>
  );
};
