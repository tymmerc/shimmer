function qe(n){return n.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’`]/g,"'").toLowerCase()}var L="(?:commande|colis|paquet|livraison|achat|envoi)s?",ze=[new RegExp(`\\bou\\s+(?:est|en\\s+est|sont|en\\s+sont|se\\s+trouve(?:nt)?)\\b[^?.!]{0,25}\\b${L}\\b`),new RegExp(`\\bsuiv(?:i|re)\\b[^?.!]{0,15}\\b${L}\\b`),new RegExp(`\\bstatut\\b[^?.!]{0,20}\\b${L}\\b`),new RegExp(`\\betat\\s+de\\s+(?:ma|mon|mes|la|le|cette)\\s+${L}\\b`),/\b(?:numero|lien|code)\s+de\s+suivi\b/,/\btracking\b/,/\bwhere(?:'s|\s+is)\s+my\s+(?:order|package|parcel)\b/,/\btrack\s+(?:my\s+)?(?:order|package|parcel)\b/,/\border\s+status\b/,/\bhas\s+my\s+(?:order|package|parcel)\s+(?:shipped|arrived|been\s+shipped)\b/,/\bmy\s+(?:order|package|parcel)\s+(?:hasn'?t|has\s+not|didn'?t|did\s+not|never)\b/],De=new RegExp(`\\b(?:(?:ma|mon|mes|notre|nos)\\s+${L}|(?:la|le|cette)\\s+(?:commande|colis|paquet)s?)\\b`),oe="(?:arriv|recev|recoi|recu|livr|expedi|part)",Fe=new RegExp([`\\bquand\\b[^?.!]{0,40}${oe}`,`${oe}\\w*[^?.!]{0,20}\\bquand\\b`,"\\bpas\\s+(?:encore\\s+)?(?:recu|arrive|livre)","\\btoujours\\s+pas\\b","\\bjamais\\s+(?:recu|arrive)","\\brecevoir\\b","\\bexpedie","\\bpartie?s?\\b","\\ben\\s+route\\b","\\ben\\s+cours\\s+de\\s+livraison\\b","\\ben\\s+retard\\b","\\bbloquee?s?\\b"].join("|"));function ae(n){let e=qe(n);return e.trim()?ze.some(t=>t.test(e))?!0:De.test(e)&&Fe.test(e):!1}function G(n){if(n==null||String(n).trim()==="")return"";let e=typeof n=="number"?n:Number(String(n??"").replace(",","."));return Number.isFinite(e)?`${Number.isInteger(e)?String(e):e.toFixed(2).replace(".",",")}\xA0\u20AC`:`${n??""}\xA0\u20AC`.trim()}var g=(n,e,t,s=1)=>({r:n,g:e,b:t,a:s}),b=g(255,255,255),q=g(17,17,17),Ue=g(10,10,10),je=g(245,245,245),Be=g(31,41,55),ce=g(17,24,39),We=g(52,211,153),Ve=g(4,120,87),Ke='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',Qe=12,I=999,T=(n,e,t)=>Math.min(t,Math.max(e,n)),M=n=>Math.round(n*1e3)/1e3,Je=/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,Ge=/^rgba?\(([^()]*)\)$/i,ue=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?%?$/i;function me(n){if(!n||typeof n!="object")return!1;let e=n;return["r","g","b","a"].every(t=>typeof e[t]=="number"&&Number.isFinite(e[t]))}function F(n){if(typeof n!="string")return null;let e=n.trim().toLowerCase();if(!e||e.length>100)return null;if(e==="transparent")return g(0,0,0,0);let t=Je.exec(e);if(t)return Ye(t[1]);let s=Ge.exec(e);return s?Xe(s[1]):null}function Ye(n){let e=n.length<=4?n.split("").map(s=>s+s).join(""):n,t=s=>parseInt(e.slice(s,s+2),16);return g(t(0),t(2),t(4),e.length===8?M(t(6)/255):1)}function Xe(n){let e=n.trim(),t,s;if(e.includes(",")){if(e.includes("/"))return null;t=e.split(",").map(i=>i.trim()),t.length===4&&(s=t.pop())}else{let i=e.split("/");if(i.length>2)return null;t=i[0].trim().split(/\s+/),i.length===2&&(s=i[1].trim())}if(t.length!==3)return null;let r=t.map(Ze),o=s===void 0?1:et(s);return o===null||r.some(i=>i===null)?null:g(r[0],r[1],r[2],o)}function Ze(n){if(!ue.test(n))return null;let e=parseFloat(n);return T(n.endsWith("%")?e*255/100:e,0,255)}function et(n){if(!ue.test(n))return null;let e=parseFloat(n);return M(T(n.endsWith("%")?e/100:e,0,1))}var Y=n=>{let e=n/255;return e<=.03928?e/12.92:Math.pow((e+.055)/1.055,2.4)};function le(n){return .2126*Y(n.r)+.7152*Y(n.g)+.0722*Y(n.b)}function p(n,e){let t=le(n),s=le(e);return(Math.max(t,s)+.05)/(Math.min(t,s)+.05)}function z(n,e,t){let s=T(Number.isFinite(t)?t:0,0,1),r=(o,i)=>o+(i-o)*s;return g(Math.round(r(n.r,e.r)),Math.round(r(n.g,e.g)),Math.round(r(n.b,e.b)),M(r(n.a,e.a)))}function x(n,e){let t=n.a+e.a*(1-n.a);if(t<=0)return g(0,0,0,0);let s=(r,o)=>Math.round((r*n.a+o*e.a*(1-n.a))/t);return g(s(n.r,e.r),s(n.g,e.g),s(n.b,e.b),M(t))}function tt(n){let e=s=>Math.round(T(Number.isFinite(s)?s:0,0,255)),t=T(Number.isFinite(n.a)?n.a:1,0,1);return t>=1?`rgb(${e(n.r)}, ${e(n.g)}, ${e(n.b)})`:`rgba(${e(n.r)}, ${e(n.g)}, ${e(n.b)}, ${M(t)})`}var st=/^[\p{L}\p{N} ,'"_.-]{1,200}$/u,nt=/^-?[\p{L}_-][\p{L}\p{N}_-]*$/u,rt=/^(?:inherit|initial|unset|revert|revert-layer|default)$/i,it=/^(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong)$/i;function he(n){let e=[],t="",s=null;for(let r of n)s?(t+=r,r===s&&(s=null)):r==='"'||r==="'"?(s=r,t+=r):r===","?(e.push(t),t=""):t+=r;return s?null:(e.push(t),e)}function ot(n){let e=n.trim().replace(/\s+/g," ");if(!e||rt.test(e))return null;let t=e[0];if(t==='"'||t==="'"){let s=e.slice(1,-1);return e.length>2&&e.endsWith(t)&&!s.includes(t)?e:null}return/["']/.test(e)?null:e.split(" ").every(s=>nt.test(s))?e:`"${e}"`}function $(n){if(typeof n!="string")return null;let e=n.trim();if(!st.test(e))return null;let t=he(e);if(!t)return null;let s=t.map(ot).filter(r=>r!==null);return s.length?s.join(", "):null}function at(n){return(he(n)??[]).some(t=>it.test(t.trim()))?n:`${n}, sans-serif`}function ct(n,e=16){let t;if(typeof n=="number"){if(!Number.isFinite(n))return null;t=n}else if(typeof n=="string"){let s=/^(\d+(?:\.\d+)?|\.\d+)\s*(px|rem|em)?$/i.exec(n.trim());if(!s)return null;let r=Number.isFinite(e)&&e>0?e:16;t=parseFloat(s[1])*(s[2]&&s[2].toLowerCase()!=="px"?r:1)}else return null;return Math.round(T(t,0,24)*10)/10}var lt=["auto","light","dark"];function X(n,e){if(!(typeof n!="string"||!n.trim()||n.length>120))try{let t=e(n.trim());return t&&me(t)&&t.a>0?t:void 0}catch{return}}function dt(n){if(typeof n=="boolean")return n;if(n==="true")return!0;if(n==="false")return!1}function ut(n){if(typeof n!="string")return;let e=n.trim().toLowerCase();return lt.includes(e)?e:void 0}function mt(n){return Object.fromEntries(Object.entries(n).filter(([,e])=>e!=null))}function A(n,e=F,t=16){if(!n||typeof n!="object")return{};let s=n;return mt({accent:X(s.accent,e),surface:X(s.surface,e),text:X(s.text,e),font:$(s.font)??void 0,radius:ct(s.radius,t)??void 0,theme:ut(s.theme),auto:dt(s.auto)})}function pe(n){return!n||typeof n!="object"?{}:{accent:n.accent??n.primaryColor,font:n.font??n.fontFamily,radius:n.radius??n.borderRadius,theme:n.mode,auto:n.auto}}function ht(n){return p(q,n)>=p(b,n)?q:b}function pt(n,e,t){return n?x(n,b):e==="dark"?Ue:e==="light"?b:t?x(t,b):b}function ft(n,e,t){let s=n==="dark"?je:n==="light"?Be:e;if(s){let r=x(s,t);if(p(r,t)>=4.5)return r}return ht(t)}function gt(n,e){let t=n;for(let s=1;s<=18;s++){let r=z(n,e,s/20);if(p(r,e)<4.5)break;t=r}return t}function bt(n,e){let t=z(e,n,.06),s=o=>Math.min(p(o,e),p(o,t)),r=[Ve,We].reduce((o,i)=>s(i)>s(o)?i:o);return s(r)>=4.5?r:n}function H(n,e){return typeof n=="number"&&Number.isFinite(n)?T(n,0,e):void 0}function vt(n,e){let t=H(n,24),s=t??H(e.radius,24)??Qe,r=H(e.ctlRadius,I),o=t!==void 0?s>=12?I:s:r!==void 0?r>=16?I:r:I;return{radius:s,radiusSm:Math.min(s,8),radiusCtl:o}}function Z(n={}){let e=n.css??{},t=n.explicit??{},s=n.remote??{},r=t.auto??s.auto??!0,o=r?n.host??{}:{},i=t.theme??s.theme??"auto",a=pt(e.surface,i,o.surface),c=e.text?x(e.text,a):void 0,d=c&&(e.surface||p(c,a)>=4.5)?c:ft(i,o.text,a),u=r||p(ce,a)<3?d:ce,h=x(e.accent??t.accent??s.accent??o.accent??u,a),f=$(e.font??t.font??s.font??o.font)??Ke;return{accent:h,onAccent:p(b,h)>=p(q,h)?b:q,accentText:p(h,a)>=3?h:d,accentLine:p(h,a)>=1.8?h:d,surface:a,text:d,muted:gt(d,a),border:z(a,d,.14),hover:z(a,d,.06),success:bt(d,a),font:at(f),...vt(e.radius??t.radius??s.radius,o)}}var yt=[["accent","--shm-accent"],["onAccent","--shm-on-accent"],["accentText","--shm-accent-text"],["accentLine","--shm-accent-line"],["surface","--shm-surface"],["text","--shm-text"],["muted","--shm-muted"],["border","--shm-border"],["hover","--shm-hover"],["success","--shm-success"],["radius","--shm-radius"],["radiusSm","--shm-radius-sm"],["radiusCtl","--shm-radius-ctl"],["font","--shm-font"]],xt=/[;{}<>\\]/,wt=/^[\w .#:()-]{1,60}$/;function de(n,e){if(n==="font")return $(e);if(n==="radius"||n==="radiusSm"||n==="radiusCtl"){let t=H(e,n==="radiusCtl"?I:24);return t===void 0?null:`${Math.round(t*10)/10}px`}return me(e)?tt(e):null}var D=Z();function P(n,e){let t=typeof n=="string"&&wt.test(n)?n.trim():":host",s=e&&typeof e=="object"?e:D,r=yt.map(([o,i])=>{let a=de(o,s[o]),c=a&&!xt.test(a)?a:de(o,D[o]);return`${i}:${c}`});return`${t}{${r.join(";")}}`}var St="shimmer-theme",kt="shimmer-sdk-theme",fe=999,Et=['[name="add"]',".product-form__submit",".single_add_to_cart_button",".add_to_cart_button","button.button--primary",".btn--primary",".btn-primary",".button.alt",".wp-element-button",".shopify-payment-button__button",'button[type="submit"]',".button","a.button"],Tt=40,Ct=20,Rt=/^(?:serif|"?times new roman"?|times|-webkit-standard)$/i,be="#shimmer-root, .sx-wrap";function v(n){try{return n()}catch{return}}var U;function Lt(){return U!==void 0||(U=v(()=>{let n=document.createElement("canvas");return n.width=1,n.height=1,n.getContext("2d",{willReadFrequently:!0})})??null),U}function k(n){if(typeof n!="string")return null;let e=n.trim();if(!e||e.length>100)return null;let t=F(e);return t||(v(()=>{let s=Lt();if(!s)return null;s.fillStyle="#000001",s.fillStyle=e;let r=String(s.fillStyle);if(s.fillStyle="#000002",s.fillStyle=e,String(s.fillStyle)!==r)return null;s.clearRect(0,0,1,1),s.fillRect(0,0,1,1);let o=s.getImageData(0,0,1,1).data;return{r:o[0],g:o[1],b:o[2],a:Math.round(o[3]/255*1e3)/1e3}})??null)}function It(n){return n?v(()=>{let e=getComputedStyle(n),t=s=>e.getPropertyValue(s).trim()||void 0;return{accent:t("--shimmer-accent"),font:t("--shimmer-font"),radius:t("--shimmer-radius"),surface:t("--shimmer-surface"),text:t("--shimmer-text")}})??{}:{}}function ve(n,e){if(e.display==="none"||e.visibility==="hidden")return!1;let t=n.getBoundingClientRect();return t.width>0&&t.height>0}function Mt(n){return n.disabled===!0||n.getAttribute("aria-disabled")==="true"}function te(n,e){let t=(e.borderTopLeftRadius||"").trim().split(/\s+/)[0]??"",s=parseFloat(t);if(!Number.isFinite(s)||s<0)return;if(t.endsWith("%"))return s>0?fe:0;let r=n.getBoundingClientRect().height;return r>0&&s>=r/2?fe:s}function $t(n,e){for(let t of[n.body,n.documentElement]){if(!t)continue;let s=k(e.getComputedStyle(t).backgroundColor);if(s&&s.a>=.5)return x(s,b)}return b}function At(n,e,t){let s=new Set,r=Tt;for(let o of Et){let i=v(()=>n.querySelectorAll(o));if(i)for(let a=0;a<i.length;a++){let c=i[a];if(s.has(c))continue;if(r--<=0)return;if(s.add(c),c.closest(be)||Mt(c))continue;let d=e.getComputedStyle(c);if(!ve(c,d))continue;let u=k(d.backgroundColor);if(!u||u.a<.5)continue;let h=x(u,t);if(!(p(h,t)<1.3))return{accent:h,ctlRadius:te(c,d)}}}}function Pt(n,e,t,s){let r=s??{r:17,g:17,b:17,a:1},o=new Set,i=Ct;for(let a of["main a[href]","a[href]"]){let c=n.querySelectorAll(a);for(let d=0;d<c.length;d++){let u=c[d];if(o.has(u))continue;if(i--<=0)return;if(o.add(u),u.closest(be))continue;let h=e.getComputedStyle(u);if(!ve(u,h))continue;let f=k(h.color);if(!f||f.a<.5)continue;let w=x(f,t);if(p(w,r)>1.5&&p(w,t)>=3)return w}}}function _t(n,e){let t=n.getBoundingClientRect().height,s=n;for(let o=0;s&&o<3&&!(o>0&&s.getBoundingClientRect().height>t*2.5);o++,s=s.parentElement){let i=e.getComputedStyle(s),a=k(i.backgroundColor),c=parseFloat(i.borderTopWidth)>0&&i.borderTopStyle!=="none";if(a&&a.a>=.5||c){let d=te(s,i);return d===void 0?void 0:Math.min(d,16)}}let r=te(n,e.getComputedStyle(n));return r===void 0?void 0:Math.min(r,16)}function Ot(n,e){let t=n.defaultView;if(!t||!n.body)return{};let s=v(()=>$t(n,t))??b,r=v(()=>t.getComputedStyle(n.body)),o=r?k(r.color):null,i=o?x(o,s):void 0,a=r?.fontFamily?.trim()??"",c=a&&!Rt.test(a)?$(a)??void 0:void 0,d=v(()=>At(n,t,s)),u=d?.accent??v(()=>Pt(n,t,s,i)),h=d?.ctlRadius===void 0?void 0:Math.min(d.ctlRadius,16),f=(e?v(()=>_t(e,t)):void 0)??h,w={surface:s,text:i,accent:u,font:c,radius:f,ctlRadius:d?.ctlRadius};return Object.fromEntries(Object.entries(w).filter(([,S])=>S!==void 0))}function ge(n,e,t,s){if(e&&e.isConnected&&e.parentNode===n)return e.textContent!==s&&(e.textContent=s),e;let r=document.createElement("style");return r.id=t,r.textContent=s,n.appendChild(r),r}function ee(){let n=v(()=>parseFloat(getComputedStyle(document.documentElement).fontSize));return n&&Number.isFinite(n)&&n>0?n:16}var j=class{constructor(e,t={}){this.getRoot=e;this.remote={};this.host={};this.anchor=null;this.shadowStyle=null;this.headStyle=null;this.explicit=A(t,k,ee())}setExplicit(e){this.explicit=A(e,k,ee()),this.refresh()}setRemote(e){this.remote=A(e,F),this.apply(),this.markReady()}markReady(){v(()=>this.getRoot().host.setAttribute("data-shm-ready",""))}refresh(e){e&&(this.anchor=e);let t=this.explicit.auto??this.remote.auto??!0;this.host=t?v(()=>Ot(document,this.anchor))??{}:{},this.apply()}apply(){try{let e=this.getRoot(),t=A(It(e.host),k,ee()),s=Z({css:t,explicit:this.explicit,remote:this.remote,host:this.host});this.shadowStyle=ge(e,this.shadowStyle,St,P(":host",s)),this.headStyle=ge(document.head,this.headStyle,kt,P(".sx-wrap",s))}catch(e){console.warn("[shimmer] th\xE8me",e)}}destroy(){this.shadowStyle?.remove(),this.headStyle?.remove(),this.shadowStyle=null,this.headStyle=null}};var Nt={fr:{searchPlaceholder:"Rechercher un produit...",chatPlaceholder:"Posez votre question...",chatTitle:"Assistant Shimmer",chatWelcome:"Bonjour ! Comment puis-je vous aider ?",trackParcel:"Suivre mon colis",savUnavailable:"Je n'arrive pas \xE0 consulter votre commande pour le moment. R\xE9essayez dans un instant.",send:"Envoyer",close:"Fermer",noResults:"Aucun r\xE9sultat trouv\xE9.",addToCart:"Voir le produit",assistTitle:"Vendeur IA",assistPlaceholder:"D\xE9crivez ce que vous cherchez...",poweredBy:"Propuls\xE9 par Shimmer"},en:{searchPlaceholder:"Search for a product...",chatPlaceholder:"Ask a question...",chatTitle:"Shimmer Assistant",chatWelcome:"Hello! How can I help you?",trackParcel:"Track my parcel",savUnavailable:"I can't look up your order right now. Please try again in a moment.",send:"Send",close:"Close",noResults:"No results found.",addToCart:"View product",assistTitle:"AI Sales Assistant",assistPlaceholder:"Describe what you are looking for...",poweredBy:"Powered by Shimmer"}};function B(n,e={},t=8e3){let s=new AbortController,r=setTimeout(()=>s.abort(),t);return fetch(n,{...e,signal:e.signal??s.signal}).finally(()=>clearTimeout(r))}var ne=class{constructor(e,t,s){this.apiUrl=e;this.apiKey=t;this.storeId=s}headers(){let e={"Content-Type":"application/json",Authorization:`Bearer ${this.apiKey}`};return this.storeId&&(e["X-Shimmer-Store"]=String(this.storeId)),e}async request(e,t,s){let r=`${this.apiUrl}${t}`,o=t.includes("/assist")||t.includes("/search")||t.includes("/chat"),i=await B(r,{method:e,headers:this.headers(),body:s?JSON.stringify(s):void 0},o?7e4:8e3);if(!i.ok){let a=await i.json().catch(()=>({error:i.statusText}));throw new Error(a.error||`HTTP ${i.status}`)}return i.json()}search(e,t){return this.request("POST","/api/search",{query:e,sessionToken:t})}assist(e,t,s,r){return this.request("POST","/api/search/assist",{message:e,sessionToken:t,history:s,knownCriteria:r})}vendeur(e,t){let s=y?ie(C)??void 0:void 0;return this.request("POST","/api/chat/message",{message:e,sessionToken:t,visitorId:s})}stockAlert(e){return this.request("POST","/api/stock-alerts",{...e,store:this.storeId})}assistStream(e,t,s,r,o){let i=new AbortController,a=`${this.apiUrl}/api/search/assist/stream`;return fetch(a,{method:"POST",headers:this.headers(),body:JSON.stringify({message:e,sessionToken:s,history:r,knownCriteria:o}),signal:i.signal}).then(async c=>{if(!c.ok||!c.body){t.onError?.(`HTTP ${c.status}`);return}let d=c.body.getReader(),u=new TextDecoder,h="";for(;;){let{done:f,value:w}=await d.read();if(f)break;h+=u.decode(w,{stream:!0});let S=h.split(`
`);h=S.pop()||"";let E="";for(let R of S)if(R.startsWith("event: "))E=R.slice(7).trim();else if(R.startsWith("data: ")){let He=R.slice(6);try{let N=JSON.parse(He);E==="metadata"?t.onMeta(N):E==="token"?t.onToken(N.text):E==="done"?t.onDone(N.fullText):E==="error"&&t.onError?.(N.error)}catch{}}}}).catch(c=>{c.name!=="AbortError"&&t.onError?.(c.message)}),i}savMessage(e,t,s){return this.request("POST","/api/chat/message",{message:e,sessionToken:t,mode:"sav",...s?{customerEmail:s.email,customerTs:s.ts,customerSignature:s.signature}:{}})}chatMessage(e,t){return this.request("POST","/api/chat/message",{message:e,sessionToken:t,stream:!1})}reviewStats(e){let t=e?`?productId=${e}`:"";return this.request("GET",`/api/reviews/stats${t}`)}productReviews(e,t=1){return this.request("GET",`/api/reviews/product/${e}?page=${t}&limit=10`)}crossSell(e,t=4){return this.request("GET",`/api/catalog/cross-sell/product/${e}?limit=${t}`)}crossSellEvents(e){let t=`${this.apiUrl}/api/catalog/cross-sell/events`,s=[];for(let r=0;r<e.length;r+=50)s.push(fetch(t,{method:"POST",headers:this.headers(),body:JSON.stringify({events:e.slice(r,r+50)}),keepalive:!0}).then(()=>{}).catch(()=>{}));return Promise.all(s).then(()=>{})}},_=null;function O(){if(_&&_.host.isConnected)return _;let n=document.createElement("div");return n.id="shimmer-root",document.body.appendChild(n),_=n.attachShadow({mode:"open"}),_}var ye=n=>`@layer shimmer-defaults{${P(n,D)}}
`;function Ht(n){let e=qt(n);if(!document.getElementById("shimmer-sdk-styles")){let o=document.createElement("style");o.id="shimmer-sdk-styles",o.textContent=ye(".sx-wrap")+e,document.head.appendChild(o)}let t=O(),s=ye(":host")+`:host { all: initial; display: block; position: static; }
`+e,r=t.querySelector("#shimmer-shadow-styles");if(r)r.textContent!==s&&(r.textContent=s);else{let o=document.createElement("style");o.id="shimmer-shadow-styles",o.textContent=s,t.appendChild(o)}}function qt(n){let e=n==="bottom-left"?"left: 20px":"right: 20px";return`
    .shimmer-widget * { box-sizing: border-box; margin: 0; padding: 0; }
    .shimmer-widget { font-family: var(--shm-font); font-size: 14px; line-height: 1.5; color: var(--shm-text); }

    /* Dock discret ancr\xE9 sous la barre de recherche du th\xE8me : pas de plein
       \xE9cran, pas de voile. Produits en haut, question du vendeur en bas. */
    .shimmer-dock {
      position: fixed; z-index: 99998; background: var(--shm-surface);
      border: 1px solid var(--shm-border); border-radius: var(--shm-radius);
      box-shadow: 0 12px 32px rgba(0,0,0,0.14);
      display: flex; flex-direction: column; overflow: hidden;
      max-height: min(60vh, 540px);
      opacity: 0; transform: translateY(-4px); transition: opacity .18s, transform .18s;
      pointer-events: none;
    }
    .shimmer-dock.active { opacity: 1; transform: translateY(0); pointer-events: auto; }
    .shimmer-search-results { flex: 1 1 auto; overflow-y: auto; padding: 6px; }
    .shimmer-search-results:empty { display: none; }
    .shimmer-dock-bottom { flex: 0 0 auto; border-top: 1px solid var(--shm-hover); }
    .shimmer-search-results:empty + .shimmer-dock-bottom { border-top: none; }
    /* La petite question du vendeur, en bas : elle propose, elle ne s'impose pas. */
    .shimmer-vendor-q { display: none; padding: 10px 14px 4px; font-size: 14px; line-height: 1.45;
      color: var(--shm-accent-text); }
    .shimmer-vendor-q.active { display: block; }
    .shimmer-dock-footer { display: flex; justify-content: space-between; gap: 8px; padding: 6px 10px 8px; }
    .shimmer-dock-footer button {
      border: none; background: none; padding: 4px 6px; cursor: pointer;
      font-family: inherit; font-size: 12px; color: var(--shm-muted);
    }
    .shimmer-dock-footer button:hover { color: var(--shm-text); text-decoration: underline; }
    .shimmer-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 6px 14px 8px; }
    .shimmer-chip { border: 1px solid var(--shm-accent-line); background: transparent; color: var(--shm-accent-text); font-family: inherit; line-height: 1.5;
      border-radius: var(--shm-radius-ctl); padding: 8px 14px; font-size: 14px; cursor: pointer; transition: .15s; }
    .shimmer-chip:hover { background: var(--shm-accent); border-color: var(--shm-accent); color: var(--shm-on-accent); }
    .shimmer-search-item {
      display: flex; gap: 12px; padding: 12px; border-radius: var(--shm-radius-sm); cursor: pointer;
      transition: background 0.15s;
    }
    .shimmer-search-item:hover { background: var(--shm-hover); }
    .shimmer-search-item img, .shimmer-search-item-ph {
      flex: 0 0 auto; width: 56px; height: 56px; object-fit: cover; border-radius: var(--shm-radius-sm); background: var(--shm-hover);
    }
    .shimmer-search-item-info { flex: 1; min-width: 0; }
    .shimmer-search-item-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .shimmer-search-item-desc { font-size: 12px; color: var(--shm-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .shimmer-search-item-price { font-weight: 700; color: var(--shm-accent-text); white-space: nowrap; }
    .shimmer-search-empty { padding: 24px; text-align: center; color: var(--shm-muted); }
    .shimmer-restock { margin: 6px 12px 10px; padding: 12px 14px; border: 1px solid var(--shm-border); border-radius: var(--shm-radius); background: var(--shm-hover); }
    .shimmer-restock-title { font-size: 13px; color: var(--shm-text); margin-bottom: 8px; }
    .shimmer-restock-title strong { font-weight: 600; }
    .shimmer-restock-form { display: flex; gap: 8px; }
    .shimmer-restock-form input { flex: 1; min-width: 0; padding: 9px 12px; border: 1px solid var(--shm-border); border-radius: var(--shm-radius-ctl);
      background: var(--shm-surface); color: var(--shm-text); font: inherit; font-size: 13px; outline: none; }
    .shimmer-restock-form input:focus { border-color: var(--shm-accent-line); }
    .shimmer-restock-form button { padding: 9px 14px; border: none; border-radius: var(--shm-radius-ctl); background: var(--shm-accent); color: var(--shm-on-accent); font: inherit; font-size: 13px; cursor: pointer; white-space: nowrap; }
    .shimmer-restock-form button:disabled { opacity: .5; cursor: default; }
    .shimmer-restock-done { font-size: 13px; color: var(--shm-success); }
    .shimmer-widget input::placeholder { color: var(--shm-muted); opacity: 1; }

    /* Chat bubble */
    .shimmer-chat-bubble {
      position: fixed; ${e}; bottom: 20px;
      width: 56px; height: 56px; border-radius: 50%; background: var(--shm-accent); color: var(--shm-on-accent);
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 99997; border: none;
      transition: transform 0.2s, opacity 0.2s;
    }
    /* Cach\xE9e tant que l'apparence de l'admin n'est pas connue (700 ms au plus). */
    :host(:not([data-shm-ready])) .shimmer-chat-bubble { opacity: 0; pointer-events: none; }
    .shimmer-chat-bubble:hover { transform: scale(1.1); }
    .shimmer-chat-bubble svg { width: 24px; height: 24px; }

    /* Chat window */
    .shimmer-chat-window {
      position: fixed; ${e}; bottom: 88px;
      width: 380px; max-width: calc(100vw - 40px); height: 520px; max-height: calc(100vh - 120px);
      background: var(--shm-surface); border-radius: var(--shm-radius); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      z-index: 99998; display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; transform: translateY(20px) scale(0.95); transition: all 0.2s; pointer-events: none;
    }
    .shimmer-chat-window.active { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .shimmer-chat-header {
      padding: 16px; background: var(--shm-accent); color: var(--shm-on-accent);
      display: flex; justify-content: space-between; align-items: center;
    }
    .shimmer-chat-header h3 { font-size: 15px; font-weight: 600; }
    .shimmer-chat-close { background: none; border: none; color: inherit; cursor: pointer; font-size: 20px; line-height: 1; }
    .shimmer-chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .shimmer-chat-msg { max-width: 85%; padding: 10px 14px; border-radius: var(--shm-radius); font-size: 13px; word-wrap: break-word; }
    .shimmer-chat-msg.user { align-self: flex-end; background: var(--shm-accent); color: var(--shm-on-accent); border-bottom-right-radius: min(4px, var(--shm-radius)); }
    .shimmer-chat-msg.assistant { align-self: flex-start; background: var(--shm-hover); color: var(--shm-text); border-bottom-left-radius: min(4px, var(--shm-radius)); }
    .shimmer-track-link {
      display: inline-block; margin-top: 8px; padding: 4px 10px; border-radius: var(--shm-radius-sm);
      background: var(--shm-surface); border: 1px solid var(--shm-border); color: var(--shm-accent-text);
      font-size: 12px; font-weight: 600; text-decoration: none;
    }
    .shimmer-track-link:hover { border-color: var(--shm-accent-line); }
    .shimmer-chat-form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--shm-border); }
    .shimmer-chat-form input {
      flex: 1; padding: 10px 14px; border: 1px solid var(--shm-border); border-radius: var(--shm-radius-ctl);
      background: var(--shm-surface); color: var(--shm-text); outline: none; font-size: 13px; font-family: inherit;
    }
    .shimmer-chat-form input:focus { border-color: var(--shm-accent-line); }
    .shimmer-chat-form button {
      padding: 10px 16px; background: var(--shm-accent); color: var(--shm-on-accent); border: none;
      border-radius: var(--shm-radius-ctl); cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit;
      transition: opacity 0.15s;
    }
    .shimmer-chat-form button:disabled { opacity: 0.5; cursor: not-allowed; }
    .shimmer-suggestions { display: flex; gap: 6px; flex-wrap: wrap; padding: 4px 0; }
    .shimmer-suggestion { padding: 6px 12px; border: 1px solid var(--shm-border); border-radius: var(--shm-radius-ctl);
      background: var(--shm-surface); color: var(--shm-text); font-size: 12px; cursor: pointer; font-family: inherit; transition: background 0.15s; }
    .shimmer-suggestion:hover { background: var(--shm-hover); }

    /* Products in chat */
    .shimmer-products { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    .shimmer-product-card {
      display: flex; gap: 10px; padding: 10px; background: var(--shm-surface); color: var(--shm-text); border: 1px solid var(--shm-border);
      border-radius: var(--shm-radius-sm); font-size: 12px;
    }
    .shimmer-product-card img { width: 48px; height: 48px; object-fit: cover; border-radius: var(--shm-radius-sm); }
    .shimmer-product-card-info { flex: 1; }
    .shimmer-product-card-name { font-weight: 600; font-size: 13px; }
    .shimmer-product-card-brand { font-size: 11px; color: var(--shm-muted); }
    .shimmer-product-card-price { color: var(--shm-accent-text); font-weight: 700; }

    /* Progress bar */
    .shimmer-progress { margin-top: 8px; }
    .shimmer-progress-bar { height: 4px; background: var(--shm-border); border-radius: 2px; overflow: hidden; }
    .shimmer-progress-fill { height: 100%; background: var(--shm-accent); transition: width 0.3s; border-radius: 2px; }
    .shimmer-progress-label { font-size: 11px; color: var(--shm-muted); margin-top: 2px; }

    .shimmer-powered { text-align: center; font-size: 11px; color: var(--shm-muted); padding: 4px 0 8px; }

    /* Typing indicator */
    .shimmer-typing { display: flex; gap: 4px; padding: 10px 14px; align-self: flex-start; }
    .shimmer-typing span {
      width: 6px; height: 6px; background: var(--shm-muted); border-radius: 50%;
      animation: shimmer-bounce 1.2s infinite;
    }
    .shimmer-typing span:nth-child(2) { animation-delay: 0.2s; }
    .shimmer-typing span:nth-child(3) { animation-delay: 0.4s; }
    /* \u2500\u2500 Cross-sell widget \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
    .sx-wrap {
      font-family: var(--shm-font);
      color: var(--shm-text);
      width: 100%;
    }
    .sx-title {
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--shm-muted);
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
      background: var(--shm-surface);
      border: 1px solid var(--shm-border);
      border-radius: var(--shm-radius);
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      text-decoration: none;
      color: inherit;
      position: relative;
    }
    .sx-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 30px -16px rgba(0,0,0,0.25);
      border-color: var(--shm-accent-line);
    }
    /* Une seule allure pour tous les r\xF4les (les classes sx-chip-<r\xF4le> restent
       sur le balisage, la boutique peut les colorer si elle veut). */
    .sx-chip {
      align-self: flex-start;
      font-family: inherit;
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: var(--shm-radius-ctl);
      margin-bottom: 12px;
      font-weight: 600;
      background: var(--shm-hover);
      color: var(--shm-accent-text);
    }

    .sx-img {
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      border-radius: var(--shm-radius-sm);
      background: var(--shm-hover);
      margin-bottom: 12px;
    }
    .sx-img-placeholder {
      width: 100%;
      aspect-ratio: 1 / 1;
      background: var(--shm-hover);
      border-radius: var(--shm-radius-sm);
      margin-bottom: 12px;
      display: flex; align-items: center; justify-content: center;
      color: var(--shm-muted); font-size: 28px;
    }
    .sx-name {
      font-size: 14.5px;
      font-weight: 500;
      line-height: 1.3;
      margin-bottom: 4px;
      color: var(--shm-text);
    }
    .sx-brand {
      font-size: 11px;
      color: var(--shm-muted);
      letter-spacing: 0.04em;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .sx-reason {
      font-size: 12.5px;
      color: var(--shm-text);
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
      color: var(--shm-text);
    }
    .sx-add {
      background: var(--shm-accent);
      color: var(--shm-on-accent);
      border: 0;
      border-radius: var(--shm-radius-ctl);
      padding: 6px 12px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .sx-add:hover { opacity: 0.85; }

    .sx-loading {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 14px;
    }
    .sx-skel {
      height: 250px;
      background: linear-gradient(90deg, var(--shm-hover) 0%, var(--shm-surface) 50%, var(--shm-hover) 100%);
      background-size: 200% 100%;
      border-radius: var(--shm-radius);
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
  `}var W=class{constructor(e,t,s,r,o){this.client=e;this.labels=t;this.searchSelector=s;this.onQuery=r;this.onOpen=o;this.anchor=null;this.savedPlaceholder="";this.bypassNext=!1;this.debounceTimer=null;this.sessionToken=null;this.history=[];this.knownCriteria=null;this.refined=!1;this.pendingBase="";this.createOverlay(),this.hookExistingInputs()}createOverlay(){this.overlay=document.createElement("div"),this.overlay.className="shimmer-widget shimmer-dock",this.overlay.setAttribute("part","dock"),this.overlay.innerHTML=`
      <div class="shimmer-search-results" part="results"></div>
      <div class="shimmer-dock-bottom">
        <div class="shimmer-vendor-q" part="question"></div>
        <div class="shimmer-chips-zone"></div>
        <div class="shimmer-dock-footer" part="footer">
          <button type="button" class="shimmer-dock-native" part="native-link"></button>
          <button type="button" class="shimmer-dock-close" part="close">Fermer</button>
        </div>
      </div>
    `,O().appendChild(this.overlay),this.questionEl=this.overlay.querySelector(".shimmer-vendor-q"),this.chipsEl=this.overlay.querySelector(".shimmer-chips-zone"),this.resultsEl=this.overlay.querySelector(".shimmer-search-results"),this.overlay.querySelector(".shimmer-dock-close").addEventListener("click",()=>this.close()),this.overlay.querySelector(".shimmer-dock-native").addEventListener("click",()=>{let e=this.anchor;this.close(),e?.form&&(this.bypassNext=!0,e.form.submit())}),document.addEventListener("click",e=>{if(!this.overlay.classList.contains("active"))return;let t=e.composedPath();!t.includes(this.overlay)&&!t.includes(this.anchor)&&this.close()}),document.addEventListener("keydown",e=>{e.key==="Escape"&&this.close(),(e.metaKey||e.ctrlKey)&&e.key==="k"&&(e.preventDefault(),document.querySelector(this.searchSelector||'input[type="search"], input[data-shimmer-search]')?.focus())}),window.addEventListener("resize",()=>this.position(),{passive:!0}),window.addEventListener("scroll",()=>this.position(),{passive:!0})}position(){if(!this.anchor||!this.overlay.classList.contains("active"))return;let e=this.anchor.getBoundingClientRect(),t=window.innerWidth;if(t<560)this.overlay.style.left="12px",this.overlay.style.right="12px",this.overlay.style.width="auto";else{let s=Math.min(Math.max(e.width,420),640,t-24),r=Math.min(Math.max(e.left,12),t-s-12);this.overlay.style.left=`${r}px`,this.overlay.style.right="auto",this.overlay.style.width=`${s}px`}this.overlay.style.top=`${Math.round(e.bottom+6)}px`}hookExistingInputs(){let e=this.searchSelector||'input[type="search"], input[data-shimmer-search]';document.querySelectorAll(e).forEach(t=>{t.addEventListener("keydown",s=>{this.bypassNext||s.key==="Enter"&&t.value.trim().length>=2&&(s.preventDefault(),s.stopPropagation(),this.open(t.value,t))}),t.form?.addEventListener("submit",s=>{if(this.bypassNext){this.bypassNext=!1;return}t.value.trim().length>=2&&(s.preventDefault(),this.open(t.value,t))})})}open(e,t){t&&t!==this.anchor&&(this.anchor=t,this.savedPlaceholder=t.placeholder);try{this.onOpen?.(this.anchor)}catch{}this.overlay.classList.add("active"),this.position();let s=this.overlay.querySelector(".shimmer-dock-native");s.textContent="Voir les r\xE9sultats classiques \u2192",s.style.display=this.anchor?.form?"":"none",e&&e.trim().length>=2&&this.handleQuery(e.trim())}handleQuery(e){try{this.onQuery?.()}catch{}if(!this.refined&&zt(e)){this.pendingBase=e,this.askToRefine(e);return}this.askVendor(e)}askToRefine(e){this.setQuestion(`Avec plaisir. Pour bien vous orienter sur \xAB\xA0${e}\xA0\xBB, c'est pour quelle occasion\xA0?`);let t=["Ap\xE9ritif","Un repas","Un cadeau","D\xE9couvrir","Petit budget"];this.chipsEl.innerHTML=`<div class="shimmer-chips" part="chips">${t.map(s=>`<button class="shimmer-chip" part="chip" type="button">${m(s)}</button>`).join("")}</div>`,this.chipsEl.querySelectorAll(".shimmer-chip").forEach(s=>{s.addEventListener("click",()=>{this.refined=!0,this.chipsEl.innerHTML="",this.askVendor(`${this.pendingBase} pour ${s.textContent}`)})})}close(){this.overlay.classList.remove("active"),this.resultsEl.innerHTML="",this.chipsEl.innerHTML="",this.setQuestion(""),this.history=[],this.knownCriteria=null,this.sessionToken=null,this.refined=!1,this.pendingBase="",this.anchor&&(this.anchor.placeholder=this.savedPlaceholder||this.labels.searchPlaceholder)}async askVendor(e){let t=this.anchor;this.setThinking();try{let s=await this.client.vendeur(e,this.sessionToken||void 0);if(s.control){this.close(),t?.form&&(t.value=e,t.form.submit());return}this.sessionToken=s.sessionToken||this.sessionToken,this.setQuestion(s.message),this.renderProducts(s.recommendedProducts||[]),this.renderRestockPrompt(s.outOfStock||[]),this.anchor&&(this.anchor.value="",this.anchor.placeholder="Pr\xE9cisez, ou demandez autre chose\u2026",this.anchor.focus())}catch{this.setQuestion(""),this.resultsEl.innerHTML=`<div class="shimmer-search-empty" part="empty">Le vendeur n'est pas joignable, r\xE9essayez dans un instant.</div>`}}setThinking(){this.questionEl.textContent="Le vendeur r\xE9fl\xE9chit\u2026",this.questionEl.classList.add("active")}setQuestion(e){if(!e){this.questionEl.textContent="",this.questionEl.classList.remove("active");return}this.questionEl.innerHTML=m(e).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),this.questionEl.classList.add("active")}renderRestockPrompt(e){if(this.resultsEl.querySelectorAll(".shimmer-restock").forEach(a=>a.remove()),!e.length)return;let t=e[0],s=document.createElement("div");s.className="shimmer-restock",s.setAttribute("part","restock"),s.innerHTML=`
      <div class="shimmer-restock-title"><strong>${m(t.name)}</strong> est \xE9puis\xE9. Je vous pr\xE9viens d\xE8s qu'il revient\xA0?</div>
      <form class="shimmer-restock-form">
        <input type="email" required placeholder="votre@email.fr" autocomplete="email" part="restock-input" />
        <button type="submit" part="restock-button">Pr\xE9venez-moi</button>
      </form>`;let r=s.querySelector("form"),o=s.querySelector("input"),i=s.querySelector("button");r.addEventListener("submit",async a=>{a.preventDefault();let c=o.value.trim();if(c){i.disabled=!0;try{let d=await this.client.stockAlert({email:c,platformVariantId:t.platformProductId?`p:${t.platformProductId}`:`local:${t.id}`,productId:t.id,variantLabel:t.name,visitorId:y?ie(C):null});s.innerHTML=d.confirm?`<div class="shimmer-restock-done">Presque fini : confirmez depuis l'e-mail qu'on vient de vous envoyer, et vous serez pr\xE9venu d\xE8s le retour de ${m(t.name)}.</div>`:`<div class="shimmer-restock-done">C'est not\xE9. Vous serez pr\xE9venu d\xE8s le retour de ${m(t.name)}.</div>`}catch{i.disabled=!1,o.setCustomValidity("Impossible d'enregistrer, r\xE9essayez."),o.reportValidity(),setTimeout(()=>o.setCustomValidity(""),2e3)}}}),this.resultsEl.prepend(s)}renderProducts(e){if(!e.length){this.resultsEl.innerHTML="";return}this.resultsEl.innerHTML=e.slice(0,8).map(s=>`
      <div class="shimmer-search-item" part="item" data-id="${s.id}">
        ${K(s.imageUrl)?`<img src="${K(s.imageUrl)}" alt="${m(s.name)}" part="item-image" />`:'<div class="shimmer-search-item-ph" part="item-image"></div>'}
        <div class="shimmer-search-item-info">
          <div class="shimmer-search-item-name" part="item-name">${m(s.name)}</div>
          <div class="shimmer-search-item-desc" part="item-desc">${m(s.category||"")} ${s.brand?"\xB7 "+m(s.brand):""}</div>
        </div>
        <div class="shimmer-search-item-price" part="item-price">${m(G(s.price))}</div>
      </div>`).join("");let t=e.slice(0,8);this.resultsEl.querySelectorAll(".shimmer-search-item").forEach((s,r)=>{let o=t[r];if(!o||!this.anchor?.form)return;s.setAttribute("role","link"),s.tabIndex=0;let i=()=>this.searchNative(o.name);s.addEventListener("click",i),s.addEventListener("keydown",a=>{a.key==="Enter"&&i()})})}searchNative(e){let t=this.anchor;this.close(),t?.form&&(t.value=e,this.bypassNext=!0,t.form.submit())}setOnQuery(e){this.onQuery=e}destroy(){this.overlay.remove()}},V=class{constructor(e,t,s=()=>null){this.client=e;this.labels=t;this.getCustomer=s;this.sessionToken=null;this.history=[];this.knownCriteria=null;this.mode="assist";this.isOpen=!1;this.savSessionToken=null;this.awaitingOrderRef=!1;this.createBubble(),this.createWindow()}createBubble(){this.bubble=document.createElement("button"),this.bubble.className="shimmer-widget shimmer-chat-bubble",this.bubble.setAttribute("part","bubble"),this.bubble.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',this.bubble.addEventListener("click",()=>this.toggle()),O().appendChild(this.bubble)}createWindow(){this.window=document.createElement("div"),this.window.className="shimmer-widget shimmer-chat-window",this.window.setAttribute("part","chat"),this.window.innerHTML=`
      <div class="shimmer-chat-header" part="chat-header">
        <h3>${this.labels.assistTitle}</h3>
        <button class="shimmer-chat-close" part="close">&times;</button>
      </div>
      <div class="shimmer-chat-messages" part="chat-messages"></div>
      <div class="shimmer-powered">${this.labels.poweredBy}</div>
      <form class="shimmer-chat-form">
        <input type="text" placeholder="${this.labels.assistPlaceholder}" autocomplete="off" part="chat-input" />
        <button type="submit" part="chat-send">${this.labels.send}</button>
      </form>
    `,O().appendChild(this.window),this.messagesEl=this.window.querySelector(".shimmer-chat-messages"),this.formInput=this.window.querySelector(".shimmer-chat-form input"),this.sendBtn=this.window.querySelector(".shimmer-chat-form button"),this.window.querySelector(".shimmer-chat-close").addEventListener("click",()=>this.toggle()),this.window.querySelector(".shimmer-chat-form").addEventListener("submit",e=>{e.preventDefault(),this.sendMessage()}),this.addMessage("assistant",this.labels.chatWelcome)}toggle(){this.isOpen=!this.isOpen,this.window.classList.toggle("active",this.isOpen),this.isOpen&&setTimeout(()=>this.formInput.focus(),100)}addMessage(e,t,s,r){let o=document.createElement("div");o.className=`shimmer-chat-msg ${e}`,o.setAttribute("part",`message message-${e}`);let i=m(t).replace(/\n/g,"<br>");s?.length&&(i+=`<div class="shimmer-products">${s.map(a=>`
        <div class="shimmer-product-card" part="product-card">
          ${K(a.imageUrl)?`<img src="${K(a.imageUrl)}" alt="${m(a.name)}" />`:""}
          <div class="shimmer-product-card-info">
            <div class="shimmer-product-card-name">${m(a.name)}</div>
            <div class="shimmer-product-card-price">${m(a.price)}${a.currency==="EUR"?"\u20AC":" "+m(a.currency)}</div>
          </div>
        </div>
      `).join("")}</div>`),r!=null&&r>0&&(i+=`<div class="shimmer-progress">
        <div class="shimmer-progress-bar"><div class="shimmer-progress-fill" style="width:${r}%"></div></div>
        <div class="shimmer-progress-label">Qualification: ${r}%</div>
      </div>`),o.innerHTML=i,this.messagesEl.appendChild(o),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}showTyping(){let e=document.createElement("div");return e.className="shimmer-typing",e.innerHTML="<span></span><span></span><span></span>",this.messagesEl.appendChild(e),this.messagesEl.scrollTop=this.messagesEl.scrollHeight,e}async sendMessage(){let e=this.formInput.value.trim();if(!e)return;if(this.formInput.value="",this.sendBtn.disabled=!0,this.addMessage("user",e),this.awaitingOrderRef&&/[@\d]/.test(e)||ae(e)){this.sendSavMessage(e);return}this.awaitingOrderRef=!1,this.history.push({role:"user",content:e});let s=document.createElement("div");s.className="shimmer-chat-msg assistant",s.setAttribute("part","message message-assistant"),s.innerHTML='<span class="shimmer-typing"><span></span><span></span><span></span></span>',this.messagesEl.appendChild(s),this.messagesEl.scrollTop=this.messagesEl.scrollHeight;let r="",o=null;this.client.assistStream(e,{onToken:i=>{s.querySelector(".shimmer-typing")&&(s.innerHTML=""),r+=i,s.innerHTML=m(r).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>"),this.messagesEl.scrollTop=this.messagesEl.scrollHeight},onMeta:i=>{o=i,this.knownCriteria=i.knownCriteria||this.knownCriteria,i.suggestedQuestions?.length&&this.renderSuggestions(i.suggestedQuestions)},onDone:i=>{r=i||r;let a=m(r).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>");o?.highlightedProducts?.length&&(a+=`<div class="shimmer-products">${o.highlightedProducts.map(c=>`
              <div class="shimmer-product-card" part="product-card">
                <div class="shimmer-product-card-info">
                  <div class="shimmer-product-card-name">${m(c.name)}</div>
                  <div class="shimmer-product-card-brand">${m(c.brand)}</div>
                  <div class="shimmer-product-card-price">${m(c.price)}</div>
                </div>
              </div>
            `).join("")}</div>`),o?.qualification?.score>0&&(a+=`<div class="shimmer-progress">
              <div class="shimmer-progress-bar"><div class="shimmer-progress-fill" style="width:${Number(o.qualification.score)||0}%"></div></div>
              <div class="shimmer-progress-label">Qualification: ${Number(o.qualification.score)||0}%</div>
            </div>`),s.innerHTML=a,this.history.push({role:"assistant",content:r}),this.sendBtn.disabled=!1,this.formInput.focus(),this.messagesEl.scrollTop=this.messagesEl.scrollHeight},onError:i=>{s.innerHTML=`Erreur: ${m(i)}`,this.sendBtn.disabled=!1,this.formInput.focus()}},this.sessionToken||void 0,this.history.slice(-8),this.knownCriteria||void 0)}async sendSavMessage(e){let t=document.createElement("div");t.className="shimmer-chat-msg assistant",t.setAttribute("part","message message-assistant"),t.innerHTML='<span class="shimmer-typing"><span></span><span></span><span></span></span>',this.messagesEl.appendChild(t),this.messagesEl.scrollTop=this.messagesEl.scrollHeight;try{let s=await this.client.savMessage(e,this.savSessionToken||void 0,this.getCustomer());this.savSessionToken=s.sessionToken??this.savSessionToken,this.awaitingOrderRef=!!s.awaitingOrderRef;let r=s.message||this.labels.savUnavailable;xe(t,r,s.tracking??[],this.labels.trackParcel)}catch{this.awaitingOrderRef=!1,xe(t,this.labels.savUnavailable,[],this.labels.trackParcel)}finally{this.sendBtn.disabled=!1,this.formInput.focus(),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}}renderSuggestions(e){this.messagesEl.querySelectorAll(".shimmer-suggestions").forEach(s=>s.remove());let t=document.createElement("div");t.className="shimmer-suggestions",t.setAttribute("part","chips");for(let s of e){let r=document.createElement("button");r.type="button",r.className="shimmer-suggestion",r.setAttribute("part","chip"),r.textContent=s,r.addEventListener("click",()=>{this.formInput.value=s,this.sendMessage(),t.remove()}),t.appendChild(r)}this.messagesEl.appendChild(t),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}destroy(){this.bubble.remove(),this.window.remove()}};function xe(n,e,t,s){n.textContent="",e.split(`
`).forEach((r,o)=>{o>0&&n.appendChild(document.createElement("br")),n.appendChild(document.createTextNode(r))});for(let r of t){if(!r.url)continue;let o;try{o=new URL(r.url)}catch{continue}if(o.protocol!=="https:"&&o.protocol!=="http:")continue;let i=document.createElement("a");i.className="shimmer-track-link",i.setAttribute("part","track-link"),i.href=o.toString(),i.target="_blank",i.rel="noopener noreferrer",i.textContent=r.carrier?`\u2197 ${s} (${r.carrier})`:`\u2197 ${s}`,n.appendChild(document.createElement("br")),n.appendChild(i)}}function we(n){if(!n||!n.email||!n.email.includes("@"))return null;let e=(n.signature||"").trim(),t=(n.ts||"").trim();return/^[0-9a-f]{64}$/i.test(e)&&/^\d{9,11}$/.test(t)?{email:n.email,ts:t,signature:e}:null}function m(n){return String(n??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function K(n){let e=String(n??"").trim();return/^https?:\/\//i.test(e)?m(e):""}function zt(n){let e=n.trim().toLowerCase().split(/\s+/);if(e.length>2)return!1;let t=["rouge","blanc","ros\xE9","rose","vin","vins","champagne","cr\xE9mant","cremant","bulle","bulles","cadeau","offrir","id\xE9e","idee","ap\xE9ro","apero"];return e.some(s=>t.includes(s))}var Dt={apero:"Ap\xE9ritif",repas:"Repas",dessert:"Dessert",decouverte:"D\xE9couverte",cadeau:"Cadeau",accessoire:"Accessoire",complement:"\xC0 associer"},C="shimmer_vid",$e=365;function ie(n){if(typeof document>"u")return null;let e=document.cookie.match(new RegExp("(?:^|; )"+n.replace(/[.$?*|{}()[\]\\\/+^]/g,"\\$&")+"=([^;]*)"));return e?decodeURIComponent(e[1]):null}function Ae(n,e,t){if(typeof document>"u")return;let s=new Date(Date.now()+t*864e5).toUTCString();document.cookie=`${n}=${encodeURIComponent(e)}; expires=${s}; path=/; SameSite=Lax`}function Se(){let n=ie(C);if(n&&n.length>=8)return n;let e="vid_"+Math.random().toString(36).slice(2,10)+Date.now().toString(36);return Ae(C,e,$e),e}var y=!1,Ft=["shimmer_xs_sid","shimmer_xs_intent"];function ke(){try{for(let n of Ft)localStorage.removeItem(n)}catch{}try{sessionStorage.removeItem("shimmer_enrolled")}catch{}}function Ee(n){typeof document>"u"||(document.cookie=`${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`)}function Te(n){let e=window,t=!1,s=e.__tcfapi;if(typeof s=="function"){t=!0;try{s("addEventListener",2,(i,a)=>{let c=i;!a||!c||(c.eventStatus==="tcloaded"||c.eventStatus==="useractioncomplete")&&n(c.gdprApplies===!1?!0:!!c.purpose?.consents?.["1"])})}catch{}}let r=e.Cookiebot;if(r&&typeof r=="object"&&"consent"in r){t=!0;let i=()=>n(!!(r.consent?.statistics||r.consent?.preferences));(r.consented||r.declined)&&i(),window.addEventListener("CookiebotOnAccept",i),window.addEventListener("CookiebotOnDecline",i)}(e.axeptioSettings||e._axcb)&&(t=!0,(e._axcb=e._axcb||[]).push(a=>{try{a.on("cookies:complete",c=>{let d=c||{};n(!!(d.shimmer??d.analytics??d.stats??Object.values(d).some(Boolean)))})}catch{}}));let o=e.wp_has_consent;if(typeof o=="function"){t=!0;let i=()=>{try{n(!!(o("statistics")||o("statistics-anonymous")))}catch{}};i(),document.addEventListener("wp_listen_for_consent_change",i)}if(e.tarteaucitron){t=!0;let i=()=>{let a=document.cookie.match(/tarteaucitron=([^;]*)/);if(!a)return;let c=decodeURIComponent(a[1]??"");/shimmer=true/.test(c)?n(!0):/shimmer=false/.test(c)?n(!1):/=true/.test(c)&&n(!0)};i(),document.addEventListener("tac.close_alert",i),document.addEventListener("tac.close_panel",i)}return t}async function Ut(n,e,t,s){let r=await B(`${n}/api/holdout/decision?store=${t}&visitorId=${encodeURIComponent(s)}`,{headers:{Authorization:`Bearer ${e}`}},5e3);if(!r.ok)throw new Error("holdout-decision-failed");return r.json()}var Ce="shimmer_enrolled";function Re(n,e,t,s,r){if(y){try{if(window.sessionStorage.getItem(Ce))return}catch{}fetch(`${n}/api/holdout/track`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({visitorId:s,store:t,exposed:r,trigger:"search"}),keepalive:!0}).then(o=>{if(o.ok)try{window.sessionStorage.setItem(Ce,"1")}catch{}}).catch(()=>{})}}function jt(n,e){let t=n||'input[type="search"], input[data-shimmer-search]';document.querySelectorAll(t).forEach(s=>{s.addEventListener("keydown",r=>{r.key==="Enter"&&s.value.trim().length>=2&&e()}),s.form?.addEventListener("submit",()=>{s.value.trim().length>=2&&e()})})}function Pe(){return typeof window>"u"||typeof document>"u"?!1:window.Shopify||document.querySelector('meta[name="shopify-checkout-api-token"], meta[name="shopify-digital-wallet"]')?!0:/\.myshopify\.com$/.test(window.location.hostname)}async function Bt(n,e){if(!y||!Pe())return;let t={attributes:{shimmer_vid:n,shimmer_bucket:String(e)}};try{await fetch("/cart/update.js",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(t),credentials:"same-origin"})}catch{}if(!("__shimmerFetchPatched"in window)){window.__shimmerFetchPatched=!0;let s=window.fetch.bind(window);window.fetch=async(...r)=>{let o=await s(...r);try{let i=typeof r[0]=="string"?r[0]:r[0].url;y&&/\/cart\/(add|change|clear)(?:\.js)?\b/.test(i)&&s("/cart/update.js",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(t),credentials:"same-origin"})}catch{}return o}}}var se="shimmer_xs_sid",Wt=30*864e5,Le=null;function Q(){if(!y||typeof localStorage>"u")return Le??(Le="xs-page-"+Math.random().toString(36).slice(2)),Le;try{let e=localStorage.getItem(se);if(e){let t=JSON.parse(e);if(t&&t.id&&t.ts&&Date.now()-t.ts<Wt)return localStorage.setItem(se,JSON.stringify({id:t.id,ts:Date.now()})),t.id}}catch{}let n="xs-"+Math.random().toString(36).slice(2)+Date.now().toString(36);try{localStorage.setItem(se,JSON.stringify({id:n,ts:Date.now()}))}catch{}return n}var _e="shimmer_xs_intent",Vt=30*60*1e3;function Oe(){if(typeof localStorage>"u")return[];try{let n=localStorage.getItem(_e);if(!n)return[];let e=JSON.parse(n);if(!Array.isArray(e))return[];let t=Date.now();return e.filter(s=>s&&typeof s=="object"&&t-s.ts<Vt)}catch{return[]}}function Ne(n){if(!(!y||typeof localStorage>"u"))try{let e=n.slice(0,20);localStorage.setItem(_e,JSON.stringify(e))}catch{}}function Ie(n){let t=Oe().filter(s=>s.target_id!==n.target_id);Ne([n,...t])}function Me(n){let e=Oe(),t=e.filter(r=>r.target_id===n);if(t.length===0)return[];let s=e.filter(r=>r.target_id!==n);return Ne(s),t}var J=class{constructor(e,t={}){this.mounted=new WeakSet;this.eventQueue=[];this.flushTimer=null;this.client=e,this.opts={selector:t.selector??"[data-shimmer-crosssell]",limit:Math.min(Math.max(t.limit??4,1),12),title:t.title??"On a aussi pens\xE9 \xE0",onProductClick:t.onProductClick??(()=>{}),productUrl:t.productUrl??null},this.sessionId=Q()}trackEvent(e){y&&(this.sessionId=Q(),this.eventQueue.push({...e,session_id:this.sessionId}),this.flushTimer===null&&typeof window<"u"&&(this.flushTimer=window.setTimeout(()=>this.flushEvents(),1500)))}flushEvents(){if(this.flushTimer!==null&&(typeof window<"u"&&window.clearTimeout(this.flushTimer),this.flushTimer=null),this.eventQueue.length===0)return;let e=this.eventQueue.splice(0,this.eventQueue.length);this.client.crossSellEvents(e).catch(()=>{})}async render(){let e=document.querySelectorAll(this.opts.selector);await Promise.all([...e].map(t=>this.mount(t)))}async renderInto(e,t){let s=typeof e=="string"?document.querySelector(e):e;s&&(s.setAttribute("data-shimmer-crosssell",String(t)),await this.mount(s))}async mount(e){if(this.mounted.has(e))return;this.mounted.add(e);let t=e.getAttribute("data-shimmer-crosssell"),s=Number(t);if(!(!Number.isFinite(s)||s<=0)){e.classList.add("shimmer-widget","sx-wrap"),e.innerHTML=`
      <p class="sx-title">${m(this.opts.title)}</p>
      <div class="sx-loading">
        <div class="sx-skel"></div><div class="sx-skel"></div>
        <div class="sx-skel"></div><div class="sx-skel"></div>
      </div>
    `;try{let r=await this.client.crossSell(s,this.opts.limit);if(!r.items.length){e.innerHTML="";return}this.renderCards(e,r)}catch{e.innerHTML=""}}}renderCards(e,t){let s=this.opts.productUrl?"a":"div",r=t.items.map(i=>{let a=this.opts.productUrl?this.opts.productUrl.replace("{id}",String(i.product.id)).replace("{sku}",i.product.sku||""):null,c=a?`href="${m(a)}"`:"",d=i.product.imageUrl?`<img class="sx-img" src="${m(i.product.imageUrl)}" alt="${m(i.product.name)}" loading="lazy" />`:'<div class="sx-img-placeholder">\u25C7</div>',u=Dt[i.role]||i.role,h=i.product.brand?`<p class="sx-brand">${m(i.product.brand)}</p>`:"";return`
          <${s} ${c} class="sx-card" data-product-id="${i.product.id}">
            <span class="sx-chip sx-chip-${m(i.role)}">${m(u)}</span>
            ${d}
            <p class="sx-name">${m(i.product.name)}</p>
            ${h}
            <p class="sx-reason">\xAB ${m(i.reason)} \xBB</p>
            <div class="sx-foot">
              <span class="sx-price">${m(G(i.product.price))}</span>
              <button type="button" class="sx-add" data-add="${i.product.id}">Ajouter</button>
            </div>
          </${s}>
        `}).join("");e.innerHTML=`
      <p class="sx-title">${m(this.opts.title)}</p>
      <div class="sx-grid">${r}</div>
    `;let o=Array.from(e.querySelectorAll(".sx-card"));if(o.forEach((i,a)=>{let c=Number(i.dataset.productId),d=t.items.find(u=>u.product.id===c);d&&i.addEventListener("click",u=>{u.target.closest(".sx-add")||(this.trackEvent({product_id:t.reference.id,target_id:d.product.id,role:d.role,event_type:"click",position:a}),Ie({ref_id:t.reference.id,target_id:d.product.id,role:d.role,position:a,ts:Date.now()}),this.flushEvents(),this.opts.onProductClick(d))})}),e.querySelectorAll(".sx-add").forEach(i=>{let a=Number(i.dataset.add),c=t.items.find(u=>u.product.id===a);if(!c)return;let d=o.findIndex(u=>u.dataset.productId===String(a));i.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.trackEvent({product_id:t.reference.id,target_id:c.product.id,role:c.role,event_type:"add",position:d}),Ie({ref_id:t.reference.id,target_id:c.product.id,role:c.role,position:d,ts:Date.now()}),this.flushEvents(),this.opts.onProductClick(c)})}),typeof IntersectionObserver<"u"){let i=new WeakSet,a=new Map,c=new IntersectionObserver(d=>{for(let u of d){if(i.has(u.target))continue;let h=u.target;if(u.isIntersecting&&u.intersectionRatio>=.5){if(a.has(h))continue;let f=window.setTimeout(()=>{i.add(h),a.delete(h),c.unobserve(h);let w=Number(h.dataset.productId),S=t.items.find(R=>R.product.id===w);if(!S)return;let E=o.indexOf(h);this.trackEvent({product_id:t.reference.id,target_id:S.product.id,role:S.role,event_type:"impression",position:E})},300);a.set(h,f)}else{let f=a.get(h);f!==void 0&&(window.clearTimeout(f),a.delete(h))}}},{threshold:[0,.5,1]});o.forEach(d=>c.observe(d))}if(typeof window<"u"){let i=()=>this.flushEvents();window.addEventListener("pagehide",i,{once:!1}),window.addEventListener("beforeunload",i,{once:!1})}}},l=class l{constructor(e){this.searchWidget=null;this.chatWidget=null;this.themeCtl=null;this.onWindowLoad=()=>this.themeCtl?.refresh();this.onSearchOpen=e=>this.themeCtl?.refresh(e);this.consent="unknown";this.visitorId=null;this.customer=null;this.measuredBootDone=!1;this.assistHistory=[];this.assistKnownCriteria={};this.config=e,this.chatPosition=e.theme?.chatPosition==="bottom-left"?"bottom-left":"bottom-right",this.labels=Nt[e.locale||"fr"],this.client=new ne(e.apiUrl,e.apiKey,e.storeId),this.customer=we(e.customer)??l.pendingCustomer}static init(e){try{l.instance&&l.instance.destroy();let t=new l(e);try{Ht(t.chatPosition)}catch(s){console.warn("[shimmer] styles",s)}try{t.startTheme()}catch(s){console.warn("[shimmer] th\xE8me",s)}return l.instance=t,t.bootstrapHoldoutAndMount().catch(s=>console.warn("[shimmer] bootstrap",s)),t}catch(t){return console.warn("[shimmer] init failed, store unaffected",t),l.instance??new l(e)}}startTheme(){this.themeCtl=new j(O,pe(this.config.theme)),this.themeCtl.refresh(),document.readyState!=="complete"&&window.addEventListener("load",this.onWindowLoad,{once:!0}),this.loadAppearance(this.config.storeId),window.setTimeout(()=>this.themeCtl?.markReady(),700)}loadAppearance(e){if(!e||!Number.isInteger(e)||e<=0){this.themeCtl?.markReady();return}B(`${this.config.apiUrl}/api/public/appearance?store=${e}`,{credentials:"omit"},4e3).then(t=>t.ok?t.json():null).then(t=>{t&&typeof t=="object"&&t.appearance&&typeof t.appearance=="object"&&this.themeCtl?.setRemote(t.appearance)}).catch(()=>{}).finally(()=>this.themeCtl?.markReady())}async bootstrapHoldoutAndMount(){let e=this.config.consentMode??"auto";if(document.addEventListener("shimmer:consent",s=>{let r=!!s.detail?.granted;this.applyConsent(r)}),l.pendingConsent===!1){l.pendingConsent=null,await this.sessionBoot(),this.applyConsent(!1);return}if(e==="granted"){this.applyConsent(!0);return}if(e==="denied"){Ee(C),ke(),await this.sessionBoot();return}if(l.pendingConsent!==null){let s=l.pendingConsent;l.pendingConsent=null,s||await this.sessionBoot(),this.applyConsent(s);return}let t=Te(s=>this.applyConsent(s));await this.sessionBoot(),e==="auto"&&!t&&window.setTimeout(()=>{this.consent==="unknown"&&!Te(s=>this.applyConsent(s))&&this.applyConsent(!0)},3e3)}applyConsent(e){let t=this.consent;this.consent=e?"granted":"denied",y=e,e&&!this.measuredBootDone?(this.measuredBootDone=!0,this.measuredBoot().catch(s=>console.warn("[shimmer] measured boot",s))):e&&(this.visitorId?Ae(C,this.visitorId,$e):Se()),!e&&t!=="denied"&&(Ee(C),ke(),t==="granted"&&Pe()&&fetch("/cart/update.js",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({attributes:{shimmer_vid:"",shimmer_bucket:""}}),credentials:"same-origin"}).catch(()=>{}))}async sessionBoot(){this.searchWidget||(this.searchWidget=new W(this.client,this.labels,this.config.searchSelector,void 0,this.onSearchOpen),this.config.enableChat&&(this.chatWidget=new V(this.client,this.labels,()=>this.customer)))}async measuredBoot(){let e=Se();this.visitorId=e;let t=!1,s=0,r=this.config.storeId;try{if(!r)try{let a=await B(`${this.config.apiUrl}/api/stores/me/config`,{headers:{Authorization:`Bearer ${this.config.apiKey}`}},5e3);if(a.ok){let c=await a.json();r=c.id??c.storeId,this.loadAppearance(r)}}catch{}if(r){let a=await Ut(this.config.apiUrl,this.config.apiKey,r,e);t=a.control,s=a.bucket}}catch{}if(!y)return;this.config.disableCartAttribution||Bt(e,s);let o=r;if(t){this.searchWidget?.destroy(),this.searchWidget=null,this.chatWidget=null,o&&jt(this.config.searchSelector,()=>Re(this.config.apiUrl,this.config.apiKey,o,e,!1));return}let i=o?()=>Re(this.config.apiUrl,this.config.apiKey,o,e,!0):void 0;this.searchWidget?this.searchWidget.setOnQuery(i):this.searchWidget=new W(this.client,this.labels,this.config.searchSelector,i,this.onSearchOpen),this.config.enableChat&&!this.chatWidget&&(this.chatWidget=new V(this.client,this.labels,()=>this.customer))}static consent(e){if(!l.instance){l.pendingConsent=e;return}l.instance.applyConsent(e)}static identify(e){l.pendingCustomer=we(e),l.instance&&(l.instance.customer=l.pendingCustomer)}static get assistant(){return{chat:l.chat,reset:l.resetChat}}static search(e){if(!l.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return l.instance.client.search(e)}static openSearch(e){l.instance?.searchWidget?.open(e)}static async chat(e){if(!l.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");let t=l.instance;t.assistHistory.push({role:"user",content:e});let s=await t.client.assist(e,t.assistSessionToken,t.assistHistory.slice(-6),t.assistKnownCriteria);return t.assistSessionToken=s.sessionToken,s.knownCriteria&&(t.assistKnownCriteria={...t.assistKnownCriteria,...s.knownCriteria}),t.assistHistory.push({role:"assistant",content:s.message}),s}static resetChat(){l.instance&&(l.instance.assistHistory=[],l.instance.assistKnownCriteria={},l.instance.assistSessionToken=void 0)}static reviewStats(e){if(!l.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return l.instance.client.reviewStats(e)}static destroy(){l.instance?.destroy()}destroy(){this.searchWidget?.destroy(),this.chatWidget?.destroy(),this.themeCtl?.destroy(),this.themeCtl=null,window.removeEventListener("load",this.onWindowLoad),document.getElementById("shimmer-sdk-styles")?.remove(),l.instance=null}};l.instance=null,l.pendingConsent=null,l.pendingCustomer=null,l.crossSell={async render(e={}){if(!l.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");await new J(l.instance.client,e).render()},async renderInto(e,t,s={}){if(!l.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");await new J(l.instance.client,s).renderInto(e,t)},fetch(e,t=4){if(!l.instance)throw new Error("Shimmer not initialized. Call Shimmer.init() first.");return l.instance.client.crossSell(e,t)},trackProductView(e){if(!y||!l.instance||!Number.isFinite(e)||e<=0)return;let t=Me(e);if(t.length===0)return;let s=Q(),r=t.map(o=>({product_id:o.ref_id,target_id:o.target_id,role:o.role,event_type:"view_target",session_id:s,position:o.position,metadata:{intent_age_ms:Date.now()-o.ts}}));l.instance.client.crossSellEvents(r).catch(()=>{})},trackPurchase(e){if(!y||!l.instance)return;let t=Q(),s=[];for(let r of e){if(!Number.isFinite(r)||r<=0)continue;let o=Me(r);for(let i of o)s.push({product_id:i.ref_id,target_id:i.target_id,role:i.role,event_type:"purchase",session_id:t,position:i.position,metadata:{intent_age_ms:Date.now()-i.ts}})}s.length!==0&&l.instance.client.crossSellEvents(s).catch(()=>{})}};var re=l;(function(){if(typeof document>"u")return;let e=document.currentScript;if(!e||!e.hasAttribute("data-shimmer"))return;let t=e.getAttribute("data-store"),s=e.getAttribute("data-key");if(!t||!s){console.warn("[shimmer] data-store et data-key sont requis pour l'auto-d\xE9marrage.");return}let r=e.getAttribute("data-api")||"";if(!r)try{r=`${new URL(e.src).origin}/shimmer`}catch{console.warn("[shimmer] impossible de d\xE9duire data-api depuis le src ; pr\xE9cisez data-api.");return}let o=()=>{try{re.init({apiUrl:r,apiKey:s,storeId:Number(t),searchSelector:e.getAttribute("data-search")||void 0,enableChat:e.hasAttribute("data-chat"),consentMode:e.getAttribute("data-consent")||void 0,theme:{accent:e.getAttribute("data-accent")||void 0,font:e.getAttribute("data-font")||void 0,radius:e.getAttribute("data-radius")||void 0,mode:e.getAttribute("data-theme")||void 0},customer:{email:e.getAttribute("data-customer-email")||"",ts:e.getAttribute("data-customer-ts")||"",signature:e.getAttribute("data-customer-signature")||""}})}catch(i){console.warn("[shimmer] init \xE9chou\xE9e",i)}};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o):o()})();export{re as Shimmer};
//# sourceMappingURL=shimmer.esm.js.map
