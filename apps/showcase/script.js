/* ═══════════════════════════════════════════════════════════
   SHIMMER — V2
   One scroll = one action = one feature
   ═══════════════════════════════════════════════════════════ */

/* ════════════════════ HERO TOXIN (unchanged) ════════════════════ */
;(function () {
  const c = document.getElementById('toxin'); if (!c) return;
  const gl = c.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
  if (!gl) { fallback(c); return; }
  const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`;
  const FS = `precision highp float;uniform vec2 R;uniform float T;uniform vec2 M;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f*=f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){return n(p)*.5+n(p*2.1)*.28+n(p*4.4)*.14;}
void main(){vec2 uv=gl_FragCoord.xy/R;float ar=R.x/R.y;vec2 p=(uv-.5)*vec2(ar,1.);float t=T*.12;
vec2 m=(M/R-.5)*vec2(ar,1.);float md=length(p-m);float mi=smoothstep(.55,.0,md);
float n1=fb(p*2.8+vec2(t*.6,t*.25));float n2=fb(p*3.2-vec2(t*.4,-t*.35)+m*.25);
float nw=fb(p*2.2+vec2(n1*.6,n2*.4)+m*mi*.6);vec3 c=vec3(.022,.007,.05);
c+=vec3(.11,.035,.20)*smoothstep(.18,.65,n1)*.65;c+=vec3(.22,.07,.45)*smoothstep(.3,.72,nw)*.55;
float v=smoothstep(.43,.48,nw)*smoothstep(.53,.48,nw);c+=vec3(.5,.18,.9)*v*2.;
c+=vec3(.3,.1,.6)*mi*.5;c+=vec3(.6,.12,.5)*mi*smoothstep(.35,.6,n2)*.55;
c+=vec3(.08,.5,.6)*mi*smoothstep(.5,.68,n1)*.25;c+=vec3(.55,.25,.95)*smoothstep(.25,.0,md)*.2;
float vig=1.-length((uv-.5)*vec2(1.3,1.5));c*=smoothstep(0.,.55,vig);gl_FragColor=vec4(c,1);}`;
  function mkS(t,s){const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);return gl.getShaderParameter(sh,gl.COMPILE_STATUS)?sh:null;}
  const vs=mkS(gl.VERTEX_SHADER,VS),fs=mkS(gl.FRAGMENT_SHADER,FS);
  if(!vs||!fs){fallback(c);return;}
  const pg=gl.createProgram();gl.attachShader(pg,vs);gl.attachShader(pg,fs);gl.linkProgram(pg);
  if(!gl.getProgramParameter(pg,gl.LINK_STATUS)){fallback(c);return;}
  gl.useProgram(pg);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const a=gl.getAttribLocation(pg,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  const uR=gl.getUniformLocation(pg,'R'),uT=gl.getUniformLocation(pg,'T'),uM=gl.getUniformLocation(pg,'M');
  let W,H,mx,my,tmx,tmy;const SC=.6;
  function resize(){const dpr=Math.min(devicePixelRatio,2);W=Math.round(c.clientWidth*dpr*SC);H=Math.round(c.clientHeight*dpr*SC);c.width=W;c.height=H;gl.viewport(0,0,W,H);}
  function css2buf(cx,cy){const r=c.getBoundingClientRect();const s=Math.min(devicePixelRatio,2)*SC;return [(cx-r.left)*s,(r.height-(cy-r.top))*s];}
  c.addEventListener('mousemove',e=>{[tmx,tmy]=css2buf(e.clientX,e.clientY);});
  c.addEventListener('mouseleave',()=>{tmx=W*.5;tmy=H*.5;});
  c.addEventListener('touchmove',e=>{[tmx,tmy]=css2buf(e.touches[0].clientX,e.touches[0].clientY);},{passive:true});
  c.addEventListener('touchend',()=>{tmx=W*.5;tmy=H*.5;});
  resize();mx=tmx=W*.5;my=tmy=H*.5;window.addEventListener('resize',resize);
  const t0=performance.now();
  (function frame(){mx+=(tmx-mx)*.07;my+=(tmy-my)*.07;
    gl.uniform2f(uR,W,H);gl.uniform1f(uT,(performance.now()-t0)*.001);gl.uniform2f(uM,mx,my);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);requestAnimationFrame(frame);})();
})();
function fallback(c) {
  const ctx = c.getContext('2d'); if (!ctx) return;
  let W, H;
  function resize() { W = c.width = c.clientWidth; H = c.height = c.clientHeight; }
  resize(); window.addEventListener('resize', resize);
  (function draw() { ctx.fillStyle = '#06020e'; ctx.fillRect(0, 0, W, H); requestAnimationFrame(draw); })();
}

/* ════════════════════ NAV ════════════════════ */
;(function () {
  const nav = document.getElementById('nav'); if (!nav) return;
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60));
})();

/* ════════════════════ MAIN ════════════════════ */
window.addEventListener('load', () => {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('GSAP missing — fallback to basic reveal');
    initBasicReveal();
    initLive();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* Lenis smooth scroll */
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({
      duration: 1.1,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  initAct1();
  initAct2();
  initAct3();
  initAct4();
  initAct5();
  initLive();
});

/* ════════════════════ ACT 1 — GRAFT (avant/après) ════════════════════ */
function initAct1() {
  const section = document.querySelector('.act-graft'); if (!section) return;
  const before = section.querySelector('.graft-before');
  const after = section.querySelector('.graft-after');
  const arrow = section.querySelector('.graft-arrow');
  const figBefore = section.querySelector('#grBefore');
  const figAfter = section.querySelector('#grAfter');

  // Pin the section, scrub through 2 viewports
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=800',
    pin: '.act-graft .act-pin',
    pinSpacing: true,
    scrub: false,
    onUpdate: self => {
      const p = self.progress;
      // p < 0.35 : "before" reveals
      // p > 0.4 : arrow draws
      // p > 0.6 : "after" reveals
      if (p > 0.1) before.classList.add('lit'); else before.classList.remove('lit');
      if (p > 0.4) arrow.classList.add('lit'); else arrow.classList.remove('lit');
      if (p > 0.6) after.classList.add('lit'); else after.classList.remove('lit');
    },
  });

  // Count up "21" and "5" when section enters viewport
  let started = false;
  ScrollTrigger.create({
    trigger: section,
    start: 'top 70%',
    onEnter: () => {
      if (started) return;
      started = true;
      countUp(figBefore, 21, 900);
      setTimeout(() => countUp(figAfter, 5, 700), 1400);
    },
  });
}

function countUp(el, target, dur) {
  const start = performance.now();
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(ease * target);
    if (p < 1) requestAnimationFrame(tick);
  })(performance.now());
}

/* ════════════════════ ACT 2 — EXACT (typing + scan + result) ════════════════════ */
function initAct2() {
  const section = document.querySelector('.act-exact'); if (!section) return;
  const typed = section.querySelector('#exactTyped');
  const caret = section.querySelector('#exactCaret');
  const scanner = section.querySelector('#exactScanner');
  const result = section.querySelector('#exactResult');
  const ms = section.querySelector('#exactMs');
  const full = 'le Chablis William Fèvre';

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=900',
    pin: '.act-exact .act-pin',
    pinSpacing: true,
    scrub: false,
  });

  let played = false;
  ScrollTrigger.create({
    trigger: section,
    start: 'top 60%',
    onEnter: () => {
      if (played) return;
      played = true;
      // 1. Type the query
      let i = 0;
      const typeId = setInterval(() => {
        if (i < full.length) {
          typed.textContent += full[i++];
        } else {
          clearInterval(typeId);
          caret.style.opacity = '0';
          // 2. Scanner sweeps the catalog
          setTimeout(() => scanner.classList.add('scan'), 200);
          // 3. Result appears
          setTimeout(() => {
            result.classList.add('show');
            countUp(ms, 9, 600);
          }, 1500);
        }
      }, 55);
    },
  });
}

/* ════════════════════ ACT 3 — QUALIFICATION (scrubbed) ════════════════════ */
function initAct3() {
  const section = document.querySelector('.act-qual'); if (!section) return;
  const thread = section.querySelector('#qualThread');
  const pick = section.querySelector('#qualPick');

  const beats = [
    { who: 'u', text: 'Un rouge pour un magret entre amis.' },
    { who: 'b', text: 'Tope ! Pour quelle occasion ?' },
    { who: 'u', text: 'Dîner ce week-end, rien de pompeux.' },
    { who: 'b', text: 'Tu as un budget en tête ?' },
    { who: 'u', text: '30 à 50 euros.' },
    { who: 'b', text: 'Pile poil. Voilà.' },
  ];

  const fills = {
    0: { key: 'rayon', value: 'Vin rouge' },
    1: { key: 'plat', value: 'Magret de canard' },
    2: { key: 'occasion', value: 'Repas amis' },
    4: { key: 'budget', value: '30–50 €' },
  };

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=' + (beats.length * 250),
    pin: '.act-qual .act-pin',
    pinSpacing: true,
    scrub: false,
    onUpdate: self => {
      const p = self.progress;
      const visible = Math.floor(p * beats.length * 1.05);

      // Render beats
      while (thread.children.length < Math.min(visible, beats.length)) {
        const idx = thread.children.length;
        const b = beats[idx];
        const el = document.createElement('div');
        el.className = `qual-bub qual-bub-${b.who}`;
        el.textContent = b.text;
        thread.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        // Fill criterion
        const fill = fills[idx];
        if (fill) {
          const li = section.querySelector(`.qual-crit li[data-key="${fill.key}"]`);
          if (li) { li.classList.add('filled'); li.querySelector('span').textContent = fill.value; }
        }
      }
      while (thread.children.length > visible) {
        thread.removeChild(thread.lastChild);
        const idx = thread.children.length;
        const fill = fills[idx];
        if (fill) {
          const li = section.querySelector(`.qual-crit li[data-key="${fill.key}"]`);
          if (li) { li.classList.remove('filled'); li.querySelector('span').textContent = ''; }
        }
      }

      // Reveal pick when all filled
      if (thread.children.length >= beats.length) pick.classList.add('show');
      else pick.classList.remove('show');
    },
  });
}

/* ════════════════════ ACT 4 — SIMILARITY ════════════════════ */
function initAct4() {
  const section = document.querySelector('.act-similar'); if (!section) return;
  const tokens = section.querySelectorAll('.sim-ref-tokens span');
  const links = section.querySelectorAll('.sim-link');
  const cards = section.querySelectorAll('.sim-card');

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=800',
    pin: '.act-similar .act-pin',
    pinSpacing: true,
    scrub: false,
  });

  let played = false;
  ScrollTrigger.create({
    trigger: section,
    start: 'top 60%',
    onEnter: () => {
      if (played) return; played = true;
      tokens.forEach((t, i) => setTimeout(() => t.classList.add('show'), 150 + i * 200));
      setTimeout(() => links.forEach((l, i) => setTimeout(() => l.classList.add('show'), i * 200)), 1000);
      setTimeout(() => cards.forEach((c, i) => setTimeout(() => c.classList.add('show'), i * 180)), 1500);
    },
  });
}

/* ════════════════════ ACT 5 — BRAND VOICE ════════════════════ */
function initAct5() {
  const section = document.querySelector('.act-voice'); if (!section) return;
  const rows = section.querySelectorAll('.voice-row');

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=1000',
    pin: '.act-voice .act-pin',
    pinSpacing: true,
    scrub: false,
  });

  let played = false;
  ScrollTrigger.create({
    trigger: section,
    start: 'top 60%',
    onEnter: () => {
      if (played) return; played = true;
      rows.forEach((row, i) => {
        setTimeout(() => {
          row.classList.add('show');
          const msg = row.querySelector('.voice-msg');
          const text = msg.dataset.msg || '';
          msg.textContent = '';
          msg.classList.add('typing');
          let idx = 0;
          (function type() {
            if (idx < text.length) {
              msg.textContent += text[idx++];
              setTimeout(type, 16 + Math.random() * 20);
            } else {
              msg.classList.remove('typing');
            }
          })();
        }, i * 900);
      });
    },
  });
}

/* ════════════════════ LIVE (real API) ════════════════════ */
function initLive() {
  const chat = document.getElementById('liveChat');
  const input = document.getElementById('liveInput');
  const send = document.getElementById('liveSend');
  const suggs = document.querySelectorAll('#liveSugg button');
  if (!chat || !input || !send) return;

  const API_URL = window.location.port === '8080' ? 'http://localhost:3003' : '/shimmer';
  const API_KEY = 'sk_fc215c787b2c48d9808a4638e2d51899';

  const history = [];
  let known = {};
  let token = null;
  let busy = false;

  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function add(text, who) {
    const d = document.createElement('div');
    d.className = 'live-msg ' + who;
    d.textContent = text;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
  }
  function addProduct(p) {
    const c = document.createElement('div');
    c.className = 'live-product';
    c.innerHTML = `<p class="lp-name">${esc(p.name)}</p><p class="lp-brand">${esc(p.brand || '')}</p><p class="lp-meta">${esc((p.reason || '').slice(0, 120))}</p><span class="lp-price">${esc(p.price)}</span>`;
    chat.appendChild(c);
    chat.scrollTop = chat.scrollHeight;
  }
  function addTyping() {
    const t = document.createElement('div');
    t.className = 'live-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    chat.appendChild(t);
    chat.scrollTop = chat.scrollHeight;
    return t;
  }

  async function ask(q) {
    if (busy || !q.trim()) return;
    busy = true;
    input.disabled = true; send.disabled = true;
    add(q.trim(), 'u');
    history.push({ role: 'user', content: q.trim() });
    const typing = addTyping();
    try {
      const r = await fetch(API_URL + '/api/search/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },
        body: JSON.stringify({ message: q.trim(), history: history.slice(-6), knownCriteria: known, sessionToken: token }),
      });
      const data = await r.json();
      typing.remove();
      add(data.message || 'Je n’ai pas compris.', 'b');
      history.push({ role: 'assistant', content: data.message || '' });
      known = data.knownCriteria || known;
      token = data.sessionToken || token;
      if (data.highlightedProducts && data.highlightedProducts.length) {
        data.highlightedProducts.slice(0, 1).forEach(addProduct);
      }
    } catch (err) {
      typing.remove();
      add('Erreur : ' + (err.message || 'connexion'), 'b');
    }
    busy = false;
    input.disabled = false; send.disabled = false;
    input.focus();
  }

  send.addEventListener('click', () => { ask(input.value); input.value = ''; });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { ask(input.value); input.value = ''; } });
  suggs.forEach(b => b.addEventListener('click', () => ask(b.textContent)));
}

/* ════════════════════ FALLBACK ════════════════════ */
function initBasicReveal() {
  const items = document.querySelectorAll('.graft-before, .graft-after, .graft-arrow, .sim-ref-tokens span, .sim-link, .sim-card, .voice-row, .qual-pick, .exact-result');
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('lit'); e.target.classList.add('show'); io.unobserve(e.target); } });
  }, { threshold: .15 });
  items.forEach(el => io.observe(el));
}
