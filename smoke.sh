#!/bin/bash
# smoke.sh — полная проверка auth-flow

BASE="http://localhost:6060/api/v1"
COOKIES=/tmp/zunno_cookies.txt
PHONE="+7999$(date +%s | tail -c 9)"   # уникальный телефон для каждого запуска

echo "=========================================="
echo "1. РЕГИСТРАЦИЯ ($PHONE)"
echo "=========================================="
REG=$(curl -s -i -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -c "$COOKIES" \
  -d "{\"phone_number\":\"$PHONE\",\"password\":\"secret123\",\"full_name\":\"Test User\",\"age\":25}")
echo "$REG" | head -1
echo "$REG" | grep -i "content-type"
echo "$REG" | tail -1

echo ""
echo "=========================================="
echo "2. ПОВТОРНАЯ РЕГИСТРАЦИЯ (ожидаем 500 или 409)"
echo "=========================================="
curl -s -i -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"$PHONE\",\"password\":\"secret123\",\"full_name\":\"Test User\",\"age\":25}" \
  | head -1

echo ""
echo "=========================================="
echo "3. ЛОГИН НЕВЕРНЫЙ ПАРОЛЬ (ожидаем 401)"
echo "=========================================="
curl -s -i -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"$PHONE\",\"password\":\"wrong\"}" \
  | head -1

echo ""
echo "=========================================="
echo "4. ЛОГИН УСПЕШНЫЙ (ожидаем 200)"
echo "=========================================="
LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -c "$COOKIES" \
  -d "{\"phone_number\":\"$PHONE\",\"password\":\"secret123\"}")
echo "$LOGIN" | python3 -m json.tool 2>/dev/null || echo "$LOGIN"

TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo ""
echo "=========================================="
echo "5. GET /users БЕЗ ТОКЕНА (ожидаем 401)"
echo "=========================================="
curl -s -i "$BASE/users" | head -1

echo ""
echo "=========================================="
echo "6. GET /users С ТОКЕНОМ (ожидаем 200)"
echo "=========================================="
curl -s -i "$BASE/users" -H "Authorization: Bearer $TOKEN" | head -1
echo "..."
curl -s "$BASE/users" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null | head -30

echo ""
echo "=========================================="
echo "7. GET /users С ТОКЕНОМ + created_at"
echo "=========================================="
curl -s "$BASE/users" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; [print(u['full_name'], u['created_at']) for u in json.load(sys.stdin)]" 2>/dev/null

echo ""
echo "=========================================="
echo "8. REFRESH (ожидаем 200, кука ротируется)"
echo "=========================================="
REFRESH=$(curl -s -i -X POST "$BASE/auth/refresh" -b "$COOKIES" -c "$COOKIES")
echo "$REFRESH" | head -1
NEW_TOKEN=$(echo "$REFRESH" | tail -1 | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

echo ""
echo "=========================================="
echo "9. LOGOUT (ожидаем 204)"
echo "=========================================="
curl -s -i -X POST "$BASE/auth/logout" -b "$COOKIES" -c "$COOKIES" | head -1

echo ""
echo "=========================================="
echo "10. REFRESH ПОСЛЕ LOGOUT (ожидаем 401)"
echo "=========================================="
curl -s -i -X POST "$BASE/auth/refresh" -b "$COOKIES" | head -1

echo ""
echo "=========================================="
echo "11. GET /users С ТОКЕНОМ ИЗ REFRESH (ожидаем 200)"
echo "=========================================="
curl -s -i "$BASE/users" -H "Authorization: Bearer $NEW_TOKEN" | head -1

echo ""
echo "=========================================="
echo "ГОТОВО"
echo "=========================================="