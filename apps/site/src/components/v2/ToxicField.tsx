'use client';

import { useEffect, useRef, useState } from 'react';
import { isSoftwareRenderer } from '../ToxicCanvas';

/**
 * La toxine, en une seule couche pour toute la page.
 *
 * Le MÊME shader que l'ancien hero (même bruit, mêmes couleurs, même
 * composition dans le hero), dessiné en coordonnées de la page sur un canvas
 * qui fait la hauteur de la page et qui DÉFILE AVEC ELLE, comme une image :
 * c'est le compositeur du navigateur qui le déplace, rien n'est redessiné
 * quand on scrolle. (Une première version redessinait un canvas fixe à
 * chaque mouvement : la toxine décrochait du texte et ça saccadait.)
 *
 * Dans le hero, rien ne change. En dessous, le nuage se prolonge en traînée
 * discrète (environ un tiers de l'intensité) qui dérive lentement d'un côté
 * à l'autre en descendant, et s'éteint avant le bloc audit.
 *
 * Coût : résolution interne basse (le nuage est flou), un seul rendu complet
 * au chargement, puis seule la bande visible (un écran de marge de chaque
 * côté) est ré-animée : 24 images/s dans le hero, 10 ailleurs, rien onglet
 * caché. Téléphone : plus bas encore. Sans WebGL matériel : rien ici, le
 * hero affiche sa nappe CSS (html[data-toxine='css']) et la page garde
 * ToxicSpread.
 */

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`;
const FS = `precision highp float;
uniform vec2 R;uniform float S;uniform float HH;uniform float VH;uniform float E;
uniform float T;uniform vec2 M;uniform float A;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f*=f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){return n(p)*.5+n(p*2.1)*.28+n(p*4.4)*.14;}
void main(){
  // Pixel en coordonnées de la page (px CSS, y depuis le haut), puis dans le
  // repère du hero (uv : y de 1 en haut du hero à 0 en bas, négatif en dessous).
  float cx=gl_FragCoord.x/S;
  float y=(R.y-gl_FragCoord.y)/S;
  float VW=R.x/S;
  vec2 uv=vec2(cx/VW,1.-y/HH);
  float ar=VW/HH;
  // Portrait (téléphone) : on étire l'axe vertical au lieu de compresser
  // l'horizontal, sinon le bruit est calibré paysage et l'écran paraît vide.
  vec2 Sc=ar>=1.?vec2(ar,1.):vec2(1.,1./ar);
  vec2 p=(uv-.5)*Sc; float t=T*.10;
  float below=smoothstep(.55*HH,1.05*HH,y);
  vec2 m=(M-.5)*Sc; float md=length(p-m); float mi=smoothstep(.55,.0,md)*(1.-below);
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
  c+=vec3(.60,.28,1.00)*smoothstep(.25,.0,md)*.22*(1.-below);
  // Dans le hero : la vignette d'origine (même rendu qu'avant).
  float vig=1.-length((uv-.5)*vec2(1.25,1.40));
  float heroMask=smoothstep(0.,.55,vig)*(1.-smoothstep(1.0*HH,1.6*HH,y));
  // Sous le hero : le même nuage, en traînée discrète qui dérive de gauche
  // à droite en descendant, et s'éteint avant la fin (E).
  float xc=.62+.26*sin((y-HH)/(1.35*VH)+.3);
  float tailMask=exp(-pow((uv.x-xc)/.30,2.))*A*smoothstep(.75*HH,1.35*HH,y)*(1.-smoothstep(E-1.2*VH,E,y));
  vec3 INK=vec3(0.051,0.043,0.078);
  c=mix(INK,c,clamp(heroMask+tailMask,0.,1.));
  gl_FragColor=vec4(c,1.);
}`;

/** Hauteur du hero et fin de la traînée (px CSS, depuis le haut de la page). */
function measure(): { hero: number; end: number } {
  const hero = document.getElementById('top');
  const audit = document.getElementById('audit');
  const top = (el: Element) => el.getBoundingClientRect().top + window.scrollY;
  const heroH = hero ? hero.getBoundingClientRect().height : window.innerHeight;
  const end = audit ? top(audit) + audit.getBoundingClientRect().height * 0.6 : document.documentElement.scrollHeight;
  return { hero: Math.max(heroH, 1), end };
}

export function ToxicField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => { setActive(true); }, []);

  useEffect(() => {
    if (!active) return;
    const c = ref.current;
    if (!c) return;
    const html = document.documentElement;
    const fallback = () => { html.dataset.toxine = 'css'; setActive(false); };
    // preserveDrawingBuffer : on ne redessine que la bande visible, le reste du
    // canvas doit garder son contenu d'une image à l'autre.
    const gl = c.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    if (!gl || isSoftwareRenderer(gl)) { fallback(); return; }

    const mk = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;
      console.warn('[toxine] shader refusé', gl.getShaderInfoLog(sh));
      return null;
    };
    const vs = mk(gl.VERTEX_SHADER, VS), fs = mk(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { fallback(); return; }
    const pg = gl.createProgram();
    if (!pg) { fallback(); return; }
    gl.attachShader(pg, vs); gl.attachShader(pg, fs); gl.linkProgram(pg);
    if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) { fallback(); return; }
    gl.useProgram(pg);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aLoc = gl.getAttribLocation(pg, 'a');
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    const u = {
      R: gl.getUniformLocation(pg, 'R'), S: gl.getUniformLocation(pg, 'S'),
      HH: gl.getUniformLocation(pg, 'HH'), VH: gl.getUniformLocation(pg, 'VH'), E: gl.getUniformLocation(pg, 'E'),
      T: gl.getUniformLocation(pg, 'T'), M: gl.getUniformLocation(pg, 'M'), A: gl.getUniformLocation(pg, 'A'),
    };
    delete html.dataset.toxine;

    // Mêmes réglages d'allègement que l'ancien hero : résolution interne
    // basse (le nuage est flou), DPR plafonné, cadence réduite sur tactile.
    const touch = (navigator.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window;
    const SC = touch ? 0.26 : 0.34;
    const DPR_CAP = touch ? 1 : 1.5;
    const FRAME_HERO = touch ? 50 : 42;
    const FRAME_IDLE = touch ? 125 : 100;
    const MAX_DIM = Math.max(2048, Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number, (gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array)[1]!)) - 1;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, cssW = 0, cssH = 0, scale = 1, heroH = 1, end = 1;
    let fullPass = true;
    // Lueur : fixe au centre du hero sur ordinateur (retour Tym : pas besoin
    // qu'elle suive la souris), elle dérive seule sur tactile.
    let mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5, lastTouch = -1e9;
    const t0 = performance.now();

    const draw = (now: number) => {
      if (touch && now - lastTouch > 2500) {
        const tt = (now - t0) * 0.001;
        tmx = 0.5 + 0.34 * Math.sin(tt * 0.23);
        tmy = 0.5 + 0.30 * Math.sin(tt * 0.15 + 1.2);
      }
      mx += (tmx - mx) * 0.09;
      my += (tmy - my) * 0.09;
      gl.uniform2f(u.R, W, H);
      gl.uniform1f(u.S, scale);
      gl.uniform1f(u.HH, heroH);
      gl.uniform1f(u.VH, window.innerHeight);
      gl.uniform1f(u.E, end);
      gl.uniform1f(u.T, still ? 0 : (now - t0) * 0.001);
      gl.uniform2f(u.M, mx, my);
      gl.uniform1f(u.A, touch ? 0.22 : 0.3);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const layout = () => {
      const w = c.clientWidth, hgt = c.clientHeight;
      if (w === cssW && Math.abs(hgt - cssH) <= 2 && W > 0) return;
      cssW = w; cssH = hgt;
      const dpr = Math.min(window.devicePixelRatio, DPR_CAP);
      // Le canvas fait toute la page : on reste sous la taille max du GPU.
      scale = Math.min(dpr * SC, MAX_DIM / Math.max(hgt, 1), MAX_DIM / Math.max(w, 1));
      W = Math.max(1, Math.round(w * scale));
      H = Math.max(1, Math.round(hgt * scale));
      c.width = W; c.height = H;
      gl.viewport(0, 0, W, H);
      ({ hero: heroH, end } = measure());
      fullPass = true;
    };
    const toHeroUv = (clientX: number, clientY: number): [number, number] =>
      [clientX / Math.max(cssW, 1), 1 - (clientY + window.scrollY) / heroH];
    const onTouch = (e: TouchEvent) => {
      lastTouch = performance.now();
      const t = e.touches[0];
      if (t) [tmx, tmy] = toHeroUv(t.clientX, t.clientY);
    };

    let raf = 0, last = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || W === 0) return;
      if (fullPass) {
        // Premier rendu (ou nouvelle taille) : toute la page, une fois.
        gl.disable(gl.SCISSOR_TEST);
        draw(now);
        fullPass = false;
        last = now;
        return;
      }
      if (still) return;
      const sy = window.scrollY, vh = window.innerHeight;
      const inHero = sy < heroH;
      if (now - last < (inHero ? FRAME_HERO : FRAME_IDLE)) return;
      last = now;
      // Seule la bande visible (plus un écran de marge de chaque côté) est
      // ré-animée ; le reste garde son dernier rendu, qui ne bouge presque pas.
      const top = Math.max(0, sy - vh), bottom = Math.min(cssH, sy + 2 * vh);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, Math.max(0, Math.floor(H - bottom * scale)), W, Math.ceil((bottom - top) * scale) + 1);
      draw(now);
    };

    layout();
    raf = requestAnimationFrame(frame);
    const main = c.parentElement;
    const ro = main ? new ResizeObserver(() => layout()) : null;
    if (main && ro) ro.observe(main);
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('touchmove', onTouch);
    };
  }, [active]);

  if (!active) return null;
  // Dans <main> (relative) : inset-0 lui donne la hauteur de la page, et le
  // z négatif le met sous tout le contenu. Il défile avec la page.
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      style={{ display: 'block' }}
    />
  );
}
