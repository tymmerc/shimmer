'use client';

import { useEffect, useState } from 'react';

interface Questionnaire {
  token: string;
  customerName: string | null;
  storeName: string;
  orderNumber: string;
  products: Array<{ id: number; name: string; category: string | null; imageUrl: string | null }>;
  status: string;
  alreadySubmitted: boolean;
}

type Step = 'loading' | 'form' | 'submitting' | 'success' | 'error';

export function ReviewForm() {
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('loading');
  const [data, setData] = useState<Questionnaire | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [overall, setOverall] = useState(0);
  const [productRatings, setProductRatings] = useState<Record<number, number>>({});
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get('token') ?? url.pathname.split('/').pop() ?? null;
    if (!t || t.length < 5) {
      setError('Lien d\'avis invalide.');
      setStep('error');
      return;
    }
    setToken(t);
    void load(t);
  }, []);

  async function load(t: string): Promise<void> {
    try {
      const res = await fetch(`/shimmer/api/public/reviews/${encodeURIComponent(t)}`);
      if (res.status === 404) throw new Error('Ce lien d\'avis n\'existe pas ou a déjà été utilisé.');
      if (res.status === 410) throw new Error('Ce lien d\'avis a expiré (au-delà de 30 jours).');
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const d = (await res.json()) as Questionnaire;
      setData(d);
      if (d.alreadySubmitted) {
        setStep('success');
        return;
      }
      setStep('form');
    } catch (e) {
      setError((e as Error).message);
      setStep('error');
    }
  }

  async function submit(): Promise<void> {
    if (!token || !data) return;
    if (overall < 1) {
      setError('Donnez d\'abord une note globale (1 à 5 étoiles).');
      return;
    }
    setError(null);
    setStep('submitting');
    try {
      const payload: Record<string, unknown> = {
        overallRating: overall,
      };
      const prs = Object.entries(productRatings)
        .filter(([, v]) => v > 0)
        .map(([productId, rating]) => ({ productId: Number(productId), rating }));
      if (prs.length > 0) payload.productRatings = prs;
      if (deliveryRating > 0) payload.deliveryRating = deliveryRating;
      if (serviceRating > 0) payload.serviceRating = serviceRating;
      if (title.trim()) payload.title = title.trim();
      if (comment.trim()) payload.comment = comment.trim();
      if (wouldRecommend !== null) payload.wouldRecommend = wouldRecommend;

      const res = await fetch(`/shimmer/api/public/reviews/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Erreur ${res.status}` }));
        throw new Error((err as { error?: string }).error ?? `Erreur ${res.status}`);
      }
      setStep('success');
    } catch (e) {
      setError((e as Error).message);
      setStep('form');
    }
  }

  if (step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/45">Chargement…</div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-400">Erreur</div>
          <h1 className="mt-4 font-display text-3xl tracking-editorial text-paper">{error}</h1>
          <p className="mt-4 text-sm text-paper/65">
            Vérifiez le lien dans votre email ou contactez la boutique.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'success' && data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid">Merci</div>
          <h1 className="mt-4 font-display text-4xl tracking-editorial text-paper">
            Votre avis est <span className="italic text-acid">enregistré</span>.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-paper/70">
            Merci d'avoir pris le temps. Votre retour va aider {data.storeName} à mieux servir les prochains
            clients. Bonne journée.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 md:px-8">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-acid">
        {data.storeName} · Commande {data.orderNumber}
      </div>
      <h1 className="font-display text-4xl tracking-editorial text-paper md:text-5xl">
        {data.customerName ? `${data.customerName}, ` : ''}votre <span className="italic text-acid">avis compte</span>.
      </h1>
      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-paper/70">
        2 minutes, c'est tout. Un mot, quelques étoiles, et vous aidez le prochain client à choisir.
      </p>

      {error && step === 'form' && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section className="mt-10 space-y-8">
        <Block label="Note globale">
          <Stars value={overall} onChange={setOverall} large />
        </Block>

        {data.products.length > 0 && (
          <Block label={`Vos produits (${data.products.length})`}>
            <div className="space-y-3">
              {data.products.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-4 rounded-xl border border-paper/10 bg-paper/[0.02] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-base text-paper">{p.name}</div>
                    {p.category && (
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">{p.category}</div>
                    )}
                  </div>
                  <Stars
                    value={productRatings[p.id] ?? 0}
                    onChange={v => setProductRatings({ ...productRatings, [p.id]: v })}
                  />
                </div>
              ))}
            </div>
          </Block>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Block label="Livraison">
            <Stars value={deliveryRating} onChange={setDeliveryRating} />
          </Block>
          <Block label="Service client">
            <Stars value={serviceRating} onChange={setServiceRating} />
          </Block>
        </div>

        <Block label="Un titre (optionnel)">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Très satisfait, livraison express..."
            maxLength={200}
            className="w-full rounded-lg border border-paper/15 bg-black/40 px-4 py-3 text-sm text-paper outline-none placeholder-paper/35 focus:border-acid"
          />
        </Block>

        <Block label="Votre avis (optionnel)">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Qu'est-ce qui vous a plu ? Ce qui pourrait être amélioré ?"
            className="w-full rounded-lg border border-paper/15 bg-black/40 px-4 py-3 text-sm text-paper outline-none placeholder-paper/35 focus:border-acid"
          />
        </Block>

        <Block label="Recommanderiez-vous cette boutique ?">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setWouldRecommend(true)}
              className={`rounded-full border px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition ${
                wouldRecommend === true
                  ? 'border-acid bg-acid/15 text-acid'
                  : 'border-paper/20 text-paper/70 hover:border-paper/40'
              }`}
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => setWouldRecommend(false)}
              className={`rounded-full border px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition ${
                wouldRecommend === false
                  ? 'border-rose-400 bg-rose-400/15 text-rose-300'
                  : 'border-paper/20 text-paper/70 hover:border-paper/40'
              }`}
            >
              Non
            </button>
          </div>
        </Block>

        <div className="pt-4">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={step === 'submitting' || overall < 1}
            className="rounded-full bg-acid px-8 py-4 font-sans text-sm uppercase tracking-[0.18em] text-ink transition hover:bg-acid-deep disabled:opacity-40"
          >
            {step === 'submitting' ? 'Envoi…' : 'Envoyer mon avis'}
          </button>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">
            Votre avis sera modéré sous 24h.
          </p>
        </div>
      </section>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">{label}</label>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Stars({ value, onChange, large }: { value: number; onChange: (v: number) => void; large?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          className={`transition ${large ? 'text-4xl' : 'text-2xl'} ${
            n <= value ? 'text-acid' : 'text-paper/25 hover:text-paper/50'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
