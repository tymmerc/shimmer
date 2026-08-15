# Shimmer V4 — Status

**Dernière update : 13:08 (Tym parti à 12:13, retour estimé 14:30, je continue jusqu'à 16h comme demandé).**

## URLs

- 🟣 **Light éditorial** — https://tymmerc.eu/shimmer/v4/ — Le main. Papier crème, serif énorme, orb toxique en sphère, 9 sections.
- 🟪 **Dark acid** — https://tymmerc.eu/shimmer/v4/dark/ — Fond noir, accent vert acide, parcours en 3 actes.
- ⚪ **Mono tech** — https://tymmerc.eu/shimmer/v4/mono/ — Linear-style dev tool. Grille, tables, terminal mock.
- 🟢 **Brutalist** — https://tymmerc.eu/shimmer/v4/brut/ — Acid green plein écran, sans-serif noir ultra-bold, blocs.

Toutes cross-linkées via le header. Mobile OK. Aucune erreur console.

## Ce qui est dans chaque variante

| | Light | Dark | Mono | Brut |
|---|---|---|---|---|
| Hero toxique | ✅ orb sphère | ✅ background full | ⏵ grille tech | ⏵ acid green block |
| Marquee verticaux | ✅ | ✅ | ❌ | ❌ |
| Parcours 3 actes | ✅ alterné | ✅ alterné | ❌ | ⏵ 3 cards |
| Vendeur IA (chat) | ✅ complet | ⏵ liste | ⏵ table | ⏵ tile |
| Cross-sell détaillé | ✅ 4 picks | ⏵ liste | ⏵ table | ⏵ tile |
| Attribution € | ✅ funnel | ✅ huge € | ✅ tiles + funnel | ✅ HUGE € |
| Mail + Reviews | ✅ | ⏵ liste | ⏵ table | ⏵ tile |
| Stack | ✅ 4 layers | ❌ | ⏵ verticals | ❌ |
| Intégration code | ✅ editor mock | ❌ | ✅ terminal | ❌ |
| Footer + CTA | ✅ | ✅ | ✅ | ✅ |

✅ = section dédiée riche · ⏵ = couvert plus rapidement · ❌ = pas inclus (par choix)

## Stack technique

- Next.js 14.2 (App Router, static export)
- React 18.3, TypeScript 5.7 strict
- Tailwind 3.4 (custom tokens : paper, ink, toxic, acid)
- Framer Motion 11.11 (useScroll, useTransform, useSpring, useInView)
- Lenis 1.1 (smooth scroll)
- Fonts Google : Fraunces (display serif), Inter Tight (sans), JetBrains Mono (mono)
- esbuild via Next pour les chunks
- Source : `/opt/shimmer/apps/site/`
- Output : `/opt/shimmer/apps/showcase/v4/`
- Serveur : nginx via `/shimmer/v4/` (alias sur le dossier)

## Build

```bash
cd /opt/shimmer/apps/site
pnpm install
pnpm build
cp -r out/* /opt/shimmer/apps/showcase/v4/
```

## Time tracking

- 12:13 — Tym parti. "Bosse 2h, je veux un site à 10k"
- 12:15 — Setup Next.js + Tailwind + Framer Motion
- 12:18 — Hero V4 light + 5 sections
- 12:25 — Première version déployée
- 12:35 — Marquee + PinnedJourney + Section Attribution polish + Stack
- 12:45 — Variante Dark
- 12:50 — Variante Mono
- 12:55 — Variante Brut
- 13:00 — Cross-links + récap écrit
- 13:08 — Fix mobile, audit console, validation 4 variantes

## Ce qui reste pour continuer (si je trouve des fix)

- Polish encore les transitions inter-sections sur la light
- Améliorer hover sur les cards de chaque variante
- Petites micro-anims supplémentaires
- Vérification responsive plus poussée

Quand tu reviens, dis-moi laquelle tu préfères et je creuse celle-là à fond.
