# Shimmer V4 — Récap pour Tym

État au 13:00. J'ai bossé jusqu'à là, je continue jusqu'à 16h comme demandé.

## TL;DR

4 variantes complètes du site + 1 page galerie qui les présente côte à côte.

| URL | Style | Mood |
|---|---|---|
| **https://tymmerc.eu/shimmer/v4/showcase/** | **Galerie** | les 4 variantes en preview, à utiliser pour choisir |
| https://tymmerc.eu/shimmer/v4/ | Light éditorial | papier crème, serif Fraunces énorme, orb toxique purple en sphère |
| https://tymmerc.eu/shimmer/v4/dark/ | Dark acid | fond noir, accent vert acide, type sérif sur fond toxique |
| https://tymmerc.eu/shimmer/v4/mono/ | Mono tech | dev tool / Linear-style, mono partout, grille, tables, badges |
| https://tymmerc.eu/shimmer/v4/brut/ | Brutalist | acid green plein écran, sans-serif noir ultra-bold, blocs |

**Commence par la galerie** pour voir les 4 d'un coup d'œil, puis clique sur celle qui t'attire.

Toutes utilisent **Next.js 14 + React 18 + Framer Motion + Lenis smooth scroll**, build static, servies par nginx.

## Ce qui est commun aux 4

- Hero respecte ton brief : canvas WebGL toxique violet **toujours présent** (mais traité différemment selon le mood)
- Fond clair sur la light et la brut, fond sombre sur la dark et la mono
- Scroll-driven animations Framer Motion (`useScroll`, `useTransform`, `useSpring`)
- Cross-links visibles entre les 4 dans le header
- Stack tech présentée (Express + TS + Prisma + Redis + Claude/Ollama + ONNX)
- Tous les CTA pointent vers les vrais artefacts du projet (/cross-sell-demo, /cross-sell-dashboard, /docs)
- Mobile checké, responsive sur les 4

## Variante 1 — Light éditorial (la "main")

`https://tymmerc.eu/shimmer/v4/`

- **Hero** : titre Fraunces "Un vendeur qui *parle*, pas un moteur qui *devine*". Orb toxique XL en sphère à droite, fade paper pour préserver la lisibilité du titre. Stats grid 4 colonnes en bas.
- **Marquee** : 14 verticaux qui défilent en italique éditorial (cave à vins · luminaires · mode féminine · cosmétique...)
- **Pinned Journey** : 3 actes narratifs alternés gauche/droite. "Le client dit. Souvent flou." → "Le vendeur cerne. Une question utile." → "Il propose. Avec la raison écrite." Avec bubbles client (ink) / vendeur (paper).
- **Section Vendeur** : 3 types de recherche (exact / qualification / similarité) + chat mockup complet à droite avec un parcours "poils de mon chat" → recommandation Silenz Pro 249€
- **Section Cross-sell** : 4 picks par rôle (complément / accessoire / premium / alternative) en gradient toxic
- **Section Attribution** : fond noir + glow toxique, compteur CountUp 28 640€, funnel 5 étapes animé (impression → clic → vue → ajout → achat), take-rate/view-through/AOV
- **Mail + Reviews** : 4 mails classés (SAV, urgent, sentiment) + 4 reviews modérées (4-5★ publiés, 1-2★ ticket SAV)
- **Stack** : 4 layers (Boutique / API / Intelligence / Data) avec sample de code à droite
- **Intégration** : code editor mock "3 lignes" + requirements (aucune dépendance / aucune migration / aucun cookie tiers / performance) + mini-stats SDK 28KB / 30 min install
- **Epilogue** : orb toxique en fond + titre énorme + 3 CTA + footer

Hauteur totale : ~11 500px. 9 sections.

## Variante 2 — Dark acid (TYM A CHOISI CELLE-LÀ ✓)

`https://tymmerc.eu/shimmer/v4/dark/`

**Mise à jour à 14:15 : enrichissement complet, 10 500px de contenu.**

- **Hero polished** : canvas toxique full screen + double veil + grain. Titre "Le vendeur *qui parle*. L'attribution *qui paie*." en italique acid. Animations entrance staggered. Stats grid 4 colonnes en bas (CA attribué acide, take-rate, picks, SDK).
- **Marquee** : verticaux qui défilent (luminaires · cosmétique · parfumerie · etc.)
- **Parcours** : 3 actes narratifs alternés gauche/droite avec bubbles client/vendeur.
- **Modules** : liste tabulaire 5 features (sales-agent / cross-sell / attribution / mail-triage / reviews) avec hover trace acide + endpoint à droite.
- **Attribution** : 28 640€ HUGE serif + badge +18.4% acide + funnel visuel à gauche (5 étapes barres dégradé toxic → acid) + colonne "Et derrière le total, la vérité" + grille stats (take-rate, view-through, AOV attribué, AOV pré-Shimmer baseline).
- **Stack** : 4 layers (Boutique / API / Intelligence / Data) avec code samples + line acide sticky qui se trace au scroll.
- **Verticaux** : 4 cards (Caves à vins, Luminaires, Mode, Cosmétique) avec sample de pick "Châteauneuf-du-Pape · ACCORD → Maroilles fermier" + volume picks/mois + chips additionnels.
- **Intégration** : code editor mock 3 lignes + requirements (aucune dépendance / migration / cookie tiers / performance) + mini-stats.
- **Epilogue** : "30 minutes pour brancher. *Le CA* dès la première vue." + 3 CTA.

Mood : sombre + acide. Tech / agent-IA-pour-investisseurs. Mais maintenant aussi riche que la light éditoriale.

## Variante 3 — Mono tech (Linear-style)

`https://tymmerc.eu/shimmer/v4/mono/`

- **Hero** : grille en background, gradient violet subtle, header `~/shimmer v0.4.0`, badge "STATUS · OPERATIONAL", titre Inter Tight "A conversational sales agent with measurable attribution"
- **Modules** : table 5 lignes (sales-agent / cross-sell / attribution / mail-triage / reviews) avec badges (llm, precompute, session, etc.) et endpoints
- **Metrics** : grille 3×2 KPI (CA, impressions, clicks, view-through, cart-adds, purchases) avec countup. Funnel + top picks détaillés en dessous.
- **Verticals** : grille 3×2 verticaux avec icons et stats (caves-vins 4 200 picks/mois, etc.)
- **Install** : terminal bash mock avec curl + response JSON + SDK 3 lignes + CLI 4 lignes
- **Footer** : 4 colonnes avec switcher entre variantes

Style "dev docs" / "Linear" / "Vercel". Quand tu veux montrer à un CTO.

## Variante 4 — Brutalist (acid + ink)

`https://tymmerc.eu/shimmer/v4/brut/`

- **Hero** : fond acid green plein écran, titre sans-serif noir ultra-bold "VENDEUR. CROSS-SELL. ATTRIBUÉ." (avec "ATTRIBUÉ" en bloc inversé), 3 cards "il comprend / il propose / il compte"
- **Features** : grille 2×3 alternée acid/ink, 6 modules en typo bold uppercase
- **Money** : 28 640€ HUGE acid sur fond noir + 4 stats
- **CTA** : 3 grands blocs (démo / dashboard / API)

Le plus radical. Couleurs saturées, blocs plein écran, pas de gradient ni de blur. À choisir si tu veux marquer.

## Technique

- **Stack** : Next.js 14 App Router, React 18, TypeScript 5.7 strict, Tailwind 3.4, Framer Motion 11, Lenis 1.1
- **Build** : static export (`out/`) copié vers `/opt/shimmer/apps/showcase/v4/`, servi par nginx via `/shimmer/v4/`
- **Fonts** : Fraunces (serif éditorial), Inter Tight (sans-serif), JetBrains Mono (mono)
- **Source** : `/opt/shimmer/apps/site/`
- **Build cmd** : `cd /opt/shimmer/apps/site && pnpm build && cp -r out/* /opt/shimmer/apps/showcase/v4/`

## Ce qui marche bien

- Le scroll-driven (orb scale + opacity + parallax sur le titre du hero light)
- L'attribution animée (countup + funnel barres qui poussent)
- Le cross-section flow (paper → bone → ink → paper alterne le mood)
- Les cross-links entre les 4 variantes (hover sur les boutons header)
- Le scroll progress bar global (fine ligne purple en haut)
- Mobile sur les 4

## Ce que je peux encore polish

- Animation pinned sur SectionCrossSell (les picks qui s'enchaînent au scroll)
- Cursor custom violet sur certains hovers
- Logo "S" minimal quand on scrolle (vs "Shimmer." full)
- Une 5ème variante "editorial mag" (serif large, photos, plus magazine)
- Polir le timing des reveals pour éviter les pop-in

Dis-moi laquelle des 4 te plaît le plus quand tu reviens, et on creuse.
