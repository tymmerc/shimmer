/**
 * Tiny API helper for the admin app. Stores the bearer key in localStorage,
 * exposes typed wrappers over the Shimmer endpoints.
 */

const KEY_STORAGE = 'shimmer.admin.key';

export function getStoredKey(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(KEY_STORAGE) ?? '';
}

export function setStoredKey(key: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY_STORAGE, key);
}

export function clearStoredKey(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY_STORAGE);
}

const BASE = '/shimmer/api';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = getStoredKey();
  const headers = new Headers(init.headers ?? {});
  headers.set('Content-Type', 'application/json');
  if (key) headers.set('Authorization', `Bearer ${key}`);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    const message = typeof body === 'object' && body !== null && 'error' in body
      ? String((body as { error: unknown }).error)
      : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return (await res.json()) as T;
}

// ─────────────────────────────────────────────────────────────
// Endpoints
// ─────────────────────────────────────────────────────────────

export interface Store {
  id: number;
  name: string;
  config?: Record<string, unknown>;
}

export interface MailRecord {
  id: number;
  fromAddr: string;
  subject: string;
  body?: string;
  category: string;
  urgency: string;
  sentiment: string;
  draftResponse?: string;
  status?: string;
  createdAt: string;
  extractedData?: Record<string, unknown>;
}

export interface SAVTicket {
  id: number;
  requestNumber: string;
  orderId: number;
  customerId: number;
  type: string;
  status: string;
  description?: string;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string | null;
  customer?: { id: number; email: string; firstName: string | null; lastName: string | null };
  order?: { id: number; orderNumber: string; totalAmount: string; status: string };
}

export interface AbandonedCart {
  id: number;
  customerId: number | null;
  customerEmail: string | null;
  items: Array<{ name: string; price: number; quantity?: number }>;
  totalAmount: string;
  abandonedAt: string;
  reminder1At: string | null;
  reminder2At: string | null;
  recoveredAt: string | null;
  recoveredAmount: string | null;
  status: string;
  promoCode: string | null;
}

export interface OutboundCampaign {
  id: number;
  prompt: string;
  format: string;
  audience: string | null;
  content: unknown;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface OrderRecord {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: string;
  orderedAt: string;
  deliveredAt: string | null;
  customer?: { id: number; firstName: string | null; lastName: string | null; email: string };
}

export interface SentEmail {
  id: number;
  toAddr: string;
  fromAddr: string;
  subject: string;
  bodyText: string | null;
  tag: string | null;
  relatedEntity: string | null;
  relatedId: number | null;
  provider: string;
  status: string;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
}

export interface ReviewRecord {
  id: number;
  rating?: number;
  comment?: string;
  status: string;
  isPublic?: boolean;
  createdAt: string;
  customer?: { firstName: string | null; lastName: string | null; email: string };
}

// API namespace
export const api = {
  // Store ping (also validates the key)
  async me(): Promise<{ id: number; name: string; config: Record<string, unknown> }> {
    return request('/stores/me/config').then((data: unknown) => {
      const r = data as { id?: number; name?: string; config?: Record<string, unknown> };
      return { id: r.id ?? 0, name: r.name ?? '', config: r.config ?? {} };
    });
  },

  // Mail
  mail: {
    async classify(input: { fromAddr: string; subject: string; body: string }): Promise<MailRecord> {
      return request('/mail/classify', { method: 'POST', body: JSON.stringify(input) });
    },
    async list(): Promise<{ mails: MailRecord[] }> {
      return request('/mail/queue');
    },
  },

  // SAV
  sav: {
    async list(filter?: { status?: string; type?: string }): Promise<{ tickets: SAVTicket[]; byStatus: Record<string, number> }> {
      const q = new URLSearchParams();
      if (filter?.status) q.set('status', filter.status);
      if (filter?.type) q.set('type', filter.type);
      const qs = q.toString();
      return request(`/sav/tickets${qs ? `?${qs}` : ''}`);
    },
    async patch(id: number, body: { status?: string; resolution?: string; refundAmount?: number }): Promise<{ ticket: SAVTicket }> {
      return request(`/sav/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    },
    async stats(): Promise<{ total: number; open: number; urgent: number; resolvedThisMonth: number; avgResolutionHours: number }> {
      return request('/sav/stats');
    },
  },

  // Carts
  carts: {
    async list(): Promise<{ carts: AbandonedCart[] }> {
      return request('/cart-recovery/carts');
    },
    async sendReminder(id: number): Promise<{ cart: AbandonedCart; reminder: { step: number; subject: string; body: string } }> {
      return request(`/cart-recovery/${id}/send-reminder`, { method: 'POST', body: '{}' });
    },
    async recover(id: number, recoveredAmount?: number): Promise<{ cart: AbandonedCart }> {
      return request(`/cart-recovery/${id}/recover`, { method: 'POST', body: JSON.stringify({ recoveredAmount }) });
    },
    async stats(): Promise<{
      total: number;
      recovered: number;
      recoveryRate: number;
      recoveredAfterEmail1: number;
      recoveredAfterEmail2: number;
      totalAbandonedEUR: number;
      totalRecoveredEUR: number;
    }> {
      return request('/cart-recovery/stats');
    },
  },

  // Orders
  orders: {
    async timeline(id: number): Promise<{ order: OrderRecord & { shipments: unknown[] }; events: Array<{ at: string; label: string; status: string; channel?: string; message: string }> }> {
      return request(`/orders/${id}/timeline`);
    },
    async patchStatus(id: number, body: { status: string; carrier?: string; trackingNumber?: string }): Promise<{ order: OrderRecord; notification: { channel: string; message: string } }> {
      return request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) });
    },
    async stats(): Promise<{ total: number; byStatus: Record<string, number> }> {
      return request('/orders/tracking-stats');
    },
  },

  // Outbound campaigns
  outbound: {
    async list(filter?: { status?: string; format?: string }): Promise<{ campaigns: OutboundCampaign[] }> {
      const q = new URLSearchParams();
      if (filter?.status) q.set('status', filter.status);
      if (filter?.format) q.set('format', filter.format);
      const qs = q.toString();
      return request(`/outbound/campaigns${qs ? `?${qs}` : ''}`);
    },
    async patch(id: number, body: { status?: string; scheduledAt?: string }): Promise<{ campaign: OutboundCampaign }> {
      return request(`/outbound/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    },
    async generate(prompt: string, format?: string): Promise<{ campaign: OutboundCampaign }> {
      return request('/outbound/generate', { method: 'POST', body: JSON.stringify({ prompt, ...(format ? { format } : {}) }) });
    },
    async stats(): Promise<{ total: number; byFormat: Record<string, number>; byStatus: Record<string, number> }> {
      return request('/outbound/stats');
    },
  },

  // Emails log
  emails: {
    async list(tag?: string): Promise<{ emails: SentEmail[] }> {
      return request(`/emails${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`);
    },
    async stats(): Promise<{ total: number; mockSent: number; realSent: number; failed: number; byTag: Record<string, number> }> {
      return request('/emails/stats/summary');
    },
  },
};
