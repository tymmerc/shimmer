#!/usr/bin/env bash
set -euo pipefail

# Backup quotidien de la base Shimmer (calqué sur /opt/blindify/scripts/backup-pg.sh).
# CRITIQUE : la base a drifté vs schema.prisma — ces dumps sont la SEULE
# source de vérité du schéma réel. Ne jamais restaurer via prisma db push.

BACKUP_DIR="/opt/backups/shimmer"
CONTAINER="ecommerce-postgres"
DB_NAME="ecommerce_db"
DB_USER="ecommerce"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup of ${DB_NAME}..."

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] Backup OK: ${BACKUP_FILE} (${SIZE})"
else
  echo "[$(date)] Backup FAILED: fichier vide ou absent" >&2
  exit 1
fi

# Rotation : supprime les dumps de plus de RETENTION_DAYS jours.
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Rotation done (retention ${RETENTION_DAYS}d)."
