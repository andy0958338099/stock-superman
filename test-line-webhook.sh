#!/bin/bash

# 測試 LINE Webhook
# 模擬 LINE 伺服器發送的請求

WEBHOOK_URL="https://stock-superman.netlify.app/.netlify/functions/line-webhook"
CHANNEL_SECRET="4d52f432dd6158badbdb99aa40050b09"

# 建立測試 payload
PAYLOAD='{
  "destination": "U1234567890abcdef1234567890abcdef",
  "events": [
    {
      "type": "message",
      "message": {
        "type": "text",
        "id": "test123",
        "text": "2330"
      },
      "timestamp": 1234567890123,
      "source": {
        "type": "user",
        "userId": "U1234567890abcdef1234567890abcdef"
      },
      "replyToken": "test-reply-token-12345",
      "mode": "active"
    }
  ]
}'

echo "🧪 測試 LINE Webhook"
echo "URL: $WEBHOOK_URL"
echo ""
echo "📦 Payload:"
echo "$PAYLOAD" | jq .
echo ""

# 計算 signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$CHANNEL_SECRET" -binary | base64)

echo "🔐 Signature: $SIGNATURE"
echo ""

# 發送請求
echo "📤 發送請求..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Line-Signature: $SIGNATURE" \
  -d "$PAYLOAD" \
  -v

echo ""
echo ""
echo "✅ 測試完成"
echo ""
echo "請查看 Netlify Function Logs 確認是否收到請求"

