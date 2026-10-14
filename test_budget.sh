#!/bin/bash
set -e

BASE="http://localhost:6060/api/v1"
TS=$(date +%s)
PHONE_A="+7900${TS:0:7}01"
PASS="secret123"

echo "=== 1. Регистрация/логин A ==="
TOKEN_A=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"$PHONE_A\",\"password\":\"$PASS\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || echo "")

if [ -z "$TOKEN_A" ]; then
  TOKEN_A=$(curl -s -X POST "$BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"phone_number\":\"$PHONE_A\",\"password\":\"$PASS\",\"full_name\":\"Budget Tester\",\"age\":25}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
fi
echo "TOKEN_A length: ${#TOKEN_A}"

echo ""
echo "=== 2. Создание группы ==="
GROUP=$(curl -s -X POST "$BASE/groups" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"name":"Budget Group"}')
GROUP_ID=$(echo "$GROUP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "GROUP_ID=$GROUP_ID"

echo ""
echo "=== 3. Создание категории ==="
CAT=$(curl -s -X POST "$BASE/groups/$GROUP_ID/categories" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"name":"Еда","type":"fixed","budget_limit":10000}')
echo "$CAT" | python3 -m json.tool
CAT_ID=$(echo "$CAT" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "CAT_ID=$CAT_ID"

echo ""
echo "=== 4. Создание транзакции ==="
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TX=$(curl -s -X POST "$BASE/groups/$GROUP_ID/transactions" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d "{\"category_id\":\"$CAT_ID\",\"amount\":1500.50,\"date\":\"$NOW\",\"description\":\"обед\"}")
echo "$TX" | python3 -m json.tool

echo ""
echo "=== 5. Ждём 2 сек, чтобы Kafka обработала ==="
sleep 2

echo ""
echo "=== 6. Statistics ==="
curl -s "$BASE/groups/$GROUP_ID/statistics?month=$(date +%Y-%m)" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

echo ""
echo "=== 7. Budget summary ==="
curl -s "$BASE/groups/$GROUP_ID/budget/summary?month=$(date +%Y-%m)" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

echo ""
echo "=== 8. Список транзакций ==="
curl -s "$BASE/groups/$GROUP_ID/transactions" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

echo ""
echo "=== ГОТОВО ==="