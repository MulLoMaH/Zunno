#!/bin/bash
set -e
BASE="http://localhost:6060/api/v1"
TS=$(date +%s)
PHONE="+7900${TS:0:7}01"
PASS="secret123"

TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"$PHONE\",\"password\":\"$PASS\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
if [ -z "$TOKEN" ]; then
  TOKEN=$(curl -s -X POST "$BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"phone_number\":\"$PHONE\",\"password\":\"$PASS\",\"full_name\":\"Planner\",\"age\":30}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
fi

G=$(curl -s -X POST "$BASE/groups" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"name":"Plans Test"}')
GID=$(echo "$G" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "GID=$GID"

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
FUTURE=$(date -u -v+1d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "+1 day" +%Y-%m-%dT%H:%M:%SZ)

echo ""
echo "=== Создать план ==="
PLAN=$(curl -s -X POST "$BASE/groups/$GID/plans" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"title\":\"Пикник\",\"description\":\"парк\",\"event_date\":\"$FUTURE\"}")
echo "$PLAN" | python3 -m json.tool
PID=$(echo "$PLAN" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo ""
echo "=== Список планов ==="
curl -s "$BASE/groups/$GID/plans?from=$NOW&to=$FUTURE" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo ""
echo "=== Обновить план ==="
curl -s -X PATCH "$BASE/groups/$GID/plans/$PID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"title\":\"Пикник v2\",\"description\":\"парк\",\"event_date\":\"$FUTURE\",\"is_done\":false,\"version\":1}" \
  | python3 -m json.tool

echo ""
echo "=== Добавить чек-лист ==="
ITEM=$(curl -s -X POST "$BASE/groups/$GID/plans/$PID/checklist" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"взять плед"}')
echo "$ITEM" | python3 -m json.tool
IID=$(echo "$ITEM" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo ""
echo "=== Отметить чек-лист ==="
curl -s -X PATCH "$BASE/groups/$GID/checklist/$IID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"взять плед","is_checked":true,"version":1}' | python3 -m json.tool

echo ""
echo "=== Удалить чек-лист ==="
curl -i -X DELETE "$BASE/groups/$GID/checklist/$IID" \
  -H "Authorization: Bearer $TOKEN" | head -1

echo ""
echo "=== Удалить план ==="
curl -i -X DELETE "$BASE/groups/$GID/plans/$PID" \
  -H "Authorization: Bearer $TOKEN" | head -1

echo ""
echo "=== ГОТОВО ==="