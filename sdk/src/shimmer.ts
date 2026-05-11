/**
 * Shimmer SDK — AI E-commerce Widgets
 * Drop-in search + chat + review widgets for any e-commerce site.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

interface ShimmerConfig {
  apiUrl: string;
  apiKey: string;
  containerId?: string;
  searchSelector?: string;
  chatSelector?: string;
  locale?: 'fr' | 'en';
  theme?: Partial<ShimmerTheme>;
}

interface ShimmerTheme {
  primaryColor: string;
  fontFamily: string;
  borderRadius: string;
  chatPosition: 'bottom-right' | 'bottom-left';
}

interface SearchResult {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  category: string;
  brand: string;
  score: number;
  matchType: string;
}

interface SearchResponse {
  results: SearchResult[];
  searchType: string;
  sessionToken: string;
  totalResults: number;
  message?: string;
}

interface AssistResponse {
  message: string;
  products?: SearchResult[];
  criteria?: Record<string, string>;
  knownCriteria?: Record<string, string>;
  progress?: number;
  stage?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type CrossSellRole = 'apero' | 'repas' | 'dessert' | 'decouverte' | 'cadeau' | 'accessoire' | 'complement';

interface CrossSellProduct {
  id: number;
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: string;
  imageUrl?: string | null;
  description?: string | null;
  specs?: Record<string, unknown>;
}

interface CrossSellItem {
  product: CrossSellProduct;
  role: CrossSellRole;
  reason: string;
  score: number;
}

interface CrossSellResponse {
  reference: {
    id: number;
    sku: string;
    name: string;
    brand: string | null;
    category: string | null;
    price: string;
  };
  items: CrossSellItem[];
}

type CrossSellEventType = 'impression' | 'click' | 'add' | 'view_target' | 'purchase';

interface CrossSellEvent {
  product_id: number;     // reference product (the one the widget was shown on)
  target_id: number;      // recommended product
  role: CrossSellRole;
  event_type: CrossSellEventType;
  session_id: string;
  position?: number;
  metadata?: Record<string, unknown>;
}

/** Attribution intent stored in localStorage when a visitor clicks a cross-sell card.
 *  Used to fire view_target / purchase events later when they navigate to the
 *  recommended product or complete checkout. */
interface CrossSellIntent {
  ref_id: number;
  target_id: number;
  role: CrossSellRole;
  position: number;
  ts: number;          // ms epoch — used to expire stale intents
}

interface CrossSellOptions {
  /** CSS selector for mount points. Default: `[data-shimmer-crosssell]`. Each matching element
   *  must carry the product id as `data-shimmer-crosssell="123"`. */
  selector?: string;
  /** Number of picks to fetch and render per product (1-12). Default 4. */
  limit?: number;
  /** Heading shown above the cards. Default: `"On a aussi pensé à"`. */
  title?: string;
  /** Hook invoked when a user clicks a card. If absent, the card behaves as a link to
   *  `/products/{id}` if the product href attribute is set, or no-op otherwise. */
  onProductClick?: (item: CrossSellItem) => void;
  /** Format used to render the URL of each pick. `{id}` and `{sku}` get substituted.
   *  Default `null` — no auto-navigation; pair with `onProductClick`. */
  productUrl?: string | null;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  recommendRate: number;
  distribution: Record<string, number>;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_THEME: ShimmerTheme = {
  primaryColor: '#6366f1',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  borderRadius: '12px',
  chatPosition: 'bottom-right',
};

const LABELS = {
  fr: {
    searchPlaceholder: 'Rechercher un produit...',
    chatPlaceholder: 'Posez votre question...',
    chatTitle: 'Assistant Shimmer',
    chatWelcome: 'Bonjour ! Comment puis-je vous aider ?',
    send: 'Envoyer',
    close: 'Fermer',
    noResults: 'Aucun résultat trouvé.',
    addToCart: 'Voir le produit',
    assistTitle: 'Vendeur IA',
    assistPlaceholder: 'Décrivez ce que vous cherchez...',
    poweredBy: 'Propulsé par Shimmer',
  },
  en: {
    searchPlaceholder: 'Search for a product...',
    chatPlaceholder: 'Ask a question...',
    chatTitle: 'Shimmer Assistant',
    chatWelcome: 'Hello! How can I help you?',
    send: 'Send',
    close: 'Close',
    noResults: 'No results found.',
    addToCart: 'View product',
    assistTitle: 'AI Sales Assistant',
    assistPlaceholder: 'Describe what you are looking for...',
    poweredBy: 'Powered by Shimmer',
  },
};

// ─── HTTP Client ─────────────────────────────────────────────────────────────

class ShimmerClient {
  constructor(private apiUrl: string, private apiKey: string) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  search(query: string, sessionToken?: string): Promise<SearchResponse> {
    return this.request('POST', '/api/search', { query, sessionToken });
  }

  assist(message: string, sessionToken?: string, history?: ChatMessage[], knownCriteria?: Record<string, string>): Promise<AssistResponse> {
    return this.request('POST', '/api/search/assist', { message, sessionToken, history, knownCriteria });
  }

  /** Stream assist response via SSE — calls onToken for each word, onMeta for metadata, onDone when complete */
  assistStream(
    message: string,
    callbacks: {
      onToken: (text: string) => void;
      onMeta: (meta: any) => void;
      onDone: (fullText: string) => void;
      onError?: (err: string) => void;
    },
    sessionToken?: string,
    history?: ChatMessage[],
    knownCriteria?: Record<string, string>,
  ): AbortController {
    const ctrl = new AbortController();
    const url = `${this.apiUrl}/api/search/assist/stream`;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ message, sessionToken, history, knownCriteria }),
      signal: ctrl.signal,
    }).then(async (res) => {
      if (!res.ok || !res.body) {
        callbacks.onError?.(`HTTP ${res.status}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (eventType === 'metadata') callbacks.onMeta(parsed);
              else if (eventType === 'token') callbacks.onToken(parsed.text);
              else if (eventType === 'done') callbacks.onDone(parsed.fullText);
              else if (eventType === 'error') callbacks.onError?.(parsed.error);
            } catch { /* ignore parse errors */ }
          }
        }
      }
    }).catch((err) => {
      if (err.name !== 'AbortError') callbacks.onError?.(err.message);
    });

    return ctrl;
  }

  chatMessage(message: string, sessionToken?: string): Promise<{ reply: string; sessionToken: string }> {
    return this.request('POST', '/api/chat/message', { message, sessionToken, stream: false });
  }

  reviewStats(productId?: number): Promise<ReviewStats> {
    const qs = productId ? `?productId=${productId}` : '';
    return this.request('GET', `/api/reviews/stats${qs}`);
  }

  productReviews(productId: number, page = 1): Promise<{ reviews: any[]; total: number }> {
    return this.request('GET', `/api/reviews/product/${productId}?page=${page}&limit=10`);
  }

  crossSell(productId: number, limit = 4): Promise<CrossSellResponse> {
    return this.request('GET', `/api/catalog/cross-sell/product/${productId}?limit=${limit}`);
  }

  crossSellEvents(events: CrossSellEvent[]): Promise<void> {
    // Use sendBeacon when available for the impression batch on unload, fall back to fetch.
    const payload = JSON.stringify({ events });
    const url = `${this.apiUrl}/api/catalog/cross-sell/events`;
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      // sendBeacon doesn't accept custom headers, so we send a plain POST. The
      // server doesn't require auth on /events from the same domain because nginx
      // forwards the Bearer header; for cross-origin we fall back to fetch below.
      // Keep it simple: try beacon first, fetch on failure or cross-origin.
      try {
        const ok = navigator.sendBeacon(url, blob);
        if (ok) return Promise.resolve();
      } catch { /* fall through */ }
    }
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: payload,
      keepalive: true,
    }).then(() => undefined).catch(() => undefined);
  }
}

// ─── CSS Injection ───────────────────────────────────────────────────────────

function injectStyles(theme: ShimmerTheme) {
  if (document.getElementById('shimmer-sdk-styles')) return;

  const style = document.createElement('style');
  style.id = 'shimmer-sdk-styles';
  style.textContent = `
    .shimmer-widget * { box-sizing: border-box; margin: 0; padding: 0; }
    .shimmer-widget { font-family: ${theme.fontFamily}; font-size: 14px; line-height: 1.5; color: #1f2937; }

    /* Search overlay */
    .shimmer-search-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99998;
      display: flex; align-items: flex-start; justify-content: center; padding-top: 10vh;
      opacity: 0; transition: opacity 0.2s; pointer-events: none;
    }
    .shimmer-search-overlay.active { opacity: 1; pointer-events: auto; }
    .shimmer-search-panel {
      background: #fff; border-radius: ${theme.borderRadius}; width: 90%; max-width: 640px;
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
    .shimmer-search-item-price { font-weight: 700; color: ${theme.primaryColor}; white-space: nowrap; }
    .shimmer-search-empty { padding: 24px; text-align: center; color: #9ca3af; }

    /* Chat bubble */
    .shimmer-chat-bubble {
      position: fixed; ${theme.chatPosition === 'bottom-right' ? 'right: 20px' : 'left: 20px'}; bottom: 20px;
      width: 56px; height: 56px; border-radius: 50%; background: ${theme.primaryColor}; color: #fff;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 99997; border: none;
      transition: transform 0.2s;
    }
    .shimmer-chat-bubble:hover { transform: scale(1.1); }
    .shimmer-chat-bubble svg { width: 24px; height: 24px; }

    /* Chat window */
    .shimmer-chat-window {
      position: fixed; ${theme.chatPosition === 'bottom-right' ? 'right: 20px' : 'left: 20px'}; bottom: 88px;
      width: 380px; max-width: calc(100vw - 40px); height: 520px; max-height: calc(100vh - 120px);
      background: #fff; border-radius: ${theme.borderRadius}; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      z-index: 99998; display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; transform: translateY(20px) scale(0.95); transition: all 0.2s; pointer-events: none;
    }
    .shimmer-chat-window.active { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .shimmer-chat-header {
      padding: 16px; background: ${theme.primaryColor}; color: #fff;
      display: flex; justify-content: space-between; align-items: center;
    }
    .shimmer-chat-header h3 { font-size: 15px; font-weight: 600; }
    .shimmer-chat-close { background: none; border: none; color: #fff; cursor: pointer; font-size: 20px; line-height: 1; }
    .shimmer-chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .shimmer-chat-msg { max-width: 85%; padding: 10px 14px; border-radius: 16px; font-size: 13px; word-wrap: break-word; }
    .shimmer-chat-msg.user { align-self: flex-end; background: ${theme.primaryColor}; color: #fff; border-bottom-right-radius: 4px; }
    .shimmer-chat-msg.assistant { align-self: flex-start; background: #f3f4f6; color: #1f2937; border-bottom-left-radius: 4px; }
    .shimmer-chat-form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #e5e7eb; }
    .shimmer-chat-form input {
      flex: 1; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 24px;
      outline: none; font-size: 13px; font-family: inherit;
    }
    .shimmer-chat-form input:focus { border-color: ${theme.primaryColor}; }
    .shimmer-chat-form button {
      padding: 10px 16px; background: ${theme.primaryColor}; color: #fff; border: none;
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
    .shimmer-product-card-price { color: ${theme.primaryColor}; font-weight: 700; }

    /* Progress bar */
    .shimmer-progress { margin-top: 8px; }
    .shimmer-progress-bar { height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden; }
    .shimmer-progress-fill { height: 100%; background: ${theme.primaryColor}; transition: width 0.3s; border-radius: 2px; }
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
    /* ── Cross-sell widget ────────────────────────────────────────── */
    .sx-wrap {
      font-family: ${theme.fontFamily};
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
      font-family: ${theme.fontFamily};
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
  `;
  document.head.appendChild(style);
}

// ─── Widgets ─────────────────────────────────────────────────────────────────

class SearchWidget {
  private overlay!: HTMLElement;
  private input!: HTMLInputElement;
  private resultsEl!: HTMLElement;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionToken: string | null = null;

  constructor(
    private client: ShimmerClient,
    private labels: typeof LABELS['fr'],
    private searchSelector?: string,
  ) {
    this.createOverlay();
    this.hookExistingInputs();
  }

  private createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'shimmer-widget shimmer-search-overlay';
    this.overlay.innerHTML = `
      <div class="shimmer-search-panel">
        <input class="shimmer-search-input" type="text" placeholder="${this.labels.searchPlaceholder}" autocomplete="off" />
        <div class="shimmer-search-results"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.input = this.overlay.querySelector('.shimmer-search-input')!;
    this.resultsEl = this.overlay.querySelector('.shimmer-search-results')!;

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.input.addEventListener('input', () => this.onInput());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); this.open(); }
    });
  }

  private hookExistingInputs() {
    const selector = this.searchSelector || 'input[type="search"], input[data-shimmer-search]';
    document.querySelectorAll<HTMLInputElement>(selector).forEach((input) => {
      input.addEventListener('focus', (e) => {
        e.preventDefault();
        input.blur();
        this.open(input.value);
      });
    });
  }

  open(query?: string) {
    this.overlay.classList.add('active');
    this.input.value = query || '';
    setTimeout(() => this.input.focus(), 50);
    if (query) this.doSearch(query);
  }

  close() {
    this.overlay.classList.remove('active');
    this.resultsEl.innerHTML = '';
  }

  private onInput() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    const q = this.input.value.trim();
    if (q.length < 2) { this.resultsEl.innerHTML = ''; return; }
    this.debounceTimer = setTimeout(() => this.doSearch(q), 300);
  }

  private async doSearch(query: string) {
    try {
      const res = await this.client.search(query, this.sessionToken || undefined);
      this.sessionToken = res.sessionToken;
      this.renderResults(res.results);
    } catch {
      this.resultsEl.innerHTML = `<div class="shimmer-search-empty">Erreur de recherche</div>`;
    }
  }

  private renderResults(results: SearchResult[]) {
    if (!results.length) {
      this.resultsEl.innerHTML = `<div class="shimmer-search-empty">${this.labels.noResults}</div>`;
      return;
    }
    this.resultsEl.innerHTML = results.slice(0, 10).map((r) => `
      <div class="shimmer-search-item" data-id="${r.id}">
        ${r.imageUrl ? `<img src="${r.imageUrl}" alt="${esc(r.name)}" />` : '<div style="width:56px;height:56px;background:#f3f4f6;border-radius:8px"></div>'}
        <div class="shimmer-search-item-info">
          <div class="shimmer-search-item-name">${esc(r.name)}</div>
          <div class="shimmer-search-item-desc">${esc(r.category || '')} ${r.brand ? '· ' + esc(r.brand) : ''}</div>
        </div>
        <div class="shimmer-search-item-price">${r.price}${r.currency === 'EUR' ? '€' : ' ' + r.currency}</div>
      </div>
    `).join('');
  }

  destroy() {
    this.overlay.remove();
  }
}

class ChatWidget {
  private bubble!: HTMLElement;
  private window!: HTMLElement;
  private messagesEl!: HTMLElement;
  private formInput!: HTMLInputElement;
  private sendBtn!: HTMLButtonElement;
  private sessionToken: string | null = null;
  private history: ChatMessage[] = [];
  private knownCriteria: Record<string, string> | null = null;
  private mode: 'chat' | 'assist' = 'assist';
  private isOpen = false;

  constructor(
    private client: ShimmerClient,
    private labels: typeof LABELS['fr'],
  ) {
    this.createBubble();
    this.createWindow();
  }

  private createBubble() {
    this.bubble = document.createElement('button');
    this.bubble.className = 'shimmer-widget shimmer-chat-bubble';
    this.bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;
    this.bubble.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.bubble);
  }

  private createWindow() {
    this.window = document.createElement('div');
    this.window.className = 'shimmer-widget shimmer-chat-window';
    this.window.innerHTML = `
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
    `;
    document.body.appendChild(this.window);

    this.messagesEl = this.window.querySelector('.shimmer-chat-messages')!;
    this.formInput = this.window.querySelector('.shimmer-chat-form input')!;
    this.sendBtn = this.window.querySelector('.shimmer-chat-form button')!;

    this.window.querySelector('.shimmer-chat-close')!.addEventListener('click', () => this.toggle());
    this.window.querySelector('.shimmer-chat-form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendMessage();
    });

    // Welcome message
    this.addMessage('assistant', this.labels.chatWelcome);
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.window.classList.toggle('active', this.isOpen);
    if (this.isOpen) setTimeout(() => this.formInput.focus(), 100);
  }

  private addMessage(role: 'user' | 'assistant', content: string, products?: SearchResult[], progress?: number) {
    const div = document.createElement('div');
    div.className = `shimmer-chat-msg ${role}`;
    let html = esc(content).replace(/\n/g, '<br>');

    if (products?.length) {
      html += `<div class="shimmer-products">${products.map((p) => `
        <div class="shimmer-product-card">
          ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${esc(p.name)}" />` : ''}
          <div class="shimmer-product-card-info">
            <div class="shimmer-product-card-name">${esc(p.name)}</div>
            <div class="shimmer-product-card-price">${p.price}${p.currency === 'EUR' ? '€' : ' ' + p.currency}</div>
          </div>
        </div>
      `).join('')}</div>`;
    }

    if (progress != null && progress > 0) {
      html += `<div class="shimmer-progress">
        <div class="shimmer-progress-bar"><div class="shimmer-progress-fill" style="width:${progress}%"></div></div>
        <div class="shimmer-progress-label">Qualification: ${progress}%</div>
      </div>`;
    }

    div.innerHTML = html;
    this.messagesEl.appendChild(div);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private showTyping(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'shimmer-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    this.messagesEl.appendChild(div);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    return div;
  }

  private async sendMessage() {
    const msg = this.formInput.value.trim();
    if (!msg) return;

    this.formInput.value = '';
    this.sendBtn.disabled = true;
    this.addMessage('user', msg);
    this.history.push({ role: 'user', content: msg });

    // Create streaming message bubble
    const msgDiv = document.createElement('div');
    msgDiv.className = 'shimmer-chat-msg assistant';
    msgDiv.innerHTML = '<span class="shimmer-typing"><span></span><span></span><span></span></span>';
    this.messagesEl.appendChild(msgDiv);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;

    let fullText = '';
    let metaData: any = null;

    this.client.assistStream(
      msg,
      {
        onToken: (text: string) => {
          if (msgDiv.querySelector('.shimmer-typing')) {
            msgDiv.innerHTML = ''; // Remove typing indicator on first token
          }
          fullText += text;
          // Render with bold support
          msgDiv.innerHTML = fullText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
          this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        },
        onMeta: (meta: any) => {
          metaData = meta;
          this.knownCriteria = meta.knownCriteria || this.knownCriteria;

          // Show suggestions as clickable buttons
          if (meta.suggestedQuestions?.length) {
            this.renderSuggestions(meta.suggestedQuestions);
          }
        },
        onDone: (text: string) => {
          fullText = text || fullText;
          // Final render with products
          let html = esc(fullText).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

          if (metaData?.highlightedProducts?.length) {
            html += `<div class="shimmer-products">${metaData.highlightedProducts.map((p: any) => `
              <div class="shimmer-product-card">
                <div class="shimmer-product-card-info">
                  <div class="shimmer-product-card-name">${esc(p.name)}</div>
                  <div style="font-size:11px;color:#6b7280">${esc(p.brand)}</div>
                  <div class="shimmer-product-card-price">${p.price}</div>
                </div>
              </div>
            `).join('')}</div>`;
          }

          if (metaData?.qualification?.score > 0) {
            html += `<div class="shimmer-progress">
              <div class="shimmer-progress-bar"><div class="shimmer-progress-fill" style="width:${metaData.qualification.score}%"></div></div>
              <div class="shimmer-progress-label">Qualification: ${metaData.qualification.score}%</div>
            </div>`;
          }

          msgDiv.innerHTML = html;
          this.history.push({ role: 'assistant', content: fullText });
          this.sendBtn.disabled = false;
          this.formInput.focus();
          this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        },
        onError: (err: string) => {
          msgDiv.innerHTML = `Erreur: ${esc(err)}`;
          this.sendBtn.disabled = false;
          this.formInput.focus();
        },
      },
      this.sessionToken || undefined,
      this.history.slice(-8),
      this.knownCriteria || undefined,
    );
  }

  private renderSuggestions(suggestions: string[]) {
    // Remove existing suggestions
    this.messagesEl.querySelectorAll('.shimmer-suggestions').forEach(el => el.remove());

    const div = document.createElement('div');
    div.className = 'shimmer-suggestions';
    div.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;padding:4px 0;';
    for (const s of suggestions) {
      const btn = document.createElement('button');
      btn.textContent = s;
      btn.style.cssText = 'padding:6px 12px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;font-size:12px;cursor:pointer;font-family:inherit;transition:background 0.15s;';
      btn.addEventListener('mouseenter', () => { btn.style.background = '#f3f4f6'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
      btn.addEventListener('click', () => {
        this.formInput.value = s;
        this.sendMessage();
        div.remove();
      });
      div.appendChild(btn);
    }
    this.messagesEl.appendChild(div);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  destroy() {
    this.bubble.remove();
    this.window.remove();
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function esc(s: string): string {
  const el = document.createElement('span');
  el.textContent = s;
  return el.innerHTML;
}

// ─── Cross-sell Widget ───────────────────────────────────────────────────────

const CROSS_SELL_ROLE_LABELS: Record<CrossSellRole, string> = {
  apero: 'Apéritif',
  repas: 'Repas',
  dessert: 'Dessert',
  decouverte: 'Découverte',
  cadeau: 'Cadeau',
  accessoire: 'Accessoire',
  complement: 'À associer',
};

// Generate/persist an anonymous session id so the same browser tab/user is
// tracked consistently across events. Stored in localStorage with a 30-day
// rolling window so analytics don't double-count the same session.
const SESSION_STORAGE_KEY = 'shimmer_xs_sid';
const SESSION_MAX_AGE_MS = 30 * 86_400_000;

function getOrCreateSessionId(): string {
  if (typeof localStorage === 'undefined') return 'no-storage-' + Math.random().toString(36).slice(2);
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.ts && Date.now() - parsed.ts < SESSION_MAX_AGE_MS) {
        // Refresh timestamp on use
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ id: parsed.id, ts: Date.now() }));
        return parsed.id;
      }
    }
  } catch { /* fall through to new id */ }
  const id = 'xs-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ id, ts: Date.now() }));
  } catch { /* ignore */ }
  return id;
}

// Attribution window: a cross-sell click "earns" a view_target / purchase event
// when the visitor lands on the recommended product within this duration.
const INTENT_STORAGE_KEY = 'shimmer_xs_intent';
const INTENT_TTL_MS = 30 * 60 * 1000;     // 30 min

function getIntents(): CrossSellIntent[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INTENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((i: CrossSellIntent) => i && typeof i === 'object' && now - i.ts < INTENT_TTL_MS);
  } catch { return []; }
}

function setIntents(intents: CrossSellIntent[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    // Cap at 20 to keep storage small. Most recent first.
    const trimmed = intents.slice(0, 20);
    localStorage.setItem(INTENT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

function recordIntent(intent: CrossSellIntent): void {
  const all = getIntents();
  // Dedupe by target_id (a more recent click overwrites the older one)
  const filtered = all.filter(i => i.target_id !== intent.target_id);
  setIntents([intent, ...filtered]);
}

function popIntentsForProduct(productId: number): CrossSellIntent[] {
  const all = getIntents();
  const matched = all.filter(i => i.target_id === productId);
  if (matched.length === 0) return [];
  const remaining = all.filter(i => i.target_id !== productId);
  setIntents(remaining);
  return matched;
}

class CrossSellWidget {
  private client: ShimmerClient;
  private opts: Required<CrossSellOptions>;
  private mounted = new WeakSet<Element>();
  private sessionId: string;
  private eventQueue: CrossSellEvent[] = [];
  private flushTimer: number | null = null;

  constructor(client: ShimmerClient, opts: CrossSellOptions = {}) {
    this.client = client;
    this.opts = {
      selector: opts.selector ?? '[data-shimmer-crosssell]',
      limit: Math.min(Math.max(opts.limit ?? 4, 1), 12),
      title: opts.title ?? 'On a aussi pensé à',
      onProductClick: opts.onProductClick ?? (() => {}),
      productUrl: opts.productUrl ?? null,
    };
    this.sessionId = getOrCreateSessionId();
  }

  /** Queue an event for batched ingestion. Flushed every 1.5 s, on widget
   *  unmount, and on page unload via navigator.sendBeacon. */
  private trackEvent(ev: Omit<CrossSellEvent, 'session_id'>): void {
    this.eventQueue.push({ ...ev, session_id: this.sessionId });
    if (this.flushTimer === null && typeof window !== 'undefined') {
      this.flushTimer = window.setTimeout(() => this.flushEvents(), 1500);
    }
  }

  private flushEvents(): void {
    if (this.flushTimer !== null) {
      if (typeof window !== 'undefined') window.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.eventQueue.length === 0) return;
    const batch = this.eventQueue.splice(0, this.eventQueue.length);
    this.client.crossSellEvents(batch).catch(() => { /* silent: never block UX */ });
  }

  /** Scan the DOM for mount points and render cross-sell cards into each. */
  async render(): Promise<void> {
    const nodes = document.querySelectorAll(this.opts.selector);
    await Promise.all([...nodes].map((el) => this.mount(el)));
  }

  /** Render cross-sells into a specific element with an explicit product id. */
  async renderInto(target: Element | string, productId: number): Promise<void> {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    el.setAttribute('data-shimmer-crosssell', String(productId));
    await this.mount(el);
  }

  private async mount(el: Element): Promise<void> {
    if (this.mounted.has(el)) return;
    this.mounted.add(el);

    const rawId = el.getAttribute('data-shimmer-crosssell');
    const productId = Number(rawId);
    if (!Number.isFinite(productId) || productId <= 0) return;

    el.classList.add('shimmer-widget', 'sx-wrap');
    el.innerHTML = `
      <p class="sx-title">${esc(this.opts.title)}</p>
      <div class="sx-loading">
        <div class="sx-skel"></div><div class="sx-skel"></div>
        <div class="sx-skel"></div><div class="sx-skel"></div>
      </div>
    `;

    try {
      const data = await this.client.crossSell(productId, this.opts.limit);
      if (!data.items.length) {
        el.innerHTML = ''; // silent: no recos available
        return;
      }
      this.renderCards(el, data);
    } catch {
      el.innerHTML = ''; // silent failure
    }
  }

  private renderCards(container: Element, data: CrossSellResponse): void {
    const tag = this.opts.productUrl ? 'a' : 'div';
    const cards = data.items
      .map((item) => {
        const url = this.opts.productUrl
          ? this.opts.productUrl
              .replace('{id}', String(item.product.id))
              .replace('{sku}', item.product.sku || '')
          : null;
        const href = url ? `href="${esc(url)}"` : '';
        const img = item.product.imageUrl
          ? `<img class="sx-img" src="${esc(item.product.imageUrl)}" alt="${esc(item.product.name)}" loading="lazy" />`
          : `<div class="sx-img-placeholder">◇</div>`;
        const roleLabel = CROSS_SELL_ROLE_LABELS[item.role] || item.role;
        const brand = item.product.brand ? `<p class="sx-brand">${esc(item.product.brand)}</p>` : '';
        return `
          <${tag} ${href} class="sx-card" data-product-id="${item.product.id}">
            <span class="sx-chip sx-chip-${esc(item.role)}">${esc(roleLabel)}</span>
            ${img}
            <p class="sx-name">${esc(item.product.name)}</p>
            ${brand}
            <p class="sx-reason">« ${esc(item.reason)} »</p>
            <div class="sx-foot">
              <span class="sx-price">${esc(item.product.price)}€</span>
              <button type="button" class="sx-add" data-add="${item.product.id}">Ajouter</button>
            </div>
          </${tag}>
        `;
      })
      .join('');

    container.innerHTML = `
      <p class="sx-title">${esc(this.opts.title)}</p>
      <div class="sx-grid">${cards}</div>
    `;

    // Map cards back to items + record position for analytics
    const cardsArr = Array.from(container.querySelectorAll<HTMLElement>('.sx-card'));
    cardsArr.forEach((card, position) => {
      const id = Number(card.dataset.productId);
      const item = data.items.find((it) => it.product.id === id);
      if (!item) return;

      // Click on the card body (not on Ajouter) — tracked as a "click" event
      card.addEventListener('click', (e) => {
        if ((e.target as Element).closest('.sx-add')) return;
        this.trackEvent({
          product_id: data.reference.id,
          target_id: item.product.id,
          role: item.role,
          event_type: 'click',
          position,
        });
        // Record attribution intent so Shimmer.trackProductView() can fire view_target
        // when the visitor lands on the target product within the TTL.
        recordIntent({
          ref_id: data.reference.id,
          target_id: item.product.id,
          role: item.role,
          position,
          ts: Date.now(),
        });
        this.flushEvents();
        this.opts.onProductClick(item);
      });
    });
    container.querySelectorAll<HTMLElement>('.sx-add').forEach((btn) => {
      const id = Number(btn.dataset.add);
      const item = data.items.find((it) => it.product.id === id);
      if (!item) return;
      const position = cardsArr.findIndex(c => c.dataset.productId === String(id));
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.trackEvent({
          product_id: data.reference.id,
          target_id: item.product.id,
          role: item.role,
          event_type: 'add',
          position,
        });
        recordIntent({
          ref_id: data.reference.id,
          target_id: item.product.id,
          role: item.role,
          position,
          ts: Date.now(),
        });
        this.flushEvents();
        this.opts.onProductClick(item);
      });
    });

    // Impression tracking: fire once per card when ≥50% visible for ≥300ms
    if (typeof IntersectionObserver !== 'undefined') {
      const seen = new WeakSet<Element>();
      const dwellTimers = new Map<Element, number>();
      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (seen.has(entry.target)) continue;
          const card = entry.target as HTMLElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (dwellTimers.has(card)) continue;
            const timer = window.setTimeout(() => {
              seen.add(card);
              dwellTimers.delete(card);
              io.unobserve(card);
              const id = Number(card.dataset.productId);
              const item = data.items.find((it) => it.product.id === id);
              if (!item) return;
              const position = cardsArr.indexOf(card);
              this.trackEvent({
                product_id: data.reference.id,
                target_id: item.product.id,
                role: item.role,
                event_type: 'impression',
                position,
              });
            }, 300);
            dwellTimers.set(card, timer);
          } else {
            const t = dwellTimers.get(card);
            if (t !== undefined) { window.clearTimeout(t); dwellTimers.delete(card); }
          }
        }
      }, { threshold: [0, 0.5, 1] });
      cardsArr.forEach((c) => io.observe(c));
    }

    // Flush on page hide/unload to capture last events
    if (typeof window !== 'undefined') {
      const flush = () => this.flushEvents();
      window.addEventListener('pagehide', flush, { once: false });
      window.addEventListener('beforeunload', flush, { once: false });
    }
  }
}

// ─── Main Class ──────────────────────────────────────────────────────────────

export class Shimmer {
  private static instance: Shimmer | null = null;
  private client: ShimmerClient;
  private searchWidget: SearchWidget | null = null;
  private chatWidget: ChatWidget | null = null;
  private config: ShimmerConfig;
  private theme: ShimmerTheme;
  private labels: typeof LABELS['fr'];

  private constructor(config: ShimmerConfig) {
    this.config = config;
    this.theme = { ...DEFAULT_THEME, ...config.theme };
    this.labels = LABELS[config.locale || 'fr'];
    this.client = new ShimmerClient(config.apiUrl, config.apiKey);
  }

  /**
   * Initialize Shimmer SDK. Creates search overlay + chat widget.
   */
  static init(config: ShimmerConfig): Shimmer {
    if (Shimmer.instance) Shimmer.instance.destroy();

    const shimmer = new Shimmer(config);
    injectStyles(shimmer.theme);
    shimmer.searchWidget = new SearchWidget(shimmer.client, shimmer.labels, config.searchSelector);
    shimmer.chatWidget = new ChatWidget(shimmer.client, shimmer.labels);
    Shimmer.instance = shimmer;
    return shimmer;
  }

  /** Convenience accessor for `Shimmer.chat()` — allows `Shimmer.assistant.chat(msg)`. */
  static get assistant() {
    return { chat: Shimmer.chat, reset: Shimmer.resetChat };
  }

  /** Programmatically trigger a search. */
  static search(query: string): Promise<SearchResponse> {
    if (!Shimmer.instance) throw new Error('Shimmer not initialized. Call Shimmer.init() first.');
    return Shimmer.instance.client.search(query);
  }

  /** Open the search overlay. */
  static openSearch(query?: string) {
    Shimmer.instance?.searchWidget?.open(query);
  }

  // Conversation state for assistant
  private assistHistory: ChatMessage[] = [];
  private assistKnownCriteria: Record<string, string> = {};
  private assistSessionToken?: string;

  /** Send a message to the AI assistant (stateful — remembers conversation). */
  static async chat(message: string): Promise<AssistResponse> {
    if (!Shimmer.instance) throw new Error('Shimmer not initialized. Call Shimmer.init() first.');
    const inst = Shimmer.instance;

    // Add user message to history
    inst.assistHistory.push({ role: 'user', content: message });

    const res = await inst.client.assist(
      message,
      inst.assistSessionToken,
      inst.assistHistory.slice(-6), // Keep last 6 for context
      inst.assistKnownCriteria,
    );

    // Update state from response
    inst.assistSessionToken = res.sessionToken;
    if (res.knownCriteria) {
      inst.assistKnownCriteria = { ...inst.assistKnownCriteria, ...res.knownCriteria };
    }
    // Add assistant response to history
    inst.assistHistory.push({ role: 'assistant', content: res.message });

    return res;
  }

  /** Reset assistant conversation state. */
  static resetChat() {
    if (!Shimmer.instance) return;
    Shimmer.instance.assistHistory = [];
    Shimmer.instance.assistKnownCriteria = {};
    Shimmer.instance.assistSessionToken = undefined;
  }

  /** Get review stats for a product or store. */
  static reviewStats(productId?: number): Promise<ReviewStats> {
    if (!Shimmer.instance) throw new Error('Shimmer not initialized. Call Shimmer.init() first.');
    return Shimmer.instance.client.reviewStats(productId);
  }

  /** Cross-sell namespace — render product-page recommendations. */
  static crossSell = {
    /** Render cards into every `[data-shimmer-crosssell="<id>"]` on the page.
     *  Returns a promise that resolves when all mounts are populated. */
    async render(opts: CrossSellOptions = {}): Promise<void> {
      if (!Shimmer.instance) throw new Error('Shimmer not initialized. Call Shimmer.init() first.');
      const widget = new CrossSellWidget(Shimmer.instance.client, opts);
      await widget.render();
    },

    /** Mount the widget on a specific element with an explicit product id. */
    async renderInto(target: Element | string, productId: number, opts: CrossSellOptions = {}): Promise<void> {
      if (!Shimmer.instance) throw new Error('Shimmer not initialized. Call Shimmer.init() first.');
      const widget = new CrossSellWidget(Shimmer.instance.client, opts);
      await widget.renderInto(target, productId);
    },

    /** Fetch raw cross-sell data without rendering anything. */
    fetch(productId: number, limit = 4): Promise<CrossSellResponse> {
      if (!Shimmer.instance) throw new Error('Shimmer not initialized. Call Shimmer.init() first.');
      return Shimmer.instance.client.crossSell(productId, limit);
    },

    /** Call on every product page load. If the visitor arrives here from a recent
     *  cross-sell click/add (intent stored in localStorage, 30 min TTL), fires a
     *  view_target event so the dashboard knows the recommendation worked. */
    trackProductView(productId: number): void {
      if (!Shimmer.instance || !Number.isFinite(productId) || productId <= 0) return;
      const intents = popIntentsForProduct(productId);
      if (intents.length === 0) return;
      const sessionId = getOrCreateSessionId();
      const events: CrossSellEvent[] = intents.map((i) => ({
        product_id: i.ref_id,
        target_id: i.target_id,
        role: i.role,
        event_type: 'view_target',
        session_id: sessionId,
        position: i.position,
        metadata: { intent_age_ms: Date.now() - i.ts },
      }));
      Shimmer.instance.client.crossSellEvents(events).catch(() => undefined);
    },

    /** Call at checkout confirmation. For each purchased product id, attribute
     *  any open cross-sell intent within the TTL — fires a `purchase` event
     *  on the matching (ref_id, target_id) pairs. */
    trackPurchase(productIds: number[]): void {
      if (!Shimmer.instance) return;
      const sessionId = getOrCreateSessionId();
      const events: CrossSellEvent[] = [];
      for (const pid of productIds) {
        if (!Number.isFinite(pid) || pid <= 0) continue;
        const intents = popIntentsForProduct(pid);
        for (const i of intents) {
          events.push({
            product_id: i.ref_id,
            target_id: i.target_id,
            role: i.role,
            event_type: 'purchase',
            session_id: sessionId,
            position: i.position,
            metadata: { intent_age_ms: Date.now() - i.ts },
          });
        }
      }
      if (events.length === 0) return;
      Shimmer.instance.client.crossSellEvents(events).catch(() => undefined);
    },
  };

  /** Tear down all widgets and clean up. */
  static destroy() {
    Shimmer.instance?.destroy();
  }

  destroy() {
    this.searchWidget?.destroy();
    this.chatWidget?.destroy();
    document.getElementById('shimmer-sdk-styles')?.remove();
    Shimmer.instance = null;
  }
}
