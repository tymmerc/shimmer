"use strict";var ShimmerSDK=(()=>{var v=Object.defineProperty;var $=Object.getOwnPropertyDescriptor;var L=Object.getOwnPropertyNames;var R=Object.prototype.hasOwnProperty;var M=(n,e)=>{for(var s in e)v(n,s,{get:e[s],enumerable:!0})},P=(n,e,s,t)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of L(e))!R.call(n,i)&&i!==s&&v(n,i,{get:()=>e[i],enumerable:!(t=$(e,i))||t.enumerable});return n};var H=n=>P(v({},"__esModule",{value:!0}),n);var B={};M(B,{Shimmer:()=>S});var z={primaryColor:"#6366f1",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',borderRadius:"12px",chatPosition:"bottom-right"},A={fr:{searchPlaceholder:"Rechercher un produit...",chatPlaceholder:"Posez votre question...",chatTitle:"Assistant Shimmer",chatWelcome:"Bonjour ! Comment puis-je vous aider ?",send:"Envoyer",close:"Fermer",noResults:"Aucun r\xE9sultat trouv\xE9.",addToCart:"Voir le produit",assistTitle:"Vendeur IA",assistPlaceholder:"D\xE9crivez ce que vous cherchez...",poweredBy:"Propuls\xE9 par Shimmer"},en:{searchPlaceholder:"Search for a product...",chatPlaceholder:"Ask a question...",chatTitle:"Shimmer Assistant",chatWelcome:"Hello! How can I help you?",send:"Send",close:"Close",noResults:"No results found.",addToCart:"View product",assistTitle:"AI Sales Assistant",assistPlaceholder:"Describe what you are looking for...",poweredBy:"Powered by Shimmer"}},x=class{constructor(e,s){this.apiUrl=e;this.apiKey=s}async request(e,s,t){let i=`${this.apiUrl}${s}`,r=await fetch(i,{method:e,headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.apiKey}`},body:t?JSON.stringify(t):void 0});if(!r.ok){let c=await r.json().catch(()=>({error:r.statusText}));throw new Error(c.error||`HTTP ${r.status}`)}return r.json()}search(e,s){return this.request("POST","/api/search",{query:e,sessionToken:s})}assist(e,s,t,i){return this.request("POST","/api/search/assist",{message:e,sessionToken:s,history:t,knownCriteria:i})}assistStream(e,s,t,i,r){let c=new AbortController,l=`${this.apiUrl}/api/search/assist/stream`;return fetch(l,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.apiKey}`},body:JSON.stringify({message:e,sessionToken:t,history:i,knownCriteria:r}),signal:c.signal}).then(async d=>{if(!d.ok||!d.body){s.onError?.(`HTTP ${d.status}`);return}let g=d.body.getReader(),f=new TextDecoder,b="";for(;;){let{done:T,value:k}=await g.read();if(T)break;b+=f.decode(k,{stream:!0});let E=b.split(`
`);b=E.pop()||"";let m="";for(let h of E)if(h.startsWith("event: "))m=h.slice(7).trim();else if(h.startsWith("data: ")){let C=h.slice(6);try{let p=JSON.parse(C);m==="metadata"?s.onMeta(p):m==="token"?s.onToken(p.text):m==="done"?s.onDone(p.fullText):m==="error"&&s.onError?.(p.error)}catch{}}}}).catch(d=>{d.name!=="AbortError"&&s.onError?.(d.message)}),c}chatMessage(e,s){return this.request("POST","/api/chat/message",{message:e,sessionToken:s,stream:!1})}reviewStats(e){let s=e?`?productId=${e}`:"";return this.request("GET",`/api/reviews/stats${s}`)}productReviews(e,s=1){return this.request("GET",`/api/reviews/product/${e}?page=${s}&limit=10`)}crossSell(e,s=4){return this.request("GET",`/api/catalog/cross-sell/product/${e}?limit=${s}`)}};function I(n){if(document.getElementById("shimmer-sdk-styles"))return;let e=document.createElement("style");e.id="shimmer-sdk-styles",e.textContent=`
    .shimmer-widget * { box-sizing: border-box; margin: 0; padding: 0; }
    .shimmer-widget { font-family: ${n.fontFamily}; font-size: 14px; line-height: 1.5; color: #1f2937; }

    /* Search overlay */
    .shimmer-search-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99998;
      display: flex; align-items: flex-start; justify-content: center; padding-top: 10vh;
      opacity: 0; transition: opacity 0.2s; pointer-events: none;
    }
    .shimmer-search-overlay.active { opacity: 1; pointer-events: auto; }
    .shimmer-search-panel {
      background: #fff; border-radius: ${n.borderRadius}; width: 90%; max-width: 640px;
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
    .shimmer-search-item-price { font-weight: 700; color: ${n.primaryColor}; white-space: nowrap; }
    .shimmer-search-empty { padding: 24px; text-align: center; color: #9ca3af; }

    /* Chat bubble */
    .shimmer-chat-bubble {
      position: fixed; ${n.chatPosition==="bottom-right"?"right: 20px":"left: 20px"}; bottom: 20px;
      width: 56px; height: 56px; border-radius: 50%; background: ${n.primaryColor}; color: #fff;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 99997; border: none;
      transition: transform 0.2s;
    }
    .shimmer-chat-bubble:hover { transform: scale(1.1); }
    .shimmer-chat-bubble svg { width: 24px; height: 24px; }

    /* Chat window */
    .shimmer-chat-window {
      position: fixed; ${n.chatPosition==="bottom-right"?"right: 20px":"left: 20px"}; bottom: 88px;
      width: 380px; max-width: calc(100vw - 40px); height: 520px; max-height: calc(100vh - 120px);
      background: #fff; border-radius: ${n.borderRadius}; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      z-index: 99998; display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; transform: translateY(20px) scale(0.95); transition: all 0.2s; pointer-events: none;
    }
    .shimmer-chat-window.active { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .shimmer-chat-header {
      padding: 16px; background: ${n.primaryColor}; color: #fff;
      display: flex; justify-content: space-between; align-items: center;
    }
    .shimmer-chat-header h3 { font-size: 15px; font-weight: 600; }
    .shimmer-chat-close { background: none; border: none; color: #fff; cursor: pointer; font-size: 20px; line-height: 1; }
    .shimmer-chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .shimmer-chat-msg { max-width: 85%; padding: 10px 14px; border-radius: 16px; font-size: 13px; word-wrap: break-word; }
    .shimmer-chat-msg.user { align-self: flex-end; background: ${n.primaryColor}; color: #fff; border-bottom-right-radius: 4px; }
    .shimmer-chat-msg.assistant { align-self: flex-start; background: #f3f4f6; color: #1f2937; border-bottom-left-radius: 4px; }
    .shimmer-chat-form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #e5e7eb; }
    .shimmer-chat-form input {
      flex: 1; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 24px;
      outline: none; font-size: 13px; font-family: inherit;
    }
    .shimmer-chat-form input:focus { border-color: ${n.primaryColor}; }
    .shimmer-chat-form button {
      padding: 10px 16px; background: ${n.primaryColor}; color: #fff; border: none;
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
    .shimmer-product-card-price { color: ${n.primaryColor}; font-weight: 700; }

    /* Progress bar */
    .shimmer-progress { margin-top: 8px; }
    .shimmer-progress-bar { height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden; }
    .shimmer-progress-fill { height: 100%; background: ${n.primaryColor}; transition: width 0.3s; border-radius: 2px; }
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
      font-family: ${n.fontFamily};
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
      font-family: ${n.fontFamily};
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
  `,document.head.appendChild(e)}var y=class{constructor(e,s,t){this.client=e;this.labels=s;this.searchSelector=t;this.debounceTimer=null;this.sessionToken=null;this.createOverlay(),this.hookExistingInputs()}createOverlay(){this.overlay=document.createElement("div"),this.overlay.className="shimmer-widget shimmer-search-overlay",this.overlay.innerHTML=`
      <div class="shimmer-search-panel">
        <input class="shimmer-search-input" type="text" placeholder="${this.labels.searchPlaceholder}" autocomplete="off" />
        <div class="shimmer-search-results"></div>
      </div>
    `,document.body.appendChild(this.overlay),this.input=this.overlay.querySelector(".shimmer-search-input"),this.resultsEl=this.overlay.querySelector(".shimmer-search-results"),this.overlay.addEventListener("click",e=>{e.target===this.overlay&&this.close()}),this.input.addEventListener("input",()=>this.onInput()),document.addEventListener("keydown",e=>{e.key==="Escape"&&this.close(),(e.metaKey||e.ctrlKey)&&e.key==="k"&&(e.preventDefault(),this.open())})}hookExistingInputs(){let e=this.searchSelector||'input[type="search"], input[data-shimmer-search]';document.querySelectorAll(e).forEach(s=>{s.addEventListener("focus",t=>{t.preventDefault(),s.blur(),this.open(s.value)})})}open(e){this.overlay.classList.add("active"),this.input.value=e||"",setTimeout(()=>this.input.focus(),50),e&&this.doSearch(e)}close(){this.overlay.classList.remove("active"),this.resultsEl.innerHTML=""}onInput(){this.debounceTimer&&clearTimeout(this.debounceTimer);let e=this.input.value.trim();if(e.length<2){this.resultsEl.innerHTML="";return}this.debounceTimer=setTimeout(()=>this.doSearch(e),300)}async doSearch(e){try{let s=await this.client.search(e,this.sessionToken||void 0);this.sessionToken=s.sessionToken,this.renderResults(s.results)}catch{this.resultsEl.innerHTML='<div class="shimmer-search-empty">Erreur de recherche</div>'}}renderResults(e){if(!e.length){this.resultsEl.innerHTML=`<div class="shimmer-search-empty">${this.labels.noResults}</div>`;return}this.resultsEl.innerHTML=e.slice(0,10).map(s=>`
      <div class="shimmer-search-item" data-id="${s.id}">
        ${s.imageUrl?`<img src="${s.imageUrl}" alt="${o(s.name)}" />`:'<div style="width:56px;height:56px;background:#f3f4f6;border-radius:8px"></div>'}
        <div class="shimmer-search-item-info">
          <div class="shimmer-search-item-name">${o(s.name)}</div>
          <div class="shimmer-search-item-desc">${o(s.category||"")} ${s.brand?"\xB7 "+o(s.brand):""}</div>
        </div>
        <div class="shimmer-search-item-price">${s.price}${s.currency==="EUR"?"\u20AC":" "+s.currency}</div>
      </div>
    `).join("")}destroy(){this.overlay.remove()}},w=class{constructor(e,s){this.client=e;this.labels=s;this.sessionToken=null;this.history=[];this.knownCriteria=null;this.mode="assist";this.isOpen=!1;this.createBubble(),this.createWindow()}createBubble(){this.bubble=document.createElement("button"),this.bubble.className="shimmer-widget shimmer-chat-bubble",this.bubble.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',this.bubble.addEventListener("click",()=>this.toggle()),document.body.appendChild(this.bubble)}createWindow(){this.window=document.createElement("div"),this.window.className="shimmer-widget shimmer-chat-window",this.window.innerHTML=`
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
    `,document.body.appendChild(this.window),this.messagesEl=this.window.querySelector(".shimmer-chat-messages"),this.formInput=this.window.querySelector(".shimmer-chat-form input"),this.sendBtn=this.window.querySelector(".shimmer-chat-form button"),this.window.querySelector(".shimmer-chat-close").addEventListener("click",()=>this.toggle()),this.window.querySelector(".shimmer-chat-form").addEventListener("submit",e=>{e.preventDefault(),this.sendMessage()}),this.addMessage("assistant",this.labels.chatWelcome)}toggle(){this.isOpen=!this.isOpen,this.window.classList.toggle("active",this.isOpen),this.isOpen&&setTimeout(()=>this.formInput.focus(),100)}addMessage(e,s,t,i){let r=document.createElement("div");r.className=`shimmer-chat-msg ${e}`;let c=o(s).replace(/\n/g,"<br>");t?.length&&(c+=`<div class="shimmer-products">${t.map(l=>`
        <div class="shimmer-product-card">
          ${l.imageUrl?`<img src="${l.imageUrl}" alt="${o(l.name)}" />`:""}
          <div class="shimmer-product-card-info">
            <div class="shimmer-product-card-name">${o(l.name)}</div>
            <div class="shimmer-product-card-price">${l.price}${l.currency==="EUR"?"\u20AC":" "+l.currency}</div>
          </div>
        </div>
      `).join("")}</div>`),i!=null&&i>0&&(c+=`<div class="shimmer-progress">
        <div class="shimmer-progress-bar"><div class="shimmer-progress-fill" style="width:${i}%"></div></div>
        <div class="shimmer-progress-label">Qualification: ${i}%</div>
      </div>`),r.innerHTML=c,this.messagesEl.appendChild(r),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}showTyping(){let e=document.createElement("div");return e.className="shimmer-typing",e.innerHTML="<span></span><span></span><span></span>",this.messagesEl.appendChild(e),this.messagesEl.scrollTop=this.messagesEl.scrollHeight,e}async sendMessage(){let e=this.formInput.value.trim();if(!e)return;this.formInput.value="",this.sendBtn.disabled=!0,this.addMessage("user",e),this.history.push({role:"user",content:e});let s=document.createElement("div");s.className="shimmer-chat-msg assistant",s.innerHTML='<span class="shimmer-typing"><span></span><span></span><span></span></span>',this.messagesEl.appendChild(s),this.messagesEl.scrollTop=this.messagesEl.scrollHeight;let t="",i=null;this.client.assistStream(e,{onToken:r=>{s.querySelector(".shimmer-typing")&&(s.innerHTML=""),t+=r,s.innerHTML=t.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>"),this.messagesEl.scrollTop=this.messagesEl.scrollHeight},onMeta:r=>{i=r,this.knownCriteria=r.knownCriteria||this.knownCriteria,r.suggestedQuestions?.length&&this.renderSuggestions(r.suggestedQuestions)},onDone:r=>{t=r||t;let c=o(t).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>");i?.highlightedProducts?.length&&(c+=`<div class="shimmer-products">${i.highlightedProducts.map(l=>`
              <div class="shimmer-product-card">
                <div class="shimmer-product-card-info">
                  <div class="shimmer-product-card-name">${o(l.name)}</div>
                  <div style="font-size:11px;color:#6b7280">${o(l.brand)}</div>
                  <div class="shimmer-product-card-price">${l.price}</div>
                </div>
              </div>
            `).join("")}</div>`),i?.qualification?.score>0&&(c+=`<div class="shimmer-progress">
              <div class="shimmer-progress-bar"><div class="shimmer-progress-fill" style="width:${i.qualification.score}%"></div></div>
              <div class="shimmer-progress-label">Qualification: ${i.qualification.score}%</div>
            </div>`),s.innerHTML=c,this.history.push({role:"assistant",content:t}),this.sendBtn.disabled=!1,this.formInput.focus(),this.messagesEl.scrollTop=this.messagesEl.scrollHeight},onError:r=>{s.innerHTML=`Erreur: ${o(r)}`,this.sendBtn.disabled=!1,this.formInput.focus()}},this.sessionToken||void 0,this.history.slice(-8),this.knownCriteria||void 0)}renderSuggestions(e){this.messagesEl.querySelectorAll(".shimmer-suggestions").forEach(t=>t.remove());let s=document.createElement("div");s.className="shimmer-suggestions",s.style.cssText="display:flex;gap:6px;flex-wrap:wrap;padding:4px 0;";for(let t of e){let i=document.createElement("button");i.textContent=t,i.style.cssText="padding:6px 12px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;font-size:12px;cursor:pointer;font-family:inherit;transition:background 0.15s;",i.addEventListener("mouseenter",()=>{i.style.background="#f3f4f6"}),i.addEventListener("mouseleave",()=>{i.style.background="#fff"}),i.addEventListener("click",()=>{this.formInput.value=t,this.sendMessage(),s.remove()}),s.appendChild(i)}this.messagesEl.appendChild(s),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}destroy(){this.bubble.remove(),this.window.remove()}};function o(n){let e=document.createElement("span");return e.textContent=n,e.innerHTML}var q={apero:"Ap\xE9ritif",repas:"Repas",dessert:"Dessert",decouverte:"D\xE9couverte",cadeau:"Cadeau",accessoire:"Accessoire",complement:"\xC0 associer"},u=class{constructor(e,s={}){this.mounted=new WeakSet;this.client=e,this.opts={selector:s.selector??"[data-shimmer-crosssell]",limit:Math.min(Math.max(s.limit??4,1),12),title:s.title??"On a aussi pens\xE9 \xE0",onProductClick:s.onProductClick??(()=>{}),productUrl:s.productUrl??null}}async render(){let e=document.querySelectorAll(this.opts.selector);await Promise.all([...e].map(s=>this.mount(s)))}async renderInto(e,s){let t=typeof e=="string"?document.querySelector(e):e;t&&(t.setAttribute("data-shimmer-crosssell",String(s)),await this.mount(t))}async mount(e){if(this.mounted.has(e))return;this.mounted.add(e);let s=e.getAttribute("data-shimmer-crosssell"),t=Number(s);if(!(!Number.isFinite(t)||t<=0)){e.classList.add("shimmer-widget","sx-wrap"),e.innerHTML=`
      <p class="sx-title">${o(this.opts.title)}</p>
      <div class="sx-loading">
        <div class="sx-skel"></div><div class="sx-skel"></div>
        <div class="sx-skel"></div><div class="sx-skel"></div>
      </div>
    `;try{let i=await this.client.crossSell(t,this.opts.limit);if(!i.items.length){e.innerHTML="";return}this.renderCards(e,i)}catch{e.innerHTML=""}}}renderCards(e,s){let t=this.opts.productUrl?"a":"div",i=s.items.map(r=>{let c=this.opts.productUrl?this.opts.productUrl.replace("{id}",String(r.product.id)).replace("{sku}",r.product.sku||""):null,l=c?`href="${o(c)}"`:"",d=r.product.imageUrl?`<img class="sx-img" src="${o(r.product.imageUrl)}" alt="${o(r.product.name)}" loading="lazy" />`:'<div class="sx-img-placeholder">\u25C7</div>',g=q[r.role]||r.role,f=r.product.brand?`<p class="sx-brand">${o(r.product.brand)}</p>`:"";return`
          <${t} ${l} class="sx-card" data-product-id="${r.product.id}">
            <span class="sx-chip sx-chip-${o(r.role)}">${o(g)}</span>
            ${d}
            <p class="sx-name">${o(r.product.name)}</p>
            ${f}
            <p class="sx-reason">\xAB ${o(r.reason)} \xBB</p>
            <div class="sx-foot">
              <span class="sx-price">${o(r.product.price)}\u20AC</span>
              <button type="button" class="sx-add" data-add="${r.product.id}">Ajouter</button>
            </div>
          </${t}>
        `}).join("");e.innerHTML=`
      <p class="sx-title">${o(this.opts.title)}</p>
      <div class="sx-grid">${i}</div>
    `,e.querySelectorAll(".sx-card").forEach(r=>{let c=Number(r.dataset.productId),l=s.items.find(d=>d.product.id===c);l&&r.addEventListener("click",d=>{d.target.closest(".sx-add")||this.opts.onProductClick(l)})}),e.querySelectorAll(".sx-add").forEach(r=>{let c=Number(r.dataset.add),l=s.items.find(d=>d.product.id===c);l&&r.addEventListener("click",d=>{d.preventDefault(),d.stopPropagation(),this.opts.onProductClick(l)})})}},a=class a{constructor(e){this.searchWidget=null;this.chatWidget=null;this.assistHistory=[];this.assistKnownCriteria={};this.config=e,this.theme={...z,...e.theme},this.labels=A[e.locale||"fr"],this.client=new x(e.apiUrl,e.apiKey)}static init(e){a.instance&&a.instance.destroy();let s=new a(e);return I(s.theme),s.searchWidget=new y(s.client,s.labels,e.searchSelector),s.chatWidget=new w(s.client,s.labels),a.instance=s,s}static get assistant(){return{chat:a.chat,reset:a.resetChat}}static search(e){if(!a.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return a.instance.client.search(e)}static openSearch(e){a.instance?.searchWidget?.open(e)}static async chat(e){if(!a.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");let s=a.instance;s.assistHistory.push({role:"user",content:e});let t=await s.client.assist(e,s.assistSessionToken,s.assistHistory.slice(-6),s.assistKnownCriteria);return s.assistSessionToken=t.sessionToken,t.knownCriteria&&(s.assistKnownCriteria={...s.assistKnownCriteria,...t.knownCriteria}),s.assistHistory.push({role:"assistant",content:t.message}),t}static resetChat(){a.instance&&(a.instance.assistHistory=[],a.instance.assistKnownCriteria={},a.instance.assistSessionToken=void 0)}static reviewStats(e){if(!a.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return a.instance.client.reviewStats(e)}static destroy(){a.instance?.destroy()}destroy(){this.searchWidget?.destroy(),this.chatWidget?.destroy(),document.getElementById("shimmer-sdk-styles")?.remove(),a.instance=null}};a.instance=null,a.crossSell={async render(e={}){if(!a.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");await new u(a.instance.client,e).render()},async renderInto(e,s,t={}){if(!a.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");await new u(a.instance.client,t).renderInto(e,s)},fetch(e,s=4){if(!a.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return a.instance.client.crossSell(e,s)}};var S=a;return H(B);})();
if(typeof window!=="undefined"){window.Shimmer=ShimmerSDK.Shimmer;}
//# sourceMappingURL=shimmer.js.map
