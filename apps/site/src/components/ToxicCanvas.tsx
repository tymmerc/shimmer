'use client';

import { useEffect, useRef, useState } from 'react';

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`;
const FS = `precision highp float;
uniform vec2 R;uniform float T;uniform vec2 M;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f*=f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){return n(p)*.5+n(p*2.1)*.28+n(p*4.4)*.14;}
void main(){
  vec2 uv=gl_FragCoord.xy/R; float ar=R.x/R.y;
  vec2 p=(uv-.5)*vec2(ar,1.); float t=T*.10;
  vec2 m=(M/R-.5)*vec2(ar,1.); float md=length(p-m); float mi=smoothstep(.55,.0,md);
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
  // Le canvas est opaque (alpha:false) : ses bords doivent virer EXACTEMENT à
  // la couleur du fond de page (#0d0b14) et non au noir, sinon le bord gauche
  // du rectangle fait une couture verticale visible (le "split en 2").
  vec3 INK=vec3(0.051,0.043,0.078);
  c=mix(INK,c,smoothstep(0.,.55,vig));
  gl_FragColor=vec4(c,1);
}`;

interface ToxicCanvasProps {
  className?: string;
}

/** Le shader WebGL plein écran ne tourne QUE sur desktop à pointeur fin. Sur
 *  mobile / tactile (pointeur grossier), il pègue le CPU/GPU du téléphone et la
 *  page lague : on renonce au shader et la nappe toxique animée CSS (STATIC_BG
 *  + .toxic-fluid-drift) prend le relais, légère et fluide. Idem si le WebGL
 *  est absent. Le toxique reste vivant partout, le shader premium est un bonus
 *  desktop. */
function shouldSkipCanvas(): boolean {
  if (typeof window === 'undefined') return true;
  // maxTouchPoints traverse le mode "site desktop" d'un téléphone (où
  // pointer:coarse et la largeur mentent). Tout appareil tactile → pas de
  // shader live, nappe CSS animée à la place.
  const touch = (navigator.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const narrow = window.matchMedia?.('(max-width: 1024px)').matches;
  if (touch || coarse || narrow) return true;
  return false;
}

// Fallback sans WebGL (accélération GPU désactivée, blocklist, vieux mobile).
// C'est ce que voit un Chrome sans accélération : il doit être AUSSI vif que
// le shader, pas deux taches diluées. Nappe fluide magenta/violet pesée à
// droite + reflet acide, bakée en radial-gradients (rendu identique sur tous
// les moteurs). Les couches animées sont dans .toxic-fluid* (globals.css).
const STATIC_BG =
  'radial-gradient(42% 55% at 78% 26%, rgba(255,102,236,0.80), rgba(255,102,236,0) 70%),' +
  'radial-gradient(52% 68% at 90% 55%, rgba(232,74,255,0.60), rgba(232,74,255,0) 72%),' +
  'radial-gradient(34% 42% at 68% 46%, rgba(255,158,247,0.55), rgba(255,158,247,0) 68%),' +
  'radial-gradient(40% 52% at 62% 74%, rgba(139,77,255,0.55), rgba(139,77,255,0) 72%),' +
  'radial-gradient(20% 24% at 57% 55%, rgba(212,255,58,0.14), rgba(212,255,58,0) 70%),' +
  'radial-gradient(60% 75% at 84% 84%, rgba(79,29,199,0.65), rgba(79,29,199,0) 75%),' +
  'radial-gradient(45% 60% at 96% 12%, rgba(58,20,150,0.55), rgba(58,20,150,0) 72%),' +
  '#0d0b14';

export function ToxicCanvas({ className }: ToxicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Le gradient statique est servi tant que le WebGL n'a pas réussi à dessiner
  // au moins une frame. À ce moment-là, on cache le gradient pour ne pas
  // gaspiller le GPU et ne pas créer de "double couche".
  const [active, setActive] = useState(false);
  const [glReady, setGlReady] = useState(false);

  useEffect(() => {
    if (!shouldSkipCanvas()) setActive(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const c = canvasRef.current;
    if (!c) return;

    const gl = c.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
    if (!gl) return;

    // Détection du rendu LOGICIEL (SwiftShader / llvmpipe / Basic Render) :
    // là, le shader plein écran s'exécute sur le CPU et pègue le thread
    // principal (la page gèle). Dans ce cas on renonce au shader et on laisse
    // la nappe animée CSS (STATIC_BG + .toxic-fluid-drift), légère et fluide.
    // Sur GPU matériel, le vrai shader tourne normalement.
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|software|basic render|llvmpipe|microsoft basic/i.test(renderer)) return;

    const mkShader = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };

    const vs = mkShader(gl.VERTEX_SHADER, VS);
    const fs = mkShader(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;

    const pg = gl.createProgram();
    if (!pg) return;
    gl.attachShader(pg, vs);
    gl.attachShader(pg, fs);
    gl.linkProgram(pg);
    if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) return;
    gl.useProgram(pg);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const aLoc = gl.getAttribLocation(pg, 'a');
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

    const uR = gl.getUniformLocation(pg, 'R');
    const uT = gl.getUniformLocation(pg, 'T');
    const uM = gl.getUniformLocation(pg, 'M');

    // Échelle de rendu interne basse (charge GPU) : le shader reste fluide et
    // flou de toute façon. 0.34 allège fortement sur les machines à WebGL mou.
    const SC = 0.34;
    let W = 0, H = 0, mx = 0, my = 0, tmx = 0, tmy = 0;
    // Throttle ~24 fps. Suffisant pour ce fond organique, moitié moins de charge.
    const MIN_FRAME_MS = 42;
    // On ne rend que quand le canvas est visible à l'écran.
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      W = Math.round(c.clientWidth * dpr * SC);
      H = Math.round(c.clientHeight * dpr * SC);
      c.width = W;
      c.height = H;
      gl.viewport(0, 0, W, H);
    };

    const cssToBuf = (cx: number, cy: number): [number, number] => {
      const r = c.getBoundingClientRect();
      const s = Math.min(window.devicePixelRatio, 1.5) * SC;
      return [(cx - r.left) * s, (r.height - (cy - r.top)) * s];
    };

    const onMove = (e: MouseEvent) => { [tmx, tmy] = cssToBuf(e.clientX, e.clientY); };
    const onLeave = () => { tmx = W * 0.5; tmy = H * 0.5; };
    const onTouch = (e: TouchEvent) => { [tmx, tmy] = cssToBuf(e.touches[0].clientX, e.touches[0].clientY); };

    c.addEventListener('mousemove', onMove);
    c.addEventListener('mouseleave', onLeave);
    c.addEventListener('touchmove', onTouch, { passive: true });
    c.addEventListener('touchend', onLeave);

    resize();
    mx = tmx = W * 0.5;
    my = tmy = H * 0.5;
    window.addEventListener('resize', resize);

    const t0 = performance.now();
    let raf = 0;
    let last = 0;
    let firstDrawDone = false;

    // Le toxique doit s'afficher À CHAQUE chargement (demande produit). On ne
    // coupe donc PAS le canvas selon les FPS : même en WebGL logiciel, on
    // préfère un rendu un peu lourd au fallback figé. Le throttle ~30 fps + le
    // rendu à 45% de résolution + la pause hors-viewport suffisent à tenir.
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      if (now - last < MIN_FRAME_MS) return;
      last = now;
      mx += (tmx - mx) * 0.09;
      my += (tmy - my) * 0.09;
      gl.uniform2f(uR, W, H);
      gl.uniform1f(uT, (now - t0) * 0.001);
      gl.uniform2f(uM, mx, my);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!firstDrawDone) {
        firstDrawDone = true;
        setGlReady(true);
      }
    };
    raf = requestAnimationFrame(frame);

    // IntersectionObserver: éteint le rendu quand le canvas sort de la fenêtre.
    // Gain massif quand le visiteur scrolle au-delà du hero.
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { visible = e.isIntersecting; }),
      { threshold: 0 },
    );
    io.observe(c);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      c.removeEventListener('mousemove', onMove);
      c.removeEventListener('mouseleave', onLeave);
      c.removeEventListener('touchmove', onTouch);
      c.removeEventListener('touchend', onLeave);
    };
  }, [active]);

  return (
    <div
      className={className}
      style={{
        background: glReady ? 'transparent' : STATIC_BG,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Couche dérivante du fallback : donne le "mouvement dans les formes"
          quand le shader WebGL n'est pas là. Transform/opacity uniquement,
          coupée par prefers-reduced-motion (voir globals.css). */}
      {!glReady && <div className="toxic-fluid-drift" aria-hidden />}
      {active && (
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
        />
      )}
    </div>
  );
}
