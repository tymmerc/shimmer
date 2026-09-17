"use strict";var ShimmerSDK=(()=>{var L=Object.defineProperty;var j=Object.getOwnPropertyDescriptor;var W=Object.getOwnPropertyNames;var V=Object.prototype.hasOwnProperty;var Q=(i,e)=>{for(var t in e)L(i,t,{get:e[t],enumerable:!0})},F=(i,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of W(e))!V.call(i,r)&&r!==t&&L(i,r,{get:()=>e[r],enumerable:!(s=j(e,r))||s.enumerable});return i};var K=i=>F(L({},"__esModule",{value:!0}),i);var de={};Q(de,{Shimmer:()=>C});var J={primaryColor:"#6366f1",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',borderRadius:"12px",chatPosition:"bottom-right"},Y={fr:{searchPlaceholder:"Rechercher un produit...",chatPlaceholder:"Posez votre question...",chatTitle:"Assistant Shimmer",chatWelcome:"Bonjour ! Comment puis-je vous aider ?",send:"Envoyer",close:"Fermer",noResults:"Aucun r\xE9sultat trouv\xE9.",addToCart:"Voir le produit",assistTitle:"Vendeur IA",assistPlaceholder:"D\xE9crivez ce que vous cherchez...",poweredBy:"Propuls\xE9 par Shimmer"},en:{searchPlaceholder:"Search for a product...",chatPlaceholder:"Ask a question...",chatTitle:"Shimmer Assistant",chatWelcome:"Hello! How can I help you?",send:"Send",close:"Close",noResults:"No results found.",addToCart:"View product",assistTitle:"AI Sales Assistant",assistPlaceholder:"Describe what you are looking for...",poweredBy:"Powered by Shimmer"}};function M(i,e={},t=8e3){let s=new AbortController,r=setTimeout(()=>s.abort(),t);return fetch(i,{...e,signal:e.signal??s.signal}).finally(()=>clearTimeout(r))}var P=class{constructor(e,t,s){this.apiUrl=e;this.apiKey=t;this.storeId=s}headers(){let e={"Content-Type":"application/json",Authorization:`Bearer ${this.apiKey}`};return this.storeId&&(e["X-Shimmer-Store"]=String(this.storeId)),e}async request(e,t,s){let r=`${this.apiUrl}${t}`,o=t.includes("/assist")||t.includes("/search")||t.includes("/chat"),n=await M(r,{method:e,headers:this.headers(),body:s?JSON.stringify(s):void 0},o?7e4:8e3);if(!n.ok){let a=await n.json().catch(()=>({error:n.statusText}));throw new Error(a.error||`HTTP ${n.status}`)}return n.json()}search(e,t){return this.request("POST","/api/search",{query:e,sessionToken:t})}assist(e,t,s,r){return this.request("POST","/api/search/assist",{message:e,sessionToken:t,history:s,knownCriteria:r})}vendeur(e,t){return this.request("POST","/api/chat/message",{message:e,sessionToken:t})}stockAlert(e){return this.request("POST","/api/stock-alerts",{...e,store:this.storeId})}assistStream(e,t,s,r,o){let n=new AbortController,a=`${this.apiUrl}/api/search/assist/stream`;return fetch(a,{method:"POST",headers:this.headers(),body:JSON.stringify({message:e,sessionToken:s,history:r,knownCriteria:o}),signal:n.signal}).then(async l=>{if(!l.ok||!l.body){t.onError?.(`HTTP ${l.status}`);return}let m=l.body.getReader(),h=new TextDecoder,u="";for(;;){let{done:f,value:T}=await m.read();if(f)break;u+=h.decode(T,{stream:!0});let g=u.split(`
`);u=g.pop()||"";let p="";for(let v of g)if(v.startsWith("event: "))p=v.slice(7).trim();else if(v.startsWith("data: ")){let U=v.slice(6);try{let y=JSON.parse(U);p==="metadata"?t.onMeta(y):p==="token"?t.onToken(y.text):p==="done"?t.onDone(y.fullText):p==="error"&&t.onError?.(y.error)}catch{}}}}).catch(l=>{l.name!=="AbortError"&&t.onError?.(l.message)}),n}chatMessage(e,t){return this.request("POST","/api/chat/message",{message:e,sessionToken:t,stream:!1})}reviewStats(e){let t=e?`?productId=${e}`:"";return this.request("GET",`/api/reviews/stats${t}`)}productReviews(e,t=1){return this.request("GET",`/api/reviews/product/${e}?page=${t}&limit=10`)}crossSell(e,t=4){return this.request("GET",`/api/catalog/cross-sell/product/${e}?limit=${t}`)}crossSellEvents(e){let t=JSON.stringify({events:e}),s=`${this.apiUrl}/api/catalog/cross-sell/events`;if(typeof navigator<"u"&&navigator.sendBeacon){let r=new Blob([t],{type:"application/json"});try{if(navigator.sendBeacon(s,r))return Promise.resolve()}catch{}}return fetch(s,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.apiKey}`},body:t,keepalive:!0}).then(()=>{}).catch(()=>{})}},b=null;function x(){if(b&&b.host.isConnected)return b;let i=document.createElement("div");return i.id="shimmer-root",document.body.appendChild(i),b=i.attachShadow({mode:"open"}),b}function G(i){let e=X(i);if(!document.getElementById("shimmer-sdk-styles")){let s=document.createElement("style");s.id="shimmer-sdk-styles",s.textContent=e,document.head.appendChild(s)}let t=x();if(!t.querySelector("#shimmer-shadow-styles")){let s=document.createElement("style");s.id="shimmer-shadow-styles",s.textContent=`:host { all: initial; display: block; position: static; }
`+e,t.appendChild(s)}}function X(i){return`
    .shimmer-widget * { box-sizing: border-box; margin: 0; padding: 0; }
    .shimmer-widget { font-family: ${i.fontFamily}; font-size: 14px; line-height: 1.5; color: #1f2937; }

    /* Dock discret ancr\xE9 sous la barre de recherche du th\xE8me : pas de plein
       \xE9cran, pas de voile. Produits en haut, question du vendeur en bas. */
    .shimmer-dock {
      position: fixed; z-index: 99998; background: #fff;
      border: 1px solid rgba(0,0,0,0.09); border-radius: ${i.borderRadius};
      box-shadow: 0 12px 32px rgba(0,0,0,0.14);
      display: flex; flex-direction: column; overflow: hidden;
      max-height: min(60vh, 540px);
      opacity: 0; transform: translateY(-4px); transition: opacity .18s, transform .18s;
      pointer-events: none;
    }
    .shimmer-dock.active { opacity: 1; transform: translateY(0); pointer-events: auto; }
    .shimmer-search-results { flex: 1 1 auto; overflow-y: auto; padding: 6px; }
    .shimmer-search-results:empty { display: none; }
    .shimmer-dock-bottom { flex: 0 0 auto; border-top: 1px solid #f1f2f4; }
    .shimmer-search-results:empty + .shimmer-dock-bottom { border-top: none; }
    /* La petite question du vendeur, en bas : elle propose, elle ne s'impose pas. */
    .shimmer-vendor-q { display: none; padding: 10px 14px 4px; font-size: 14px; line-height: 1.45;
      color: ${i.primaryColor}; }
    .shimmer-vendor-q.active { display: block; }
    .shimmer-dock-footer { display: flex; justify-content: space-between; gap: 8px; padding: 6px 10px 8px; }
    .shimmer-dock-footer button {
      border: none; background: none; padding: 4px 6px; cursor: pointer;
      font-family: inherit; font-size: 12px; color: #9ca3af;
    }
    .shimmer-dock-footer button:hover { color: #374151; text-decoration: underline; }
    .shimmer-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 6px 14px 8px; }
    .shimmer-chip { border: 1px solid ${i.primaryColor}; background: transparent; color: ${i.primaryColor};
      border-radius: 999px; padding: 8px 14px; font-size: 14px; cursor: pointer; transition: .15s; }
    .shimmer-chip:hover { background: ${i.primaryColor}; color: #fff; }
    .shimmer-search-item {
      display: flex; gap: 12px; padding: 12px; border-radius: 8px; cursor: pointer;
      transition: background 0.15s;
    }
    .shimmer-search-item:hover { background: #f3f4f6; }
    .shimmer-search-item img {
      width: 56px; height: 56px; object-fit: cover; border-radius: 8px; background: #f3f4f6;
    }
    .shimmer-search-item-info { flex: 1; min-width: 0; }
    .shimmer-search-item-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .shimmer-search-item-desc { font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .shimmer-search-item-price { font-weight: 700; color: ${i.primaryColor}; white-space: nowrap; }
    .shimmer-search-empty { padding: 24px; text-align: center; color: #9ca3af; }
    .shimmer-restock { margin: 6px 12px 10px; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fafafa; }
    .shimmer-restock-title { font-size: 13px; color: #111827; margin-bottom: 8px; }
    .shimmer-restock-title strong { font-weight: 600; }
    .shimmer-restock-form { display: flex; gap: 8px; }
    .shimmer-restock-form input { flex: 1; min-width: 0; padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 999px; font: inherit; font-size: 13px; outline: none; }
    .shimmer-restock-form input:focus { border-color: #111827; }
    .shimmer-restock-form button { padding: 9px 14px; border: none; border-radius: 999px; background: #111827; color: #fff; font: inherit; font-size: 13px; cursor: pointer; white-space: nowrap; }
    .shimmer-restock-form button:disabled { opacity: .5; cursor: default; }
    .shimmer-restock-done { font-size: 13px; color: #047857; }

    /* Chat bubble */
    .shimmer-chat-bubble {
      position: fixed; ${i.chatPosition==="bottom-right"?"right: 20px":"left: 20px"}; bottom: 20px;
      width: 56px; height: 56px; border-radius: 50%; background: ${i.primaryColor}; color: #fff;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 99997; border: none;
      transition: transform 0.2s;
    }
    .shimmer-chat-bubble:hover { transform: scale(1.1); }
    .shimmer-chat-bubble svg { width: 24px; height: 24px; }

    /* Chat window */
    .shimmer-chat-window {
      position: fixed; ${i.chatPosition==="bottom-right"?"right: 20px":"left: 20px"}; bottom: 88px;
      width: 380px; max-width: calc(100vw - 40px); height: 520px; max-height: calc(100vh - 120px);
      background: #fff; border-radius: ${i.borderRadius}; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      z-index: 99998; display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; transform: translateY(20px) scale(0.95); transition: all 0.2s; pointer-events: none;
    }
    .shimmer-chat-window.active { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .shimmer-chat-header {
      padding: 16px; background: ${i.primaryColor}; color: #fff;
      display: flex; justify-content: space-between; align-items: center;
    }
    .shimmer-chat-header h3 { font-size: 15px; font-weight: 600; }
    .shimmer-chat-close { background: none; border: none; color: #fff; cursor: pointer; font-size: 20px; line-height: 1; }
    .shimmer-chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .shimmer-chat-msg { max-width: 85%; padding: 10px 14px; border-radius: 16px; font-size: 13px; word-wrap: break-word; }
    .shimmer-chat-msg.user { align-self: flex-end; background: ${i.primaryColor}; color: #fff; border-bottom-right-radius: 4px; }
    .shimmer-chat-msg.assistant { align-self: flex-start; background: #f3f4f6; color: #1f2937; border-bottom-left-radius: 4px; }
    .shimmer-chat-form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #e5e7eb; }
    .shimmer-chat-form input {
      flex: 1; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 24px;
      outline: none; font-size: 13px; font-family: inherit;
    }
    .shimmer-chat-form input:focus { border-color: ${i.primaryColor}; }
    .shimmer-chat-form button {
      padding: 10px 16px; background: ${i.primaryColor}; color: #fff; border: none;
      border-radius: 24px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit;
      transition: opacity 0.15s;
    }
    .shimmer-chat-form button:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Products in chat */
    .shimmer-products { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    .shimmer-product-card {
      display: flex; gap: 10px; padding: 10px; background: #fff; border: 1px solid #e5e7eb;
      border-radius: 10px; font-size: 12px;
    }
    .shimmer-product-card img { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; }
    .shimmer-product-card-info { flex: 1; }
    .shimmer-product-card-name { font-weight: 600; font-size: 13px; }
    .shimmer-product-card-price { color: ${i.primaryColor}; font-weight: 700; }

    /* Progress bar */
    .shimmer-progress { margin-top: 8px; }
    .shimmer-progress-bar { height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden; }
    .shimmer-progress-fill { height: 100%; background: ${i.primaryColor}; transition: width 0.3s; border-radius: 2px; }
    .shimmer-progress-label { font-size: 11px; color: #9ca3af; margin-top: 2px; }

    .shimmer-powered { text-align: center; font-size: 11px; color: #9ca3af; padding: 4px 0 8px; }

    /* Typing indicator */
    .shimmer-typing { display: flex; gap: 4px; padding: 10px 14px; align-self: flex-start; }
    .shimmer-typing span {
      width: 6px; height: 6px; background: #9ca3af; border-radius: 50%;
      animation: shimmer-bounce 1.2s infinite;
    }
    .shimmer-typing span:nth-child(2) { animation-delay: 0.2s; }
    .shimmer-typing span:nth-child(3) { animation-delay: 0.4s; }
    /* \u2500\u2500 Cross-sell widget \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
    .sx-wrap {
      font-family: ${i.fontFamily};
      color: #0e0a1c;
      width: 100%;
    }
    .sx-title {
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #6a5d7f;
      margin: 0 0 16px;
      font-weight: 500;
    }
    .sx-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 14px;
    }
    .sx-card {
      display: flex;
      flex-direction: column;
      padding: 18px 16px;
      background: #fff;
      border: 1px solid rgba(14,10,28,0.08);
      border-radius: 12px;
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      text-decoration: none;
      color: inherit;
      position: relative;
    }
    .sx-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 30px -16px rgba(106, 43, 245, 0.28);
      border-color: rgba(106, 43, 245, 0.22);
    }
    .sx-chip {
      align-self: flex-start;
      font-family: ${i.fontFamily};
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .sx-chip-apero      { background: #fff3e6; color: #9c4d00; }
    .sx-chip-repas      { background: #fff0d9; color: #875f00; }
    .sx-chip-dessert    { background: #fde7f3; color: #a3236e; }
    .sx-chip-decouverte { background: #e6f4ff; color: #1b5b91; }
    .sx-chip-cadeau     { background: #ece4ff; color: #4a23c0; }
    .sx-chip-accessoire { background: #ecf6ec; color: #2f7a37; }
    .sx-chip-complement { background: #efefef; color: #3b2e54; }

    .sx-img {
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      border-radius: 8px;
      background: #f3f0ea;
      margin-bottom: 12px;
    }
    .sx-img-placeholder {
      width: 100%;
      aspect-ratio: 1 / 1;
      background: linear-gradient(135deg, #f3f0ea 0%, #e7dfd0 100%);
      border-radius: 8px;
      margin-bottom: 12px;
      display: flex; align-items: center; justify-content: center;
      color: #b3a99a; font-size: 28px;
    }
    .sx-name {
      font-size: 14.5px;
      font-weight: 500;
      line-height: 1.3;
      margin-bottom: 4px;
      color: #0e0a1c;
    }
    .sx-brand {
      font-size: 11px;
      color: #6a5d7f;
      letter-spacing: 0.04em;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .sx-reason {
      font-size: 12.5px;
      color: #3b2e54;
      line-height: 1.45;
      margin-bottom: 14px;
      font-style: italic;
    }
    .sx-foot {
      margin-top: auto;
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }
    .sx-price {
      font-size: 16px;
      font-weight: 600;
      color: #0e0a1c;
    }
    .sx-add {
      background: #0e0a1c;
      color: #fff;
      border: 0;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    .sx-add:hover { background: #6a2bf5; }

    .sx-loading {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 14px;
    }
    .sx-skel {
      height: 250px;
      background: linear-gradient(90deg, #f3f0ea 0%, #ecebe7 50%, #f3f0ea 100%);
      background-size: 200% 100%;
      border-radius: 12px;
      animation: sx-shimmer 1.4s infinite;
    }
    @keyframes sx-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @keyframes shimmer-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }
  `}var w=class{constructor(e,t,s,r){this.client=e;this.labels=t;this.searchSelector=s;this.onQuery=r;this.anchor=null;this.savedPlaceholder="";this.bypassNext=!1;this.debounceTimer=null;this.sessionToken=null;this.history=[];this.knownCriteria=null;this.refined=!1;this.pendingBase="";this.createOverlay(),this.hookExistingInputs()}createOverlay(){this.overlay=document.createElement("div"),this.overlay.className="shimmer-widget shimmer-dock",this.overlay.innerHTML=`
      <div class="shimmer-search-results"></div>
      <div class="shimmer-dock-bottom">
        <div class="shimmer-vendor-q"></div>
        <div class="shimmer-chips-zone"></div>
        <div class="shimmer-dock-footer">
          <button type="button" class="shimmer-dock-native"></button>
          <button type="button" class="shimmer-dock-close">Fermer</button>
        </div>
      </div>
    `,x().appendChild(this.overlay),this.questionEl=this.overlay.querySelector(".shimmer-vendor-q"),this.chipsEl=this.overlay.querySelector(".shimmer-chips-zone"),this.resultsEl=this.overlay.querySelector(".shimmer-search-results"),this.overlay.querySelector(".shimmer-dock-close").addEventListener("click",()=>this.close()),this.overlay.querySelector(".shimmer-dock-native").addEventListener("click",()=>{let e=this.anchor;this.close(),e?.form&&(this.bypassNext=!0,e.form.submit())}),document.addEventListener("click",e=>{if(!this.overlay.classList.contains("active"))return;let t=e.composedPath();!t.includes(this.overlay)&&!t.includes(this.anchor)&&this.close()}),document.addEventListener("keydown",e=>{e.key==="Escape"&&this.close(),(e.metaKey||e.ctrlKey)&&e.key==="k"&&(e.preventDefault(),document.querySelector(this.searchSelector||'input[type="search"], input[data-shimmer-search]')?.focus())}),window.addEventListener("resize",()=>this.position(),{passive:!0}),window.addEventListener("scroll",()=>this.position(),{passive:!0})}position(){if(!this.anchor||!this.overlay.classList.contains("active"))return;let e=this.anchor.getBoundingClientRect(),t=window.innerWidth;if(t<560)this.overlay.style.left="12px",this.overlay.style.right="12px",this.overlay.style.width="auto";else{let s=Math.min(Math.max(e.width,420),640,t-24),r=Math.min(Math.max(e.left,12),t-s-12);this.overlay.style.left=`${r}px`,this.overlay.style.right="auto",this.overlay.style.width=`${s}px`}this.overlay.style.top=`${Math.round(e.bottom+6)}px`}hookExistingInputs(){let e=this.searchSelector||'input[type="search"], input[data-shimmer-search]';document.querySelectorAll(e).forEach(t=>{t.addEventListener("keydown",s=>{this.bypassNext||s.key==="Enter"&&t.value.trim().length>=2&&(s.preventDefault(),s.stopPropagation(),this.open(t.value,t))}),t.form?.addEventListener("submit",s=>{if(this.bypassNext){this.bypassNext=!1;return}t.value.trim().length>=2&&(s.preventDefault(),this.open(t.value,t))})})}open(e,t){t&&t!==this.anchor&&(this.anchor=t,this.savedPlaceholder=t.placeholder),this.overlay.classList.add("active"),this.position();let s=this.overlay.querySelector(".shimmer-dock-native");s.textContent="Voir les r\xE9sultats classiques \u2192",s.style.display=this.anchor?.form?"":"none",e&&e.trim().length>=2&&this.handleQuery(e.trim())}handleQuery(e){try{this.onQuery?.()}catch{}if(!this.refined&&Z(e)){this.pendingBase=e,this.askToRefine(e);return}this.askVendor(e)}askToRefine(e){this.setQuestion(`Avec plaisir. Pour bien vous orienter sur \xAB ${e} \xBB, c'est pour quelle occasion ?`);let t=["Ap\xE9ritif","Un repas","Un cadeau","D\xE9couvrir","Petit budget"];this.chipsEl.innerHTML=`<div class="shimmer-chips">${t.map(s=>`<button class="shimmer-chip" type="button">${d(s)}</button>`).join("")}</div>`,this.chipsEl.querySelectorAll(".shimmer-chip").forEach(s=>{s.addEventListener("click",()=>{this.refined=!0,this.chipsEl.innerHTML="",this.askVendor(`${this.pendingBase} pour ${s.textContent}`)})})}close(){this.overlay.classList.remove("active"),this.resultsEl.innerHTML="",this.chipsEl.innerHTML="",this.setQuestion(""),this.history=[],this.knownCriteria=null,this.sessionToken=null,this.refined=!1,this.pendingBase="",this.anchor&&(this.anchor.placeholder=this.savedPlaceholder||this.labels.searchPlaceholder)}async askVendor(e){this.setThinking();try{let t=await this.client.vendeur(e,this.sessionToken||void 0);this.sessionToken=t.sessionToken||this.sessionToken,this.setQuestion(t.message),this.renderProducts(t.recommendedProducts||[]),this.renderRestockPrompt(t.outOfStock||[]),this.anchor&&(this.anchor.value="",this.anchor.placeholder="Pr\xE9cisez, ou demandez autre chose\u2026",this.anchor.focus())}catch{this.setQuestion(""),this.resultsEl.innerHTML=`<div class="shimmer-search-empty">Le vendeur n'est pas joignable, r\xE9essayez dans un instant.</div>`}}setThinking(){this.questionEl.textContent="Le vendeur r\xE9fl\xE9chit\u2026",this.questionEl.classList.add("active")}setQuestion(e){if(!e){this.questionEl.textContent="",this.questionEl.classList.remove("active");return}this.questionEl.innerHTML=d(e).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),this.questionEl.classList.add("active")}renderRestockPrompt(e){if(this.resultsEl.querySelectorAll(".shimmer-restock").forEach(a=>a.remove()),!e.length)return;let t=e[0],s=document.createElement("div");s.className="shimmer-restock",s.innerHTML=`
      <div class="shimmer-restock-title"><strong>${d(t.name)}</strong> est \xE9puis\xE9. Je vous pr\xE9viens d\xE8s qu'il revient ?</div>
      <form class="shimmer-restock-form">
        <input type="email" required placeholder="votre@email.fr" autocomplete="email" />
        <button type="submit">Pr\xE9venez-moi</button>
      </form>`;let r=s.querySelector("form"),o=s.querySelector("input"),n=s.querySelector("button");r.addEventListener("submit",async a=>{a.preventDefault();let l=o.value.trim();if(l){n.disabled=!0;try{await this.client.stockAlert({email:l,platformVariantId:t.platformProductId?`p:${t.platformProductId}`:`local:${t.id}`,productId:t.id,variantLabel:t.name,visitorId:_(k)}),s.innerHTML=`<div class="shimmer-restock-done">C'est not\xE9. Vous serez pr\xE9venu d\xE8s le retour de ${d(t.name)}.</div>`}catch{n.disabled=!1,o.setCustomValidity("Impossible d'enregistrer, r\xE9essayez."),o.reportValidity(),setTimeout(()=>o.setCustomValidity(""),2e3)}}}),this.resultsEl.prepend(s)}renderProducts(e){if(!e.length){this.resultsEl.innerHTML="";return}this.resultsEl.innerHTML=e.slice(0,8).map(t=>`
      <div class="shimmer-search-item" data-id="${t.id}">
        ${t.imageUrl?`<img src="${t.imageUrl}" alt="${d(t.name)}" />`:'<div style="width:56px;height:56px;background:#f3f4f6;border-radius:8px"></div>'}
        <div class="shimmer-search-item-info">
          <div class="shimmer-search-item-name">${d(t.name)}</div>
          <div class="shimmer-search-item-desc">${d(t.category||"")} ${t.brand?"\xB7 "+d(t.brand):""}</div>
        </div>
        <div class="shimmer-search-item-price">${d(t.price)} \u20AC</div>
      </div>`).join("")}setOnQuery(e){this.onQuery=e}destroy(){this.overlay.remove()}},S=class{constructor(e,t){this.client=e;this.labels=t;this.sessionToken=null;this.history=[];this.knownCriteria=null;this.mode="assist";this.isOpen=!1;this.createBubble(),this.createWindow()}createBubble(){this.bubble=document.createElement("button"),this.bubble.className="shimmer-widget shimmer-chat-bubble",this.bubble.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',this.bubble.addEventListener("click",()=>this.toggle()),x().appendChild(this.bubble)}createWindow(){this.window=document.createElement("div"),this.window.className="shimmer-widget shimmer-chat-window",this.window.innerHTML=`
      <div class="shimmer-chat-header">
        <h3>${this.labels.assistTitle}</h3>
        <button class="shimmer-chat-close">&times;</button>
      </div>
      <div class="shimmer-chat-messages"></div>
      <div class="shimmer-powered">${this.labels.poweredBy}</div>
      <form class="shimmer-chat-form">
        <input type="text" placeholder="${this.labels.assistPlaceholder}" autocomplete="off" />
        <button type="submit">${this.labels.send}</button>
      </form>
    `,x().appendChild(this.window),this.messagesEl=this.window.querySelector(".shimmer-chat-messages"),this.formInput=this.window.querySelector(".shimmer-chat-form input"),this.sendBtn=this.window.querySelector(".shimmer-chat-form button"),this.window.querySelector(".shimmer-chat-close").addEventListener("click",()=>this.toggle()),this.window.querySelector(".shimmer-chat-form").addEventListener("submit",e=>{e.preventDefault(),this.sendMessage()}),this.addMessage("assistant",this.labels.chatWelcome)}toggle(){this.isOpen=!this.isOpen,this.window.classList.toggle("active",this.isOpen),this.isOpen&&setTimeout(()=>this.formInput.focus(),100)}addMessage(e,t,s,r){let o=document.createElement("div");o.className=`shimmer-chat-msg ${e}`;let n=d(t).replace(/\n/g,"<br>");s?.length&&(n+=`<div class="shimmer-products">${s.map(a=>`
        <div class="shimmer-product-card">
          ${a.imageUrl?`<img src="${a.imageUrl}" alt="${d(a.name)}" />`:""}
          <div class="shimmer-product-card-info">
            <div class="shimmer-product-card-name">${d(a.name)}</div>
            <div class="shimmer-product-card-price">${a.price}${a.currency==="EUR"?"\u20AC":" "+a.currency}</div>
          </div>
        </div>
      `).join("")}</div>`),r!=null&&r>0&&(n+=`<div class="shimmer-progress">
        <div class="shimmer-progress-bar"><div class="shimmer-progress-fill" style="width:${r}%"></div></div>
        <div class="shimmer-progress-label">Qualification: ${r}%</div>
      </div>`),o.innerHTML=n,this.messagesEl.appendChild(o),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}showTyping(){let e=document.createElement("div");return e.className="shimmer-typing",e.innerHTML="<span></span><span></span><span></span>",this.messagesEl.appendChild(e),this.messagesEl.scrollTop=this.messagesEl.scrollHeight,e}async sendMessage(){let e=this.formInput.value.trim();if(!e)return;this.formInput.value="",this.sendBtn.disabled=!0,this.addMessage("user",e),this.history.push({role:"user",content:e});let t=document.createElement("div");t.className="shimmer-chat-msg assistant",t.innerHTML='<span class="shimmer-typing"><span></span><span></span><span></span></span>',this.messagesEl.appendChild(t),this.messagesEl.scrollTop=this.messagesEl.scrollHeight;let s="",r=null;this.client.assistStream(e,{onToken:o=>{t.querySelector(".shimmer-typing")&&(t.innerHTML=""),s+=o,t.innerHTML=s.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>"),this.messagesEl.scrollTop=this.messagesEl.scrollHeight},onMeta:o=>{r=o,this.knownCriteria=o.knownCriteria||this.knownCriteria,o.suggestedQuestions?.length&&this.renderSuggestions(o.suggestedQuestions)},onDone:o=>{s=o||s;let n=d(s).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>");r?.highlightedProducts?.length&&(n+=`<div class="shimmer-products">${r.highlightedProducts.map(a=>`
              <div class="shimmer-product-card">
                <div class="shimmer-product-card-info">
                  <div class="shimmer-product-card-name">${d(a.name)}</div>
                  <div style="font-size:11px;color:#6b7280">${d(a.brand)}</div>
                  <div class="shimmer-product-card-price">${a.price}</div>
                </div>
              </div>
            `).join("")}</div>`),r?.qualification?.score>0&&(n+=`<div class="shimmer-progress">
              <div class="shimmer-progress-bar"><div class="shimmer-progress-fill" style="width:${r.qualification.score}%"></div></div>
              <div class="shimmer-progress-label">Qualification: ${r.qualification.score}%</div>
            </div>`),t.innerHTML=n,this.history.push({role:"assistant",content:s}),this.sendBtn.disabled=!1,this.formInput.focus(),this.messagesEl.scrollTop=this.messagesEl.scrollHeight},onError:o=>{t.innerHTML=`Erreur: ${d(o)}`,this.sendBtn.disabled=!1,this.formInput.focus()}},this.sessionToken||void 0,this.history.slice(-8),this.knownCriteria||void 0)}renderSuggestions(e){this.messagesEl.querySelectorAll(".shimmer-suggestions").forEach(s=>s.remove());let t=document.createElement("div");t.className="shimmer-suggestions",t.style.cssText="display:flex;gap:6px;flex-wrap:wrap;padding:4px 0;";for(let s of e){let r=document.createElement("button");r.textContent=s,r.style.cssText="padding:6px 12px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;font-size:12px;cursor:pointer;font-family:inherit;transition:background 0.15s;",r.addEventListener("mouseenter",()=>{r.style.background="#f3f4f6"}),r.addEventListener("mouseleave",()=>{r.style.background="#fff"}),r.addEventListener("click",()=>{this.formInput.value=s,this.sendMessage(),t.remove()}),t.appendChild(r)}this.messagesEl.appendChild(t),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}destroy(){this.bubble.remove(),this.window.remove()}};function d(i){let e=document.createElement("span");return e.textContent=i,e.innerHTML}function Z(i){let e=i.trim().toLowerCase().split(/\s+/);if(e.length>2)return!1;let t=["rouge","blanc","ros\xE9","rose","vin","vins","champagne","cr\xE9mant","cremant","bulle","bulles","cadeau","offrir","id\xE9e","idee","ap\xE9ro","apero"];return e.some(s=>t.includes(s))}var ee={apero:"Ap\xE9ritif",repas:"Repas",dessert:"Dessert",decouverte:"D\xE9couverte",cadeau:"Cadeau",accessoire:"Accessoire",complement:"\xC0 associer"},k="shimmer_vid",te=365;function _(i){if(typeof document>"u")return null;let e=document.cookie.match(new RegExp("(?:^|; )"+i.replace(/[.$?*|{}()[\]\\\/+^]/g,"\\$&")+"=([^;]*)"));return e?decodeURIComponent(e[1]):null}function se(i,e,t){if(typeof document>"u")return;let s=new Date(Date.now()+t*864e5).toUTCString();document.cookie=`${i}=${encodeURIComponent(e)}; expires=${s}; path=/; SameSite=Lax`}function R(){let i=_(k);if(i&&i.length>=8)return i;let e="vid_"+Math.random().toString(36).slice(2,10)+Date.now().toString(36);return se(k,e,te),e}function ie(i){typeof document>"u"||(document.cookie=`${i}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`)}function A(i){let e=window,t=!1,s=e.__tcfapi;if(typeof s=="function"){t=!0;try{s("addEventListener",2,(o,n)=>{let a=o;!n||!a||(a.eventStatus==="tcloaded"||a.eventStatus==="useractioncomplete")&&i(a.gdprApplies===!1?!0:!!a.purpose?.consents?.["1"])})}catch{}}let r=e.Cookiebot;if(r&&typeof r=="object"&&"consent"in r){t=!0;let o=()=>i(!!(r.consent?.statistics||r.consent?.preferences));(r.consented||r.declined)&&o(),window.addEventListener("CookiebotOnAccept",o),window.addEventListener("CookiebotOnDecline",o)}if((e.axeptioSettings||e._axcb)&&(t=!0,(e._axcb=e._axcb||[]).push(n=>{try{n.on("cookies:complete",a=>{let l=a||{};i(!!(l.shimmer??l.analytics??l.stats??Object.values(l).some(Boolean)))})}catch{}})),e.tarteaucitron){t=!0;let o=()=>{let n=document.cookie.match(/tarteaucitron=([^;]*)/);if(!n)return;let a=decodeURIComponent(n[1]??"");/shimmer=true/.test(a)?i(!0):/shimmer=false/.test(a)?i(!1):/=true/.test(a)&&i(!0)};o(),document.addEventListener("tac.close_alert",o),document.addEventListener("tac.close_panel",o)}return t}async function re(i,e,t){let s=await M(`${i}/api/holdout/decision?store=${e}&visitorId=${encodeURIComponent(t)}`,{},5e3);if(!s.ok)throw new Error("holdout-decision-failed");return s.json()}var H="shimmer_enrolled";function O(i,e,t,s){try{if(window.sessionStorage.getItem(H))return}catch{}fetch(`${i}/api/holdout/track`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({visitorId:t,store:e,exposed:s,trigger:"search"}),keepalive:!0}).then(()=>{try{window.sessionStorage.setItem(H,"1")}catch{}}).catch(()=>{})}function ne(i,e){let t=i||'input[type="search"], input[data-shimmer-search]';document.querySelectorAll(t).forEach(s=>{s.addEventListener("keydown",r=>{r.key==="Enter"&&s.value.trim().length>=2&&e()}),s.form?.addEventListener("submit",()=>{s.value.trim().length>=2&&e()})})}function oe(){return typeof window>"u"||typeof document>"u"?!1:window.Shopify||document.querySelector('meta[name="shopify-checkout-api-token"], meta[name="shopify-digital-wallet"]')?!0:/\.myshopify\.com$/.test(window.location.hostname)}async function ae(i,e){if(!oe())return;let t={attributes:{shimmer_vid:i,shimmer_bucket:String(e)}};try{await fetch("/cart/update.js",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(t),credentials:"same-origin"})}catch{}if(!("__shimmerFetchPatched"in window)){window.__shimmerFetchPatched=!0;let s=window.fetch.bind(window);window.fetch=async(...r)=>{let o=await s(...r);try{let n=typeof r[0]=="string"?r[0]:r[0].url;/\/cart\/(add|change|clear)(?:\.js)?\b/.test(n)&&s("/cart/update.js",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(t),credentials:"same-origin"})}catch{}return o}}}var $="shimmer_xs_sid",ce=30*864e5;function I(){if(typeof localStorage>"u")return"no-storage-"+Math.random().toString(36).slice(2);try{let e=localStorage.getItem($);if(e){let t=JSON.parse(e);if(t&&t.id&&t.ts&&Date.now()-t.ts<ce)return localStorage.setItem($,JSON.stringify({id:t.id,ts:Date.now()})),t.id}}catch{}let i="xs-"+Math.random().toString(36).slice(2)+Date.now().toString(36);try{localStorage.setItem($,JSON.stringify({id:i,ts:Date.now()}))}catch{}return i}var B="shimmer_xs_intent",le=30*60*1e3;function N(){if(typeof localStorage>"u")return[];try{let i=localStorage.getItem(B);if(!i)return[];let e=JSON.parse(i);if(!Array.isArray(e))return[];let t=Date.now();return e.filter(s=>s&&typeof s=="object"&&t-s.ts<le)}catch{return[]}}function D(i){if(!(typeof localStorage>"u"))try{let e=i.slice(0,20);localStorage.setItem(B,JSON.stringify(e))}catch{}}function q(i){let t=N().filter(s=>s.target_id!==i.target_id);D([i,...t])}function z(i){let e=N(),t=e.filter(r=>r.target_id===i);if(t.length===0)return[];let s=e.filter(r=>r.target_id!==i);return D(s),t}var E=class{constructor(e,t={}){this.mounted=new WeakSet;this.eventQueue=[];this.flushTimer=null;this.client=e,this.opts={selector:t.selector??"[data-shimmer-crosssell]",limit:Math.min(Math.max(t.limit??4,1),12),title:t.title??"On a aussi pens\xE9 \xE0",onProductClick:t.onProductClick??(()=>{}),productUrl:t.productUrl??null},this.sessionId=I()}trackEvent(e){this.eventQueue.push({...e,session_id:this.sessionId}),this.flushTimer===null&&typeof window<"u"&&(this.flushTimer=window.setTimeout(()=>this.flushEvents(),1500))}flushEvents(){if(this.flushTimer!==null&&(typeof window<"u"&&window.clearTimeout(this.flushTimer),this.flushTimer=null),this.eventQueue.length===0)return;let e=this.eventQueue.splice(0,this.eventQueue.length);this.client.crossSellEvents(e).catch(()=>{})}async render(){let e=document.querySelectorAll(this.opts.selector);await Promise.all([...e].map(t=>this.mount(t)))}async renderInto(e,t){let s=typeof e=="string"?document.querySelector(e):e;s&&(s.setAttribute("data-shimmer-crosssell",String(t)),await this.mount(s))}async mount(e){if(this.mounted.has(e))return;this.mounted.add(e);let t=e.getAttribute("data-shimmer-crosssell"),s=Number(t);if(!(!Number.isFinite(s)||s<=0)){e.classList.add("shimmer-widget","sx-wrap"),e.innerHTML=`
      <p class="sx-title">${d(this.opts.title)}</p>
      <div class="sx-loading">
        <div class="sx-skel"></div><div class="sx-skel"></div>
        <div class="sx-skel"></div><div class="sx-skel"></div>
      </div>
    `;try{let r=await this.client.crossSell(s,this.opts.limit);if(!r.items.length){e.innerHTML="";return}this.renderCards(e,r)}catch{e.innerHTML=""}}}renderCards(e,t){let s=this.opts.productUrl?"a":"div",r=t.items.map(n=>{let a=this.opts.productUrl?this.opts.productUrl.replace("{id}",String(n.product.id)).replace("{sku}",n.product.sku||""):null,l=a?`href="${d(a)}"`:"",m=n.product.imageUrl?`<img class="sx-img" src="${d(n.product.imageUrl)}" alt="${d(n.product.name)}" loading="lazy" />`:'<div class="sx-img-placeholder">\u25C7</div>',h=ee[n.role]||n.role,u=n.product.brand?`<p class="sx-brand">${d(n.product.brand)}</p>`:"";return`
          <${s} ${l} class="sx-card" data-product-id="${n.product.id}">
            <span class="sx-chip sx-chip-${d(n.role)}">${d(h)}</span>
            ${m}
            <p class="sx-name">${d(n.product.name)}</p>
            ${u}
            <p class="sx-reason">\xAB ${d(n.reason)} \xBB</p>
            <div class="sx-foot">
              <span class="sx-price">${d(n.product.price)}\u20AC</span>
              <button type="button" class="sx-add" data-add="${n.product.id}">Ajouter</button>
            </div>
          </${s}>
        `}).join("");e.innerHTML=`
      <p class="sx-title">${d(this.opts.title)}</p>
      <div class="sx-grid">${r}</div>
    `;let o=Array.from(e.querySelectorAll(".sx-card"));if(o.forEach((n,a)=>{let l=Number(n.dataset.productId),m=t.items.find(h=>h.product.id===l);m&&n.addEventListener("click",h=>{h.target.closest(".sx-add")||(this.trackEvent({product_id:t.reference.id,target_id:m.product.id,role:m.role,event_type:"click",position:a}),q({ref_id:t.reference.id,target_id:m.product.id,role:m.role,position:a,ts:Date.now()}),this.flushEvents(),this.opts.onProductClick(m))})}),e.querySelectorAll(".sx-add").forEach(n=>{let a=Number(n.dataset.add),l=t.items.find(h=>h.product.id===a);if(!l)return;let m=o.findIndex(h=>h.dataset.productId===String(a));n.addEventListener("click",h=>{h.preventDefault(),h.stopPropagation(),this.trackEvent({product_id:t.reference.id,target_id:l.product.id,role:l.role,event_type:"add",position:m}),q({ref_id:t.reference.id,target_id:l.product.id,role:l.role,position:m,ts:Date.now()}),this.flushEvents(),this.opts.onProductClick(l)})}),typeof IntersectionObserver<"u"){let n=new WeakSet,a=new Map,l=new IntersectionObserver(m=>{for(let h of m){if(n.has(h.target))continue;let u=h.target;if(h.isIntersecting&&h.intersectionRatio>=.5){if(a.has(u))continue;let f=window.setTimeout(()=>{n.add(u),a.delete(u),l.unobserve(u);let T=Number(u.dataset.productId),g=t.items.find(v=>v.product.id===T);if(!g)return;let p=o.indexOf(u);this.trackEvent({product_id:t.reference.id,target_id:g.product.id,role:g.role,event_type:"impression",position:p})},300);a.set(u,f)}else{let f=a.get(u);f!==void 0&&(window.clearTimeout(f),a.delete(u))}}},{threshold:[0,.5,1]});o.forEach(m=>l.observe(m))}if(typeof window<"u"){let n=()=>this.flushEvents();window.addEventListener("pagehide",n,{once:!1}),window.addEventListener("beforeunload",n,{once:!1})}}},c=class c{constructor(e){this.searchWidget=null;this.chatWidget=null;this.consent="unknown";this.measuredBootDone=!1;this.assistHistory=[];this.assistKnownCriteria={};this.config=e,this.theme={...J,...e.theme},this.labels=Y[e.locale||"fr"],this.client=new P(e.apiUrl,e.apiKey,e.storeId)}static init(e){try{c.instance&&c.instance.destroy();let t=new c(e);try{G(t.theme)}catch(s){console.warn("[shimmer] styles",s)}return c.instance=t,t.bootstrapHoldoutAndMount().catch(s=>console.warn("[shimmer] bootstrap",s)),t}catch(t){return console.warn("[shimmer] init failed, store unaffected",t),c.instance??new c(e)}}async bootstrapHoldoutAndMount(){let e=this.config.consentMode??"auto";if(document.addEventListener("shimmer:consent",s=>{let r=!!s.detail?.granted;this.applyConsent(r)}),e==="granted"){this.applyConsent(!0);return}if(e==="denied"){await this.sessionBoot();return}let t=A(s=>this.applyConsent(s));await this.sessionBoot(),e==="auto"&&!t&&window.setTimeout(()=>{this.consent==="unknown"&&!A(s=>this.applyConsent(s))&&this.applyConsent(!0)},3e3)}applyConsent(e){let t=this.consent;this.consent=e?"granted":"denied",e&&!this.measuredBootDone?(this.measuredBootDone=!0,this.measuredBoot().catch(s=>console.warn("[shimmer] measured boot",s))):e&&R(),!e&&t!=="denied"&&ie(k)}async sessionBoot(){this.searchWidget||(this.searchWidget=new w(this.client,this.labels,this.config.searchSelector,void 0),this.config.enableChat&&(this.chatWidget=new S(this.client,this.labels)))}async measuredBoot(){let e=R(),t=!1,s=0,r=this.config.storeId;try{if(!r)try{let a=await M(`${this.config.apiUrl}/api/stores/me/config`,{headers:{Authorization:`Bearer ${this.config.apiKey}`}},5e3);if(a.ok){let l=await a.json();r=l.id??l.storeId}}catch{}if(r){let a=await re(this.config.apiUrl,r,e);t=a.control,s=a.bucket}}catch{}this.config.disableCartAttribution||ae(e,s);let o=r;if(t){this.searchWidget?.destroy(),this.searchWidget=null,this.chatWidget=null,o&&ne(this.config.searchSelector,()=>O(this.config.apiUrl,o,e,!1));return}let n=o?()=>O(this.config.apiUrl,o,e,!0):void 0;this.searchWidget?this.searchWidget.setOnQuery(n):this.searchWidget=new w(this.client,this.labels,this.config.searchSelector,n),this.config.enableChat&&!this.chatWidget&&(this.chatWidget=new S(this.client,this.labels))}static consent(e){c.instance?.applyConsent(e)}static get assistant(){return{chat:c.chat,reset:c.resetChat}}static search(e){if(!c.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return c.instance.client.search(e)}static openSearch(e){c.instance?.searchWidget?.open(e)}static async chat(e){if(!c.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");let t=c.instance;t.assistHistory.push({role:"user",content:e});let s=await t.client.assist(e,t.assistSessionToken,t.assistHistory.slice(-6),t.assistKnownCriteria);return t.assistSessionToken=s.sessionToken,s.knownCriteria&&(t.assistKnownCriteria={...t.assistKnownCriteria,...s.knownCriteria}),t.assistHistory.push({role:"assistant",content:s.message}),s}static resetChat(){c.instance&&(c.instance.assistHistory=[],c.instance.assistKnownCriteria={},c.instance.assistSessionToken=void 0)}static reviewStats(e){if(!c.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return c.instance.client.reviewStats(e)}static destroy(){c.instance?.destroy()}destroy(){this.searchWidget?.destroy(),this.chatWidget?.destroy(),document.getElementById("shimmer-sdk-styles")?.remove(),c.instance=null}};c.instance=null,c.crossSell={async render(e={}){if(!c.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");await new E(c.instance.client,e).render()},async renderInto(e,t,s={}){if(!c.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");await new E(c.instance.client,s).renderInto(e,t)},fetch(e,t=4){if(!c.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return c.instance.client.crossSell(e,t)},trackProductView(e){if(!c.instance||!Number.isFinite(e)||e<=0)return;let t=z(e);if(t.length===0)return;let s=I(),r=t.map(o=>({product_id:o.ref_id,target_id:o.target_id,role:o.role,event_type:"view_target",session_id:s,position:o.position,metadata:{intent_age_ms:Date.now()-o.ts}}));c.instance.client.crossSellEvents(r).catch(()=>{})},trackPurchase(e){if(!c.instance)return;let t=I(),s=[];for(let r of e){if(!Number.isFinite(r)||r<=0)continue;let o=z(r);for(let n of o)s.push({product_id:n.ref_id,target_id:n.target_id,role:n.role,event_type:"purchase",session_id:t,position:n.position,metadata:{intent_age_ms:Date.now()-n.ts}})}s.length!==0&&c.instance.client.crossSellEvents(s).catch(()=>{})}};var C=c;(function(){if(typeof document>"u")return;let e=document.currentScript;if(!e||!e.hasAttribute("data-shimmer"))return;let t=e.getAttribute("data-store"),s=e.getAttribute("data-key");if(!t||!s){console.warn("[shimmer] data-store et data-key sont requis pour l'auto-d\xE9marrage.");return}let r=e.getAttribute("data-api")||"";if(!r)try{r=`${new URL(e.src).origin}/shimmer`}catch{console.warn("[shimmer] impossible de d\xE9duire data-api depuis le src ; pr\xE9cisez data-api.");return}let o=()=>{try{C.init({apiUrl:r,apiKey:s,storeId:Number(t),searchSelector:e.getAttribute("data-search")||void 0,enableChat:e.hasAttribute("data-chat"),consentMode:e.getAttribute("data-consent")||void 0})}catch(n){console.warn("[shimmer] init \xE9chou\xE9e",n)}};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o):o()})();return K(de);})();
if(typeof window!=="undefined"){window.Shimmer=ShimmerSDK.Shimmer;}
//# sourceMappingURL=shimmer.iife.js.map
