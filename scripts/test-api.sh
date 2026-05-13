#!/usr/bin/env bash
# test-api.sh — End-to-end test of all BNPL backend endpoints
# Usage: bash scripts/test-api.sh [base_url]
# Default base_url: http://localhost:4000/api/v1

set -euo pipefail

BASE="${1:-http://localhost:4000/api/v1}"
PASS=0
FAIL=0
ADMIN_TOKEN=""
USER_TOKEN=""
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

# ─── 1. ADMIN LOGIN (Pre-seeded) ───
echo -e "${CYAN}[1] POST /auth/login (Admin)${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"amira@example.tn","password":"DemoPass123!"}')
check "Admin login" "201" "$RESP"
ADMIN_TOKEN=$(echo "$RESP" | sed '$d' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# ─── 2. USER SIGNUP ───
echo ""
echo -e "${CYAN}[2] POST /auth/signup (User)${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Regular User","email":"user@example.com","phone":"+21655555555","password":"password123"}')
BODY=$(echo "$RESP" | sed '$d')
check "User signup" "201" "$RESP"
USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
USER_TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "  -> USER_ID=$USER_ID"

# ─── 3. OWNERSHIP TEST: Attempt to set username for another user ───
echo ""
echo -e "${CYAN}[3] PATCH /auth/:userId/username (Ownership Breach Attempt)${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/auth/user_demo_amira/username" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"username":"hacked"}')
check "Ownership check (Should be 403)" "403" "$RESP"

# ─── 4. ADMIN: analytics ───
echo ""
echo -e "${CYAN}[4] GET /admin/analytics${NC}"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/admin/analytics" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "Admin analytics" "200" "$RESP"

# ─── 5. KYC: submit ───
echo ""
echo -e "${CYAN}[5] POST /kyc/$USER_ID/submit${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/kyc/$USER_ID/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"employmentStatus":"unemployed","documents":[{"type":"cin_front","fileName":"cin_front.jpg","storagePath":"clients/test/kyc/cin_front.jpg"},{"type":"cin_back","fileName":"cin_back.jpg","storagePath":"clients/test/kyc/cin_back.jpg"},{"type":"selfie","fileName":"selfie.jpg","storagePath":"clients/test/kyc/selfie.jpg"},{"type":"proof_of_address","fileName":"addr.jpg","storagePath":"clients/test/kyc/addr.jpg"}]}')
BODY=$(echo "$RESP" | sed '$d')
check "Submit KYC" "201" "$RESP"
KYC_APP_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# ─── 6. KYC: approve (by Admin) ───
echo ""
echo -e "${CYAN}[6] PATCH /kyc/applications/$KYC_APP_ID/approve${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/kyc/applications/$KYC_APP_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "Approve KYC" "200" "$RESP"

# ─── 7. MERCHANTS: register ───
echo ""
echo -e "${CYAN}[7] POST /merchants/register${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/merchants/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"legalName":"User Store","displayName":"UserStore","category":"retail"}')
BODY=$(echo "$RESP" | sed '$d')
check "Register merchant" "201" "$RESP"
MERCHANT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# ─── 8. MERCHANTS: approve (by Admin) ───
echo ""
echo -e "${CYAN}[8] PATCH /merchants/$MERCHANT_ID/approve${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/merchants/$MERCHANT_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "Approve merchant" "200" "$RESP"

# ─── 9. MERCHANTS: create product ───
echo ""
echo -e "${CYAN}[9] POST /merchants/products${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/merchants/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d "{\"merchantId\":\"$MERCHANT_ID\",\"name\":\"Cool Item\",\"description\":\"Stuff\",\"price\":50,\"stock\":10}")
check "Create product" "201" "$RESP"
PRODUCT_ID=$(echo "$RESP" | sed '$d' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# ─── 10. LOANS: create ───
echo ""
echo -e "${CYAN}[10] POST /loans${NC}"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/loans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d "{\"userId\":\"$USER_ID\",\"merchantId\":\"$MERCHANT_ID\",\"amount\":20}")
check "Create loan" "201" "$RESP"
LOAN_ID=$(echo "$RESP" | sed '$d' | grep -o '"id":"loan_[^"]*"' | head -1 | cut -d'"' -f4)

# ─── 11. NOTIFICATIONS: list ───
echo ""
echo -e "${CYAN}[11] GET /notifications/user/$USER_ID${NC}"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/notifications/user/$USER_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
check "User notifications" "200" "$RESP"

# ─── SUMMARY ───
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC}"
echo -e "${CYAN}========================================${NC}"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
