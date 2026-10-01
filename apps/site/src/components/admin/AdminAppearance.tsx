'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { SectionHeader, Loading, ErrorBlock, Panel } from './AdminOverview';
import { AppearancePreview } from './AdminAppearancePreview';
import { AppearanceIntegrators } from './AdminAppearanceIntegrators';
import {
  type AppearanceForm,
  type AppearanceTheme,
  DEFAULT_FORM,
  RADIUS_MAX,
  RADIUS_MIN,
  STANDIN_RADIUS,
  formFromAppearance,
  isValidFont,
  normalizeHex,
  parseAppearance,
  payloadFromForm,
} from './appearance';

interface StoreConfig {
  id: number;
  config: Record<string, unknown>;
}

const CONFIG_URL = '/shimmer/api/stores/me/config';

const THEME_OPTIONS: { value: AppearanceTheme; label: string }[] = [
  { value: 'auto', label: 'Automatique' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

function authHeaders(withJson: boolean): Record<string, string> {
  const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
  return withJson
    ? { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
    : { Authorization: `Bearer ${key}` };
}

function httpError(status: number): Error {
  return new Error(status === 400 ? 'Réglages refusés par le serveur, vérifiez les valeurs.' : `HTTP ${status}`);
}

export function AdminAppearance() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const [form, setForm] = useState<AppearanceForm>(DEFAULT_FORM);
  const [hexDraft, setHexDraft] = useState('');
  const [hexBlurred, setHexBlurred] = useState(false);

  function applyConfig(d: StoreConfig) {
    const next = formFromAppearance(parseAppearance(d.config.appearance));
    setForm(next);
    setHexDraft(next.accent ?? '');
    setHexBlurred(false);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(CONFIG_URL, { headers: authHeaders(false) });
      if (!res.ok) throw httpError(res.status);
      applyConfig((await res.json()) as StoreConfig);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function patch(appearance: unknown, okLabel: string) {
    setSaving(true);
    setSaved(null);
    setError(null);
    try {
      const res = await fetch(CONFIG_URL, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({ appearance }),
      });
      if (!res.ok) throw httpError(res.status);
      const d = (await res.json()) as StoreConfig;
      // Un serveur qui ignore la clé répond 200 sans l'avoir écrite : on le dit.
      if (appearance !== null && !d.config.appearance) {
        throw new Error("Le serveur n'a pas enregistré l'apparence.");
      }
      applyConfig(d);
      setSaved(okLabel);
      setTimeout(() => setSaved(null), 5000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function onHexChange(value: string) {
    setHexDraft(value);
    setHexBlurred(false);
    if (!value.trim()) {
      setForm(f => ({ ...f, accent: null }));
      return;
    }
    const hex = normalizeHex(value);
    if (hex) setForm(f => ({ ...f, accent: hex }));
  }

  function onPickColor(value: string) {
    setHexDraft(value);
    setHexBlurred(false);
    setForm(f => ({ ...f, accent: value }));
  }

  function resetAll() {
    if (!window.confirm("Remettre toute l'apparence du widget en automatique ?")) return;
    void patch(null, '✓ tout est en automatique, visible sur la boutique d’ici une à deux minutes');
  }

  if (loading) return <Loading />;
  if (loadError) return <ErrorBlock message={loadError} />;

  const hexInvalid = hexDraft.trim() !== '' && normalizeHex(hexDraft) === null;
  const fontInvalid = !isValidFont(form.font);
  const canSave = !hexInvalid && !fontInvalid && !saving;
  const preview = payloadFromForm(form);

  return (
    <div>
      <SectionHeader eyebrow="Widget" title="L'apparence du" accent="vendeur" />
      {error && <div className="mt-4"><ErrorBlock message={error} /></div>}

      <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-neutral-500">
        Par défaut, le widget reprend le style de votre boutique : fond, couleur du texte, police, arrondis et
        couleur du bouton principal. Les réglages ci-dessous imposent une valeur à la place.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Panel title="Style de la boutique">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div id="appearance-auto-label" className="text-sm text-neutral-900">Reprendre le style de ma boutique</div>
                <div className="mt-1 text-xs text-neutral-500">
                  Désactivé, tout ce qui reste en automatique prend le style Shimmer par défaut.
                </div>
              </div>
              <Switch
                checked={form.auto}
                labelledBy="appearance-auto-label"
                onChange={v => setForm(f => ({ ...f, auto: v }))}
              />
            </div>
          </Panel>

          <Panel title="Réglages">
            <div className="space-y-6">
              <Field label="Couleur d'accent" hint="Prix, question du vendeur, suggestions et boutons.">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    aria-label="Choisir la couleur d'accent"
                    value={form.accent ?? '#525252'}
                    onChange={e => onPickColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-neutral-200 bg-white p-1"
                  />
                  <input
                    type="text"
                    aria-label="Couleur d'accent en hexadécimal"
                    value={hexDraft}
                    onChange={e => onHexChange(e.target.value)}
                    onBlur={() => setHexBlurred(true)}
                    placeholder="Automatique"
                    maxLength={7}
                    spellCheck={false}
                    className="w-32 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm text-neutral-900 outline-none focus:border-emerald-500"
                  />
                  <AutoChip active={form.accent === null} onClick={() => onHexChange('')} />
                </div>
                {hexInvalid && hexBlurred && (
                  <div className="mt-2 text-xs text-red-600">Format attendu : #RRGGBB, par exemple #0055ff.</div>
                )}
              </Field>

              <Field label="Police" hint="Le nom utilisé par votre thème. Shimmer ne charge pas la police : elle doit déjà être chargée par votre boutique.">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    aria-label="Police"
                    value={form.font}
                    onChange={e => setForm(f => ({ ...f, font: e.target.value }))}
                    placeholder="Police de votre boutique"
                    maxLength={120}
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-emerald-500"
                  />
                  <AutoChip active={form.font.trim() === ''} onClick={() => setForm(f => ({ ...f, font: '' }))} />
                </div>
                {fontInvalid && (
                  <div className="mt-2 text-xs text-red-600">
                    Lettres, chiffres, espaces, virgules, guillemets, points, tirets et _ uniquement (120 caractères au plus).
                  </div>
                )}
              </Field>

              <Field label="Arrondi" hint="Coins du dock, des produits et des boutons.">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="range"
                    aria-label="Arrondi en pixels"
                    min={RADIUS_MIN}
                    max={RADIUS_MAX}
                    step={1}
                    value={form.radius ?? STANDIN_RADIUS}
                    onChange={e => setForm(f => ({ ...f, radius: Number(e.target.value) }))}
                    className={`min-w-0 flex-1 accent-emerald-600 ${form.radius === null ? 'opacity-40' : ''}`}
                  />
                  <span className="w-24 text-right text-sm tabular-nums text-neutral-900">
                    {form.radius === null ? 'Automatique' : `${form.radius} px`}
                  </span>
                  <AutoChip active={form.radius === null} onClick={() => setForm(f => ({ ...f, radius: null }))} />
                </div>
              </Field>

              <Field label="Thème" hint="Automatique suit le fond de votre boutique.">
                <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5" role="group" aria-label="Thème">
                  {THEME_OPTIONS.map(opt => {
                    const active = form.theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setForm(f => ({ ...f, theme: opt.value }))}
                        className={`rounded-md px-3 py-1.5 text-xs transition ${
                          active
                            ? 'bg-white font-medium text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.06]'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          </Panel>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Panel title="Aperçu">
            <AppearancePreview appearance={preview} />
          </Panel>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          onClick={() => void patch(payloadFromForm(form), '✓ enregistré, visible sur la boutique d’ici une à deux minutes')}
          disabled={!canSave}
          className="rounded-full bg-emerald-600 px-6 py-3 text-xs text-white transition hover:bg-emerald-700 disabled:opacity-40"
        >
          {saving ? 'Enregistrement…' : "Enregistrer l'apparence"}
        </button>
        <button
          onClick={resetAll}
          disabled={saving}
          className="rounded-full border border-neutral-200 bg-white px-6 py-3 text-xs text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-40"
        >
          Tout remettre en automatique
        </button>
        {saved && <span className="text-xs text-emerald-600">{saved}</span>}
      </div>

      <div className="mt-8">
        <AppearanceIntegrators />
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="mt-2">{children}</div>
      {hint && <div className="mt-2 text-xs text-neutral-400">{hint}</div>}
    </div>
  );
}

function AutoChip({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? 'border-emerald-500 bg-emerald-100 text-neutral-900'
          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
      }`}
    >
      Automatique
    </button>
  );
}

function Switch({ checked, labelledBy, onChange }: { checked: boolean; labelledBy: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        checked ? 'bg-emerald-600' : 'bg-neutral-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
