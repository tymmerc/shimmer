"use strict";var ShimmerSDK=(()=>{var w=Object.defineProperty;var O=Object.getOwnPropertyDescriptor;var _=Object.getOwnPropertyNames;var z=Object.prototype.hasOwnProperty;var j=(r,e)=>{for(var t in e)w(r,t,{get:e[t],enumerable:!0})},N=(r,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of _(e))!z.call(r,i)&&i!==t&&w(r,i,{get:()=>e[i],enumerable:!(s=O(e,i))||s.enumerable});return r};var D=r=>N(w({},"__esModule",{value:!0}),r);var ee={};j(ee,{Shimmer:()=>$});var q={primaryColor:"#6366f1",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',borderRadius:"12px",chatPosition:"bottom-right"},U={fr:{searchPlaceholder:"Rechercher un produit...",chatPlaceholder:"Posez votre question...",chatTitle:"Assistant Shimmer",chatWelcome:"Bonjour ! Comment puis-je vous aider ?",send:"Envoyer",close:"Fermer",noResults:"Aucun r\xE9sultat trouv\xE9.",addToCart:"Voir le produit",assistTitle:"Vendeur IA",assistPlaceholder:"D\xE9crivez ce que vous cherchez...",poweredBy:"Propuls\xE9 par Shimmer"},en:{searchPlaceholder:"Search for a product...",chatPlaceholder:"Ask a question...",chatTitle:"Shimmer Assistant",chatWelcome:"Hello! How can I help you?",send:"Send",close:"Close",noResults:"No results found.",addToCart:"View product",assistTitle:"AI Sales Assistant",assistPlaceholder:"Describe what you are looking for...",poweredBy:"Powered by Shimmer"}},E=class{constructor(e,t){this.apiUrl=e;this.apiKey=t}async request(e,t,s){let i=`${this.apiUrl}${t}`,o=await fetch(i,{method:e,headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.apiKey}`},body:s?JSON.stringify(s):void 0});if(!o.ok){let n=await o.json().catch(()=>({error:o.statusText}));throw new Error(n.error||`HTTP ${o.status}`)}return o.json()}search(e,t){return this.request("POST","/api/search",{query:e,sessionToken:t})}assist(e,t,s,i){return this.request("POST","/api/search/assist",{message:e,sessionToken:t,history:s,knownCriteria:i})}assistStream(e,t,s,i,o){let n=new AbortController,c=`${this.apiUrl}/api/search/assist/stream`;return fetch(c,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.apiKey}`},body:JSON.stringify({message:e,sessionToken:s,history:i,knownCriteria:o}),signal:n.signal}).then(async d=>{if(!d.ok||!d.body){t.onError?.(`HTTP ${d.status}`);return}let h=d.body.getReader(),m=new TextDecoder,p="";for(;;){let{done:f,value:x}=await h.read();if(f)break;p+=m.decode(x,{stream:!0});let g=p.split(`
`);p=g.pop()||"";let u="";for(let v of g)if(v.startsWith("event: "))u=v.slice(7).trim();else if(v.startsWith("data: ")){let A=v.slice(6);try{let b=JSON.parse(A);u==="metadata"?t.onMeta(b):u==="token"?t.onToken(b.text):u==="done"?t.onDone(b.fullText):u==="error"&&t.onError?.(b.error)}catch{}}}}).catch(d=>{d.name!=="AbortError"&&t.onError?.(d.message)}),n}chatMessage(e,t){return this.request("POST","/api/chat/message",{message:e,sessionToken:t,stream:!1})}reviewStats(e){let t=e?`?productId=${e}`:"";return this.request("GET",`/api/reviews/stats${t}`)}productReviews(e,t=1){return this.request("GET",`/api/reviews/product/${e}?page=${t}&limit=10`)}crossSell(e,t=4){return this.request("GET",`/api/catalog/cross-sell/product/${e}?limit=${t}`)}crossSellEvents(e){let t=JSON.stringify({events:e}),s=`${this.apiUrl}/api/catalog/cross-sell/events`;if(typeof navigator<"u"&&navigator.sendBeacon){let i=new Blob([t],{type:"application/json"});try{if(navigator.sendBeacon(s,i))return Promise.resolve()}catch{}}return fetch(s,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.apiKey}`},body:t,keepalive:!0}).then(()=>{}).catch(()=>{})}};function B(r){if(document.getElementById("shimmer-sdk-styles"))return;let e=document.createElement("style");e.id="shimmer-sdk-styles",e.textContent=`
    .shimmer-widget * { box-sizing: border-box; margin: 0; padding: 0; }
    .shimmer-widget { font-family: ${r.fontFamily}; font-size: 14px; line-height: 1.5; color: #1f2937; }

    /* Search overlay */
    .shimmer-search-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99998;
      display: flex; align-items: flex-start; justify-content: center; padding-top: 10vh;
      opacity: 0; transition: opacity 0.2s; pointer-events: none;
    }
    .shimmer-search-overlay.active { opacity: 1; pointer-events: auto; }
    .shimmer-search-panel {
      background: #fff; border-radius: ${r.borderRadius}; width: 90%; max-width: 640px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden;
      transform: translateY(-20px); transition: transform 0.2s;
    }
    .shimmer-search-overlay.active .shimmer-search-panel { transform: translateY(0); }
    .shimmer-search-input {
      width: 100%; padding: 16px 20px; border: none; outline: none;
      font-size: 16px; font-family: inherit; border-bottom: 1px solid #e5e7eb;
    }
    .shimmer-search-results { max-height: 60vh; overflow-y: auto; padding: 8px; }
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
    .shimmer-search-item-price { font-weight: 700; color: ${r.primaryColor}; white-space: nowrap; }
    .shimmer-search-empty { padding: 24px; text-align: center; color: #9ca3af; }

    /* Chat bubble */
    .shimmer-chat-bubble {
      position: fixed; ${r.chatPosition==="bottom-right"?"right: 20px":"left: 20px"}; bottom: 20px;
      width: 56px; height: 56px; border-radius: 50%; background: ${r.primaryColor}; color: #fff;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 99997; border: none;
      transition: transform 0.2s;
    }
    .shimmer-chat-bubble:hover { transform: scale(1.1); }
    .shimmer-chat-bubble svg { width: 24px; height: 24px; }

    /* Chat window */
    .shimmer-chat-window {
      position: fixed; ${r.chatPosition==="bottom-right"?"right: 20px":"left: 20px"}; bottom: 88px;
      width: 380px; max-width: calc(100vw - 40px); height: 520px; max-height: calc(100vh - 120px);
      background: #fff; border-radius: ${r.borderRadius}; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      z-index: 99998; display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; transform: translateY(20px) scale(0.95); transition: all 0.2s; pointer-events: none;
    }
    .shimmer-chat-window.active { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .shimmer-chat-header {
      padding: 16px; background: ${r.primaryColor}; color: #fff;
      display: flex; justify-content: space-between; align-items: center;
    }
    .shimmer-chat-header h3 { font-size: 15px; font-weight: 600; }
    .shimmer-chat-close { background: none; border: none; color: #fff; cursor: pointer; font-size: 20px; line-height: 1; }
    .shimmer-chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .shimmer-chat-msg { max-width: 85%; padding: 10px 14px; border-radius: 16px; font-size: 13px; word-wrap: break-word; }
    .shimmer-chat-msg.user { align-self: flex-end; background: ${r.primaryColor}; color: #fff; border-bottom-right-radius: 4px; }
    .shimmer-chat-msg.assistant { align-self: flex-start; background: #f3f4f6; color: #1f2937; border-bottom-left-radius: 4px; }
    .shimmer-chat-form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #e5e7eb; }
    .shimmer-chat-form input {
      flex: 1; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 24px;
      outline: none; font-size: 13px; font-family: inherit;
    }
    .shimmer-chat-form input:focus { border-color: ${r.primaryColor}; }
    .shimmer-chat-form button {
      padding: 10px 16px; background: ${r.primaryColor}; color: #fff; border: none;
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
    .shimmer-product-card-price { color: ${r.primaryColor}; font-weight: 700; }

    /* Progress bar */
    .shimmer-progress { margin-top: 8px; }
    .shimmer-progress-bar { height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden; }
    .shimmer-progress-fill { height: 100%; background: ${r.primaryColor}; transition: width 0.3s; border-radius: 2px; }
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
      font-family: ${r.fontFamily};
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
      font-family: ${r.fontFamily};
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
  `,document.head.appendChild(e)}var T=class{constructor(e,t,s){this.client=e;this.labels=t;this.searchSelector=s;this.debounceTimer=null;this.sessionToken=null;this.createOverlay(),this.hookExistingInputs()}createOverlay(){this.overlay=document.createElement("div"),this.overlay.className="shimmer-widget shimmer-search-overlay",this.overlay.innerHTML=`
      <div class="shimmer-search-panel">
        <input class="shimmer-search-input" type="text" placeholder="${this.labels.searchPlaceholder}" autocomplete="off" />
        <div class="shimmer-search-results"></div>
      </div>
    `,document.body.appendChild(this.overlay),this.input=this.overlay.querySelector(".shimmer-search-input"),this.resultsEl=this.overlay.querySelector(".shimmer-search-results"),this.overlay.addEventListener("click",e=>{e.target===this.overlay&&this.close()}),this.input.addEventListener("input",()=>this.onInput()),document.addEventListener("keydown",e=>{e.key==="Escape"&&this.close(),(e.metaKey||e.ctrlKey)&&e.key==="k"&&(e.preventDefault(),this.open())})}hookExistingInputs(){let e=this.searchSelector||'input[type="search"], input[data-shimmer-search]';document.querySelectorAll(e).forEach(t=>{t.addEventListener("focus",s=>{s.preventDefault(),t.blur(),this.open(t.value)})})}open(e){this.overlay.classList.add("active"),this.input.value=e||"",setTimeout(()=>this.input.focus(),50),e&&this.doSearch(e)}close(){this.overlay.classList.remove("active"),this.resultsEl.innerHTML=""}onInput(){this.debounceTimer&&clearTimeout(this.debounceTimer);let e=this.input.value.trim();if(e.length<2){this.resultsEl.innerHTML="";return}this.debounceTimer=setTimeout(()=>this.doSearch(e),300)}async doSearch(e){try{let t=await this.client.search(e,this.sessionToken||void 0);this.sessionToken=t.sessionToken,this.renderResults(t.results)}catch{this.resultsEl.innerHTML='<div class="shimmer-search-empty">Erreur de recherche</div>'}}renderResults(e){if(!e.length){this.resultsEl.innerHTML=`<div class="shimmer-search-empty">${this.labels.noResults}</div>`;return}this.resultsEl.innerHTML=e.slice(0,10).map(t=>`
      <div class="shimmer-search-item" data-id="${t.id}">
        ${t.imageUrl?`<img src="${t.imageUrl}" alt="${l(t.name)}" />`:'<div style="width:56px;height:56px;background:#f3f4f6;border-radius:8px"></div>'}
        <div class="shimmer-search-item-info">
          <div class="shimmer-search-item-name">${l(t.name)}</div>
          <div class="shimmer-search-item-desc">${l(t.category||"")} ${t.brand?"\xB7 "+l(t.brand):""}</div>
        </div>
        <div class="shimmer-search-item-price">${t.price}${t.currency==="EUR"?"\u20AC":" "+t.currency}</div>
      </div>
    `).join("")}destroy(){this.overlay.remove()}},k=class{constructor(e,t){this.client=e;this.labels=t;this.sessionToken=null;this.history=[];this.knownCriteria=null;this.mode="assist";this.isOpen=!1;this.createBubble(),this.createWindow()}createBubble(){this.bubble=document.createElement("button"),this.bubble.className="shimmer-widget shimmer-chat-bubble",this.bubble.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',this.bubble.addEventListener("click",()=>this.toggle()),document.body.appendChild(this.bubble)}createWindow(){this.window=document.createElement("div"),this.window.className="shimmer-widget shimmer-chat-window",this.window.innerHTML=`
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
    `,document.body.appendChild(this.window),this.messagesEl=this.window.querySelector(".shimmer-chat-messages"),this.formInput=this.window.querySelector(".shimmer-chat-form input"),this.sendBtn=this.window.querySelector(".shimmer-chat-form button"),this.window.querySelector(".shimmer-chat-close").addEventListener("click",()=>this.toggle()),this.window.querySelector(".shimmer-chat-form").addEventListener("submit",e=>{e.preventDefault(),this.sendMessage()}),this.addMessage("assistant",this.labels.chatWelcome)}toggle(){this.isOpen=!this.isOpen,this.window.classList.toggle("active",this.isOpen),this.isOpen&&setTimeout(()=>this.formInput.focus(),100)}addMessage(e,t,s,i){let o=document.createElement("div");o.className=`shimmer-chat-msg ${e}`;let n=l(t).replace(/\n/g,"<br>");s?.length&&(n+=`<div class="shimmer-products">${s.map(c=>`
        <div class="shimmer-product-card">
          ${c.imageUrl?`<img src="${c.imageUrl}" alt="${l(c.name)}" />`:""}
          <div class="shimmer-product-card-info">
            <div class="shimmer-product-card-name">${l(c.name)}</div>
            <div class="shimmer-product-card-price">${c.price}${c.currency==="EUR"?"\u20AC":" "+c.currency}</div>
          </div>
        </div>
      `).join("")}</div>`),i!=null&&i>0&&(n+=`<div class="shimmer-progress">
        <div class="shimmer-progress-bar"><div class="shimmer-progress-fill" style="width:${i}%"></div></div>
        <div class="shimmer-progress-label">Qualification: ${i}%</div>
      </div>`),o.innerHTML=n,this.messagesEl.appendChild(o),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}showTyping(){let e=document.createElement("div");return e.className="shimmer-typing",e.innerHTML="<span></span><span></span><span></span>",this.messagesEl.appendChild(e),this.messagesEl.scrollTop=this.messagesEl.scrollHeight,e}async sendMessage(){let e=this.formInput.value.trim();if(!e)return;this.formInput.value="",this.sendBtn.disabled=!0,this.addMessage("user",e),this.history.push({role:"user",content:e});let t=document.createElement("div");t.className="shimmer-chat-msg assistant",t.innerHTML='<span class="shimmer-typing"><span></span><span></span><span></span></span>',this.messagesEl.appendChild(t),this.messagesEl.scrollTop=this.messagesEl.scrollHeight;let s="",i=null;this.client.assistStream(e,{onToken:o=>{t.querySelector(".shimmer-typing")&&(t.innerHTML=""),s+=o,t.innerHTML=s.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>"),this.messagesEl.scrollTop=this.messagesEl.scrollHeight},onMeta:o=>{i=o,this.knownCriteria=o.knownCriteria||this.knownCriteria,o.suggestedQuestions?.length&&this.renderSuggestions(o.suggestedQuestions)},onDone:o=>{s=o||s;let n=l(s).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>");i?.highlightedProducts?.length&&(n+=`<div class="shimmer-products">${i.highlightedProducts.map(c=>`
              <div class="shimmer-product-card">
                <div class="shimmer-product-card-info">
                  <div class="shimmer-product-card-name">${l(c.name)}</div>
                  <div style="font-size:11px;color:#6b7280">${l(c.brand)}</div>
                  <div class="shimmer-product-card-price">${c.price}</div>
                </div>
              </div>
            `).join("")}</div>`),i?.qualification?.score>0&&(n+=`<div class="shimmer-progress">
              <div class="shimmer-progress-bar"><div class="shimmer-progress-fill" style="width:${i.qualification.score}%"></div></div>
              <div class="shimmer-progress-label">Qualification: ${i.qualification.score}%</div>
            </div>`),t.innerHTML=n,this.history.push({role:"assistant",content:s}),this.sendBtn.disabled=!1,this.formInput.focus(),this.messagesEl.scrollTop=this.messagesEl.scrollHeight},onError:o=>{t.innerHTML=`Erreur: ${l(o)}`,this.sendBtn.disabled=!1,this.formInput.focus()}},this.sessionToken||void 0,this.history.slice(-8),this.knownCriteria||void 0)}renderSuggestions(e){this.messagesEl.querySelectorAll(".shimmer-suggestions").forEach(s=>s.remove());let t=document.createElement("div");t.className="shimmer-suggestions",t.style.cssText="display:flex;gap:6px;flex-wrap:wrap;padding:4px 0;";for(let s of e){let i=document.createElement("button");i.textContent=s,i.style.cssText="padding:6px 12px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;font-size:12px;cursor:pointer;font-family:inherit;transition:background 0.15s;",i.addEventListener("mouseenter",()=>{i.style.background="#f3f4f6"}),i.addEventListener("mouseleave",()=>{i.style.background="#fff"}),i.addEventListener("click",()=>{this.formInput.value=s,this.sendMessage(),t.remove()}),t.appendChild(i)}this.messagesEl.appendChild(t),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}destroy(){this.bubble.remove(),this.window.remove()}};function l(r){let e=document.createElement("span");return e.textContent=r,e.innerHTML}var K={apero:"Ap\xE9ritif",repas:"Repas",dessert:"Dessert",decouverte:"D\xE9couverte",cadeau:"Cadeau",accessoire:"Accessoire",complement:"\xC0 associer"},I="shimmer_vid",F=365;function W(r){if(typeof document>"u")return null;let e=document.cookie.match(new RegExp("(?:^|; )"+r.replace(/[.$?*|{}()[\]\\\/+^]/g,"\\$&")+"=([^;]*)"));return e?decodeURIComponent(e[1]):null}function J(r,e,t){if(typeof document>"u")return;let s=new Date(Date.now()+t*864e5).toUTCString();document.cookie=`${r}=${encodeURIComponent(e)}; expires=${s}; path=/; SameSite=Lax`}function Y(){let r=W(I);if(r&&r.length>=8)return r;let e="vid_"+Math.random().toString(36).slice(2,10)+Date.now().toString(36);return J(I,e,F),e}async function Q(r,e,t){let s=await fetch(`${r}/api/holdout/decision?store=${e}&visitorId=${encodeURIComponent(t)}`);if(!s.ok)throw new Error("holdout-decision-failed");return s.json()}function V(){return typeof window>"u"||typeof document>"u"?!1:window.Shopify||document.querySelector('meta[name="shopify-checkout-api-token"], meta[name="shopify-digital-wallet"]')?!0:/\.myshopify\.com$/.test(window.location.hostname)}async function G(r,e){if(!V())return;let t={attributes:{shimmer_vid:r,shimmer_bucket:String(e)}};try{await fetch("/cart/update.js",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(t),credentials:"same-origin"})}catch{}if(!("__shimmerFetchPatched"in window)){window.__shimmerFetchPatched=!0;let s=window.fetch.bind(window);window.fetch=async(...i)=>{let o=await s(...i);try{let n=typeof i[0]=="string"?i[0]:i[0].url;/\/cart\/(add|change|clear)(?:\.js)?\b/.test(n)&&s("/cart/update.js",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(t),credentials:"same-origin"})}catch{}return o}}}var S="shimmer_xs_sid",X=30*864e5;function C(){if(typeof localStorage>"u")return"no-storage-"+Math.random().toString(36).slice(2);try{let e=localStorage.getItem(S);if(e){let t=JSON.parse(e);if(t&&t.id&&t.ts&&Date.now()-t.ts<X)return localStorage.setItem(S,JSON.stringify({id:t.id,ts:Date.now()})),t.id}}catch{}let r="xs-"+Math.random().toString(36).slice(2)+Date.now().toString(36);try{localStorage.setItem(S,JSON.stringify({id:r,ts:Date.now()}))}catch{}return r}var R="shimmer_xs_intent",Z=30*60*1e3;function M(){if(typeof localStorage>"u")return[];try{let r=localStorage.getItem(R);if(!r)return[];let e=JSON.parse(r);if(!Array.isArray(e))return[];let t=Date.now();return e.filter(s=>s&&typeof s=="object"&&t-s.ts<Z)}catch{return[]}}function H(r){if(!(typeof localStorage>"u"))try{let e=r.slice(0,20);localStorage.setItem(R,JSON.stringify(e))}catch{}}function L(r){let t=M().filter(s=>s.target_id!==r.target_id);H([r,...t])}function P(r){let e=M(),t=e.filter(i=>i.target_id===r);if(t.length===0)return[];let s=e.filter(i=>i.target_id!==r);return H(s),t}var y=class{constructor(e,t={}){this.mounted=new WeakSet;this.eventQueue=[];this.flushTimer=null;this.client=e,this.opts={selector:t.selector??"[data-shimmer-crosssell]",limit:Math.min(Math.max(t.limit??4,1),12),title:t.title??"On a aussi pens\xE9 \xE0",onProductClick:t.onProductClick??(()=>{}),productUrl:t.productUrl??null},this.sessionId=C()}trackEvent(e){this.eventQueue.push({...e,session_id:this.sessionId}),this.flushTimer===null&&typeof window<"u"&&(this.flushTimer=window.setTimeout(()=>this.flushEvents(),1500))}flushEvents(){if(this.flushTimer!==null&&(typeof window<"u"&&window.clearTimeout(this.flushTimer),this.flushTimer=null),this.eventQueue.length===0)return;let e=this.eventQueue.splice(0,this.eventQueue.length);this.client.crossSellEvents(e).catch(()=>{})}async render(){let e=document.querySelectorAll(this.opts.selector);await Promise.all([...e].map(t=>this.mount(t)))}async renderInto(e,t){let s=typeof e=="string"?document.querySelector(e):e;s&&(s.setAttribute("data-shimmer-crosssell",String(t)),await this.mount(s))}async mount(e){if(this.mounted.has(e))return;this.mounted.add(e);let t=e.getAttribute("data-shimmer-crosssell"),s=Number(t);if(!(!Number.isFinite(s)||s<=0)){e.classList.add("shimmer-widget","sx-wrap"),e.innerHTML=`
      <p class="sx-title">${l(this.opts.title)}</p>
      <div class="sx-loading">
        <div class="sx-skel"></div><div class="sx-skel"></div>
        <div class="sx-skel"></div><div class="sx-skel"></div>
      </div>
    `;try{let i=await this.client.crossSell(s,this.opts.limit);if(!i.items.length){e.innerHTML="";return}this.renderCards(e,i)}catch{e.innerHTML=""}}}renderCards(e,t){let s=this.opts.productUrl?"a":"div",i=t.items.map(n=>{let c=this.opts.productUrl?this.opts.productUrl.replace("{id}",String(n.product.id)).replace("{sku}",n.product.sku||""):null,d=c?`href="${l(c)}"`:"",h=n.product.imageUrl?`<img class="sx-img" src="${l(n.product.imageUrl)}" alt="${l(n.product.name)}" loading="lazy" />`:'<div class="sx-img-placeholder">\u25C7</div>',m=K[n.role]||n.role,p=n.product.brand?`<p class="sx-brand">${l(n.product.brand)}</p>`:"";return`
          <${s} ${d} class="sx-card" data-product-id="${n.product.id}">
            <span class="sx-chip sx-chip-${l(n.role)}">${l(m)}</span>
            ${h}
            <p class="sx-name">${l(n.product.name)}</p>
            ${p}
            <p class="sx-reason">\xAB ${l(n.reason)} \xBB</p>
            <div class="sx-foot">
              <span class="sx-price">${l(n.product.price)}\u20AC</span>
              <button type="button" class="sx-add" data-add="${n.product.id}">Ajouter</button>
            </div>
          </${s}>
        `}).join("");e.innerHTML=`
      <p class="sx-title">${l(this.opts.title)}</p>
      <div class="sx-grid">${i}</div>
    `;let o=Array.from(e.querySelectorAll(".sx-card"));if(o.forEach((n,c)=>{let d=Number(n.dataset.productId),h=t.items.find(m=>m.product.id===d);h&&n.addEventListener("click",m=>{m.target.closest(".sx-add")||(this.trackEvent({product_id:t.reference.id,target_id:h.product.id,role:h.role,event_type:"click",position:c}),L({ref_id:t.reference.id,target_id:h.product.id,role:h.role,position:c,ts:Date.now()}),this.flushEvents(),this.opts.onProductClick(h))})}),e.querySelectorAll(".sx-add").forEach(n=>{let c=Number(n.dataset.add),d=t.items.find(m=>m.product.id===c);if(!d)return;let h=o.findIndex(m=>m.dataset.productId===String(c));n.addEventListener("click",m=>{m.preventDefault(),m.stopPropagation(),this.trackEvent({product_id:t.reference.id,target_id:d.product.id,role:d.role,event_type:"add",position:h}),L({ref_id:t.reference.id,target_id:d.product.id,role:d.role,position:h,ts:Date.now()}),this.flushEvents(),this.opts.onProductClick(d)})}),typeof IntersectionObserver<"u"){let n=new WeakSet,c=new Map,d=new IntersectionObserver(h=>{for(let m of h){if(n.has(m.target))continue;let p=m.target;if(m.isIntersecting&&m.intersectionRatio>=.5){if(c.has(p))continue;let f=window.setTimeout(()=>{n.add(p),c.delete(p),d.unobserve(p);let x=Number(p.dataset.productId),g=t.items.find(v=>v.product.id===x);if(!g)return;let u=o.indexOf(p);this.trackEvent({product_id:t.reference.id,target_id:g.product.id,role:g.role,event_type:"impression",position:u})},300);c.set(p,f)}else{let f=c.get(p);f!==void 0&&(window.clearTimeout(f),c.delete(p))}}},{threshold:[0,.5,1]});o.forEach(h=>d.observe(h))}if(typeof window<"u"){let n=()=>this.flushEvents();window.addEventListener("pagehide",n,{once:!1}),window.addEventListener("beforeunload",n,{once:!1})}}},a=class a{constructor(e){this.searchWidget=null;this.chatWidget=null;this.assistHistory=[];this.assistKnownCriteria={};this.config=e,this.theme={...q,...e.theme},this.labels=U[e.locale||"fr"],this.client=new E(e.apiUrl,e.apiKey)}static init(e){a.instance&&a.instance.destroy();let t=new a(e);return B(t.theme),a.instance=t,t.bootstrapHoldoutAndMount(),t}async bootstrapHoldoutAndMount(){let e=Y(),t=!1,s=0;try{let i=this.config.storeId;if(!i)try{let o=await fetch(`${this.config.apiUrl}/api/stores/me/config`,{headers:{Authorization:`Bearer ${this.config.apiKey}`}});if(o.ok){let n=await o.json();i=n.id??n.storeId}}catch{}if(i){let o=await Q(this.config.apiUrl,i,e);t=o.control,s=o.bucket}}catch{}t||(this.config.disableCartAttribution||G(e,s),this.searchWidget=new T(this.client,this.labels,this.config.searchSelector),this.chatWidget=new k(this.client,this.labels))}static get assistant(){return{chat:a.chat,reset:a.resetChat}}static search(e){if(!a.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return a.instance.client.search(e)}static openSearch(e){a.instance?.searchWidget?.open(e)}static async chat(e){if(!a.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");let t=a.instance;t.assistHistory.push({role:"user",content:e});let s=await t.client.assist(e,t.assistSessionToken,t.assistHistory.slice(-6),t.assistKnownCriteria);return t.assistSessionToken=s.sessionToken,s.knownCriteria&&(t.assistKnownCriteria={...t.assistKnownCriteria,...s.knownCriteria}),t.assistHistory.push({role:"assistant",content:s.message}),s}static resetChat(){a.instance&&(a.instance.assistHistory=[],a.instance.assistKnownCriteria={},a.instance.assistSessionToken=void 0)}static reviewStats(e){if(!a.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return a.instance.client.reviewStats(e)}static destroy(){a.instance?.destroy()}destroy(){this.searchWidget?.destroy(),this.chatWidget?.destroy(),document.getElementById("shimmer-sdk-styles")?.remove(),a.instance=null}};a.instance=null,a.crossSell={async render(e={}){if(!a.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");await new y(a.instance.client,e).render()},async renderInto(e,t,s={}){if(!a.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");await new y(a.instance.client,s).renderInto(e,t)},fetch(e,t=4){if(!a.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return a.instance.client.crossSell(e,t)},trackProductView(e){if(!a.instance||!Number.isFinite(e)||e<=0)return;let t=P(e);if(t.length===0)return;let s=C(),i=t.map(o=>({product_id:o.ref_id,target_id:o.target_id,role:o.role,event_type:"view_target",session_id:s,position:o.position,metadata:{intent_age_ms:Date.now()-o.ts}}));a.instance.client.crossSellEvents(i).catch(()=>{})},trackPurchase(e){if(!a.instance)return;let t=C(),s=[];for(let i of e){if(!Number.isFinite(i)||i<=0)continue;let o=P(i);for(let n of o)s.push({product_id:n.ref_id,target_id:n.target_id,role:n.role,event_type:"purchase",session_id:t,position:n.position,metadata:{intent_age_ms:Date.now()-n.ts}})}s.length!==0&&a.instance.client.crossSellEvents(s).catch(()=>{})}};var $=a;return D(ee);})();
if(typeof window!=="undefined"){window.Shimmer=ShimmerSDK.Shimmer;}
//# sourceMappingURL=shimmer.js.map
