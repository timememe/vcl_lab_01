#!/bin/bash

# Test API endpoints
# Usage: ./test-api.sh

API_URL="http://localhost:4000"

echo "🧪 Testing VCL Lab API"
echo "====================="
echo ""

# Test 1: Health check
echo "1️⃣  Testing health endpoint..."
curl -s "$API_URL/api/health" | jq .
echo ""

# Test 2: Login
echo "2️⃣  Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "✅ Token received: ${TOKEN:0:20}..."
echo ""

# Test 3: Verify token
echo "3️⃣  Testing token verification..."
curl -s "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

# Test 4: Get usage
echo "4️⃣  Testing usage endpoint..."
curl -s "$API_URL/api/usage" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

# Test 5: Increment usage
echo "5️⃣  Testing usage increment..."
curl -s -X POST "$API_URL/api/usage/increment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"categoryId":"product_photo","creditsUsed":1,"aiModel":"openai"}' | jq .
echo ""

# Test 6: Get activity logs
echo "6️⃣  Testing activity logs (admin only)..."
curl -s "$API_URL/api/activity/logs?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

echo "✅ All tests completed!"
