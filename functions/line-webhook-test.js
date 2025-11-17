/**
 * 簡化版 LINE Webhook - 用於測試
 * 只回應簡單訊息，不做任何複雜處理
 */

const crypto = require('crypto');

exports.handler = async (event, context) => {
  console.log('🔔 收到 LINE Webhook 請求');
  
  try {
    // 只接受 POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // 驗證 LINE Signature
    const signature = event.headers['x-line-signature'];
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    
    if (!channelSecret) {
      console.error('❌ LINE_CHANNEL_SECRET 未設定');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Configuration error' })
      };
    }

    const body = event.body;
    const hash = crypto
      .createHmac('SHA256', channelSecret)
      .update(body)
      .digest('base64');

    if (hash !== signature) {
      console.error('❌ Signature 驗證失敗');
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    console.log('✅ Signature 驗證成功');

    // 解析 webhook body
    const data = JSON.parse(body);
    console.log('📦 Webhook data:', JSON.stringify(data, null, 2));

    // 回應 200 OK（不做任何回覆）
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'OK' })
    };

  } catch (error) {
    console.error('❌ 錯誤:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

