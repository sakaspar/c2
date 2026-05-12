#!/usr/bin/env bash
# test-api.sh — End-to-end test of all BNPL backend endpoints
# Usage: bash scripts/test-api.sh [base_url]
# Default base_url: http://localhost:4000/api/v1

set -euo pipefail

BASE="${1:-http://localhost:4000/api/v1}"
PASS=0
FAIL=0
TOKEN=""
USER_ID=""
MERCHANT_ID=""
PRODUCT_ID=""
KYC_APP_ID=""
LOAN_ID=""

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

check() {
  local label="$1" expected="$2" resp="$3"
  local status; status=$(echo "$resp" | tail -1)
  local body; body=$(echo "$resp" | sed '$d')
  if [ "$status" = "$expected" ]; then
    echo -e "  ${GREEN}PASS${NC} $label (HTTP $status)"
    PASS=$((PASS + 1))
    echo "$body"
  else
    echo -e "  ${RED}FAIL${NC} $label (expected $expected, got $status)"
    FAIL=$((FAIL + 1))
    echo "$body"
  fi
}

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  BNPL API Endpoint Test Suite${NC}"
echo -e "${CYAN}  Target: $BASE${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ─── 1. AUTH: signup ───
echo -e "${CYAN}[1] POST /auth/signup${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"testuser@example.com","phone":"+21620123456","password":"password123"}')
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
check "Create local account" "201" "$RESP"
USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "  -> USER_ID=$USER_ID"

# ─── 2. AUTH: login ───
echo ""
echo -e "${CYAN}[2] POST /auth/login${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testuser@example.com","password":"password123"}')
check "Login with email" "201" "$RESP"
TOKEN=$(echo "$RESP" | sed '$d' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# ─── 3. AUTH: google (no real token, expect 400) ───
echo ""
echo -e "${CYAN}[3] POST /auth/google (invalid token)${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/google" \
  -H "Content-Type: application/json" \
  -d '{"idToken":"fake-token"}')
check "Google signup with bad token" "400" "$RESP"

# ─── 4. ADMIN: analytics ───
echo ""
echo -e "${CYAN}[4] GET /admin/analytics${NC}"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/admin/analytics")
check "Admin analytics" "200" "$RESP"

# ─── 5. ADMIN: clients ───
echo ""
echo -e "${CYAN}[5] GET /admin/clients${NC}"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/admin/clients")
check "List clients" "200" "$RESP"

# ─── 6. ADMIN: kyc-applications ───
echo ""
echo -e "${CYAN}[6] GET /admin/kyc-applications${NC}"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/admin/kyc-applications")
check "List KYC applications" "200" "$RESP"

# ─── 7. KYC: submit ───
echo ""
echo -e "${CYAN}[7] POST /kyc/$USER_ID/submit${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/kyc/$USER_ID/submit" \
  -H "Content-Type: application/json" \
  -d '{"employmentStatus":"unemployed","documents":[{"type":"cin_front","fileName":"cin_front.jpg","storagePath":"clients/test/kyc/cin_front.jpg"},{"type":"cin_back","fileName":"cin_back.jpg","storagePath":"clients/test/kyc/cin_back.jpg"},{"type":"selfie","fileName":"selfie.jpg","storagePath":"clients/test/kyc/selfie.jpg"},{"type":"proof_of_address","fileName":"addr.jpg","storagePath":"clients/test/kyc/addr.jpg"}]}')
BODY=$(echo "$RESP" | sed '$d')
check "Submit KYC (unemployed)" "201" "$RESP"
KYC_APP_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  -> KYC_APP_ID=$KYC_APP_ID"

# ─── 8. KYC: approve ───
echo ""
echo -e "${CYAN}[8] PATCH /kyc/applications/$KYC_APP_ID/approve${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/kyc/applications/$KYC_APP_ID/approve")
check "Approve KYC application" "200" "$RESP"

# ─── 9. KYC: reject (on already-approved, expect 200 but state unchanged) ───
echo ""
echo -e "${CYAN}[9] PATCH /kyc/applications/$KYC_APP_ID/reject${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/kyc/applications/$KYC_APP_ID/reject" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Test rejection"}')
check "Reject KYC application" "200" "$RESP"

# ─── 10. MERCHANTS: create ───
echo ""
echo -e "${CYAN}[10] POST /merchants${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/merchants" \
  -H "Content-Type: application/json" \
  -d '{"legalName":"Test Store SARL","displayName":"TestStore","category":"electronics"}')
BODY=$(echo "$RESP" | sed '$d')
check "Create merchant" "201" "$RESP"
MERCHANT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  -> MERCHANT_ID=$MERCHANT_ID"

# ─── 11. MERCHANTS: list ───
echo ""
echo -e "${CYAN}[11] GET /merchants${NC}"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/merchants")
check "List merchants" "200" "$RESP"

# ─── 12. MERCHANTS: approve ───
echo ""
echo -e "${CYAN}[12] PATCH /merchants/$MERCHANT_ID/approve${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/merchants/$MERCHANT_ID/approve")
check "Approve merchant" "200" "$RESP"

# ─── 13. MERCHANTS: create product ───
echo ""
echo -e "${CYAN}[13] POST /merchants/products${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/merchants/products" \
  -H "Content-Type: application/json" \
  -d "{\"merchantId\":\"$MERCHANT_ID\",\"name\":\"Test Laptop\",\"description\":\"A test laptop\",\"price\":800,\"stock\":5}")
BODY=$(echo "$RESP" | sed '$d')
check "Create product" "201" "$RESP"
PRODUCT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  -> PRODUCT_ID=$PRODUCT_ID"

# ─── 14. MERCHANTS: list products ───
echo ""
echo -e "${CYAN}[14] GET /merchants/products${NC}"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/merchants/products")
check "List products" "200" "$RESP"

# ─── 15. LOANS: create ───
echo ""
echo -e "${CYAN}[15] POST /loans${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/loans" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"merchantId\":\"$MERCHANT_ID\",\"amount\":80}")
BODY=$(echo "$RESP" | sed '$d')
check "Create loan" "201" "$RESP"
LOAN_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  -> LOAN_ID=$LOAN_ID"

# ─── 16. LOANS: list ───
echo ""
echo -e "${CYAN}[16] GET /loans${NC}"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/loans")
check "List loans" "200" "$RESP"

# ─── 17. LOANS: checkout ───
echo ""
echo -e "${CYAN}[17] POST /loans/checkout${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/loans/checkout" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"productId\":\"$PRODUCT_ID\"}")
check "Checkout product" "201" "$RESP"

# ─── 18. LOANS: repay ───
echo ""
echo -e "${CYAN}[18] POST /loans/$LOAN_ID/repay${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/loans/$LOAN_ID/repay" \
  -H "Content-Type: application/json" \
  -d '{"amount":20}')
check "Repay loan (partial)" "201" "$RESP"

# ─── 19. CREDIT: recalculate ───
echo ""
echo -e "${CYAN}[19] POST /credit/$USER_ID/recalculate${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/credit/$USER_ID/recalculate")
check "Recalculate credit score" "201" "$RESP"

# ─── 20. CREDIT: history ───
echo ""
echo -e "${CYAN}[20] GET /credit/$USER_ID${NC}"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/credit/$USER_ID")
check "Credit score history" "200" "$RESP"

# ─── 21. NOTIFICATIONS: list ───
echo ""
echo -e "${CYAN}[21] GET /notifications/user/$USER_ID${NC}"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/notifications/user/$USER_ID")
check "User notifications" "200" "$RESP"

# ─── SUMMARY ───
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC}"
echo -e "${CYAN}========================================${NC}"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
