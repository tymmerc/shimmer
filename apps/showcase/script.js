/* ═══════════════════════════════════════
   SHIMMER — Arcane Toxin (WebGL only)
   Flowing purple poison, mouse reactive
   ═══════════════════════════════════════ */

// ═══ TOXIN CANVAS ═══
;(function () {
  const c = document.getElementById('toxin');
  if (!c) return;

  const gl = c.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
  if (!gl) { fallback(c); return; }

  const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`;
  const FS = `
precision highp float;
uniform vec2 R;
uniform float T;
uniform vec2 M;

float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f*=f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);
}
float fb(vec2 p){return n(p)*.5+n(p*2.1)*.28+n(p*4.4)*.14;}

void main(){
  vec2 uv=gl_FragCoord.xy/R;
  float ar=R.x/R.y;
  vec2 p=(uv-.5)*vec2(ar,1.);
  float t=T*.12;

  // Mouse
  vec2 m=(M/R-.5)*vec2(ar,1.);
  float md=length(p-m);
  float mi=smoothstep(.55,.0,md);

  // Flowing toxin
  float n1=fb(p*2.8+vec2(t*.6,t*.25));
  float n2=fb(p*3.2-vec2(t*.4,-t*.35)+m*.25);
  float nw=fb(p*2.2+vec2(n1*.6,n2*.4)+m*mi*.6);

  // Color layers
  vec3 c=vec3(.022,.007,.05);
  c+=vec3(.11,.035,.20)*smoothstep(.18,.65,n1)*.65;
  c+=vec3(.22,.07,.45)*smoothstep(.3,.72,nw)*.55;

  // Bright veins
  float v=smoothstep(.43,.48,nw)*smoothstep(.53,.48,nw);
  c+=vec3(.5,.18,.9)*v*2.;

  // Mouse glow + colors
  c+=vec3(.3,.1,.6)*mi*.5;
  c+=vec3(.6,.12,.5)*mi*smoothstep(.35,.6,n2)*.55;
  c+=vec3(.08,.5,.6)*mi*smoothstep(.5,.68,n1)*.25;
  c+=vec3(.55,.25,.95)*smoothstep(.25,.0,md)*.2;

  // Vignette
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
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
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

// 2D fallback if no WebGL
function fallback(c) {
  const ctx = c.getContext('2d');
  if (!ctx) return;
  let W, H, mx = 0, my = 0;
  function resize() { W = c.width = c.clientWidth; H = c.height = c.clientHeight; }
  resize(); window.addEventListener('resize', resize);
  c.addEventListener('mousemove', e => { const r = c.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
  c.addEventListener('mouseleave', () => { mx = W * .5; my = H * .5; });

  const blobs = [];
  for (let i = 0; i < 14; i++) {
    blobs.push({ x: Math.random() * 1920, y: Math.random() * 1080, r: 120 + Math.random() * 250,
      vx: (Math.random()-.5)*.3, vy: (Math.random()-.5)*.3, hue: 265+Math.random()*30, a: .05+Math.random()*.08 });
  }
  ;(function draw() {
    ctx.fillStyle = '#06020e'; ctx.fillRect(0, 0, W, H);
    for (const b of blobs) {
      const dx = b.x-mx, dy = b.y-my, d = Math.hypot(dx,dy);
      if (d < 300 && d > 0) { b.vx += dx/d*.015; b.vy += dy/d*.015; }
      b.x += b.vx; b.y += b.vy; b.vx *= .99; b.vy *= .99;
      if (b.x<-b.r) b.x=W+b.r; if (b.x>W+b.r) b.x=-b.r;
      if (b.y<-b.r) b.y=H+b.r; if (b.y>H+b.r) b.y=-b.r;
      const g = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
      g.addColorStop(0,`hsla(${b.hue},70%,35%,${b.a})`); g.addColorStop(1,'transparent');
      ctx.fillStyle = g; ctx.fillRect(b.x-b.r,b.y-b.r,b.r*2,b.r*2);
    }
    const mg = ctx.createRadialGradient(mx,my,0,mx,my,200);
    mg.addColorStop(0,'rgba(147,51,234,.1)'); mg.addColorStop(1,'transparent');
    ctx.fillStyle = mg; ctx.fillRect(0,0,W,H);
    requestAnimationFrame(draw);
  })();
}


// ═══ NAV ═══
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

// ═══ REVEAL ON SCROLL ═══
;(function () {
  const els = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); }});
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
  els.forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * .08}s`; io.observe(el); });
})();

// ═══ COUNTER ═══
;(function () {
  const nums = document.querySelectorAll('[data-to]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, to = parseInt(el.dataset.to, 10), dur = 1200;
      let started = false;
      function tick(now) { if (!started) started = now; const p = Math.min((now - started) / dur, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * to); if (p < 1) requestAnimationFrame(tick); }
      requestAnimationFrame(tick); io.unobserve(el);
    });
  }, { threshold: .5 });
  nums.forEach(n => io.observe(n));
})();

// ═══ CHAT TYPING ═══
;(function () {
  const typing = document.getElementById('typing');
  const typed = document.getElementById('typed');
  if (!typing || !typed) return;
  const msg = "Votre commande #4521 a ete expediee le 10 mars via Colissimo. Suivi : 8R12345678. Livraison prevue demain. Besoin d'autre chose ?";
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      setTimeout(() => { typing.style.display = 'none'; typed.style.display = 'block';
        let i = 0; (function t() { if (i < msg.length) { typed.textContent += msg[i++]; setTimeout(t, 14 + Math.random() * 22); } })();
      }, 1800); io.unobserve(e.target);
    });
  }, { threshold: .3 });
  io.observe(typing.closest('.chat-mock'));
})();

// ═══ DEMO VENDEUR IA — E-Commerce Search Experience ═══
;(function () {
  const input = document.getElementById('dcQ');
  const btn = document.getElementById('dcGo');
  const aiBar = document.getElementById('aiBar');
  const aiText = document.getElementById('aiText');
  const suggEl = document.getElementById('dcSugg');
  const resultsEl = document.getElementById('storeResults');
  const gridEl = document.getElementById('storeGrid');
  const countEl = document.getElementById('resultsCount');
  const qualEl = document.getElementById('aiQual');
  const promoEl = document.getElementById('storePromo');
  if (!input || !btn) return;

  const apiUrl = window.location.port === '8080' ? 'http://localhost:3003' : '/shimmer';
  let busy = false;
  let assistHistory = [];
  let assistKnownCriteria = {};

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function fmt(text) {
    return esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  function setSuggestions(questions) {
    if (!suggEl) return;
    suggEl.innerHTML = '';
    if (!questions?.length) return;
    for (const q of questions) {
      const pill = document.createElement('button');
      pill.className = 'dc-pill';
      pill.textContent = q;
      pill.addEventListener('click', () => send(q));
      suggEl.appendChild(pill);
    }
  }

  function showProducts(products) {
    if (!gridEl || !resultsEl) return;
    if (!products?.length) { resultsEl.style.display = 'none'; return; }
    promoEl.style.display = 'none';
    resultsEl.style.display = 'block';
    countEl.textContent = products.length + ' produit' + (products.length > 1 ? 's' : '') + ' recommande' + (products.length > 1 ? 's' : '');
    gridEl.innerHTML = products.map((p, i) => `
      <div class="store-card ${i === 0 ? 'recommended' : ''}">
        <div class="store-card-img">${i === 0 ? '⭐' : '📦'}</div>
        <div class="store-card-body">
          ${i === 0 ? '<div class="store-card-badge">Recommande par l\'IA</div>' : ''}
          <div class="store-card-name">${esc(p.name)}</div>
          <div class="store-card-brand">${esc(p.brand || '')}</div>
          <div class="store-card-price">${esc(p.price)}</div>
          ${p.reason ? '<div class="store-card-reason">' + esc(p.reason) + '</div>' : ''}
        </div>
      </div>
    `).join('');
  }

  function showQual(qual) {
    if (!qualEl || !qual) return;
    const pct = qual.score;
    qualEl.innerHTML = `
      <span style="font-size:11px;color:#9ca3af">IA ${pct}%</span>
      <div class="ai-qual-bar"><div class="ai-qual-fill" style="width:${pct}%"></div></div>
    `;
  }

  async function send(q) {
    if (busy || !q.trim()) return;
    busy = true;
    input.disabled = true;
    btn.disabled = true;

    const query = q.trim();
    input.value = ''; // Clear for next input
    assistHistory.push({ role: 'user', content: query });

    // Show AI bar with loading
    aiBar.style.display = 'flex';
    aiText.innerHTML = '<span style="color:#9ca3af">Analyse en cours...</span>';
    suggEl.innerHTML = '';

    try {
      const res = await fetch(apiUrl + '/api/search/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-api-key' },
        body: JSON.stringify({
          message: query,
          history: assistHistory.slice(-6),
          knownCriteria: assistKnownCriteria,
        }),
      });

      const data = await res.json();

      if (data.error) {
        aiText.innerHTML = '<span style="color:#ef4444">Erreur : ' + esc(data.error) + '</span>';
      } else {
        aiText.innerHTML = fmt(data.message || 'Je n\'ai pas compris, reformulez ?');
        assistHistory.push({ role: 'assistant', content: data.message });
        assistKnownCriteria = data.knownCriteria || assistKnownCriteria;
        showQual(data.qualification);
        setSuggestions(data.suggestedQuestions);
        if (data.highlightedProducts?.length) showProducts(data.highlightedProducts);
      }

    } catch (e) {
      aiText.innerHTML = '<span style="color:#ef4444">Erreur : ' + esc(e.message) + '</span>';
    }

    busy = false;
    input.disabled = false;
    btn.disabled = false;
    input.focus();
  }

  btn.addEventListener('click', () => send(input.value));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') send(input.value); });

  // Reset button
  const resetBtn = document.getElementById('dcReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      assistHistory = [];
      assistKnownCriteria = {};
      aiBar.style.display = 'none';
      resultsEl.style.display = 'none';
      promoEl.style.display = 'block';
      input.value = '';
      input.placeholder = 'Que cherchez-vous ?';
      input.focus();
    });
  }

  // Category clicks
  document.querySelectorAll('.store-cat[data-q]').forEach(cat => {
    cat.addEventListener('click', () => send(cat.dataset.q));
  });
})();

// ═══ SMOOTH SCROLL ═══
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return; e.preventDefault();
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  });
});
