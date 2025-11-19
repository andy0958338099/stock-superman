/**
 * LINE Webhook Handler
 * 處理 LINE Bot 訊息、去重、快取、回覆 Flex Message
 */

const line = require('@line/bot-sdk');
const {
  isReplyTokenUsed,
  recordReplyToken,
  getStockCache,
  saveStockCache,
  deleteStockCache
} = require('./supabase-client');
const { fetchStockPrice, fetchStockInfo, isValidStockId } = require('./finmind');
const { generateIndicatorChart } = require('./generate-chart-quickchart');
const { analyzeWithDeepSeek } = require('./deepseek');
const { analyzeKD, analyzeMACDSignal, calculateKD, calculateMACD } = require('./indicators');
const { analyzeUSMarket } = require('./us-market-analysis');
const { generateUSMarketFlexMessage } = require('./us-market-flex-message');

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
 * 處理美股分析指令
 * @returns {Promise<object>} - LINE 訊息物件
 */
async function handleUSMarketCommand() {
  const startTime = Date.now();

  try {
    console.log('🌎 開始處理美股分析請求...');

    // 執行美股分析
    const analysisResult = await analyzeUSMarket();

    // 生成 Flex Message
    const flexMessage = generateUSMarketFlexMessage(analysisResult);

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ 美股分析請求處理完成（總耗時 ${totalTime.toFixed(2)} 秒）`);

    return flexMessage;

  } catch (error) {
    const totalTime = (Date.now() - startTime) / 1000;
    console.error(`❌ 美股分析失敗（耗時 ${totalTime.toFixed(2)} 秒）:`, error.message);
    console.error('錯誤堆疊:', error.stack);

    let errorMessage = '❌ 美股分析失敗\n\n';

    // 更詳細的錯誤分類
    if (error.message && error.message.includes('超時')) {
      errorMessage += '⏱️ 處理超時\n\n' +
                     '可能原因：\n' +
                     '• 資料抓取時間過長\n' +
                     '• 網路連線不穩定\n\n' +
                     '💡 建議：\n' +
                     '• 請等待 2-3 分鐘後再試\n' +
                     '• 如持續發生，請聯繫管理員';
    } else if (error.message && error.message.includes('資料格式錯誤')) {
      errorMessage += '📊 資料格式異常\n\n' +
                     '可能原因：\n' +
                     '• FinMind API 資料格式變更\n' +
                     '• 資料欄位缺失\n\n' +
                     '💡 建議：請稍後再試';
    } else if (error.message && error.message.includes('資料不足')) {
      errorMessage += '📉 資料不足\n\n' +
                     '可能原因：\n' +
                     '• 資料筆數不足以計算指標\n' +
                     '• API 返回資料不完整\n\n' +
                     '💡 建議：請稍後再試';
    } else if (error.message && error.message.includes('FinMind') || error.message.includes('頻率限制')) {
      errorMessage += '🚫 API 請求限制\n\n' +
                     '可能原因：\n' +
                     '• FinMind API 頻率限制\n' +
                     '• API 配額暫時用完\n\n' +
                     '💡 建議：\n' +
                     '• 等待 2-3 分鐘後再試\n' +
                     '• 使用快取資料（4 小時內有效）';
    } else if (error.message && error.message.includes('DeepSeek')) {
      errorMessage += '🤖 AI 分析失敗\n\n' +
                     '可能原因：\n' +
                     '• DeepSeek API 暫時無法使用\n' +
                     '• API 配額不足\n\n' +
                     '💡 建議：請稍後再試';
    } else {
      errorMessage += '⚠️ 系統錯誤\n\n' +
                     '可能原因：\n' +
                     '• 系統處理異常\n' +
                     '• 網路連線問題\n\n' +
                     `錯誤訊息：${error.message}\n\n` +
                     '💡 建議：請稍後再試或聯繫管理員';
    }

    return {
      type: 'text',
      text: errorMessage
    };
  }
}

/**
 * 處理快取管理指令
 * @param {string} replyToken - LINE reply token
 * @param {string} text - 指令文字
 * @returns {Promise<boolean>} - 是否為快取管理指令
 */
async function handleCacheCommand(replyToken, text) {
  // 刪除所有快取：清除快取
  if (text === '清除快取' || text === '刪除快取' || text === 'clear cache') {
    const result = await deleteStockCache(null);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: `🔧 快取管理\n\n${result.message}`
    });
    return true;
  }

  // 刪除特定股票快取：刪除快取 2330
  const deleteMatch = text.match(/^(?:刪除快取|清除快取|delete cache)\s+(\d{3,5})$/i);
  if (deleteMatch) {
    const stockId = deleteMatch[1];
    const result = await deleteStockCache(stockId);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: `🔧 快取管理\n\n${result.message}`
    });
    return true;
  }

  return false;
}

/**
 * 建立 Flex Message（股票分析結果）
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {object} latestData - 最新股價資料
 * @param {string} kdImageUrl - KD 圖表 URL
 * @param {string} macdImageUrl - MACD 圖表 URL
 * @param {object} kdAnalysis - KD 分析結果
 * @param {object} macdAnalysis - MACD 分析結果
 * @param {object} aiResult - AI 分析結果（可為 null）
 * @returns {object} - Flex Message 物件
 */
function createFlexMessage(stockId, stockName, latestData, kdImageUrl, macdImageUrl, kdAnalysis, macdAnalysis, aiResult) {
  const title = `${stockId} ${stockName}`;
  const priceInfo = `收盤價：${latestData.close} | ${latestData.date}`;

  // 建立技術指標摘要
  const kdSummary = `KD：${kdAnalysis.signal} (K=${kdAnalysis.K}, D=${kdAnalysis.D})`;
  const macdSummary = `MACD：${macdAnalysis.signal}`;

  // AI 分析摘要
  let aiSummary = '';
  if (aiResult) {
    aiSummary = `📊 預期最近10日走勢\n` +
                `↗️ 上漲 ${aiResult.probability_up}% | ➡️ 持平 ${aiResult.probability_flat}% | ↘️ 下跌 ${aiResult.probability_down}%\n` +
                `💡 ${aiResult.trend_summary || ''}`;
  } else {
    aiSummary = '⚠️ AI 分析暫時不可用';
  }

  const flexMessage = {
    type: 'bubble',
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
        },
        {
          type: 'separator',
          margin: 'lg'
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          spacing: 'none',
          contents: [
            {
              type: 'image',
              url: kdImageUrl,
              size: 'full',
              aspectMode: 'fit',
              aspectRatio: '16:11',
              margin: 'none'
            },
            {
              type: 'image',
              url: macdImageUrl,
              size: 'full',
              aspectMode: 'fit',
              aspectRatio: '16:9',
              margin: 'none'
            }
          ]
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
    if (cache && cache.result_json) {
      console.log('✅ 使用快取資料');

      try {
        const cachedData = cache.result_json;

        // 驗證快取資料的完整性
        if (cachedData.kd_image_url && cachedData.macd_image_url &&
            cachedData.stock_info && cachedData.latest_data &&
            cachedData.kd_analysis && cachedData.macd_analysis) {

          // 使用與第一次查詢相同的 Flex Message 格式
          const flexMessage = createFlexMessage(
            stockId,
            cachedData.stock_info.stock_name,
            cachedData.latest_data,
            cachedData.kd_image_url,
            cachedData.macd_image_url,
            cachedData.kd_analysis,
            cachedData.macd_analysis,
            cachedData.ai_result
          );

          await client.replyMessage(replyToken, {
            type: 'flex',
            altText: `${stockId} ${cachedData.stock_info.stock_name} 分析結果（快取）`,
            contents: flexMessage
          });

          console.log(`✅ 已使用快取回覆（快取時間：${new Date(cache.updated_at).toLocaleString('zh-TW')}）`);
          return;
        } else {
          console.log('⚠️ 快取資料不完整，重新生成');
        }
      } catch (error) {
        console.error('⚠️ 解析快取資料失敗，重新生成:', error.message);
      }
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

    // 5. 🚀 優化：使用圖表生成時已計算的指標，避免重複計算
    const { K, D, MACD, Signal, Histogram } = chartInfo.indicators;
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

    // 8. 儲存快取（儲存三張圖的 URL）
    await saveStockCache({
      stock_id: stockId,
      result_json: {
        stock_info: stockInfo,
        latest_data: latestData,
        kd_analysis: kdAnalysis,
        macd_analysis: macdAnalysis,
        ai_result: aiResult,
        price_image_url: chartInfo.priceImageUrl,
        kd_image_url: chartInfo.kdImageUrl,
        macd_image_url: chartInfo.macdImageUrl,
        timestamp: new Date().toISOString()
      },
      image_url: chartInfo.macdImageUrl, // 主要使用 MACD 圖
      image_path: null,
      result_summary: summaryText
    });

    console.log('✅ 快取已儲存');

    // 9. 建立並發送 Flex Message（使用 KD + MACD 圖）
    const flexMessage = createFlexMessage(
      stockId,
      stockInfo.stock_name,
      latestData,
      chartInfo.kdImageUrl,    // KD 圖（上方）
      chartInfo.macdImageUrl,  // MACD 圖（下方）
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
      const userId = ev.source.userId;
      const text = ev.message.text.trim();

      console.log(`📝 收到訊息：${text} (User: ${userId})`);

      // 1. 檢查 reply token 是否已使用（去重）
      const isUsed = await isReplyTokenUsed(replyToken);
      if (isUsed) {
        console.log('⚠️ Reply token 已使用過，忽略');
        continue;
      }

      // 2. 記錄 reply token
      await recordReplyToken(replyToken);

      // 3. 檢查美股分析指令
      if (text === '美股' || text === '美股分析' || text === 'US' || text === 'us market') {
        console.log('🌎 收到美股分析請求');
        const usMarketMessage = await handleUSMarketCommand();
        await client.replyMessage(replyToken, usMarketMessage);
        console.log('✅ 美股分析完成');
        continue;
      }

      // 4. 檢查快取管理指令
      const isCacheCmd = await handleCacheCommand(replyToken, text);
      if (isCacheCmd) {
        console.log('✅ 快取管理指令執行完成');
        continue;
      }

      // 5. 解析股票代號
      const stockIdMatch = text.match(/\d{3,5}/);
      if (!stockIdMatch) {
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '👋 歡迎使用股市大亨 LINE Bot！\n\n' +
                '📊 台股分析：輸入股票代號\n' +
                '例如：2330、0050、3003\n\n' +
                '🌎 美股分析：輸入「美股」\n' +
                '查看 S&P500、NASDAQ、SOXX 與台股連動\n\n' +
                '✨ 功能特色：\n' +
                '• 即時台股資料\n' +
                '• KD、MACD 技術指標\n' +
                '• 預期最近10日走勢\n' +
                '• 智慧快取機制\n\n' +
                '🔧 快取管理：\n' +
                '• 輸入「清除快取」刪除所有快取\n' +
                '• 輸入「刪除快取 2330」刪除特定股票快取'
        });
        continue;
      }

      const stockId = stockIdMatch[0];

      // 5. 驗證股票代號格式
      if (!isValidStockId(stockId)) {
        await client.replyMessage(replyToken, {
          type: 'text',
          text: `❌ 股票代號格式錯誤：${stockId}\n\n請輸入 3-5 位數字的台股代號`
        });
        continue;
      }

      // 6. 處理股票查詢
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

