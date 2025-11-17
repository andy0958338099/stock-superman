/**
 * LINE Webhook Handler
 * 處理 LINE Bot 訊息、去重、快取、回覆 Flex Message
 */

const line = require('@line/bot-sdk');
const { 
  isReplyTokenUsed, 
  recordReplyToken, 
  getStockCache, 
  saveStockCache 
} = require('./supabase-client');
const { fetchStockPrice, fetchStockInfo, isValidStockId } = require('./finmind');
const { generateIndicatorChart } = require('./generate-chart-quickchart');
const { analyzeWithDeepSeek } = require('./deepseek');
const { analyzeKD, analyzeMACDSignal, calculateKD, calculateMACD } = require('./indicators');

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

if (!config.channelAccessToken || !config.channelSecret) {
  throw new Error('❌ LINE 環境變數未設定：需要 LINE_CHANNEL_ACCESS_TOKEN 和 LINE_CHANNEL_SECRET');
}

const client = new line.Client(config);

/**
 * 建立 Flex Message（股票分析結果）
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {object} latestData - 最新股價資料
 * @param {string} imageUrl - 圖表 URL
 * @param {object} kdAnalysis - KD 分析結果
 * @param {object} macdAnalysis - MACD 分析結果
 * @param {object} aiResult - AI 分析結果（可為 null）
 * @returns {object} - Flex Message 物件
 */
function createFlexMessage(stockId, stockName, latestData, imageUrl, kdAnalysis, macdAnalysis, aiResult) {
  const title = `${stockId} ${stockName}`;
  const priceInfo = `收盤價：${latestData.close} | ${latestData.date}`;
  
  // 建立技術指標摘要
  const kdSummary = `KD：${kdAnalysis.signal} (K=${kdAnalysis.K}, D=${kdAnalysis.D})`;
  const macdSummary = `MACD：${macdAnalysis.signal}`;
  
  // AI 分析摘要
  let aiSummary = '';
  if (aiResult) {
    aiSummary = `📊 AI 預測（10日）\n` +
                `↗️ 上漲 ${aiResult.probability_up}% | ➡️ 持平 ${aiResult.probability_flat}% | ↘️ 下跌 ${aiResult.probability_down}%\n` +
                `💡 ${aiResult.trend_summary || ''}`;
  } else {
    aiSummary = '⚠️ AI 分析暫時不可用';
  }
  
  const flexMessage = {
    type: 'bubble',
    hero: {
      type: 'image',
      url: imageUrl,
      size: 'full',
      aspectRatio: '4:5',
      aspectMode: 'cover'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: title,
          weight: 'bold',
          size: 'xl',
          color: '#1DB446'
        },
        {
          type: 'text',
          text: priceInfo,
          size: 'sm',
          color: '#999999',
          margin: 'md'
        },
        {
          type: 'separator',
          margin: 'lg'
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: '📈 技術指標',
              weight: 'bold',
              size: 'md',
              color: '#555555'
            },
            {
              type: 'text',
              text: kdSummary,
              size: 'sm',
              wrap: true,
              color: '#666666'
            },
            {
              type: 'text',
              text: kdAnalysis.description,
              size: 'xs',
              wrap: true,
              color: '#999999'
            },
            {
              type: 'text',
              text: macdSummary,
              size: 'sm',
              wrap: true,
              color: '#666666',
              margin: 'md'
            },
            {
              type: 'text',
              text: macdAnalysis.description,
              size: 'xs',
              wrap: true,
              color: '#999999'
            }
          ]
        },
        {
          type: 'separator',
          margin: 'lg'
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: aiSummary,
              size: 'sm',
              wrap: true,
              color: '#333333'
            }
          ]
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: '💡 資料來源：FinMind | AI：DeepSeek',
          size: 'xxs',
          color: '#aaaaaa',
          align: 'center'
        }
      ]
    }
  };
  
  return flexMessage;
}

/**
 * 處理股票查詢
 * @param {string} replyToken - LINE reply token
 * @param {string} stockId - 股票代號
 */
async function handleStockQuery(replyToken, stockId) {
  try {
    console.log(`\n🔍 處理股票查詢：${stockId}`);

    // 1. 檢查快取（12 小時內）
    const cache = await getStockCache(stockId, 12);
    if (cache && cache.image_url) {
      console.log('✅ 使用快取資料');

      // 從快取建立 Flex Message
      const flexMessage = {
        type: 'bubble',
        hero: {
          type: 'image',
          url: cache.image_url,
          size: 'full',
          aspectRatio: '4:5',
          aspectMode: 'cover'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${stockId}（快取）`,
              weight: 'bold',
              size: 'xl',
              color: '#1DB446'
            },
            {
              type: 'text',
              text: cache.result_summary || '已快取分析結果',
              size: 'sm',
              wrap: true,
              margin: 'md'
            },
            {
              type: 'text',
              text: `⏰ 快取時間：${new Date(cache.updated_at).toLocaleString('zh-TW')}`,
              size: 'xs',
              color: '#999999',
              margin: 'md'
            }
          ]
        }
      };

      await client.replyMessage(replyToken, {
        type: 'flex',
        altText: `${stockId} 分析結果（快取）`,
        contents: flexMessage
      });

      return;
    }

    // 如果快取存在但 image_url 是 null，忽略快取重新生成
    if (cache && !cache.image_url) {
      console.log('⚠️ 快取的圖片 URL 無效，重新生成');
    }

    // 2. 無快取，開始分析流程
    console.log('📥 快取未命中，開始抓取資料...');

    // ⚠️ 重要：不能先回「分析中」再回結果，因為 replyToken 只能用一次
    // 所以直接進行完整分析，然後一次回覆完整結果

    // 3. 抓取股票資料
    const [stockData, stockInfo] = await Promise.all([
      fetchStockPrice(stockId),
      fetchStockInfo(stockId)
    ]);

    if (!stockData || stockData.length < 30) {
      throw new Error('資料不足，至少需要 30 天的歷史資料');
    }

    console.log(`✅ 已抓取 ${stockData.length} 天資料`);

    // 4. 生成圖表
    const chartInfo = await generateIndicatorChart(stockId, stockData, stockInfo.stock_name);

    // 5. 計算技術指標分析
    const recentData = stockData.slice(-60);
    const { K, D } = calculateKD(recentData);
    const { MACD, Signal, Histogram } = calculateMACD(recentData);
    const kdAnalysis = analyzeKD(K, D);
    const macdAnalysis = analyzeMACDSignal(MACD, Signal, Histogram);

    // 6. 呼叫 AI 分析（可能較慢）
    let aiResult = null;
    try {
      aiResult = await analyzeWithDeepSeek(stockId, stockData, stockInfo.stock_name);
    } catch (error) {
      console.warn('⚠️ AI 分析失敗，繼續流程:', error.message);
    }

    // 7. 建立結果摘要
    const latestData = stockData[stockData.length - 1];
    let summaryText = `${stockInfo.stock_name} | 收盤 ${latestData.close}\n`;
    summaryText += `KD：${kdAnalysis.signal} | MACD：${macdAnalysis.signal}\n`;
    if (aiResult) {
      summaryText += `AI 預測：↗️${aiResult.probability_up}% ➡️${aiResult.probability_flat}% ↘️${aiResult.probability_down}%`;
    }

    // 8. 儲存快取
    await saveStockCache({
      stock_id: stockId,
      result_json: {
        stock_info: stockInfo,
        latest_data: latestData,
        kd_analysis: kdAnalysis,
        macd_analysis: macdAnalysis,
        ai_result: aiResult,
        timestamp: new Date().toISOString()
      },
      image_url: chartInfo.imageUrl,
      image_path: null,
      result_summary: summaryText
    });

    console.log('✅ 快取已儲存');

    // 9. 建立並發送 Flex Message
    const flexMessage = createFlexMessage(
      stockId,
      stockInfo.stock_name,
      latestData,
      chartInfo.imageUrl,
      kdAnalysis,
      macdAnalysis,
      aiResult
    );

    // 發送 Flex Message（使用 replyToken 一次性回覆）
    await client.replyMessage(replyToken, {
      type: 'flex',
      altText: `${stockId} ${stockInfo.stock_name} 分析結果`,
      contents: flexMessage
    });

    console.log('✅ 分析完成並已回覆');

  } catch (error) {
    console.error('❌ 處理股票查詢失敗:', error);

    // 回覆錯誤訊息
    try {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: `❌ 查詢失敗\n\n${error.message}\n\n請確認股票代號是否正確，或稍後再試。`
      });
    } catch (replyError) {
      console.error('回覆錯誤訊息失敗:', replyError);
    }
  }
}

/**
 * Netlify Function Handler
 */
exports.handler = async function(event, context) {
  console.log('🔔 LINE Webhook 被呼叫');

  try {
    // 只處理 POST 請求
    if (event.httpMethod !== 'POST') {
      console.log('❌ 非 POST 請求');
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // 驗證 LINE Signature
    const signature = event.headers['x-line-signature'];
    if (!signature) {
      console.error('❌ 缺少 LINE signature');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    console.log('✅ 收到 signature');

    // 驗證 signature（使用 @line/bot-sdk 的內建驗證）
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('SHA256', config.channelSecret)
      .update(event.body)
      .digest('base64');

    if (hash !== signature) {
      console.error('❌ Signature 驗證失敗');
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    console.log('✅ Signature 驗證成功');

    // 解析 body
    const body = JSON.parse(event.body);
    const events = body.events || [];

    console.log(`\n📨 收到 ${events.length} 個事件`);

    // 處理每個事件
    for (const ev of events) {
      // 只處理文字訊息
      if (ev.type !== 'message' || ev.message.type !== 'text') {
        console.log(`⏭️ 跳過非文字訊息：${ev.type}`);
        continue;
      }

      const replyToken = ev.replyToken;
      const text = ev.message.text.trim();

      console.log(`📝 收到訊息：${text}`);

      // 1. 檢查 reply token 是否已使用（去重）
      const isUsed = await isReplyTokenUsed(replyToken);
      if (isUsed) {
        console.log('⚠️ Reply token 已使用過，忽略');
        continue;
      }

      // 2. 記錄 reply token
      await recordReplyToken(replyToken);

      // 3. 解析股票代號
      const stockIdMatch = text.match(/\d{3,5}/);
      if (!stockIdMatch) {
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '👋 歡迎使用股市大亨 LINE Bot！\n\n' +
                '📊 請輸入股票代號查詢分析\n' +
                '例如：2330、0050、2454\n\n' +
                '✨ 功能特色：\n' +
                '• FinMind 即時資料\n' +
                '• KD、MACD 技術指標\n' +
                '• DeepSeek AI 走勢預測\n' +
                '• 12 小時智慧快取'
        });
        continue;
      }

      const stockId = stockIdMatch[0];

      // 4. 驗證股票代號格式
      if (!isValidStockId(stockId)) {
        await client.replyMessage(replyToken, {
          type: 'text',
          text: `❌ 股票代號格式錯誤：${stockId}\n\n請輸入 3-5 位數字的台股代號`
        });
        continue;
      }

      // 5. 處理股票查詢
      await handleStockQuery(replyToken, stockId);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'OK' })
    };

  } catch (error) {
    console.error('❌ Webhook 處理失敗:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

