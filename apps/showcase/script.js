/* ═══════════════════════════════════════════════════════════
   SHIMMER — Tutorial-scroll showcase
   ═══════════════════════════════════════════════════════════ */

// ════════════════════════════════════════════
// HERO TOXIN — WebGL (unchanged, preserved)
// ════════════════════════════════════════════
;(function () {
  const c = document.getElementById('toxin');
  if (!c) return;
  const gl = c.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
  if (!gl) { fallback(c); return; }

  const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`;
  const FS = `
precision highp float;
uniform vec2 R; uniform float T; uniform vec2 M;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f*=f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){return n(p)*.5+n(p*2.1)*.28+n(p*4.4)*.14;}
void main(){
  vec2 uv=gl_FragCoord.xy/R; float ar=R.x/R.y;
  vec2 p=(uv-.5)*vec2(ar,1.); float t=T*.12;
  vec2 m=(M/R-.5)*vec2(ar,1.); float md=length(p-m);
  float mi=smoothstep(.55,.0,md);
  float n1=fb(p*2.8+vec2(t*.6,t*.25));
  float n2=fb(p*3.2-vec2(t*.4,-t*.35)+m*.25);
  float nw=fb(p*2.2+vec2(n1*.6,n2*.4)+m*mi*.6);
  vec3 c=vec3(.022,.007,.05);
  c+=vec3(.11,.035,.20)*smoothstep(.18,.65,n1)*.65;
  c+=vec3(.22,.07,.45)*smoothstep(.3,.72,nw)*.55;
  float v=smoothstep(.43,.48,nw)*smoothstep(.53,.48,nw);
  c+=vec3(.5,.18,.9)*v*2.;
  c+=vec3(.3,.1,.6)*mi*.5;
  c+=vec3(.6,.12,.5)*mi*smoothstep(.35,.6,n2)*.55;
  c+=vec3(.08,.5,.6)*mi*smoothstep(.5,.68,n1)*.25;
  c+=vec3(.55,.25,.95)*smoothstep(.25,.0,md)*.2;
  float vig=1.-length((uv-.5)*vec2(1.3,1.5));
  c*=smoothstep(0.,.55,vig);
  gl_FragColor=vec4(c,1);
}`;

  function mkS(t, s) {
    const sh = gl.createShader(t);
    gl.shaderSource(sh, s); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { gl.deleteShader(sh); return null; }
    return sh;
  }
  const vs = mkS(gl.VERTEX_SHADER, VS), fs = mkS(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { fallback(c); return; }
  const pg = gl.createProgram();
  gl.attachShader(pg, vs); gl.attachShader(pg, fs); gl.linkProgram(pg);
  if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) { fallback(c); return; }
  gl.useProgram(pg);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(pg, 'a');
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pg, 'R');
  const uT = gl.getUniformLocation(pg, 'T');
  const uM = gl.getUniformLocation(pg, 'M');
  let W, H, mx, my, tmx, tmy;
  const SC = .6;
  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    W = Math.round(c.clientWidth * dpr * SC);
    H = Math.round(c.clientHeight * dpr * SC);
    c.width = W; c.height = H;
    gl.viewport(0, 0, W, H);
  }
  function css2buf(cx, cy) {
    const r = c.getBoundingClientRect();
    const s = Math.min(devicePixelRatio, 2) * SC;
    return [(cx - r.left) * s, (r.height - (cy - r.top)) * s];
  }
  c.addEventListener('mousemove', e => { [tmx, tmy] = css2buf(e.clientX, e.clientY); });
  c.addEventListener('mouseleave', () => { tmx = W * .5; tmy = H * .5; });
  c.addEventListener('touchmove', e => { [tmx, tmy] = css2buf(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  c.addEventListener('touchend', () => { tmx = W * .5; tmy = H * .5; });
  resize();
  mx = tmx = W * .5; my = tmy = H * .5;
  window.addEventListener('resize', resize);
  const t0 = performance.now();
  ;(function frame() {
    mx += (tmx - mx) * .07;
    my += (tmy - my) * .07;
    gl.uniform2f(uR, W, H);
    gl.uniform1f(uT, (performance.now() - t0) * .001);
    gl.uniform2f(uM, mx, my);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  })();
})();

function fallback(c) {
  const ctx = c.getContext('2d'); if (!ctx) return;
  let W, H, mx = 0, my = 0;
  function resize() { W = c.width = c.clientWidth; H = c.height = c.clientHeight; }
  resize(); window.addEventListener('resize', resize);
  c.addEventListener('mousemove', e => { const r = c.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
  c.addEventListener('mouseleave', () => { mx = W * .5; my = H * .5; });
  const blobs = [];
  for (let i = 0; i < 14; i++) {
    blobs.push({ x: Math.random() * 1920, y: Math.random() * 1080, r: 120 + Math.random() * 250,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, hue: 265 + Math.random() * 30, a: .05 + Math.random() * .08 });
  }
  ;(function draw() {
    ctx.fillStyle = '#06020e'; ctx.fillRect(0, 0, W, H);
    for (const b of blobs) {
      const dx = b.x - mx, dy = b.y - my, d = Math.hypot(dx, dy);
      if (d < 300 && d > 0) { b.vx += dx / d * .015; b.vy += dy / d * .015; }
      b.x += b.vx; b.y += b.vy; b.vx *= .99; b.vy *= .99;
      if (b.x < -b.r) b.x = W + b.r; if (b.x > W + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = H + b.r; if (b.y > H + b.r) b.y = -b.r;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, `hsla(${b.hue},70%,35%,${b.a})`); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    requestAnimationFrame(draw);
  })();
}

// ════════════════════════════════════════════
// TOXIC BLEED — Particles that drift from hero into the next section
// ════════════════════════════════════════════
;(function () {
  const c = document.getElementById('bleed');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H;
  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    W = c.width = c.clientWidth * dpr;
    H = c.height = c.clientHeight * dpr;
    c.style.height = c.clientWidth * .35 + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  // Particles drift down, fade out
  const N = 26;
  const blobs = [];
  for (let i = 0; i < N; i++) {
    blobs.push({
      x: Math.random() * 1, y: -Math.random() * .4,
      r: 30 + Math.random() * 80,
      vy: .0004 + Math.random() * .0008,
      vx: (Math.random() - .5) * .0006,
      hue: 265 + Math.random() * 30,
      a: .05 + Math.random() * .08,
    });
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      b.x += b.vx; b.y += b.vy;
      if (b.y > 1.2) { b.y = -.3; b.x = Math.random(); }
      const px = b.x * W, py = b.y * H, pr = b.r * (W / 1200);
      const fade = 1 - Math.min(1, Math.max(0, (b.y - .2) / .8));
      const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, `hsla(${b.hue}, 80%, 55%, ${b.a * fade})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }
  frame();
})();

// ════════════════════════════════════════════
// NAV
// ════════════════════════════════════════════
;(function () {
  const nav = document.getElementById('nav');
  const burger = document.getElementById('navBurger');
  const links = document.getElementById('navLinks');
  if (!nav) return;
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60));
  if (burger && links) {
    burger.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }
})();

// ════════════════════════════════════════════
// SCROLL ANIMATIONS — GSAP + Lenis
// ════════════════════════════════════════════
window.addEventListener('load', () => {
  // Wait for GSAP/Lenis to load
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('GSAP not loaded; falling back to basic animations');
    initBasicReveal();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Lenis smooth scroll
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({
      duration: 1.15,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // ── INTRO transition: lead text reveal at scroll ──
  gsap.from('.intro .lead', {
    scrollTrigger: { trigger: '.intro', start: 'top 70%', end: 'bottom 30%', scrub: 1 },
    opacity: 0, y: 60,
  });
  gsap.from('.intro .lead-sub', {
    scrollTrigger: { trigger: '.intro .lead-sub', start: 'top 80%', end: 'top 40%', scrub: 1 },
    opacity: 0, y: 30,
  });

  // ── STEP 1: WORKFLOW (pinned, 4 nodes light up sequentially) ──
  initWorkflow();

  // ── STEP 2: EXACT MATCH ──
  initExact();

  // ── STEP 3: QUALIFICATION (pinned, chat + criteria fill in lockstep) ──
  initQualification();

  // ── STEP 4: SIMILARITY ──
  initSimilarity();

  // ── STEP 5: BRAND VOICE ──
  initVoice();

  // ── LIVE DEMO ──
  initLive();
});

// ════════════════════════════════════════════
// STEP 1 — WORKFLOW
// ════════════════════════════════════════════
function initWorkflow() {
  const section = document.querySelector('.step-graft');
  if (!section) return;
  const nodes = section.querySelectorAll('.wf-node');
  const lines = section.querySelectorAll('.wf-line');

  // Pin the section while user scrolls through 4 phases
  ScrollTrigger.create({
    trigger: section,
    start: 'top top+=60',
    end: '+=' + (nodes.length * 220),
    pin: '.step-graft .step-pin',
    pinSpacing: true,
    scrub: false,
    onUpdate: self => {
      const progress = self.progress;
      // Sequential lighting: each node lights at its threshold
      nodes.forEach((node, i) => {
        const threshold = (i + 0.4) / nodes.length;
        if (progress >= threshold) node.classList.add('lit');
        else node.classList.remove('lit');
      });
      lines.forEach((line, i) => {
        const threshold = (i + 1) / nodes.length;
        if (progress >= threshold) line.classList.add('lit');
        else line.classList.remove('lit');
      });
    },
  });
}

// ════════════════════════════════════════════
// STEP 2 — EXACT MATCH
// ════════════════════════════════════════════
function initExact() {
  const section = document.querySelector('.step-exact');
  if (!section) return;
  const textEl = section.querySelector('#exactText');
  const caretEl = section.querySelector('#exactCaret');
  const replyEl = section.querySelector('#exactReply');
  const msEl = section.querySelector('#exactMs');
  const fullText = 'Je veux le Chablis William Fèvre';

  let played = false;
  ScrollTrigger.create({
    trigger: section,
    start: 'top 60%',
    onEnter: () => {
      if (played) return;
      played = true;
      // Type the query
      let i = 0;
      caretEl.style.display = 'inline-block';
      const typeInterval = setInterval(() => {
        if (i < fullText.length) {
          textEl.textContent += fullText[i++];
        } else {
          clearInterval(typeInterval);
          // Hide caret
          caretEl.style.opacity = '0';
          // Reveal product after 600ms
          setTimeout(() => {
            replyEl.classList.add('lit');
            // Count up ms
            const target = 9;
            const dur = 800;
            const start = performance.now();
            (function tick(now) {
              const p = Math.min((now - start) / dur, 1);
              const ease = 1 - Math.pow(1 - p, 3);
              msEl.textContent = Math.round(ease * target);
              if (p < 1) requestAnimationFrame(tick);
            })(performance.now());
          }, 500);
        }
      }, 60);
    },
  });
}

// ════════════════════════════════════════════
// STEP 3 — QUALIFICATION (pinned, scrub)
// ════════════════════════════════════════════
function initQualification() {
  const section = document.querySelector('.step-qual');
  if (!section) return;
  const thread = section.querySelector('#qualThread');
  const criteria = section.querySelectorAll('.qual-criteria li');
  const bar = section.querySelector('#qualBar');
  const pct = section.querySelector('#qualPct');
  const result = section.querySelector('#qualResult');

  // Conversation script — 6 beats unfolding as user scrolls
  const beats = [
    { speaker: 'user', text: 'Je cherche un rouge pour un magret entre amis.' },
    { speaker: 'bot', text: 'Tope ! Pour quelle occasion exactement ?' },
    { speaker: 'user', text: 'Dîner ce week-end, rien de trop pompeux.' },
    { speaker: 'bot', text: 'Tu as un budget en tête ?' },
    { speaker: 'user', text: 'Disons 30 à 50 euros la bouteille.' },
    { speaker: 'bot', text: 'Pile poil ! Je te recommande celui-ci.' },
  ];

  // Criterion fill order — per beat index, which criterion gets filled
  const criteriaFill = {
    0: { key: 'universe', value: 'Vin rouge' },
    1: { key: 'plat', value: 'Magret de canard' },
    2: { key: 'occasion', value: 'Repas amis' },
    4: { key: 'budget', value: '30-50 €' },
  };

  // Pin the section and scrub through the beats
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=' + (beats.length * 200),
    pin: '.step-qual .step-pin',
    pinSpacing: true,
    scrub: false,
    onUpdate: self => {
      const progress = self.progress;
      // Reveal beats progressively
      const visibleBeats = Math.floor(progress * beats.length * 1.05);

      // Render beats
      const existing = thread.children.length;
      for (let i = existing; i < visibleBeats && i < beats.length; i++) {
        const beat = beats[i];
        const bub = document.createElement('div');
        bub.className = `bub bub-${beat.speaker === 'user' ? 'user' : 'bot'}`;
        bub.textContent = beat.text;
        thread.appendChild(bub);
        requestAnimationFrame(() => bub.classList.add('show'));

        // Fill matching criterion
        const fill = criteriaFill[i];
        if (fill) {
          const li = section.querySelector(`.qual-criteria li[data-key="${fill.key}"]`);
          if (li) {
            li.classList.add('filled');
            li.querySelector('.cri-v').textContent = fill.value;
          }
        }
      }

      // Remove beats if we scrolled back
      while (thread.children.length > visibleBeats) {
        const last = thread.lastChild;
        thread.removeChild(last);
        // Un-fill criterion
        const idx = thread.children.length;
        const fill = criteriaFill[idx];
        if (fill) {
          const li = section.querySelector(`.qual-criteria li[data-key="${fill.key}"]`);
          if (li) {
            li.classList.remove('filled');
            li.querySelector('.cri-v').textContent = '';
          }
        }
      }

      // Update score bar
      const filled = section.querySelectorAll('.qual-criteria li.filled').length;
      const total = criteria.length;
      const score = Math.round((filled / total) * 92); // max 92%
      bar.style.width = score + '%';
      pct.textContent = score;

      // Reveal result when all criteria filled
      if (filled >= total) result.classList.add('show');
      else result.classList.remove('show');
    },
  });
}

// ════════════════════════════════════════════
// STEP 4 — SIMILARITY
// ════════════════════════════════════════════
function initSimilarity() {
  const section = document.querySelector('.step-similar');
  if (!section) return;
  const traits = section.querySelectorAll('.sim-trait');
  const links = section.querySelectorAll('.sim-link');
  const cards = section.querySelectorAll('.sim-card');

  ScrollTrigger.create({
    trigger: section,
    start: 'top 60%',
    onEnter: () => {
      // 1. Traits appear one by one (200ms each)
      traits.forEach((t, i) => setTimeout(() => t.classList.add('show'), 200 + i * 220));
      // 2. Links draw (after traits done)
      setTimeout(() => links.forEach((l, i) => setTimeout(() => l.classList.add('show'), i * 250)), 1300);
      // 3. Cards appear
      setTimeout(() => cards.forEach((c, i) => setTimeout(() => c.classList.add('show'), i * 180)), 1900);
    },
  });
}

// ════════════════════════════════════════════
// STEP 5 — BRAND VOICE
// ════════════════════════════════════════════
function initVoice() {
  const section = document.querySelector('.step-voice');
  if (!section) return;
  const cards = section.querySelectorAll('.voice-card');

  ScrollTrigger.create({
    trigger: section,
    start: 'top 65%',
    onEnter: () => {
      cards.forEach((card, i) => {
        setTimeout(() => {
          card.classList.add('show');
          // Type the message in this card
          const msgEl = card.querySelector('.voice-msg');
          const fullMsg = (msgEl.dataset.msg || '').replace(/\\n/g, '\n');
          msgEl.textContent = '';
          msgEl.classList.add('typing');
          let idx = 0;
          const typeFn = () => {
            if (idx < fullMsg.length) {
              msgEl.textContent += fullMsg[idx++];
              setTimeout(typeFn, 18 + Math.random() * 22);
            } else {
              msgEl.classList.remove('typing');
            }
          };
          setTimeout(typeFn, 200);
        }, i * 700);
      });
    },
  });
}

// ════════════════════════════════════════════
// LIVE DEMO — Real API calls
// ════════════════════════════════════════════
function initLive() {
  const chat = document.getElementById('liveChat');
  const input = document.getElementById('liveInput');
  const send = document.getElementById('liveSend');
  const suggs = document.querySelectorAll('#liveSugg button');
  if (!chat || !input || !send) return;

  const API_URL = window.location.port === '8080' ? 'http://localhost:3003' : '/shimmer';
  // Live demo uses the Caves Forty-Two store (showcases brand voice + tone tu)
  const API_KEY = 'sk_fc215c787b2c48d9808a4638e2d51899';

  const history = [];
  let knownCriteria = {};
  let sessionToken = null;
  let busy = false;

  function addMsg(text, who) {
    const div = document.createElement('div');
    div.className = 'live-msg ' + (who === 'u' ? 'u' : 'b');
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function addProduct(p) {
    const card = document.createElement('div');
    card.className = 'live-product';
    card.innerHTML = `
      <p class="lp-name">${escape(p.name)}</p>
      <p class="lp-brand">${escape(p.brand || '')}</p>
      <p class="lp-meta">${escape((p.reason || '').slice(0, 130))}</p>
      <span class="lp-price">${escape(p.price)}</span>
    `;
    chat.appendChild(card);
    chat.scrollTop = chat.scrollHeight;
  }

  function addTyping() {
    const t = document.createElement('div');
    t.className = 'live-typing';
    t.id = 'liveTyping';
    t.innerHTML = '<span></span><span></span><span></span>';
    chat.appendChild(t);
    chat.scrollTop = chat.scrollHeight;
    return t;
  }

  function escape(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  async function ask(q) {
    if (busy || !q.trim()) return;
    busy = true;
    input.disabled = true;
    send.disabled = true;
    addMsg(q.trim(), 'u');
    history.push({ role: 'user', content: q.trim() });

    const typing = addTyping();

    try {
      const r = await fetch(API_URL + '/api/search/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },
        body: JSON.stringify({
          message: q.trim(),
          history: history.slice(-6),
          knownCriteria,
          sessionToken,
        }),
      });
      const data = await r.json();
      typing.remove();
      addMsg(data.message || 'Je n’ai pas compris.', 'b');
      history.push({ role: 'assistant', content: data.message || '' });
      knownCriteria = data.knownCriteria || knownCriteria;
      sessionToken = data.sessionToken || sessionToken;
      if (data.highlightedProducts && data.highlightedProducts.length) {
        data.highlightedProducts.slice(0, 1).forEach(addProduct);
      }
    } catch (err) {
      typing.remove();
      addMsg('Erreur : ' + (err.message || 'connexion impossible'), 'b');
    }

    busy = false;
    input.disabled = false;
    send.disabled = false;
    input.focus();
  }

  send.addEventListener('click', () => { ask(input.value); input.value = ''; });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { ask(input.value); input.value = ''; }
  });
  suggs.forEach(b => b.addEventListener('click', () => { ask(b.textContent); }));
}

// ════════════════════════════════════════════
// FALLBACK if GSAP doesn't load
// ════════════════════════════════════════════
function initBasicReveal() {
  // Reveal sections via IntersectionObserver
  const els = document.querySelectorAll('.wf-node, .sim-trait, .sim-card, .voice-card, .phone-reply, .qual-result');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('show');
        e.target.classList.add('lit');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));

  // Init live demo even without GSAP
  initLive();
}
