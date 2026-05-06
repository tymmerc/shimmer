#!/bin/bash
# Greffage Caves Forty-Two — script reproductible
# Joue le parcours complet d'onboarding via API publique.

set -euo pipefail
API="${API:-http://localhost:3003}"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "=== 1/4 Création du store ==="
STORE_JSON=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"Caves Forty-Two"}' \
  "$API/api/stores")
echo "$STORE_JSON" | jq
STORE_ID=$(echo "$STORE_JSON" | jq -r '.id')
API_KEY=$(echo "$STORE_JSON" | jq -r '.apiKey')
echo "store_id=$STORE_ID api_key=$API_KEY"
echo "$API_KEY" > "$HERE/.api-key"

echo ""
echo "=== 2/4 Import catalogue (80 vins) ==="
curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{\"products\": $(cat "$HERE/config/catalogue.json")}" \
  "$API/api/catalog/import" | jq

echo ""
echo "=== 3/4 Génération auto des univers (~2min, LLM) ==="
curl -s -X POST -H "Authorization: Bearer $API_KEY" --max-time 300 \
  "$API/api/universe/generate" | jq '{success, totalMs, universes}'

echo ""
echo "=== 4/4 Liste des univers générés ==="
curl -s -H "Authorization: Bearer $API_KEY" "$API/api/universe" | jq '.universes[] | {id, label, criteria: (.criteria | map(.id))}'

echo ""
echo "Done. API key in $HERE/.api-key"
