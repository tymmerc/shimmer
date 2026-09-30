"use strict";var ShimmerSDK=(()=>{var R=Object.defineProperty;var ie=Object.getOwnPropertyDescriptor;var re=Object.getOwnPropertyNames;var ne=Object.prototype.hasOwnProperty;var oe=(i,e)=>{for(var t in e)R(i,t,{get:e[t],enumerable:!0})},ae=(i,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of re(e))!ne.call(i,r)&&r!==t&&R(i,r,{get:()=>e[r],enumerable:!(s=ie(e,r))||s.enumerable});return i};var ce=i=>ae(R({},"__esModule",{value:!0}),i);var Ce={};oe(Ce,{Shimmer:()=>P});function le(i){return i.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’`]/g,"'").toLowerCase()}var x="(?:commande|colis|paquet|livraison|achat|envoi)s?",de=[new RegExp(`\\bou\\s+(?:est|en\\s+est|sont|en\\s+sont|se\\s+trouve(?:nt)?)\\b[^?.!]{0,25}\\b${x}\\b`),new RegExp(`\\bsuiv(?:i|re)\\b[^?.!]{0,15}\\b${x}\\b`),new RegExp(`\\bstatut\\b[^?.!]{0,20}\\b${x}\\b`),new RegExp(`\\betat\\s+de\\s+(?:ma|mon|mes|la|le|cette)\\s+${x}\\b`),/\b(?:numero|lien|code)\s+de\s+suivi\b/,/\btracking\b/,/\bwhere(?:'s|\s+is)\s+my\s+(?:order|package|parcel)\b/,/\btrack\s+(?:my\s+)?(?:order|package|parcel)\b/,/\border\s+status\b/,/\bhas\s+my\s+(?:order|package|parcel)\s+(?:shipped|arrived|been\s+shipped)\b/,/\bmy\s+(?:order|package|parcel)\s+(?:hasn'?t|has\s+not|didn'?t|did\s+not|never)\b/],me=new RegExp(`\\b(?:(?:ma|mon|mes|notre|nos)\\s+${x}|(?:la|le|cette)\\s+(?:commande|colis|paquet)s?)\\b`),q="(?:arriv|recev|recoi|recu|livr|expedi|part)",ue=new RegExp([`\\bquand\\b[^?.!]{0,40}${q}`,`${q}\\w*[^?.!]{0,20}\\bquand\\b`,"\\bpas\\s+(?:encore\\s+)?(?:recu|arrive|livre)","\\btoujours\\s+pas\\b","\\bjamais\\s+(?:recu|arrive)","\\brecevoir\\b","\\bexpedie","\\bpartie?s?\\b","\\ben\\s+route\\b","\\ben\\s+cours\\s+de\\s+livraison\\b","\\ben\\s+retard\\b","\\bbloquee?s?\\b"].join("|"));function N(i){let e=le(i);return e.trim()?de.some(t=>t.test(e))?!0:me.test(e)&&ue.test(e):!1}function z(i){if(i==null||String(i).trim()==="")return"";let e=typeof i=="number"?i:Number(String(i??"").replace(",","."));return Number.isFinite(e)?`${Number.isInteger(e)?String(e):e.toFixed(2).replace(".",",")}\xA0\u20AC`:`${i??""}\xA0\u20AC`.trim()}var he={primaryColor:"#6366f1",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',borderRadius:"12px",chatPosition:"bottom-right"},pe={fr:{searchPlaceholder:"Rechercher un produit...",chatPlaceholder:"Posez votre question...",chatTitle:"Assistant Shimmer",chatWelcome:"Bonjour ! Comment puis-je vous aider ?",trackParcel:"Suivre mon colis",savUnavailable:"Je n'arrive pas \xE0 consulter votre commande pour le moment. R\xE9essayez dans un instant.",send:"Envoyer",close:"Fermer",noResults:"Aucun r\xE9sultat trouv\xE9.",addToCart:"Voir le produit",assistTitle:"Vendeur IA",assistPlaceholder:"D\xE9crivez ce que vous cherchez...",poweredBy:"Propuls\xE9 par Shimmer"},en:{searchPlaceholder:"Search for a product...",chatPlaceholder:"Ask a question...",chatTitle:"Shimmer Assistant",chatWelcome:"Hello! How can I help you?",trackParcel:"Track my parcel",savUnavailable:"I can't look up your order right now. Please try again in a moment.",send:"Send",close:"Close",noResults:"No results found.",addToCart:"View product",assistTitle:"AI Sales Assistant",assistPlaceholder:"Describe what you are looking for...",poweredBy:"Powered by Shimmer"}};function O(i,e={},t=8e3){let s=new AbortController,r=setTimeout(()=>s.abort(),t);return fetch(i,{...e,signal:e.signal??s.signal}).finally(()=>clearTimeout(r))}var A=class{constructor(e,t,s){this.apiUrl=e;this.apiKey=t;this.storeId=s}headers(){let e={"Content-Type":"application/json",Authorization:`Bearer ${this.apiKey}`};return this.storeId&&(e["X-Shimmer-Store"]=String(this.storeId)),e}async request(e,t,s){let r=`${this.apiUrl}${t}`,o=t.includes("/assist")||t.includes("/search")||t.includes("/chat"),n=await O(r,{method:e,headers:this.headers(),body:s?JSON.stringify(s):void 0},o?7e4:8e3);if(!n.ok){let a=await n.json().catch(()=>({error:n.statusText}));throw new Error(a.error||`HTTP ${n.status}`)}return n.json()}search(e,t){return this.request("POST","/api/search",{query:e,sessionToken:t})}assist(e,t,s,r){return this.request("POST","/api/search/assist",{message:e,sessionToken:t,history:s,knownCriteria:r})}vendeur(e,t){let s=p?H(g)??void 0:void 0;return this.request("POST","/api/chat/message",{message:e,sessionToken:t,visitorId:s})}stockAlert(e){return this.request("POST","/api/stock-alerts",{...e,store:this.storeId})}assistStream(e,t,s,r,o){let n=new AbortController,a=`${this.apiUrl}/api/search/assist/stream`;return fetch(a,{method:"POST",headers:this.headers(),body:JSON.stringify({message:e,sessionToken:s,history:r,knownCriteria:o}),signal:n.signal}).then(async l=>{if(!l.ok||!l.body){t.onError?.(`HTTP ${l.status}`);return}let u=l.body.getReader(),m=new TextDecoder,h="";for(;;){let{done:v,value:I}=await u.read();if(v)break;h+=m.decode(I,{stream:!0});let b=h.split(`
`);h=b.pop()||"";let f="";for(let y of b)if(y.startsWith("event: "))f=y.slice(7).trim();else if(y.startsWith("data: ")){let se=y.slice(6);try{let k=JSON.parse(se);f==="metadata"?t.onMeta(k):f==="token"?t.onToken(k.text):f==="done"?t.onDone(k.fullText):f==="error"&&t.onError?.(k.error)}catch{}}}}).catch(l=>{l.name!=="AbortError"&&t.onError?.(l.message)}),n}savMessage(e,t,s){return this.request("POST","/api/chat/message",{message:e,sessionToken:t,mode:"sav",...s?{customerEmail:s.email,customerTs:s.ts,customerSignature:s.signature}:{}})}chatMessage(e,t){return this.request("POST","/api/chat/message",{message:e,sessionToken:t,stream:!1})}reviewStats(e){let t=e?`?productId=${e}`:"";return this.request("GET",`/api/reviews/stats${t}`)}productReviews(e,t=1){return this.request("GET",`/api/reviews/product/${e}?page=${t}&limit=10`)}crossSell(e,t=4){return this.request("GET",`/api/catalog/cross-sell/product/${e}?limit=${t}`)}crossSellEvents(e){let t=`${this.apiUrl}/api/catalog/cross-sell/events`,s=[];for(let r=0;r<e.length;r+=50)s.push(fetch(t,{method:"POST",headers:this.headers(),body:JSON.stringify({events:e.slice(r,r+50)}),keepalive:!0}).then(()=>{}).catch(()=>{}));return Promise.all(s).then(()=>{})}},w=null;function S(){if(w&&w.host.isConnected)return w;let i=document.createElement("div");return i.id="shimmer-root",document.body.appendChild(i),w=i.attachShadow({mode:"open"}),w}function fe(i){let e=ge(i);if(!document.getElementById("shimmer-sdk-styles")){let s=document.createElement("style");s.id="shimmer-sdk-styles",s.textContent=e,document.head.appendChild(s)}let t=S();if(!t.querySelector("#shimmer-shadow-styles")){let s=document.createElement("style");s.id="shimmer-shadow-styles",s.textContent=`:host { all: initial; display: block; position: static; }
`+e,t.appendChild(s)}}function ge(i){return`
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
    .shimmer-chip { border: 1px solid ${i.primaryColor}; background: transparent; color: ${i.primaryColor}; font-family: inherit; line-height: 1.5;
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
    .shimmer-track-link {
      display: inline-block; margin-top: 8px; padding: 4px 10px; border-radius: 8px;
      background: #fff; border: 1px solid #e5e7eb; color: ${i.primaryColor};
      font-size: 12px; font-weight: 600; text-decoration: none;
    }
    .shimmer-track-link:hover { border-color: ${i.primaryColor}; }
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
  `}var E=class{constructor(e,t,s,r){this.client=e;this.labels=t;this.searchSelector=s;this.onQuery=r;this.anchor=null;this.savedPlaceholder="";this.bypassNext=!1;this.debounceTimer=null;this.sessionToken=null;this.history=[];this.knownCriteria=null;this.refined=!1;this.pendingBase="";this.createOverlay(),this.hookExistingInputs()}createOverlay(){this.overlay=document.createElement("div"),this.overlay.className="shimmer-widget shimmer-dock",this.overlay.innerHTML=`
      <div class="shimmer-search-results"></div>
      <div class="shimmer-dock-bottom">
        <div class="shimmer-vendor-q"></div>
        <div class="shimmer-chips-zone"></div>
        <div class="shimmer-dock-footer">
          <button type="button" class="shimmer-dock-native"></button>
          <button type="button" class="shimmer-dock-close">Fermer</button>
        </div>
      </div>
    `,S().appendChild(this.overlay),this.questionEl=this.overlay.querySelector(".shimmer-vendor-q"),this.chipsEl=this.overlay.querySelector(".shimmer-chips-zone"),this.resultsEl=this.overlay.querySelector(".shimmer-search-results"),this.overlay.querySelector(".shimmer-dock-close").addEventListener("click",()=>this.close()),this.overlay.querySelector(".shimmer-dock-native").addEventListener("click",()=>{let e=this.anchor;this.close(),e?.form&&(this.bypassNext=!0,e.form.submit())}),document.addEventListener("click",e=>{if(!this.overlay.classList.contains("active"))return;let t=e.composedPath();!t.includes(this.overlay)&&!t.includes(this.anchor)&&this.close()}),document.addEventListener("keydown",e=>{e.key==="Escape"&&this.close(),(e.metaKey||e.ctrlKey)&&e.key==="k"&&(e.preventDefault(),document.querySelector(this.searchSelector||'input[type="search"], input[data-shimmer-search]')?.focus())}),window.addEventListener("resize",()=>this.position(),{passive:!0}),window.addEventListener("scroll",()=>this.position(),{passive:!0})}position(){if(!this.anchor||!this.overlay.classList.contains("active"))return;let e=this.anchor.getBoundingClientRect(),t=window.innerWidth;if(t<560)this.overlay.style.left="12px",this.overlay.style.right="12px",this.overlay.style.width="auto";else{let s=Math.min(Math.max(e.width,420),640,t-24),r=Math.min(Math.max(e.left,12),t-s-12);this.overlay.style.left=`${r}px`,this.overlay.style.right="auto",this.overlay.style.width=`${s}px`}this.overlay.style.top=`${Math.round(e.bottom+6)}px`}hookExistingInputs(){let e=this.searchSelector||'input[type="search"], input[data-shimmer-search]';document.querySelectorAll(e).forEach(t=>{t.addEventListener("keydown",s=>{this.bypassNext||s.key==="Enter"&&t.value.trim().length>=2&&(s.preventDefault(),s.stopPropagation(),this.open(t.value,t))}),t.form?.addEventListener("submit",s=>{if(this.bypassNext){this.bypassNext=!1;return}t.value.trim().length>=2&&(s.preventDefault(),this.open(t.value,t))})})}open(e,t){t&&t!==this.anchor&&(this.anchor=t,this.savedPlaceholder=t.placeholder),this.overlay.classList.add("active"),this.position();let s=this.overlay.querySelector(".shimmer-dock-native");s.textContent="Voir les r\xE9sultats classiques \u2192",s.style.display=this.anchor?.form?"":"none",e&&e.trim().length>=2&&this.handleQuery(e.trim())}handleQuery(e){try{this.onQuery?.()}catch{}if(!this.refined&&ve(e)){this.pendingBase=e,this.askToRefine(e);return}this.askVendor(e)}askToRefine(e){this.setQuestion(`Avec plaisir. Pour bien vous orienter sur \xAB\xA0${e}\xA0\xBB, c'est pour quelle occasion\xA0?`);let t=["Ap\xE9ritif","Un repas","Un cadeau","D\xE9couvrir","Petit budget"];this.chipsEl.innerHTML=`<div class="shimmer-chips">${t.map(s=>`<button class="shimmer-chip" type="button">${d(s)}</button>`).join("")}</div>`,this.chipsEl.querySelectorAll(".shimmer-chip").forEach(s=>{s.addEventListener("click",()=>{this.refined=!0,this.chipsEl.innerHTML="",this.askVendor(`${this.pendingBase} pour ${s.textContent}`)})})}close(){this.overlay.classList.remove("active"),this.resultsEl.innerHTML="",this.chipsEl.innerHTML="",this.setQuestion(""),this.history=[],this.knownCriteria=null,this.sessionToken=null,this.refined=!1,this.pendingBase="",this.anchor&&(this.anchor.placeholder=this.savedPlaceholder||this.labels.searchPlaceholder)}async askVendor(e){let t=this.anchor;this.setThinking();try{let s=await this.client.vendeur(e,this.sessionToken||void 0);if(s.control){this.close(),t?.form&&(t.value=e,t.form.submit());return}this.sessionToken=s.sessionToken||this.sessionToken,this.setQuestion(s.message),this.renderProducts(s.recommendedProducts||[]),this.renderRestockPrompt(s.outOfStock||[]),this.anchor&&(this.anchor.value="",this.anchor.placeholder="Pr\xE9cisez, ou demandez autre chose\u2026",this.anchor.focus())}catch{this.setQuestion(""),this.resultsEl.innerHTML=`<div class="shimmer-search-empty">Le vendeur n'est pas joignable, r\xE9essayez dans un instant.</div>`}}setThinking(){this.questionEl.textContent="Le vendeur r\xE9fl\xE9chit\u2026",this.questionEl.classList.add("active")}setQuestion(e){if(!e){this.questionEl.textContent="",this.questionEl.classList.remove("active");return}this.questionEl.innerHTML=d(e).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),this.questionEl.classList.add("active")}renderRestockPrompt(e){if(this.resultsEl.querySelectorAll(".shimmer-restock").forEach(a=>a.remove()),!e.length)return;let t=e[0],s=document.createElement("div");s.className="shimmer-restock",s.innerHTML=`
      <div class="shimmer-restock-title"><strong>${d(t.name)}</strong> est \xE9puis\xE9. Je vous pr\xE9viens d\xE8s qu'il revient\xA0?</div>
      <form class="shimmer-restock-form">
        <input type="email" required placeholder="votre@email.fr" autocomplete="email" />
        <button type="submit">Pr\xE9venez-moi</button>
      </form>`;let r=s.querySelector("form"),o=s.querySelector("input"),n=s.querySelector("button");r.addEventListener("submit",async a=>{a.preventDefault();let l=o.value.trim();if(l){n.disabled=!0;try{await this.client.stockAlert({email:l,platformVariantId:t.platformProductId?`p:${t.platformProductId}`:`local:${t.id}`,productId:t.id,variantLabel:t.name,visitorId:p?H(g):null}),s.innerHTML=`<div class="shimmer-restock-done">C'est not\xE9. Vous serez pr\xE9venu d\xE8s le retour de ${d(t.name)}.</div>`}catch{n.disabled=!1,o.setCustomValidity("Impossible d'enregistrer, r\xE9essayez."),o.reportValidity(),setTimeout(()=>o.setCustomValidity(""),2e3)}}}),this.resultsEl.prepend(s)}renderProducts(e){if(!e.length){this.resultsEl.innerHTML="";return}this.resultsEl.innerHTML=e.slice(0,8).map(s=>`
      <div class="shimmer-search-item" data-id="${s.id}">
        ${T(s.imageUrl)?`<img src="${T(s.imageUrl)}" alt="${d(s.name)}" />`:'<div style="width:56px;height:56px;background:#f3f4f6;border-radius:8px"></div>'}
        <div class="shimmer-search-item-info">
          <div class="shimmer-search-item-name">${d(s.name)}</div>
          <div class="shimmer-search-item-desc">${d(s.category||"")} ${s.brand?"\xB7 "+d(s.brand):""}</div>
        </div>
        <div class="shimmer-search-item-price">${d(z(s.price))}</div>
      </div>`).join("");let t=e.slice(0,8);this.resultsEl.querySelectorAll(".shimmer-search-item").forEach((s,r)=>{let o=t[r];if(!o||!this.anchor?.form)return;s.setAttribute("role","link"),s.tabIndex=0;let n=()=>this.searchNative(o.name);s.addEventListener("click",n),s.addEventListener("keydown",a=>{a.key==="Enter"&&n()})})}searchNative(e){let t=this.anchor;this.close(),t?.form&&(t.value=e,this.bypassNext=!0,t.form.submit())}setOnQuery(e){this.onQuery=e}destroy(){this.overlay.remove()}},C=class{constructor(e,t,s=()=>null){this.client=e;this.labels=t;this.getCustomer=s;this.sessionToken=null;this.history=[];this.knownCriteria=null;this.mode="assist";this.isOpen=!1;this.savSessionToken=null;this.awaitingOrderRef=!1;this.createBubble(),this.createWindow()}createBubble(){this.bubble=document.createElement("button"),this.bubble.className="shimmer-widget shimmer-chat-bubble",this.bubble.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',this.bubble.addEventListener("click",()=>this.toggle()),S().appendChild(this.bubble)}createWindow(){this.window=document.createElement("div"),this.window.className="shimmer-widget shimmer-chat-window",this.window.innerHTML=`
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
    `,S().appendChild(this.window),this.messagesEl=this.window.querySelector(".shimmer-chat-messages"),this.formInput=this.window.querySelector(".shimmer-chat-form input"),this.sendBtn=this.window.querySelector(".shimmer-chat-form button"),this.window.querySelector(".shimmer-chat-close").addEventListener("click",()=>this.toggle()),this.window.querySelector(".shimmer-chat-form").addEventListener("submit",e=>{e.preventDefault(),this.sendMessage()}),this.addMessage("assistant",this.labels.chatWelcome)}toggle(){this.isOpen=!this.isOpen,this.window.classList.toggle("active",this.isOpen),this.isOpen&&setTimeout(()=>this.formInput.focus(),100)}addMessage(e,t,s,r){let o=document.createElement("div");o.className=`shimmer-chat-msg ${e}`;let n=d(t).replace(/\n/g,"<br>");s?.length&&(n+=`<div class="shimmer-products">${s.map(a=>`
        <div class="shimmer-product-card">
          ${T(a.imageUrl)?`<img src="${T(a.imageUrl)}" alt="${d(a.name)}" />`:""}
          <div class="shimmer-product-card-info">
            <div class="shimmer-product-card-name">${d(a.name)}</div>
            <div class="shimmer-product-card-price">${d(a.price)}${a.currency==="EUR"?"\u20AC":" "+d(a.currency)}</div>
          </div>
        </div>
      `).join("")}</div>`),r!=null&&r>0&&(n+=`<div class="shimmer-progress">
        <div class="shimmer-progress-bar"><div class="shimmer-progress-fill" style="width:${r}%"></div></div>
        <div class="shimmer-progress-label">Qualification: ${r}%</div>
      </div>`),o.innerHTML=n,this.messagesEl.appendChild(o),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}showTyping(){let e=document.createElement("div");return e.className="shimmer-typing",e.innerHTML="<span></span><span></span><span></span>",this.messagesEl.appendChild(e),this.messagesEl.scrollTop=this.messagesEl.scrollHeight,e}async sendMessage(){let e=this.formInput.value.trim();if(!e)return;if(this.formInput.value="",this.sendBtn.disabled=!0,this.addMessage("user",e),this.awaitingOrderRef&&/[@\d]/.test(e)||N(e)){this.sendSavMessage(e);return}this.awaitingOrderRef=!1,this.history.push({role:"user",content:e});let s=document.createElement("div");s.className="shimmer-chat-msg assistant",s.innerHTML='<span class="shimmer-typing"><span></span><span></span><span></span></span>',this.messagesEl.appendChild(s),this.messagesEl.scrollTop=this.messagesEl.scrollHeight;let r="",o=null;this.client.assistStream(e,{onToken:n=>{s.querySelector(".shimmer-typing")&&(s.innerHTML=""),r+=n,s.innerHTML=d(r).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>"),this.messagesEl.scrollTop=this.messagesEl.scrollHeight},onMeta:n=>{o=n,this.knownCriteria=n.knownCriteria||this.knownCriteria,n.suggestedQuestions?.length&&this.renderSuggestions(n.suggestedQuestions)},onDone:n=>{r=n||r;let a=d(r).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>");o?.highlightedProducts?.length&&(a+=`<div class="shimmer-products">${o.highlightedProducts.map(l=>`
              <div class="shimmer-product-card">
                <div class="shimmer-product-card-info">
                  <div class="shimmer-product-card-name">${d(l.name)}</div>
                  <div style="font-size:11px;color:#6b7280">${d(l.brand)}</div>
                  <div class="shimmer-product-card-price">${d(l.price)}</div>
                </div>
              </div>
            `).join("")}</div>`),o?.qualification?.score>0&&(a+=`<div class="shimmer-progress">
              <div class="shimmer-progress-bar"><div class="shimmer-progress-fill" style="width:${Number(o.qualification.score)||0}%"></div></div>
              <div class="shimmer-progress-label">Qualification: ${Number(o.qualification.score)||0}%</div>
            </div>`),s.innerHTML=a,this.history.push({role:"assistant",content:r}),this.sendBtn.disabled=!1,this.formInput.focus(),this.messagesEl.scrollTop=this.messagesEl.scrollHeight},onError:n=>{s.innerHTML=`Erreur: ${d(n)}`,this.sendBtn.disabled=!1,this.formInput.focus()}},this.sessionToken||void 0,this.history.slice(-8),this.knownCriteria||void 0)}async sendSavMessage(e){let t=document.createElement("div");t.className="shimmer-chat-msg assistant",t.innerHTML='<span class="shimmer-typing"><span></span><span></span><span></span></span>',this.messagesEl.appendChild(t),this.messagesEl.scrollTop=this.messagesEl.scrollHeight;try{let s=await this.client.savMessage(e,this.savSessionToken||void 0,this.getCustomer());this.savSessionToken=s.sessionToken??this.savSessionToken,this.awaitingOrderRef=!!s.awaitingOrderRef;let r=s.message||this.labels.savUnavailable;_(t,r,s.tracking??[],this.labels.trackParcel)}catch{this.awaitingOrderRef=!1,_(t,this.labels.savUnavailable,[],this.labels.trackParcel)}finally{this.sendBtn.disabled=!1,this.formInput.focus(),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}}renderSuggestions(e){this.messagesEl.querySelectorAll(".shimmer-suggestions").forEach(s=>s.remove());let t=document.createElement("div");t.className="shimmer-suggestions",t.style.cssText="display:flex;gap:6px;flex-wrap:wrap;padding:4px 0;";for(let s of e){let r=document.createElement("button");r.textContent=s,r.style.cssText="padding:6px 12px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;font-size:12px;cursor:pointer;font-family:inherit;transition:background 0.15s;",r.addEventListener("mouseenter",()=>{r.style.background="#f3f4f6"}),r.addEventListener("mouseleave",()=>{r.style.background="#fff"}),r.addEventListener("click",()=>{this.formInput.value=s,this.sendMessage(),t.remove()}),t.appendChild(r)}this.messagesEl.appendChild(t),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}destroy(){this.bubble.remove(),this.window.remove()}};function _(i,e,t,s){i.textContent="",e.split(`
`).forEach((r,o)=>{o>0&&i.appendChild(document.createElement("br")),i.appendChild(document.createTextNode(r))});for(let r of t){if(!r.url)continue;let o;try{o=new URL(r.url)}catch{continue}if(o.protocol!=="https:"&&o.protocol!=="http:")continue;let n=document.createElement("a");n.className="shimmer-track-link",n.href=o.toString(),n.target="_blank",n.rel="noopener noreferrer",n.textContent=r.carrier?`\u2197 ${s} (${r.carrier})`:`\u2197 ${s}`,i.appendChild(document.createElement("br")),i.appendChild(n)}}function B(i){if(!i||!i.email||!i.email.includes("@"))return null;let e=(i.signature||"").trim(),t=(i.ts||"").trim();return/^[0-9a-f]{64}$/i.test(e)&&/^\d{9,11}$/.test(t)?{email:i.email,ts:t,signature:e}:null}function d(i){return String(i??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function T(i){let e=String(i??"").trim();return/^https?:\/\//i.test(e)?d(e):""}function ve(i){let e=i.trim().toLowerCase().split(/\s+/);if(e.length>2)return!1;let t=["rouge","blanc","ros\xE9","rose","vin","vins","champagne","cr\xE9mant","cremant","bulle","bulles","cadeau","offrir","id\xE9e","idee","ap\xE9ro","apero"];return e.some(s=>t.includes(s))}var be={apero:"Ap\xE9ritif",repas:"Repas",dessert:"Dessert",decouverte:"D\xE9couverte",cadeau:"Cadeau",accessoire:"Accessoire",complement:"\xC0 associer"},g="shimmer_vid",Y=365;function H(i){if(typeof document>"u")return null;let e=document.cookie.match(new RegExp("(?:^|; )"+i.replace(/[.$?*|{}()[\]\\\/+^]/g,"\\$&")+"=([^;]*)"));return e?decodeURIComponent(e[1]):null}function G(i,e,t){if(typeof document>"u")return;let s=new Date(Date.now()+t*864e5).toUTCString();document.cookie=`${i}=${encodeURIComponent(e)}; expires=${s}; path=/; SameSite=Lax`}function U(){let i=H(g);if(i&&i.length>=8)return i;let e="vid_"+Math.random().toString(36).slice(2,10)+Date.now().toString(36);return G(g,e,Y),e}var p=!1,ye=["shimmer_xs_sid","shimmer_xs_intent"];function D(){try{for(let i of ye)localStorage.removeItem(i)}catch{}try{sessionStorage.removeItem("shimmer_enrolled")}catch{}}function j(i){typeof document>"u"||(document.cookie=`${i}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`)}function V(i){let e=window,t=!1,s=e.__tcfapi;if(typeof s=="function"){t=!0;try{s("addEventListener",2,(o,n)=>{let a=o;!n||!a||(a.eventStatus==="tcloaded"||a.eventStatus==="useractioncomplete")&&i(a.gdprApplies===!1?!0:!!a.purpose?.consents?.["1"])})}catch{}}let r=e.Cookiebot;if(r&&typeof r=="object"&&"consent"in r){t=!0;let o=()=>i(!!(r.consent?.statistics||r.consent?.preferences));(r.consented||r.declined)&&o(),window.addEventListener("CookiebotOnAccept",o),window.addEventListener("CookiebotOnDecline",o)}if((e.axeptioSettings||e._axcb)&&(t=!0,(e._axcb=e._axcb||[]).push(n=>{try{n.on("cookies:complete",a=>{let l=a||{};i(!!(l.shimmer??l.analytics??l.stats??Object.values(l).some(Boolean)))})}catch{}})),e.tarteaucitron){t=!0;let o=()=>{let n=document.cookie.match(/tarteaucitron=([^;]*)/);if(!n)return;let a=decodeURIComponent(n[1]??"");/shimmer=true/.test(a)?i(!0):/shimmer=false/.test(a)?i(!1):/=true/.test(a)&&i(!0)};o(),document.addEventListener("tac.close_alert",o),document.addEventListener("tac.close_panel",o)}return t}async function xe(i,e,t,s){let r=await O(`${i}/api/holdout/decision?store=${t}&visitorId=${encodeURIComponent(s)}`,{headers:{Authorization:`Bearer ${e}`}},5e3);if(!r.ok)throw new Error("holdout-decision-failed");return r.json()}var W="shimmer_enrolled";function Q(i,e,t,s,r){if(p){try{if(window.sessionStorage.getItem(W))return}catch{}fetch(`${i}/api/holdout/track`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({visitorId:s,store:t,exposed:r,trigger:"search"}),keepalive:!0}).then(o=>{if(o.ok)try{window.sessionStorage.setItem(W,"1")}catch{}}).catch(()=>{})}}function we(i,e){let t=i||'input[type="search"], input[data-shimmer-search]';document.querySelectorAll(t).forEach(s=>{s.addEventListener("keydown",r=>{r.key==="Enter"&&s.value.trim().length>=2&&e()}),s.form?.addEventListener("submit",()=>{s.value.trim().length>=2&&e()})})}function X(){return typeof window>"u"||typeof document>"u"?!1:window.Shopify||document.querySelector('meta[name="shopify-checkout-api-token"], meta[name="shopify-digital-wallet"]')?!0:/\.myshopify\.com$/.test(window.location.hostname)}async function ke(i,e){if(!p||!X())return;let t={attributes:{shimmer_vid:i,shimmer_bucket:String(e)}};try{await fetch("/cart/update.js",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(t),credentials:"same-origin"})}catch{}if(!("__shimmerFetchPatched"in window)){window.__shimmerFetchPatched=!0;let s=window.fetch.bind(window);window.fetch=async(...r)=>{let o=await s(...r);try{let n=typeof r[0]=="string"?r[0]:r[0].url;p&&/\/cart\/(add|change|clear)(?:\.js)?\b/.test(n)&&s("/cart/update.js",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(t),credentials:"same-origin"})}catch{}return o}}}var M="shimmer_xs_sid",Se=30*864e5,F=null;function L(){if(!p||typeof localStorage>"u")return F??(F="xs-page-"+Math.random().toString(36).slice(2)),F;try{let e=localStorage.getItem(M);if(e){let t=JSON.parse(e);if(t&&t.id&&t.ts&&Date.now()-t.ts<Se)return localStorage.setItem(M,JSON.stringify({id:t.id,ts:Date.now()})),t.id}}catch{}let i="xs-"+Math.random().toString(36).slice(2)+Date.now().toString(36);try{localStorage.setItem(M,JSON.stringify({id:i,ts:Date.now()}))}catch{}return i}var Z="shimmer_xs_intent",Ee=30*60*1e3;function ee(){if(typeof localStorage>"u")return[];try{let i=localStorage.getItem(Z);if(!i)return[];let e=JSON.parse(i);if(!Array.isArray(e))return[];let t=Date.now();return e.filter(s=>s&&typeof s=="object"&&t-s.ts<Ee)}catch{return[]}}function te(i){if(!(!p||typeof localStorage>"u"))try{let e=i.slice(0,20);localStorage.setItem(Z,JSON.stringify(e))}catch{}}function K(i){let t=ee().filter(s=>s.target_id!==i.target_id);te([i,...t])}function J(i){let e=ee(),t=e.filter(r=>r.target_id===i);if(t.length===0)return[];let s=e.filter(r=>r.target_id!==i);return te(s),t}var $=class{constructor(e,t={}){this.mounted=new WeakSet;this.eventQueue=[];this.flushTimer=null;this.client=e,this.opts={selector:t.selector??"[data-shimmer-crosssell]",limit:Math.min(Math.max(t.limit??4,1),12),title:t.title??"On a aussi pens\xE9 \xE0",onProductClick:t.onProductClick??(()=>{}),productUrl:t.productUrl??null},this.sessionId=L()}trackEvent(e){p&&(this.sessionId=L(),this.eventQueue.push({...e,session_id:this.sessionId}),this.flushTimer===null&&typeof window<"u"&&(this.flushTimer=window.setTimeout(()=>this.flushEvents(),1500)))}flushEvents(){if(this.flushTimer!==null&&(typeof window<"u"&&window.clearTimeout(this.flushTimer),this.flushTimer=null),this.eventQueue.length===0)return;let e=this.eventQueue.splice(0,this.eventQueue.length);this.client.crossSellEvents(e).catch(()=>{})}async render(){let e=document.querySelectorAll(this.opts.selector);await Promise.all([...e].map(t=>this.mount(t)))}async renderInto(e,t){let s=typeof e=="string"?document.querySelector(e):e;s&&(s.setAttribute("data-shimmer-crosssell",String(t)),await this.mount(s))}async mount(e){if(this.mounted.has(e))return;this.mounted.add(e);let t=e.getAttribute("data-shimmer-crosssell"),s=Number(t);if(!(!Number.isFinite(s)||s<=0)){e.classList.add("shimmer-widget","sx-wrap"),e.innerHTML=`
      <p class="sx-title">${d(this.opts.title)}</p>
      <div class="sx-loading">
        <div class="sx-skel"></div><div class="sx-skel"></div>
        <div class="sx-skel"></div><div class="sx-skel"></div>
      </div>
    `;try{let r=await this.client.crossSell(s,this.opts.limit);if(!r.items.length){e.innerHTML="";return}this.renderCards(e,r)}catch{e.innerHTML=""}}}renderCards(e,t){let s=this.opts.productUrl?"a":"div",r=t.items.map(n=>{let a=this.opts.productUrl?this.opts.productUrl.replace("{id}",String(n.product.id)).replace("{sku}",n.product.sku||""):null,l=a?`href="${d(a)}"`:"",u=n.product.imageUrl?`<img class="sx-img" src="${d(n.product.imageUrl)}" alt="${d(n.product.name)}" loading="lazy" />`:'<div class="sx-img-placeholder">\u25C7</div>',m=be[n.role]||n.role,h=n.product.brand?`<p class="sx-brand">${d(n.product.brand)}</p>`:"";return`
          <${s} ${l} class="sx-card" data-product-id="${n.product.id}">
            <span class="sx-chip sx-chip-${d(n.role)}">${d(m)}</span>
            ${u}
            <p class="sx-name">${d(n.product.name)}</p>
            ${h}
            <p class="sx-reason">\xAB ${d(n.reason)} \xBB</p>
            <div class="sx-foot">
              <span class="sx-price">${d(n.product.price)}\u20AC</span>
              <button type="button" class="sx-add" data-add="${n.product.id}">Ajouter</button>
            </div>
          </${s}>
        `}).join("");e.innerHTML=`
      <p class="sx-title">${d(this.opts.title)}</p>
      <div class="sx-grid">${r}</div>
    `;let o=Array.from(e.querySelectorAll(".sx-card"));if(o.forEach((n,a)=>{let l=Number(n.dataset.productId),u=t.items.find(m=>m.product.id===l);u&&n.addEventListener("click",m=>{m.target.closest(".sx-add")||(this.trackEvent({product_id:t.reference.id,target_id:u.product.id,role:u.role,event_type:"click",position:a}),K({ref_id:t.reference.id,target_id:u.product.id,role:u.role,position:a,ts:Date.now()}),this.flushEvents(),this.opts.onProductClick(u))})}),e.querySelectorAll(".sx-add").forEach(n=>{let a=Number(n.dataset.add),l=t.items.find(m=>m.product.id===a);if(!l)return;let u=o.findIndex(m=>m.dataset.productId===String(a));n.addEventListener("click",m=>{m.preventDefault(),m.stopPropagation(),this.trackEvent({product_id:t.reference.id,target_id:l.product.id,role:l.role,event_type:"add",position:u}),K({ref_id:t.reference.id,target_id:l.product.id,role:l.role,position:u,ts:Date.now()}),this.flushEvents(),this.opts.onProductClick(l)})}),typeof IntersectionObserver<"u"){let n=new WeakSet,a=new Map,l=new IntersectionObserver(u=>{for(let m of u){if(n.has(m.target))continue;let h=m.target;if(m.isIntersecting&&m.intersectionRatio>=.5){if(a.has(h))continue;let v=window.setTimeout(()=>{n.add(h),a.delete(h),l.unobserve(h);let I=Number(h.dataset.productId),b=t.items.find(y=>y.product.id===I);if(!b)return;let f=o.indexOf(h);this.trackEvent({product_id:t.reference.id,target_id:b.product.id,role:b.role,event_type:"impression",position:f})},300);a.set(h,v)}else{let v=a.get(h);v!==void 0&&(window.clearTimeout(v),a.delete(h))}}},{threshold:[0,.5,1]});o.forEach(u=>l.observe(u))}if(typeof window<"u"){let n=()=>this.flushEvents();window.addEventListener("pagehide",n,{once:!1}),window.addEventListener("beforeunload",n,{once:!1})}}},c=class c{constructor(e){this.searchWidget=null;this.chatWidget=null;this.consent="unknown";this.visitorId=null;this.customer=null;this.measuredBootDone=!1;this.assistHistory=[];this.assistKnownCriteria={};this.config=e,this.theme={...he,...e.theme},this.labels=pe[e.locale||"fr"],this.client=new A(e.apiUrl,e.apiKey,e.storeId),this.customer=B(e.customer)??c.pendingCustomer}static init(e){try{c.instance&&c.instance.destroy();let t=new c(e);try{fe(t.theme)}catch(s){console.warn("[shimmer] styles",s)}return c.instance=t,t.bootstrapHoldoutAndMount().catch(s=>console.warn("[shimmer] bootstrap",s)),t}catch(t){return console.warn("[shimmer] init failed, store unaffected",t),c.instance??new c(e)}}async bootstrapHoldoutAndMount(){let e=this.config.consentMode??"auto";if(document.addEventListener("shimmer:consent",s=>{let r=!!s.detail?.granted;this.applyConsent(r)}),c.pendingConsent===!1){c.pendingConsent=null,await this.sessionBoot(),this.applyConsent(!1);return}if(e==="granted"){this.applyConsent(!0);return}if(e==="denied"){j(g),D(),await this.sessionBoot();return}if(c.pendingConsent!==null){let s=c.pendingConsent;c.pendingConsent=null,s||await this.sessionBoot(),this.applyConsent(s);return}let t=V(s=>this.applyConsent(s));await this.sessionBoot(),e==="auto"&&!t&&window.setTimeout(()=>{this.consent==="unknown"&&!V(s=>this.applyConsent(s))&&this.applyConsent(!0)},3e3)}applyConsent(e){let t=this.consent;this.consent=e?"granted":"denied",p=e,e&&!this.measuredBootDone?(this.measuredBootDone=!0,this.measuredBoot().catch(s=>console.warn("[shimmer] measured boot",s))):e&&(this.visitorId?G(g,this.visitorId,Y):U()),!e&&t!=="denied"&&(j(g),D(),t==="granted"&&X()&&fetch("/cart/update.js",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({attributes:{shimmer_vid:"",shimmer_bucket:""}}),credentials:"same-origin"}).catch(()=>{}))}async sessionBoot(){this.searchWidget||(this.searchWidget=new E(this.client,this.labels,this.config.searchSelector,void 0),this.config.enableChat&&(this.chatWidget=new C(this.client,this.labels,()=>this.customer)))}async measuredBoot(){let e=U();this.visitorId=e;let t=!1,s=0,r=this.config.storeId;try{if(!r)try{let a=await O(`${this.config.apiUrl}/api/stores/me/config`,{headers:{Authorization:`Bearer ${this.config.apiKey}`}},5e3);if(a.ok){let l=await a.json();r=l.id??l.storeId}}catch{}if(r){let a=await xe(this.config.apiUrl,this.config.apiKey,r,e);t=a.control,s=a.bucket}}catch{}if(!p)return;this.config.disableCartAttribution||ke(e,s);let o=r;if(t){this.searchWidget?.destroy(),this.searchWidget=null,this.chatWidget=null,o&&we(this.config.searchSelector,()=>Q(this.config.apiUrl,this.config.apiKey,o,e,!1));return}let n=o?()=>Q(this.config.apiUrl,this.config.apiKey,o,e,!0):void 0;this.searchWidget?this.searchWidget.setOnQuery(n):this.searchWidget=new E(this.client,this.labels,this.config.searchSelector,n),this.config.enableChat&&!this.chatWidget&&(this.chatWidget=new C(this.client,this.labels,()=>this.customer))}static consent(e){if(!c.instance){c.pendingConsent=e;return}c.instance.applyConsent(e)}static identify(e){c.pendingCustomer=B(e),c.instance&&(c.instance.customer=c.pendingCustomer)}static get assistant(){return{chat:c.chat,reset:c.resetChat}}static search(e){if(!c.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return c.instance.client.search(e)}static openSearch(e){c.instance?.searchWidget?.open(e)}static async chat(e){if(!c.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");let t=c.instance;t.assistHistory.push({role:"user",content:e});let s=await t.client.assist(e,t.assistSessionToken,t.assistHistory.slice(-6),t.assistKnownCriteria);return t.assistSessionToken=s.sessionToken,s.knownCriteria&&(t.assistKnownCriteria={...t.assistKnownCriteria,...s.knownCriteria}),t.assistHistory.push({role:"assistant",content:s.message}),s}static resetChat(){c.instance&&(c.instance.assistHistory=[],c.instance.assistKnownCriteria={},c.instance.assistSessionToken=void 0)}static reviewStats(e){if(!c.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return c.instance.client.reviewStats(e)}static destroy(){c.instance?.destroy()}destroy(){this.searchWidget?.destroy(),this.chatWidget?.destroy(),document.getElementById("shimmer-sdk-styles")?.remove(),c.instance=null}};c.instance=null,c.pendingConsent=null,c.pendingCustomer=null,c.crossSell={async render(e={}){if(!c.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");await new $(c.instance.client,e).render()},async renderInto(e,t,s={}){if(!c.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");await new $(c.instance.client,s).renderInto(e,t)},fetch(e,t=4){if(!c.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return c.instance.client.crossSell(e,t)},trackProductView(e){if(!p||!c.instance||!Number.isFinite(e)||e<=0)return;let t=J(e);if(t.length===0)return;let s=L(),r=t.map(o=>({product_id:o.ref_id,target_id:o.target_id,role:o.role,event_type:"view_target",session_id:s,position:o.position,metadata:{intent_age_ms:Date.now()-o.ts}}));c.instance.client.crossSellEvents(r).catch(()=>{})},trackPurchase(e){if(!p||!c.instance)return;let t=L(),s=[];for(let r of e){if(!Number.isFinite(r)||r<=0)continue;let o=J(r);for(let n of o)s.push({product_id:n.ref_id,target_id:n.target_id,role:n.role,event_type:"purchase",session_id:t,position:n.position,metadata:{intent_age_ms:Date.now()-n.ts}})}s.length!==0&&c.instance.client.crossSellEvents(s).catch(()=>{})}};var P=c;(function(){if(typeof document>"u")return;let e=document.currentScript;if(!e||!e.hasAttribute("data-shimmer"))return;let t=e.getAttribute("data-store"),s=e.getAttribute("data-key");if(!t||!s){console.warn("[shimmer] data-store et data-key sont requis pour l'auto-d\xE9marrage.");return}let r=e.getAttribute("data-api")||"";if(!r)try{r=`${new URL(e.src).origin}/shimmer`}catch{console.warn("[shimmer] impossible de d\xE9duire data-api depuis le src ; pr\xE9cisez data-api.");return}let o=()=>{try{P.init({apiUrl:r,apiKey:s,storeId:Number(t),searchSelector:e.getAttribute("data-search")||void 0,enableChat:e.hasAttribute("data-chat"),consentMode:e.getAttribute("data-consent")||void 0,customer:{email:e.getAttribute("data-customer-email")||"",ts:e.getAttribute("data-customer-ts")||"",signature:e.getAttribute("data-customer-signature")||""}})}catch(n){console.warn("[shimmer] init \xE9chou\xE9e",n)}};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o):o()})();return ce(Ce);})();
if(typeof window!=="undefined"){window.Shimmer=ShimmerSDK.Shimmer;}
//# sourceMappingURL=shimmer.js.map
