'use client';

import { useEffect, useRef } from 'react';

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
  c*=smoothstep(0.,.55,vig);
  gl_FragColor=vec4(c,1);
}`;

interface ToxicCanvasProps {
  className?: string;
}

export function ToxicCanvas({ className }: ToxicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const gl = c.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
    if (!gl) return;

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

    const SC = 0.6;
    let W = 0, H = 0, mx = 0, my = 0, tmx = 0, tmy = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      W = Math.round(c.clientWidth * dpr * SC);
      H = Math.round(c.clientHeight * dpr * SC);
      c.width = W;
      c.height = H;
      gl.viewport(0, 0, W, H);
    };

    const cssToBuf = (cx: number, cy: number): [number, number] => {
      const r = c.getBoundingClientRect();
      const s = Math.min(window.devicePixelRatio, 2) * SC;
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
    const frame = () => {
      mx += (tmx - mx) * 0.07;
      my += (tmy - my) * 0.07;
      gl.uniform2f(uR, W, H);
      gl.uniform1f(uT, (performance.now() - t0) * 0.001);
      gl.uniform2f(uM, mx, my);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      c.removeEventListener('mousemove', onMove);
      c.removeEventListener('mouseleave', onLeave);
      c.removeEventListener('touchmove', onTouch);
      c.removeEventListener('touchend', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
