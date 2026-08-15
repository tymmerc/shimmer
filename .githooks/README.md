# Git hooks

Hooks locaux versionnés avec le repo.

## Activation

Une fois après `git clone` :

```bash
git config core.hooksPath .githooks
```

## Hooks fournis

### pre-commit

Avant chaque commit :

1. Détecte les patterns de secrets (Claude API, Stripe, AWS, clé privée) et bloque.
2. Bloque les fichiers `.env` (sauf `.env.example`).
3. Lance `pnpm lint` si des fichiers TypeScript sont stagés.
4. Lance `tsc --noEmit` sur `@shimmer/core` si le schema Prisma ou des fichiers core sont modifiés.

## Bypass

Si vraiment nécessaire (debugging d'un faux positif) : `git commit --no-verify`. Ne pas en faire l'habitude.

## Ajouter un hook

Créer un fichier exécutable dans `.githooks/` portant le nom Git standard (`pre-commit`, `pre-push`, `commit-msg`, etc.). Documenter ici.
