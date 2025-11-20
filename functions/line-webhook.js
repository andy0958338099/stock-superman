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
const {
  AnalysisStatus,
  createUSMarketAnalysisTask,
  getTaskStatus,
  getUserLatestTask,
  executeUSMarketAnalysis
} = require('./us-market-async');

// 互動式分析功能處理器
const { handleNewsAnalysis } = require('./handlers/news-handler');
const { handlePoliticsAnalysis } = require('./handlers/politics-handler');
const { handleUSMarketAnalysis } = require('./handlers/us-market-handler');
const { handleDiscussionInit, handleDiscussionOpinion } = require('./handlers/discussion-handler');
const { handleFinalReview, handleReviewVote } = require('./handlers/final-review-handler');
const { getConversationState, initConversationState, getUserActiveDiscussion, saveConversationState } = require('./conversation-state');
const { buildStockAnalysisQuickReply, buildUSMarketPollingQuickReply } = require('./quick-reply-builder');

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
 * 處理美股分析指令（異步版本）
 * @param {string} userId - LINE 用戶 ID
 * @returns {Promise<object>} - LINE 訊息物件
 */
async function handleUSMarketCommand(userId) {
  const startTime = Date.now();

  try {
    console.log(`🌎 開始處理美股分析請求... (用戶: ${userId})`);

    // 1. 檢查是否有進行中的任務
    const existingTask = await getUserLatestTask(userId);

    if (existingTask && existingTask.status === AnalysisStatus.PROCESSING) {
      const elapsedTime = Math.floor((Date.now() - new Date(existingTask.created_at)) / 1000);
      console.log(`⏳ 用戶已有進行中的任務（已進行 ${elapsedTime} 秒）`);

      return {
        type: 'text',
        text: `⏳ 美股分析進行中...\n\n` +
              `📊 已進行 ${elapsedTime} 秒\n` +
              `⏱️ 預計還需要 ${Math.max(0, 25 - elapsedTime)} 秒\n\n` +
              `💡 請點擊下方按鈕查看分析結果`,
        quickReply: buildUSMarketPollingQuickReply(existingTask.task_id).quickReply
      };
    }

    // 2. 創建新任務
    const taskId = await createUSMarketAnalysisTask(userId);
    console.log(`✅ 創建美股分析任務：${taskId}`);

    // 3. 異步執行分析（不等待）
    executeUSMarketAnalysis(taskId).catch(err => {
      console.error('❌ 異步分析失敗:', err);
    });

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ 美股分析任務已創建（耗時 ${totalTime.toFixed(2)} 秒）`);

    // 4. 立即返回「分析中」訊息
    return {
      type: 'text',
      text: `🚀 開始美股分析\n\n` +
            `📊 正在抓取以下資料：\n` +
            `• S&P 500 指數\n` +
            `• NASDAQ 指數\n` +
            `• TSM ADR\n` +
            `• 台股加權指數\n` +
            `• USD/TWD 匯率\n` +
            `• VIX 恐慌指數\n\n` +
            `⏱️ 預計需要 15-25 秒\n\n` +
            `💡 請在 15 秒後點擊下方按鈕查看分析結果`,
      quickReply: buildUSMarketPollingQuickReply(taskId).quickReply
    };

  } catch (error) {
    const totalTime = (Date.now() - startTime) / 1000;
    console.error(`❌ 美股分析任務創建失敗（耗時 ${totalTime.toFixed(2)} 秒）:`, error.message);
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
                     '• 使用快取資料（6 小時內有效）';
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
 * 處理美股分析輪詢請求
 * @param {string} userId - LINE 用戶 ID
 * @param {string} taskId - 任務 ID（可選）
 * @returns {Promise<object>} - LINE 訊息物件
 */
async function handleUSMarketPolling(userId, taskId = null) {
  try {
    console.log(`🔍 處理美股分析輪詢請求... (用戶: ${userId}, 任務: ${taskId || '最新'})`);

    // 1. 取得任務
    const task = taskId
      ? await getTaskStatus(taskId)
      : await getUserLatestTask(userId);

    if (!task) {
      console.log('⚠️ 找不到分析任務');
      return {
        type: 'text',
        text: '⚠️ 找不到分析任務\n\n請重新輸入「美股」開始分析'
      };
    }

    console.log(`📊 任務狀態：${task.status}`);

    // 2. 檢查任務狀態
    switch (task.status) {
      case AnalysisStatus.COMPLETED:
        // 分析完成，返回完整 Flex Message
        console.log('✅ 分析已完成，返回完整結果');
        return generateUSMarketFlexMessage(task.result);

      case AnalysisStatus.PROCESSING:
        // 仍在處理中，返回進度訊息
        const elapsedTime = Math.floor((Date.now() - new Date(task.created_at)) / 1000);
        console.log(`⏳ 分析進行中（已進行 ${elapsedTime} 秒）`);

        return {
          type: 'text',
          text: `⏳ 美股分析進行中...\n\n` +
                `📊 已進行 ${elapsedTime} 秒\n` +
                `⏱️ 預計還需要 ${Math.max(0, 25 - elapsedTime)} 秒\n\n` +
                `💡 請稍後再點擊下方按鈕查看結果`,
          quickReply: buildUSMarketPollingQuickReply(task.task_id).quickReply
        };

      case AnalysisStatus.FAILED:
        // 分析失敗，返回錯誤訊息
        console.log(`❌ 分析失敗：${task.error_message}`);

        return {
          type: 'text',
          text: `❌ 美股分析失敗\n\n` +
                `錯誤訊息：${task.error_message || '未知錯誤'}\n\n` +
                `💡 請稍後再試或輸入「美股」重新分析`
        };

      case AnalysisStatus.PENDING:
      default:
        // 等待中
        console.log('⏳ 任務等待中');

        return {
          type: 'text',
          text: `⏳ 美股分析等待中...\n\n` +
                `💡 請稍後再點擊下方按鈕查看結果`,
          quickReply: buildUSMarketPollingQuickReply(task.task_id).quickReply
        };
    }

  } catch (error) {
    console.error('❌ 處理輪詢請求失敗:', error);
    return {
      type: 'text',
      text: '❌ 系統錯誤\n\n請稍後再試'
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
    await recordReplyToken(replyToken); // 成功回覆後記錄 token
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
    await recordReplyToken(replyToken); // 成功回覆後記錄 token
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
 * @param {string} userId - LINE 用戶 ID
 */
async function handleStockQuery(replyToken, stockId, userId) {
  try {
    console.log(`\n🔍 處理股票查詢：${stockId}`);

    // 1. 檢查快取（6 小時內，統一快取時間）
    const cache = await getStockCache(stockId, 6);
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

          // 取得對話狀態並建立 Quick Reply 按鈕
          const state = await getConversationState(userId, stockId);
          const quickReply = buildStockAnalysisQuickReply(stockId, state);

          const replyMessages = [
            {
              type: 'flex',
              altText: `${stockId} ${cachedData.stock_info.stock_name} 分析結果（快取）`,
              contents: flexMessage
            }
          ];

          // 如果有 Quick Reply，直接附加到 Flex Message
          if (quickReply) {
            replyMessages[0].quickReply = quickReply.quickReply;
          }

          await client.replyMessage(replyToken, replyMessages);
          await recordReplyToken(replyToken); // 成功回覆後記錄 token

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

    // 10. 初始化對話狀態並建立 Quick Reply 按鈕
    const technicalAnalysisText = `${stockInfo.stock_name}(${stockId})\n` +
                                  `收盤：${latestData.close}\n` +
                                  `KD：${kdAnalysis.signal} - ${kdAnalysis.description}\n` +
                                  `MACD：${macdAnalysis.signal} - ${macdAnalysis.description}`;

    await initConversationState(userId, stockId, technicalAnalysisText);
    const state = await getConversationState(userId, stockId);
    const quickReply = buildStockAnalysisQuickReply(stockId, state);

    const replyMessages = [
      {
        type: 'flex',
        altText: `${stockId} ${stockInfo.stock_name} 分析結果`,
        contents: flexMessage
      }
    ];

    // 如果有 Quick Reply，直接附加到 Flex Message
    if (quickReply) {
      replyMessages[0].quickReply = quickReply.quickReply;
    }

    // 發送 Flex Message（使用 replyToken 一次性回覆）
    await client.replyMessage(replyToken, replyMessages);
    await recordReplyToken(replyToken); // 成功回覆後記錄 token

    console.log('✅ 分析完成並已回覆');

  } catch (error) {
    console.error('❌ 處理股票查詢失敗:', error);

    // 回覆錯誤訊息
    try {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: `❌ 查詢失敗\n\n${error.message}\n\n請確認股票代號是否正確，或稍後再試。`
      });
      await recordReplyToken(replyToken); // 成功回覆後記錄 token
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

      // 2. 解析互動式分析指令（格式：功能:股票代號 或 評價:股票代號:評價）
      const interactiveMatch = text.match(/^(新聞|政治|討論|總評|評價):(\d{3,5})(?::(.+))?$/);
      if (interactiveMatch) {
        const [, action, stockId, extra] = interactiveMatch;
        console.log(`🎯 收到互動式分析請求：${action} - ${stockId}`);

        // 取得股票名稱（從快取或 API）
        let stockName = stockId;
        try {
          const stockInfo = await fetchStockInfo(stockId);
          stockName = stockInfo?.stock_name || stockId;
        } catch (e) {
          console.warn('⚠️ 無法取得股票名稱，使用代號');
        }

        let replyMessage;

        switch (action) {
          case '新聞':
            replyMessage = await handleNewsAnalysis(userId, stockId, stockName);
            break;
          case '政治':
            replyMessage = await handlePoliticsAnalysis(userId, stockId, stockName);
            break;
          case '討論':
            replyMessage = await handleDiscussionInit(userId, stockId, stockName);
            break;
          case '總評':
            replyMessage = await handleFinalReview(userId, stockId, stockName);
            break;
          case '評價':
            replyMessage = await handleReviewVote(userId, stockId, extra);
            break;
          default:
            replyMessage = {
              type: 'text',
              text: '⚠️ 未知的指令'
            };
        }

        await client.replyMessage(replyToken, replyMessage);
        await recordReplyToken(replyToken); // 成功回覆後記錄 token
        console.log(`✅ ${action}分析完成`);
        continue;
      }

      // 4. 檢查是否在討論模式中（用戶輸入意見）
      // 查詢用戶當前是否有進行中的討論
      const discussionState = await getUserActiveDiscussion(userId);

      if (discussionState) {
        console.log('💬 用戶在討論模式中，處理意見');
        const stockId = discussionState.stock_id;

        // 取得股票名稱
        let stockName = stockId;
        try {
          const stockInfo = await fetchStockInfo(stockId);
          stockName = stockInfo?.stock_name || stockId;
        } catch (e) {
          console.warn('⚠️ 無法取得股票名稱，使用代號');
        }

        const replyMessage = await handleDiscussionOpinion(userId, stockId, stockName, text);
        await client.replyMessage(replyToken, replyMessage);
        await recordReplyToken(replyToken); // 成功回覆後記錄 token
        console.log('✅ 討論意見處理完成');
        continue;
      }

      // 5. 檢查美股分析輪詢指令
      if (text.startsWith('查看美股分析')) {
        console.log('🔍 收到美股分析輪詢請求');
        const taskId = text.includes(':') ? text.split(':')[1] : null;
        const pollingMessage = await handleUSMarketPolling(userId, taskId);
        await client.replyMessage(replyToken, pollingMessage);
        await recordReplyToken(replyToken); // 成功回覆後記錄 token
        console.log('✅ 美股分析輪詢完成');
        continue;
      }

      // 6. 檢查美股分析指令
      if (text === '美股' || text === '美股分析' || text === 'US' || text === 'us market') {
        console.log('🌎 收到美股分析請求');
        const usMarketMessage = await handleUSMarketCommand(userId);  // 傳入 userId
        await client.replyMessage(replyToken, usMarketMessage);
        await recordReplyToken(replyToken); // 成功回覆後記錄 token
        console.log('✅ 美股分析任務已創建');
        continue;
      }

      // 7. 檢查快取管理指令
      const isCacheCmd = await handleCacheCommand(replyToken, text);
      if (isCacheCmd) {
        console.log('✅ 快取管理指令執行完成');
        continue;
      }

      // 7. 解析股票代號
      const stockIdMatch = text.match(/\d{3,5}/);

      // 8. 驗證股票代號
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
        await recordReplyToken(replyToken); // 成功回覆後記錄 token
        continue;
      }

      const stockId = stockIdMatch[0];

      // 9. 驗證股票代號格式
      if (!isValidStockId(stockId)) {
        await client.replyMessage(replyToken, {
          type: 'text',
          text: `❌ 股票代號格式錯誤：${stockId}\n\n請輸入 3-5 位數字的台股代號`
        });
        await recordReplyToken(replyToken); // 成功回覆後記錄 token
        continue;
      }

      // 10. 清除可能存在的討論等待狀態
      // 如果用戶在討論模式中途離開（輸入股票代號），清除舊的討論狀態
      const existingDiscussion = await getUserActiveDiscussion(userId);
      if (existingDiscussion && existingDiscussion.current_stage === 'discussion_waiting') {
        console.log('⚠️ 用戶離開討論模式，清除討論等待狀態');
        await saveConversationState(userId, existingDiscussion.stock_id, {
          current_stage: 'discussion',
          ...existingDiscussion
        });
      }

      // 11. 處理股票查詢
      await handleStockQuery(replyToken, stockId, userId);
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

