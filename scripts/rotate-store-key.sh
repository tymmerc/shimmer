#!/usr/bin/env bash
# Rotation de la clé secrète (sk_) d'un store Shimmer.
#
#   scripts/rotate-store-key.sh <store_id> [--dry-run]
#
# - génère une clé sk_ + 32 hex (même format que POST /api/stores)
# - la pose dans stores.api_key, seulement si l'ancienne n'a pas bougé entre-temps
# - range la nouvelle dans .secrets.local (la ligne qui portait l'ancienne valeur,
#   sinon SHIMMER_STORE<id>_SK), fichier en 600
# - garde l'ancienne dans ~/.shimmer-rotation/ (retour arrière d'urgence, 600)
# - vérifie sur l'API locale : ancienne clé -> 401, nouvelle -> 200
# - liste les fichiers du dépôt qui contiennent encore l'ancienne clé
#
# Aucune clé n'est affichée, ni passée en argument de commande (visible dans ps).
# L'API relit stores.api_key à chaque requête : effet immédiat, pas de restart.
#
# Variables : SHIMMER_ENV_FILE, SHIMMER_SECRETS_FILE, SHIMMER_ROTATION_DIR,
# SHIMMER_API_URL, SKIP_VERIFY=1 (pas d'appel API, pour les tests).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${SHIMMER_ENV_FILE:-$ROOT/.env}"
SECRETS_FILE="${SHIMMER_SECRETS_FILE:-$ROOT/.secrets.local}"
BACKUP_DIR="${SHIMMER_ROTATION_DIR:-$HOME/.shimmer-rotation}"
API_URL="${SHIMMER_API_URL:-http://127.0.0.1:3003}"

usage() { echo "usage: $0 <store_id> [--dry-run]" >&2; exit 2; }
[ $# -ge 1 ] && [ $# -le 2 ] || usage
STORE_ID="$1"
[[ "$STORE_ID" =~ ^[0-9]+$ ]] || usage
DRY_RUN=0
if [ $# -eq 2 ]; then [ "$2" = "--dry-run" ] || usage; DRY_RUN=1; fi

[ -f "$ENV_FILE" ] || { echo "fichier env introuvable : $ENV_FILE (lancer depuis /opt/shimmer ou fixer SHIMMER_ENV_FILE)" >&2; exit 1; }
DB_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | sed -E 's/[?&]schema=[^&]*//' || true)"
[ -n "$DB_URL" ] || { echo "DATABASE_URL introuvable dans $ENV_FILE" >&2; exit 1; }
q() { psql "$DB_URL" -X -q -At -v ON_ERROR_STOP=1 "$@"; }

umask 077
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Code HTTP de /api/stores/me/config avec la clé contenue dans le fichier $1.
http_status() {
  printf 'Authorization: Bearer %s\n' "$(cat "$1")" > "$TMP/hdr"
  curl -s -o /dev/null -m 10 -w '%{http_code}' -H @"$TMP/hdr" "$API_URL/api/stores/me/config" || true
}

q -c "SELECT api_key FROM stores WHERE id = $STORE_ID" | tr -d '\n' > "$TMP/old"
[ -s "$TMP/old" ] || { echo "store $STORE_ID introuvable" >&2; exit 1; }
NAME="$(q -c "SELECT name FROM stores WHERE id = $STORE_ID")"
echo "store $STORE_ID ($NAME) : clé actuelle de $(wc -c < "$TMP/old") caractères"

if [ "${SKIP_VERIFY:-0}" != "1" ]; then
  echo "  clé actuelle sur l'API : HTTP $(http_status "$TMP/old") (attendu 200)"
fi

if [ "$DRY_RUN" = "1" ]; then
  echo "  --dry-run : rien n'est modifié"
  exit 0
fi

printf 'sk_%s' "$(openssl rand -hex 16)" > "$TMP/new"

# Sauvegarde AVANT d'écrire en base : si la suite échoue, rien n'est perdu.
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)-store$STORE_ID"
cp "$TMP/old" "$BACKUP_DIR/$STAMP.old"
cp "$TMP/new" "$BACKUP_DIR/$STAMP.new"

# Clés passées par stdin (heredoc), jamais en argument. Échappement des quotes.
OLD_SQL="$(sed "s/'/''/g" "$TMP/old")"
NEW_SQL="$(cat "$TMP/new")"
UPDATED="$(q <<SQL
UPDATE stores SET api_key = '$NEW_SQL', updated_at = now()
WHERE id = $STORE_ID AND api_key = '$OLD_SQL'
RETURNING id;
SQL
)"
[ "$UPDATED" = "$STORE_ID" ] || { echo "UPDATE sans effet (clé modifiée entre-temps ?), rien n'a changé" >&2; exit 1; }
echo "  base : clé remplacée (sauvegarde $BACKUP_DIR/$STAMP.{old,new})"

# .secrets.local : on remplace la valeur partout où elle valait l'ancienne clé.
touch "$SECRETS_FILE"
chmod 600 "$SECRETS_FILE"
OLD="$(cat "$TMP/old")" NEW="$(cat "$TMP/new")" awk '
  BEGIN { hit = 0 }
  {
    i = index($0, "=")
    if (i > 0 && substr($0, 1, 1) != "#") {
      v = substr($0, i + 1); gsub(/^"|"$/, "", v)
      if (v == ENVIRON["OLD"]) { print substr($0, 1, i) ENVIRON["NEW"]; hit = 1; next }
    }
    print
  }
  END { if (!hit) exit 3 }
' "$SECRETS_FILE" > "$TMP/secrets" && replaced=1 || replaced=0
if [ "$replaced" = "1" ]; then
  cat "$TMP/secrets" > "$SECRETS_FILE"
  echo "  $SECRETS_FILE : ancienne valeur remplacée"
else
  printf 'SHIMMER_STORE%s_SK=%s\n' "$STORE_ID" "$(cat "$TMP/new")" >> "$SECRETS_FILE"
  echo "  $SECRETS_FILE : SHIMMER_STORE${STORE_ID}_SK ajoutée"
fi

if [ "${SKIP_VERIFY:-0}" != "1" ]; then
  echo "  ancienne clé sur l'API : HTTP $(http_status "$TMP/old") (attendu 401)"
  echo "  nouvelle clé sur l'API : HTTP $(http_status "$TMP/new") (attendu 200)"
fi

LEFT="$(grep -rlF -f "$TMP/old" "$ROOT" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next 2>/dev/null || true)"
if [ -n "$LEFT" ]; then
  echo "  fichiers qui contiennent encore l'ancienne clé (désormais morte) :"
  printf '%s\n' "$LEFT" | sed 's/^/    /'
fi
