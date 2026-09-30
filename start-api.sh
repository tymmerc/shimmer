#!/bin/bash
set -a
source /opt/shimmer/.env
set +a
# Mode production (30/09/2026) : journaux JSON niveau info, sans le journal de
# chaque requête SQL. Le .env garde NODE_ENV=development pour les outils locaux.
export NODE_ENV=production
# Écoute sur la boucle locale seulement : nginx passe par 127.0.0.1:3003 (audit du 30/09).
export API_HOST=127.0.0.1
export PATH=/root/.nvm/versions/node/v22.21.1/bin:$PATH
cd /opt/shimmer/apps/api
exec /opt/shimmer/node_modules/.pnpm/node_modules/.bin/tsx src/index.ts
