#!/bin/bash

# 測試 Netlify Function 是否運作
# 請將 YOUR_NETLIFY_URL 替換成你的實際 URL

NETLIFY_URL="YOUR_NETLIFY_URL"  # 例如：https://stock-superman-123.netlify.app

echo "🧪 測試 Netlify Function..."
echo "URL: ${NETLIFY_URL}/.netlify/functions/line-webhook"
echo ""

# 測試 GET 請求（應該回傳 405 Method Not Allowed，表示 function 存在）
curl -i "${NETLIFY_URL}/.netlify/functions/line-webhook"

echo ""
echo "---"
echo "✅ 如果看到 '405 Method Not Allowed' 或 '400 Bad Request'，表示 Function 正常運作"
echo "❌ 如果看到 '404 Not Found'，表示 Function 沒有部署成功"

