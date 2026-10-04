'use client';

import { useEffect, useRef, useState } from 'react';
import { isSoftwareRenderer } from '../ToxicCanvas';

/**
 * Le ruban de toxine : la même matière que le shader du hero (bruit fbm,
 * filaments magenta et violet), mais tirée en un ruban qui part de la toxine
 * du hero et serpente de section en section jusqu'au bloc audit.
 *
 * Il est dessiné en coordonnées de la PAGE : chaque image lit window.scrollY
 * et le ruban reste cloué au contenu, en 1 pour 1, sans ressort (le ressort,
 * c'est ce qui donnait la sensation « à la traîne » de l'ancienne toxine liée
 * au scroll). La courbe passe par un point par section (calculé depuis le
 * DOM, recalculé au resize et quand la page change de hauteur), en alternant
 * gauche et droite comme un vendeur qui passe d'un rayon à l'autre.
 *
 * Coût : un shader plein écran à basse résolution interne, 24 images/s en
 * défilement, 10 au repos (les filaments respirent), rien quand l'onglet est
 * caché. Téléphone : résolution plus basse et cadence réduite. Sans WebGL
 * matériel : pas de ruban, la nappe fixe (ToxicSpread) reste.
 */

const MAX_POINTS = 14;
// Le tableau envoyé au shader est le tableau des points avec le premier et le
// dernier doublés aux deux bouts : en WebGL 1, un shader de fragments ne peut
// indexer un tableau qu'avec des constantes ou l'indice de boucle, pas avec
// « N-1 » ni « i-1 ». Avec ce rembourrage, le segment i va de Q[i+1] à Q[i+2]
// et ses voisins sont Q[i] et Q[i+3] : que des indices permis.
const Q_LEN = MAX_POINTS + 2;

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`;
const FS = `precision highp float;
uniform vec2 R;uniform float S;uniform float Y;uniform float T;uniform float W;
uniform int N;uniform vec2 Q[${Q_LEN}];uniform vec4 E;uniform float K;uniform float I;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f*=f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){return n(p)*.5+n(p*2.1)*.28+n(p*4.4)*.14;}
void main(){
  // Position du pixel dans la page (px CSS) : x depuis la gauche, y depuis le haut.
  float cx=gl_FragCoord.x/S;
  float y=Y+(R.y-gl_FragCoord.y)/S;
  if(y<E.x||y>E.w){gl_FragColor=vec4(0.);return;}
  // Courbe de Catmull-Rom paramétrée par y : x(y) et sa pente.
  float xc=Q[1].x, dx=0.;
  for(int i=0;i<${Q_LEN - 3};i++){
    if(i>N-2)break;
    vec2 a=Q[i+1], b=Q[i+2];
    if(y>=a.y&&y<=b.y){
      vec2 pa=Q[i], pb=Q[i+3];
      float L=max(b.y-a.y,1.);
      float t=(y-a.y)/L;
      float m0=(b.x-pa.x)/max(b.y-pa.y,1.)*L;
      float m1=(pb.x-a.x)/max(pb.y-a.y,1.)*L;
      float t2=t*t,t3=t2*t;
      xc=(2.*t3-3.*t2+1.)*a.x+(t3-2.*t2+t)*m0+(-2.*t3+3.*t2)*b.x+(t3-t2)*m1;
      dx=((6.*t2-6.*t)*a.x+(3.*t2-4.*t+1.)*m0+(-6.*t2+6.*t)*b.x+(3.*t2-2.*t)*m1)/L;
    }
  }
  float d=(cx-xc)/sqrt(1.+dx*dx);
  // Enveloppe : naît dans la toxine du hero, s'éteint dans le bloc audit.
  float env=smoothstep(E.x,E.y,y)*(1.-smoothstep(E.z,E.w,y));
  // Fibres longues : le bruit est étiré le long du ruban (u) et serré en
  // travers (v), bandes larges pour rester douces à basse résolution.
  float u=y*.0042-T*.2, v=d*.016;
  float n1=fb(vec2(u*.45,v*1.2));
  float n2=fb(vec2(u*.9+3.1,v*3.6-1.7)+n1*.35);
  float strands=smoothstep(.40,.5,n2)*smoothstep(.60,.5,n2);
  float broad=smoothstep(.25,.72,n1);
  float g=exp(-d*d/(W*W));
  float halo=exp(-d*d/(W*W*6.));
  vec3 vio=vec3(.545,.302,1.), mag=vec3(.91,.29,1.), core=vec3(1.,.82,1.), mint=vec3(.38,1.,.72);
  vec3 c=vio*halo*.06+vio*g*broad*.30+mag*g*strands*.85+core*g*g*strands*broad*.45+mint*g*g*strands*K;
  c*=env*I;
  float al=clamp(max(c.r,max(c.g,c.b)),0.,1.);
  gl_FragColor=vec4(c,al);
}`;

/** Points de passage (px CSS, coordonnées de la page), un par section. */
function waypoints(vw: number, touch: boolean): Array<[number, number]> {
  const main = document.querySelector('main');
  if (!main) return [];
  const top = (el: Element) => el.getBoundingClientRect().top + window.scrollY;
  const sections = [...main.querySelectorAll(':scope > section')];
  const hero = sections.find((s) => s.id === 'top');
  const audit = sections.find((s) => s.id === 'audit');
  if (!hero || !audit) return [];
  const heroTop = top(hero), heroH = hero.getBoundingClientRect().height;
  const middle = sections.filter((s) => s !== hero && s !== audit && s.getBoundingClientRect().height > 160 && top(s) < top(audit));
  // Côtés : la toxine du hero est à droite, on part de là puis on alterne.
  // Deux points par section (au quart et aux trois quarts) : le ruban longe
  // la section d'un côté et vire ENTRE les sections, pas derrière les titres.
  const left = touch ? 0.26 : 0.21, right = touch ? 0.74 : 0.8;
  const pts: Array<[number, number]> = [
    [vw * (touch ? 0.6 : 0.64), heroTop + heroH * 0.38],
    [vw * (touch ? 0.66 : 0.72), heroTop + heroH * 0.88],
  ];
  middle.forEach((s, i) => {
    const h = s.getBoundingClientRect().height, y = top(s);
    const x = vw * (i % 2 === 0 ? left : right);
    pts.push([x, y + h * 0.28], [x, y + h * 0.72]);
  });
  const auditTop = top(audit), auditH = audit.getBoundingClientRect().height;
  pts.push([vw * 0.5, auditTop + auditH * 0.22]);
  pts.push([vw * 0.5, auditTop + auditH * 0.62]);
  // Trop de sections pour le shader : on garde le début et la fin.
  return pts.length <= MAX_POINTS ? pts : [...pts.slice(0, MAX_POINTS - 2), ...pts.slice(-2)];
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ToxicRibbon() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => { setActive(true); }, []);

  useEffect(() => {
    if (!active) return;
    const c = ref.current;
    if (!c) return;
    const gl = c.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' });
    if (!gl || isSoftwareRenderer(gl)) { setActive(false); return; }

    const mk = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;
      console.warn('[toxine] ruban : shader refusé', gl.getShaderInfoLog(sh));
      return null;
    };
    const vs = mk(gl.VERTEX_SHADER, VS), fs = mk(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;
    const pg = gl.createProgram();
    if (!pg) return;
    gl.attachShader(pg, vs); gl.attachShader(pg, fs); gl.linkProgram(pg);
    if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) return;
    gl.useProgram(pg);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aLoc = gl.getAttribLocation(pg, 'a');
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    const u = {
      R: gl.getUniformLocation(pg, 'R'), S: gl.getUniformLocation(pg, 'S'), Y: gl.getUniformLocation(pg, 'Y'),
      T: gl.getUniformLocation(pg, 'T'), W: gl.getUniformLocation(pg, 'W'), N: gl.getUniformLocation(pg, 'N'),
      Q: gl.getUniformLocation(pg, 'Q'), E: gl.getUniformLocation(pg, 'E'), K: gl.getUniformLocation(pg, 'K'),
      I: gl.getUniformLocation(pg, 'I'),
    };
    gl.clearColor(0, 0, 0, 0);

    const touch = (navigator.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window;
    // Des fibres fines demandent plus de résolution que la nappe du hero
    // (sinon elles pixellisent) ; le ruban reste bien moins cher qu'à 100 %.
    const SC = touch ? 0.45 : 0.5;
    const DPR_CAP = touch ? 1 : 1.5;
    const FRAME_SCROLL = touch ? 55 : 42;
    const FRAME_IDLE = 100;
    const still = reducedMotion();
    let W = 0, H = 0, scale = 1;
    let pts = new Float32Array(Q_LEN * 2), n = 0;
    let env = new Float32Array(4);

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio, DPR_CAP);
      scale = dpr * SC;
      W = Math.max(1, Math.round(c.clientWidth * scale));
      H = Math.max(1, Math.round(c.clientHeight * scale));
      c.width = W; c.height = H;
      gl.viewport(0, 0, W, H);
      const list = waypoints(c.clientWidth, touch);
      n = list.length;
      pts = new Float32Array(Q_LEN * 2);
      if (n >= 3) {
        const padded = [list[0]!, ...list, list[n - 1]!];
        while (padded.length < Q_LEN) padded.push(list[n - 1]!);
        padded.forEach(([x, y], i) => { pts[i * 2] = x; pts[i * 2 + 1] = y; });
        env = new Float32Array([list[0]![1], list[1]![1], list[n - 2]![1], list[n - 1]![1]]);
      }
      dirty = true;
    };

    let raf = 0, last = 0, lastScrollY = -1, lastScrollAt = 0, dirty = true;
    const t0 = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || n < 3) return;
      const sy = window.scrollY;
      if (sy !== lastScrollY) { lastScrollY = sy; lastScrollAt = now; dirty = true; }
      const scrolling = now - lastScrollAt < 400;
      const minGap = scrolling ? FRAME_SCROLL : FRAME_IDLE;
      if (!dirty && still) return;
      if (now - last < minGap) return;
      last = now; dirty = false;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.R, W, H);
      gl.uniform1f(u.S, scale);
      gl.uniform1f(u.Y, sy);
      gl.uniform1f(u.T, still ? 0 : (now - t0) * 0.001);
      gl.uniform1f(u.W, touch ? 72 : 115);
      // Téléphone : le texte occupe toute la largeur, le ruban passe derrière
      // lui, il doit rester un halo, pas un mur de lumière.
      gl.uniform1f(u.I, touch ? 0.55 : 0.85);
      gl.uniform1i(u.N, n);
      gl.uniform2fv(u.Q, pts);
      gl.uniform4fv(u.E, env);
      gl.uniform1f(u.K, 0.18);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    layout();
    raf = requestAnimationFrame(frame);
    // Hauteur de page qui change (formulaire qui apparaît, images) : on
    // recalcule les points de passage.
    const main = document.querySelector('main');
    const ro = main ? new ResizeObserver(() => layout()) : null;
    if (main && ro) ro.observe(main);
    let resizeTimer = 0;
    const onResize = () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(layout, 120); };
    window.addEventListener('resize', onResize);
    const onVisible = () => { dirty = true; };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[4] h-full w-full"
      style={{ display: 'block' }}
    />
  );
}
