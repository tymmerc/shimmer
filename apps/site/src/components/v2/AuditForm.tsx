'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { AUDIT_EMAIL } from '@/lib/audit';
import {
  MESSAGE_MAX,
  PLATFORMS,
  auditMailtoWith,
  buildPayload,
  firstInvalidField,
  pingLeads,
  submitLead,
  validateLead,
  type FieldErrors,
  type LeadDraft,
  type LeadField,
} from '@/lib/leads';
import { CopyEmail } from './CopyEmail';

type Status = 'idle' | 'sending' | 'error';

const EMPTY_DRAFT: LeadDraft = { shopUrl: '', email: '', platform: null, message: '' };

const LABEL = 'block font-mono text-[12px] uppercase tracking-[0.16em] text-paper/70';

// 16 px minimum sur mobile : en dessous, iOS zoome sur le champ au focus.
function fieldClass(invalid: boolean): string {
  return clsx(
    'mt-2.5 block w-full rounded-xl border bg-ink/30 px-4 py-3.5 text-base text-paper outline-none transition-colors duration-200 placeholder:text-paper/35 md:text-[17px]',
    invalid ? 'border-rose-300/70 focus:border-rose-300' : 'border-paper/20 hover:border-paper/35 focus:border-paper/60',
  );
}

function withoutField(errors: FieldErrors, field: LeadField): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([key]) => key !== field)) as FieldErrors;
}

/**
 * Le formulaire ne s'affiche que si l'API répond au ping : sur un site dont
 * l'API n'a pas encore la route, on garde l'e-mail seul (rien ne se perd).
 */
export function useLeadFormAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void pingLeads(controller.signal).then((ok) => {
      if (!controller.signal.aborted) setAvailable(ok);
    });
    return () => controller.abort();
  }, []);
  return available;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm leading-snug text-rose-300">
      {message}
    </p>
  );
}

/** Demande d'audit : boutique, e-mail, plateforme, un mot. Remplace le mailto seul. */
export function AuditForm() {
  const uid = useId();
  const idOf = (name: string) => `${uid}-${name}`;
  const errorIdOf = (field: LeadField) => `${uid}-${field}-error`;

  const [draft, setDraft] = useState<LeadDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const shownAt = useRef(0);
  const sending = useRef(false);
  const focusNext = useRef<LeadField | null>(null);
  const shopUrlRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const platformRef = useRef<HTMLFieldSetElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const websiteRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  // Heure d'affichage du formulaire : le serveur ignore un envoi trop rapide.
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  // Focus sur le premier champ à corriger, une fois les messages rendus.
  useEffect(() => {
    const field = focusNext.current;
    focusNext.current = null;
    if (!field) return;
    if (field === 'platform') {
      const group = platformRef.current;
      (group?.querySelector<HTMLInputElement>('input:checked') ?? group?.querySelector<HTMLInputElement>('input'))?.focus();
      return;
    }
    const refs = { shopUrl: shopUrlRef, email: emailRef, message: messageRef };
    refs[field].current?.focus();
  }, [errors]);

  useEffect(() => {
    if (sentTo !== null) confirmRef.current?.focus();
  }, [sentTo]);

  function update<K extends LeadField>(key: K, value: LeadDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => (e[key] === undefined ? e : withoutField(e, key)));
  }

  function showErrors(found: FieldErrors) {
    focusNext.current = firstInvalidField(found);
    setErrors(found);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const found = validateLead(draft);
    if (firstInvalidField(found)) {
      showErrors(found);
      return;
    }

    sending.current = true;
    setErrors({});
    setStatus('sending');
    const payload = buildPayload(draft, websiteRef.current?.value ?? '', Date.now() - shownAt.current);
    const result = await submitLead(payload);
    sending.current = false;

    if (result.kind === 'ok') {
      setStatus('idle');
      setSentTo(payload.email);
    } else if (result.kind === 'invalid') {
      setStatus('idle');
      showErrors(result.errors);
    } else {
      setStatus('error');
    }
  }

  const a11y = (field: LeadField) =>
    errors[field] ? { 'aria-invalid': true as const, 'aria-describedby': errorIdOf(field) } : {};

  return (
    <div>
      <div role="status" aria-live="polite" aria-atomic="true">
        {sentTo !== null ? (
          <motion.div
            ref={confirmRef}
            tabIndex={-1}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="outline-none"
          >
            <p className="max-w-[26ch] font-display text-[clamp(26px,3.4vw,46px)] leading-[1.1] tracking-tightest text-paper">
              C’est noté. Je vous réponds sous 24&nbsp;h, à{' '}
              <span className="italic text-acid [overflow-wrap:anywhere]">{sentTo}</span>.
            </p>
          </motion.div>
        ) : null}
      </div>

      {sentTo === null ? (
        <form
          noValidate
          onSubmit={onSubmit}
          aria-label="Demande d’audit"
          aria-busy={status === 'sending'}
          className="relative max-w-[920px]"
        >
          <p className="font-display text-[clamp(22px,2.4vw,32px)] leading-snug text-paper">
            Dites-moi où trouver votre boutique.
          </p>
          <p className="mt-2 text-pretty text-[15px] leading-relaxed text-paper/60 md:text-base">
            Gratuit, sans engagement, 30 minutes de restitution. Réponse sous 24&nbsp;h.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-6 md:mt-10 md:grid-cols-2 md:gap-y-8">
            <div>
              <label htmlFor={idOf('shop')} className={LABEL}>
                Adresse de la boutique
              </label>
              <input
                ref={shopUrlRef}
                id={idOf('shop')}
                name="shopUrl"
                type="text"
                inputMode="url"
                autoComplete="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                maxLength={300}
                placeholder="maboutique.fr"
                value={draft.shopUrl}
                onChange={(e) => update('shopUrl', e.target.value)}
                className={fieldClass(Boolean(errors.shopUrl))}
                {...a11y('shopUrl')}
              />
              <FieldError id={errorIdOf('shopUrl')} message={errors.shopUrl} />
            </div>

            <div>
              <label htmlFor={idOf('email')} className={LABEL}>
                Votre e-mail
              </label>
              <input
                ref={emailRef}
                id={idOf('email')}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                maxLength={255}
                placeholder="vous@maboutique.fr"
                value={draft.email}
                onChange={(e) => update('email', e.target.value)}
                className={fieldClass(Boolean(errors.email))}
                {...a11y('email')}
              />
              <FieldError id={errorIdOf('email')} message={errors.email} />
            </div>

            <fieldset ref={platformRef} className="min-w-0 md:col-span-2">
              <legend className={LABEL}>Plateforme</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <label key={p.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name={idOf('platform')}
                      value={p.value}
                      checked={draft.platform === p.value}
                      onChange={() => update('platform', p.value)}
                      className="peer sr-only"
                      {...a11y('platform')}
                    />
                    <span className="inline-flex items-center rounded-full border border-paper/20 px-4 py-2 text-[15px] text-paper/70 transition-colors duration-200 hover:border-paper/40 hover:text-paper peer-checked:border-paper/70 peer-checked:bg-paper/10 peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-paper/70">
                      {p.label}
                    </span>
                  </label>
                ))}
              </div>
              <FieldError id={errorIdOf('platform')} message={errors.platform} />
            </fieldset>

            <div className="md:col-span-2">
              <label htmlFor={idOf('message')} className={LABEL}>
                Un mot sur votre boutique <span className="text-paper/35">· facultatif</span>
              </label>
              <textarea
                ref={messageRef}
                id={idOf('message')}
                name="message"
                rows={3}
                maxLength={MESSAGE_MAX}
                placeholder="Ce que vous vendez, ce qui coince en ce moment…"
                value={draft.message}
                onChange={(e) => update('message', e.target.value)}
                className={clsx(fieldClass(Boolean(errors.message)), 'resize-y leading-relaxed')}
                {...a11y('message')}
              />
              <FieldError id={errorIdOf('message')} message={errors.message} />
            </div>
          </div>

          {/* Piège à robots : invisible et hors du parcours clavier. Un humain le laisse vide. */}
          <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
            <label htmlFor={idOf('website')}>Site web</label>
            <input
              ref={websiteRef}
              id={idOf('website')}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
              aria-hidden="true"
            />
          </div>

          <div className="mt-9 md:mt-10">
            <button
              type="submit"
              disabled={status === 'sending'}
              className="group inline-flex w-full items-center justify-center gap-3 whitespace-nowrap rounded-full bg-paper px-7 py-3.5 font-sans text-[15px] font-medium text-ink transition-colors duration-300 hover:bg-toxic-500 hover:text-paper disabled:cursor-wait disabled:opacity-70 disabled:hover:bg-paper sm:w-auto sm:min-w-[14.5rem] sm:py-4"
            >
              {status === 'sending' ? (
                'Envoi…'
              ) : (
                <>
                  Envoyer ma demande
                  <span
                    aria-hidden="true"
                    className="text-ink/50 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-1"
                  >
                    →
                  </span>
                </>
              )}
            </button>
            <p className="mt-3 text-sm text-paper/55">Vos coordonnées servent uniquement à vous répondre.</p>
          </div>

          <div aria-live="polite">
            {status === 'error' ? (
              <div className="mt-6 rounded-2xl border border-paper/15 bg-ink/40 p-5 md:p-6">
                <p className="text-[15px] leading-relaxed text-paper md:text-base">
                  L’envoi n’a pas marché. Écrivez-moi directement :
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <a
                    href={auditMailtoWith(draft)}
                    className="break-all font-display text-[clamp(20px,2.4vw,30px)] leading-tight text-paper underline decoration-acid/50 decoration-1 underline-offset-[0.2em] transition-colors hover:decoration-acid"
                  >
                    {AUDIT_EMAIL}
                  </a>
                  <CopyEmail />
                </div>
                <p className="mt-3 text-sm text-paper/55">Le lien ouvre un e-mail déjà rempli avec vos réponses.</p>
              </div>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
