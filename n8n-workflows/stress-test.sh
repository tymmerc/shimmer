#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Shimmer n8n Workflows — Stress Test
# Envoie des données massives sur tous les endpoints API
# Champs alignés sur les vrais schémas Zod de l'API
# ═══════════════════════════════════════════════════════════

API="${SHIMMER_API_URL:-http://localhost:3003}"
KEY="${SHIMMER_API_KEY:-test-api-key}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

OK=0
FAIL=0
TOTAL=0
START_TIME=$(date +%s)

post() {
  local endpoint="$1"
  local data="$2"
  local label="$3"
  TOTAL=$((TOTAL + 1))

  HTTP_CODE=$(curl -s -o /tmp/stress-resp.json -w "%{http_code}" \
    -X POST "$API$endpoint" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $KEY" \
    -d "$data" \
    --max-time 120 2>/dev/null)

  if [[ "$HTTP_CODE" =~ ^2[0-9][0-9]$ ]]; then
    OK=$((OK + 1))
    echo -e "  ${GREEN}✓${NC} $label → HTTP $HTTP_CODE"
  else
    FAIL=$((FAIL + 1))
    RESP=$(cat /tmp/stress-resp.json 2>/dev/null | head -c 150)
    echo -e "  ${RED}✗${NC} $label → HTTP $HTTP_CODE — $RESP"
  fi
}

get() {
  local endpoint="$1"
  local label="$2"
  TOTAL=$((TOTAL + 1))

  HTTP_CODE=$(curl -s -o /tmp/stress-resp.json -w "%{http_code}" \
    "$API$endpoint" \
    -H "Authorization: Bearer $KEY" \
    --max-time 30 2>/dev/null)

  if [[ "$HTTP_CODE" =~ ^2[0-9][0-9]$ ]]; then
    OK=$((OK + 1))
    SIZE=$(wc -c < /tmp/stress-resp.json)
    echo -e "  ${GREEN}✓${NC} $label → HTTP $HTTP_CODE (${SIZE}B)"
  else
    FAIL=$((FAIL + 1))
    echo -e "  ${RED}✗${NC} $label → HTTP $HTTP_CODE"
  fi
}

echo -e "\n${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  SHIMMER — Stress Test ($(date '+%Y-%m-%d %H:%M'))${NC}"
echo -e "${BOLD}  API: $API${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}\n"

# ═══════════════════════════════════════
# 1. EMAIL CLASSIFICATION (Workflow 01)
# Schema: { fromAddr: email, subject: string, body: string }
# ═══════════════════════════════════════
echo -e "${CYAN}[1/6] Email Classification — 30 emails${NC}"

post "/api/mail/classify" '{"fromAddr":"jean.dupont@gmail.com","subject":"Ou en est ma commande 4521?","body":"Bonjour, je nai toujours pas recu ma commande passee il y a 10 jours. Numero 4521. Pouvez-vous me dire ou elle en est? Merci"}' "ORDER_STATUS — suivi commande"
post "/api/mail/classify" '{"fromAddr":"marie.martin@yahoo.fr","subject":"Retour article defectueux","body":"Bonjour, je souhaite retourner la perceuse Bosch commandee la semaine derniere. Elle ne fonctionne plus apres 2 utilisations. Commande 3987. Je veux un remboursement."}' "RETURN_REQUEST — perceuse defectueuse"
post "/api/mail/classify" '{"fromAddr":"pierre.durand@outlook.com","subject":"Question sur perceuse sans fil","body":"Bonjour, est-ce que la perceuse Makita 18V est compatible avec les batteries de la gamme precedente? Et quel est le couple maximum? Merci davance."}' "PRODUCT_QUESTION — compatibilite batterie"
post "/api/mail/classify" '{"fromAddr":"sophie.bernard@gmail.com","subject":"URGENT - Jamais recu et debite","body":"CA FAIT 3 SEMAINES QUE JATTENDS MA COMMANDE. Jai ete debite de 189 euros et RIEN. Commande 5102. Si je nai pas de reponse sous 24h je passe par ma banque."}' "COMPLAINT — urgent non livre"
post "/api/mail/classify" '{"fromAddr":"nicolas.petit@free.fr","subject":"Facture commande 2891","body":"Bonjour, pourriez-vous me renvoyer la facture de ma commande 2891 du mois dernier? Jai besoin pour ma comptabilite. Merci"}' "BILLING — demande facture"
post "/api/mail/classify" '{"fromAddr":"emma.leroy@gmail.com","subject":"Merci pour le service","body":"Bonjour, je voulais juste vous remercier pour la rapidite de livraison et la qualite du produit. Laspirateur Dyson est top! Je recommande."}' "OTHER — remerciement positif"
post "/api/mail/classify" '{"fromAddr":"lucas.moreau@hotmail.fr","subject":"Probleme de livraison","body":"Bonjour, le livreur a depose mon colis chez le voisin qui est absent pour 2 semaines. Que faire? Commande 6734."}' "SHIPPING — colis chez voisin"
post "/api/mail/classify" '{"fromAddr":"chloe.simon@gmail.com","subject":"Annulation commande","body":"Bonjour, je souhaite annuler ma commande 7891 passee il y a 1 heure. Je me suis trompee de modele. Est-ce encore possible? Merci"}' "ORDER_STATUS — annulation"
post "/api/mail/classify" '{"fromAddr":"thomas.laurent@wanadoo.fr","subject":"Garantie tondeuse","body":"Bonjour, ma tondeuse thermique achetee il y a 11 mois ne demarre plus. Elle est encore sous garantie. Comment faire pour la reparation? Commande 1234."}' "RETURN_REQUEST — garantie"
post "/api/mail/classify" '{"fromAddr":"lea.garcia@gmail.com","subject":"Demande de devis","body":"Bonjour, nous sommes une entreprise de nettoyage et nous cherchons a equiper nos 15 employes en aspirateurs professionnels. Pouvez-vous nous faire un devis pour le Dyson Big Ball x15?"}' "OTHER — devis B2B"
post "/api/mail/classify" '{"fromAddr":"spam@cheap-deals.ru","subject":"CONGRATULATIONS YOU WON","body":"Click here to claim your prize of 1000000 dollars free shipping worldwide buy now cheap electronics"}' "SPAM — arnaque classique"
post "/api/mail/classify" '{"fromAddr":"hugo.martinez@gmail.com","subject":"Echange taille","body":"Bonjour, jai recu les gants de jardinage taille L mais ils sont trop grands. Puis-je les echanger contre du M? Commande 4455."}' "RETURN_REQUEST — echange taille"
post "/api/mail/classify" '{"fromAddr":"camille.robert@orange.fr","subject":"Code promo ne marche pas","body":"Bonjour, jessaie dutiliser le code SUMMER20 mais il ne sapplique pas a mon panier. Jai un robot cuisine Moulinex plus accessoires pour 299 euros. Le code devrait fonctionner non?"}' "BILLING — code promo"
post "/api/mail/classify" '{"fromAddr":"antoine.dubois@gmail.com","subject":"Re Suivi commande 3210","body":"Merci pour votre reponse. Jai bien recu le colis ce matin, tout est en ordre. Bonne journee."}' "OTHER — confirmation reception"
post "/api/mail/classify" '{"fromAddr":"julie.thomas@laposte.net","subject":"Produit different de la photo","body":"Bonjour, laspirateur recu ne correspond pas du tout a la photo du site. La couleur est differente et il manque un accessoire. Je suis tres decue. Commande 8876. Je veux un geste commercial."}' "COMPLAINT — non conforme"
post "/api/mail/classify" '{"fromAddr":"max.richard@gmail.com","subject":"Paiement en 3 fois","body":"Bonjour, est-il possible de payer en 3 fois sans frais pour la perceuse a colonne a 450 euros? Si oui comment faire?"}' "BILLING — paiement 3x"
post "/api/mail/classify" '{"fromAddr":"clara.petit@outlook.com","subject":"Livraison en Corse","body":"Bonjour, je vis en Corse. Est-ce que vous livrez? Et quels sont les delais et frais supplementaires? Merci"}' "SHIPPING — livraison Corse"
post "/api/mail/classify" '{"fromAddr":"remi.blanc@gmail.com","subject":"Panne apres 1 jour","body":"Incroyable. Laspirateur robot achete hier est deja en panne. Il tourne en rond et ne nettoie rien. 400 euros pour ca cest du vol. Commande 9901. Je veux un remplacement IMMEDIAT ou un remboursement."}' "COMPLAINT — panne critique"
post "/api/mail/classify" '{"fromAddr":"ines.morel@free.fr","subject":"Modifier adresse livraison","body":"Bonjour, ma commande 5543 nest pas encore expediee. Puis-je modifier ladresse de livraison? Je demenage vendredi. Nouvelle adresse: 12 rue des Lilas 75020 Paris."}' "SHIPPING — changement adresse"
post "/api/mail/classify" '{"fromAddr":"paul.fournier@gmail.com","subject":"Avis sur grille-pain Tefal","body":"Bonjour, jhesiste entre le grille-pain Tefal Express et le Moulinex Subito. Lequel me conseillez-vous pour une famille de 4? Budget max 50 euros."}' "PRODUCT_QUESTION — conseil achat"
post "/api/mail/classify" '{"fromAddr":"manon.girard@yahoo.fr","subject":"Double prelevement","body":"Bonjour, jai ete prelevee 2 fois pour la meme commande 6677. 78 euros x2 sur mon releve. Merci de corriger rapidement."}' "BILLING — double prelevement"
post "/api/mail/classify" '{"fromAddr":"alex.bonnet@gmail.com","subject":"Partenariat influenceur","body":"Bonjour, je suis createur de contenu bricolage sur YouTube 250k abonnes. Je serais interesse par un partenariat pour tester vos perceuses. Pouvez-vous me contacter?"}' "OTHER — partenariat"
post "/api/mail/classify" '{"fromAddr":"sarah.lambert@outlook.com","subject":"Pieces detachees","body":"Bonjour, je cherche la brosse rotative de remplacement pour laspirateur Dyson V11. Avez-vous ca en stock? Reference XYZ-456."}' "PRODUCT_QUESTION — pieces detachees"
post "/api/mail/classify" '{"fromAddr":"kevin.rousseau@gmail.com","subject":"Commande bloquee en douane","body":"Bonjour, ma commande 2233 est bloquee en douane depuis 5 jours. Le suivi indique attente dedouanement. Cest normal? Que dois-je faire?"}' "SHIPPING — douane"
post "/api/mail/classify" '{"fromAddr":"laura.fontaine@laposte.net","subject":"Felicitations pour votre site","body":"Bravo pour la refonte du site, il est beaucoup plus agreable a utiliser. La recherche intelligente est top. Continuez comme ca."}' "OTHER — compliment"
post "/api/mail/classify" '{"fromAddr":"damien.mercier@gmail.com","subject":"Alerte securite rappel produit","body":"Bonjour, jai vu sur les reseaux quil y avait un rappel sur les batteries Bosch 18V. Mon modele achete chez vous commande 4400 est-il concerne? Cest urgent car je lutilise tous les jours."}' "PRODUCT_QUESTION — rappel securite"
post "/api/mail/classify" '{"fromAddr":"noemie.clement@free.fr","subject":"Programme fidelite","body":"Bonjour, jai cumule pas mal dachats chez vous cette annee. Avez-vous un programme de fidelite ou des avantages pour les clients reguliers?"}' "OTHER — fidelite"
post "/api/mail/classify" '{"fromAddr":"valentin.henry@gmail.com","subject":"Colis endommage a la reception","body":"Bonjour, jai recu ma commande 7788 mais le carton etait completement ecrase. Le robot patissier a une rayure sur le bol et le fouet est tordu. Je demande un remplacement."}' "COMPLAINT — colis endommage"
post "/api/mail/classify" '{"fromAddr":"oceane.masson@yahoo.fr","subject":"Desabonnement newsletter","body":"Bonjour, merci de me desabonner de votre newsletter. Je recois trop demails. Cordialement."}' "OTHER — desabonnement"
post "/api/mail/classify" '{"fromAddr":"baptiste.andre@gmail.com","subject":"Erreur dans la commande recue","body":"Bonjour, jai commande une perceuse Makita bleue ref DTD172Z et jai recu la version verte DTD171Z. Commande 8899. Ce nest pas le bon modele. Merci de proceder a lechange."}' "COMPLAINT — mauvais modele"
echo ""

# ═══════════════════════════════════════
# 2. REVIEW REQUESTS (Workflow 02)
# Schema: { orderId: number, customerId: number, delayHours?: number }
# ═══════════════════════════════════════
echo -e "${CYAN}[2/6] Review Requests — 10 demandes${NC}"

for i in $(seq 1 10); do
  DELAY=$((RANDOM % 72))
  post "/api/reviews/request" \
    "{\"orderId\":$i,\"customerId\":$i,\"delayHours\":$DELAY}" \
    "Review request — Order #$i, Customer #$i (delay ${DELAY}h)"
done
echo ""

# ═══════════════════════════════════════
# 3. REVIEW SUBMISSIONS (Workflow 02 part 2)
# Schema: { token: string, overallRating: 1-5, title?, comment?, deliveryRating?, serviceRating?, wouldRecommend? }
# ═══════════════════════════════════════
echo -e "${CYAN}[3/6] Review Submissions — 20 soumissions${NC}"

COMMENTS_GOOD=(
  "Excellent produit, je recommande vivement"
  "Tres bonne qualite, livraison rapide"
  "Parfait pour mes travaux, puissant et leger"
  "Super rapport qualite-prix"
  "Le produit correspond exactement a la description"
  "Livraison en 2 jours, bien emballe"
  "Deja 3 commandes, toujours impeccable"
  "Mon mari est ravi de son cadeau"
)

COMMENTS_BAD=(
  "Tres decu, arrive casse et le SAV ne repond pas"
  "Qualite mediocre pour le prix"
  "Ne correspond pas du tout a la description"
  "Ne fonctionne plus apres 3 jours"
  "Le pire achat de ma vie"
)

COMMENTS_MID=(
  "Correct sans plus, fait le job"
  "Bon produit mais livraison tres lente"
  "La qualite est ok mais emballage abime"
)

# First get the tokens from pending requests
echo -e "  ${YELLOW}Fetching review tokens...${NC}"
TOKENS=$(curl -s "$API/api/reviews/requests" -H "Authorization: Bearer $KEY" 2>/dev/null)

for i in $(seq 1 20); do
  RAND=$((RANDOM % 10))
  if [ $RAND -lt 6 ]; then
    RATING=$((4 + RANDOM % 2))
    CMT_IDX=$((RANDOM % ${#COMMENTS_GOOD[@]}))
    COMMENT="${COMMENTS_GOOD[$CMT_IDX]}"
    RECOMMEND="true"
  elif [ $RAND -lt 8 ]; then
    RATING=$((1 + RANDOM % 2))
    CMT_IDX=$((RANDOM % ${#COMMENTS_BAD[@]}))
    COMMENT="${COMMENTS_BAD[$CMT_IDX]}"
    RECOMMEND="false"
  else
    RATING=3
    CMT_IDX=$((RANDOM % ${#COMMENTS_MID[@]}))
    COMMENT="${COMMENTS_MID[$CMT_IDX]}"
    RECOMMEND="false"
  fi

  DELIV_RATING=$((3 + RANDOM % 3))
  SERV_RATING=$((3 + RANDOM % 3))

  post "/api/reviews/submit" \
    "{\"token\":\"stress-tok-$(printf '%04d' $i)\",\"overallRating\":$RATING,\"deliveryRating\":$DELIV_RATING,\"serviceRating\":$SERV_RATING,\"title\":\"Test review $i\",\"comment\":\"$COMMENT\",\"wouldRecommend\":$RECOMMEND,\"productRatings\":[{\"productId\":$((i % 5 + 1)),\"rating\":$RATING}]}" \
    "Submit review $i/20 — ${RATING} etoiles"
done
echo ""

# ═══════════════════════════════════════
# 4. SEARCH (used by all workflows for product data)
# Schema: POST { query: string, searchType?, filters? }
# ═══════════════════════════════════════
echo -e "${CYAN}[4/6] Search Pipeline — 15 requetes${NC}"

post "/api/search" '{"query":"perceuse"}' "Search: perceuse"
post "/api/search" '{"query":"aspirateur sans fil"}' "Search: aspirateur sans fil"
post "/api/search" '{"query":"visseuse a chocs bosch"}' "Search: visseuse a chocs bosch"
post "/api/search" '{"query":"scie circulaire"}' "Search: scie circulaire"
post "/api/search" '{"query":"ponceuse"}' "Search: ponceuse"
post "/api/search" '{"query":"meuleuse 125mm"}' "Search: meuleuse 125mm"
post "/api/search" '{"query":"outil pour percer du beton"}' "Search: outil pour percer du beton"
post "/api/search" '{"query":"kit complet bricolage debutant"}' "Search: kit bricolage debutant"
post "/api/search" '{"query":"batterie 18V compatible makita"}' "Search: batterie 18V makita"
post "/api/search" '{"query":"aspirateur robot pour appartement avec chat"}' "Search: aspirateur robot chat"
post "/api/search" '{"query":"robot patissier","filters":{"maxPrice":300}}' "Search: robot + filtre prix"
post "/api/search" '{"query":"tondeuse","filters":{"inStock":true}}' "Search: tondeuse en stock"
post "/api/search" '{"query":"cafetiere expresso pas cher"}' "Search: cafetiere expresso"
post "/api/search" '{"query":"grille pain","searchType":"FUNCTIONAL"}' "Search: grille pain FUNCTIONAL"
post "/api/search" '{"query":"a]@#$%^&*("}' "Search: caracteres speciaux (edge case)"
echo ""

# ═══════════════════════════════════════
# 5. VENDEUR IA (Workflow — concurrent conversational)
# ═══════════════════════════════════════
echo -e "${CYAN}[5/6] Vendeur IA — 10 conversations${NC}"

post "/api/search/assist" '{"message":"je cherche une perceuse"}' "Vendeur: perceuse"
post "/api/search/assist" '{"message":"aspirateur pour poils de chat dans un appartement"}' "Vendeur: aspirateur chat"
post "/api/search/assist" '{"message":"un bon robot cuisine pas trop cher"}' "Vendeur: robot cuisine"
post "/api/search/assist" '{"message":"tondeuse pour grand jardin 500m2"}' "Vendeur: tondeuse 500m2"
post "/api/search/assist" '{"message":"visseuse sans fil pour monter des meubles ikea"}' "Vendeur: visseuse ikea"
post "/api/search/assist" '{"message":"aspirateur robot"}' "Vendeur: aspirateur robot"
post "/api/search/assist" '{"message":"cafetiere expresso bon cappuccino"}' "Vendeur: cafetiere cappuccino"
post "/api/search/assist" '{"message":"taille haie electrique pour haie de 2m"}' "Vendeur: taille haie"
post "/api/search/assist" '{"message":"meuleuse pour couper du beton arme"}' "Vendeur: meuleuse beton"
post "/api/search/assist" '{"message":"je sais pas quoi acheter, cest pour un cadeau"}' "Vendeur: besoin flou"
echo ""

# ═══════════════════════════════════════
# 6. GET ENDPOINTS (Reporting)
# ═══════════════════════════════════════
echo -e "${CYAN}[6/6] Stats & Reporting Endpoints${NC}"

get "/api/reviews/stats" "Review Stats global"
get "/api/reviews/product/1" "Reviews produit #1"
get "/api/reviews/product/2" "Reviews produit #2"
get "/api/reviews/product/3" "Reviews produit #3"
get "/api/mail/queue" "Mail Queue"
get "/api/reviews/pending" "Pending Review Requests"
get "/api/reviews/requests" "All Review Requests"
echo ""

# ═══════════════════════════════════════
# RESULTS
# ═══════════════════════════════════════
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  RESULTATS — ${DURATION}s${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "  Total:   ${BOLD}$TOTAL${NC} requetes"
echo -e "  ${GREEN}OK:      $OK${NC}"
echo -e "  ${RED}FAIL:    $FAIL${NC}"

if [ $TOTAL -gt 0 ]; then
  PCT=$((OK * 100 / TOTAL))
  if [ $PCT -ge 90 ]; then
    COLOR=$GREEN
  elif [ $PCT -ge 70 ]; then
    COLOR=$YELLOW
  else
    COLOR=$RED
  fi
  echo -e "  Score:   ${COLOR}${BOLD}${PCT}%${NC}"
  echo -e "  Duree:   ${BOLD}${DURATION}s${NC} (${TOTAL} req → $((TOTAL * 1000 / (DURATION > 0 ? DURATION : 1)))ms/req avg)"
fi

echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}\n"
