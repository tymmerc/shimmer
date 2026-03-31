#!/bin/bash
set -a
source /opt/shimmer/.env
set +a
export PATH=/root/.nvm/versions/node/v22.21.1/bin:$PATH
cd /opt/shimmer/apps/api
exec /opt/shimmer/node_modules/.pnpm/node_modules/.bin/tsx src/index.ts
