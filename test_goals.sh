#!/bin/bash
#!/bin/bash
set -e

BASE="http://localhost:6060/api/v1"
PHONE_A="+79001110001"
PHONE_B="+79001110002"
PHONE_C="+79001110003"
PASS="secret123"

# helper: register or login
get_token() {
  local phone=$1
  local name=$2
  local age=$3
  local token
  token=$(curl -s -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"phone_number\":\"$phone\",\"password\":\"$PASS\"}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || echo "")
  if [ -z "$token" ]; then
    token=$(curl -s -X POST "$BASE/auth/register" \
      -H "Content-Type: application/json" \
      -d "{\"phone_number\":\"$phone\",\"password\":\"$PASS\",\"full_name\":\"$name\",\"age\":$age}" \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
  fi
  echo "$token"
}

echo "=== 1. Получаем токены A, B, C ==="
TOKEN_A=$(get_token "$PHONE_A" "User A" 25)
TOKEN_B=$(get_token "$PHONE_B" "User B" 30)
TOKEN_C=$(get_token "$PHONE_C" "User C" 22)

echo "TOKEN_A length: ${#TOKEN_A}"
echo "TOKEN_B length: ${#TOKEN_B}"
echo "TOKEN_C length: ${#TOKEN_C}"

echo ""
echo "=== 2. A создаёт группу ==="
GROUP=$(curl -s -X POST "$BASE/groups" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Goals Group"}')
echo "$GROUP" | python3 -m json.tool
GROUP_ID=$(echo "$GROUP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "GROUP_ID=$GROUP_ID"

echo ""
echo "=== 3. Создать категорию ==="
CAT=$(curl -s -X POST "$BASE/groups/$GROUP_ID/goal-categories" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"name":"Фильмы"}')
echo "$CAT" | python3 -m json.tool
CAT_ID=$(echo "$CAT" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "CAT_ID=$CAT_ID"

echo ""
echo "=== 4. Список категорий ==="
curl -s "$BASE/groups/$GROUP_ID/goal-categories" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

echo ""
echo "=== 5. Переименовать категорию (v1 → v2) ==="
curl -i -X PATCH "$BASE/groups/$GROUP_ID/goal-categories/$CAT_ID" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"name":"Кино","version":1}' | head -1

echo ""
echo "=== 6. Переименовать со старой version → 409 ==="
curl -i -X PATCH "$BASE/groups/$GROUP_ID/goal-categories/$CAT_ID" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"name":"Кино 2","version":1}' | head -1

echo ""
echo "=== 7. Добавить элемент ==="
ITEM=$(curl -s -X POST "$BASE/groups/$GROUP_ID/goal-categories/$CAT_ID/items" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"title":"Посмотреть Дюну","description":"часть 2"}')
echo "$ITEM" | python3 -m json.tool
ITEM_ID=$(echo "$ITEM" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "ITEM_ID=$ITEM_ID"

echo ""
echo "=== 8. Отметить done ==="
curl -i -X PATCH "$BASE/groups/$GROUP_ID/goal-items/$ITEM_ID" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"done":true,"version":1}' | head -1

echo ""
echo "=== 9. Список элементов ==="
curl -s "$BASE/groups/$GROUP_ID/goal-categories/$CAT_ID/items" \
  -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

echo ""
echo "=== 10. Юзер C (не в группе) → 403 ==="
curl -i "$BASE/groups/$GROUP_ID/goal-categories" \
  -H "Authorization: Bearer $TOKEN_C" | head -1

echo ""
echo "=== 11. Удалить элемент ==="
curl -i -X DELETE "$BASE/groups/$GROUP_ID/goal-items/$ITEM_ID" \
  -H "Authorization: Bearer $TOKEN_A" | head -1

echo ""
echo "=== 12. Удалить категорию ==="
curl -i -X DELETE "$BASE/groups/$GROUP_ID/goal-categories/$CAT_ID" \
  -H "Authorization: Bearer $TOKEN_A" | head -1

echo ""
echo "=== ГОТОВО ==="