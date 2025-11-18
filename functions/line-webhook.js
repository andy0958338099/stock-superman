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

// 互動式分析系統模組
const { parseCommand } = require('./command-router');
const {
  getOrCreateSession,
  updateInitialAnalysis,
  updateNewsAnalysis,
  isFeatureUsed,
  logInteraction
} = require('./conversation-manager');
const { generateAnalysisQuickReply } = require('./quick-reply-builder');
const { fetchStockNews } = require('./tej-api');
const { analyzeNewsWithDeepSeek } = require('./news-analyzer');
const { generateNewsFlexMessage } = require('./news-flex-message');

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
  try {
    console.log('🌎 開始處理美股分析請求...');

    // 執行美股分析
    const analysisResult = await analyzeUSMarket();

    // 生成 Flex Message
    const flexMessage = generateUSMarketFlexMessage(analysisResult);

    return flexMessage;

  } catch (error) {
    console.error('❌ 美股分析失敗:', error);
    console.error('錯誤堆疊:', error.stack);

    let errorMessage = '❌ 美股分析失敗\n\n';

    // 更詳細的錯誤分類
    if (error.message && error.message.includes('資料格式錯誤')) {
      errorMessage += '可能原因：\n' +
                     '• 系統處理超時\n' +
                     '• 網路連線問題\n\n' +
                     `錯誤訊息：${error.message}\n\n` +
                     '⏱️ 請稍後再試';
    } else if (error.message && error.message.includes('資料不足')) {
      errorMessage += '可能原因：\n' +
                     '• FinMind API 資料不完整\n' +
                     '• 資料來源暫時無法連線\n\n' +
                     `錯誤訊息：${error.message}\n\n` +
                     '⏱️ 請稍後再試';
    } else if (error.message && error.message.includes('FinMind')) {
      errorMessage += '可能原因：\n' +
                     '• API 請求頻率過高（每分鐘限制）\n' +
                     '• API 配額已用完（每日限制）\n' +
                     '• 資料來源暫時無法連線\n\n' +
                     '💡 建議：\n' +
                     '• 等待 1-2 分鐘後再試\n' +
                     '• 使用快取結果（1 小時內有效）';
    } else if (error.message && error.message.includes('DeepSeek')) {
      errorMessage += '可能原因：\n' +
                     '• DeepSeek API 配額用完\n' +
                     '• API 回應超時\n\n' +
                     '💡 建議：稍後再試';
    } else {
      errorMessage += '可能原因：\n' +
                     '• 系統處理超時\n' +
                     '• 網路連線問題\n\n' +
                     `錯誤訊息：${error.message}\n\n` +
                     '⏱️ 請稍後再試';
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
 * 處理新聞分析指令
 * @param {string} replyToken - LINE reply token
 * @param {string} stockId - 股票代號
 * @param {string} userId - LINE 用戶 ID
 */
async function handleNewsAnalysis(replyToken, stockId, userId) {
  try {
    console.log(`\n📰 處理新聞分析：${stockId} (User: ${userId})`);

    // 1. 取得會話
    const session = await getOrCreateSession(userId, stockId);

    if (!session) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: `❌ 無法取得會話資訊\n\n請先查詢股票代號：${stockId}`
      });
      return;
    }

    // 2. 檢查是否已經分析過新聞
    if (isFeatureUsed(session, 'news')) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: `⚠️ 您已經查詢過 ${stockId} 的新聞分析\n\n每支股票的新聞分析僅限查詢一次。\n\n您可以選擇其他功能：\n• 政治:${stockId}\n• 美股:${stockId}\n• 討論:${stockId}\n• 總評:${stockId}`
      });
      return;
    }

    // 3. 先回覆「處理中」訊息（因為新聞分析可能需要較長時間）
    await client.replyMessage(replyToken, {
      type: 'text',
      text: `📰 正在分析 ${stockId} 的近期新聞...\n\n⏱️ 預計需要 30-60 秒\n請稍候...`
    });

    // 4. 抓取新聞
    console.log('📥 開始抓取 TEJ 新聞...');
    const newsData = await fetchStockNews(stockId, 6);

    if (!newsData || newsData.length === 0) {
      // 使用 Push Message 發送錯誤訊息（因為 replyToken 已使用）
      await client.pushMessage(userId, {
        type: 'text',
        text: `❌ 無法取得 ${stockId} 的新聞資料\n\n可能原因：\n• TEJ API 無此股票的新聞\n• API 配額已用完\n• 網路連線問題\n\n請稍後再試，或選擇其他功能。`
      });
      return;
    }

    console.log(`✅ 成功抓取 ${newsData.length} 則新聞`);

    // 5. 使用 DeepSeek 分析新聞
    console.log('🤖 開始 DeepSeek AI 分析...');
    const stockName = session.stock_name || stockId;
    const newsAnalysis = await analyzeNewsWithDeepSeek(stockId, stockName, newsData);

    console.log('✅ 新聞分析完成');

    // 6. 更新會話
    await updateNewsAnalysis(session.id, newsAnalysis);

    // 7. 記錄互動
    await logInteraction(
      userId,
      session.id,
      stockId,
      'news_analysis',
      `新聞:${stockId}`,
      newsAnalysis
    );

    // 8. 生成 Flex Message
    const flexMessage = generateNewsFlexMessage(newsAnalysis);

    // 9. 重新取得會話（已更新）並生成 Quick Reply
    const updatedSession = await getOrCreateSession(userId, stockId);
    const quickReply = generateAnalysisQuickReply(stockId, updatedSession);

    // 10. 發送結果（使用 Push Message）
    await client.pushMessage(userId, {
      type: 'flex',
      altText: `${stockId} ${stockName} 新聞分析`,
      contents: flexMessage,
      quickReply: quickReply
    });

    console.log('✅ 新聞分析完成並已發送');

  } catch (error) {
    console.error('❌ 新聞分析失敗:', error);
    console.error('錯誤堆疊:', error.stack);

    // 發送錯誤訊息
    try {
      await client.pushMessage(userId, {
        type: 'text',
        text: `❌ 新聞分析失敗\n\n${error.message}\n\n請稍後再試。`
      });
    } catch (pushError) {
      console.error('發送錯誤訊息失敗:', pushError);
    }
  }
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

    // 10. 創建或更新對話會話（互動式分析系統）
    let session = null;
    let quickReply = null;

    try {
      // 創建會話並儲存初步分析結果
      session = await getOrCreateSession(userId, stockId, stockInfo.stock_name);

      const initialAnalysis = {
        stock_id: stockId,
        stock_name: stockInfo.stock_name,
        latest_data: latestData,
        kd_analysis: kdAnalysis,
        macd_analysis: macdAnalysis,
        ai_result: aiResult,
        chart_urls: {
          kd: chartInfo.kdImageUrl,
          macd: chartInfo.macdImageUrl
        },
        analyzed_at: new Date().toISOString()
      };

      await updateInitialAnalysis(session.id, initialAnalysis);

      // 生成 Quick Reply 按鍵
      quickReply = generateAnalysisQuickReply(stockId, session);

      console.log('✅ 對話會話已創建，ID:', session.id);
    } catch (sessionError) {
      console.error('⚠️ 創建對話會話失敗（不影響主流程）:', sessionError.message);
    }

    // 11. 發送 Flex Message（使用 replyToken 一次性回覆）
    const replyMessage = {
      type: 'flex',
      altText: `${stockId} ${stockInfo.stock_name} 分析結果`,
      contents: flexMessage
    };

    // 如果有 Quick Reply，添加到訊息中
    if (quickReply) {
      replyMessage.quickReply = quickReply;
    }

    await client.replyMessage(replyToken, replyMessage);

    console.log('✅ 分析完成並已回覆' + (quickReply ? '（含 Quick Reply 按鍵）' : ''));

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

      // 3. 使用指令路由器解析指令
      const command = parseCommand(text);
      console.log('🎯 解析指令:', command.type, command.stockId || '');

      // 4. 處理互動式分析指令
      if (command.type === 'news') {
        // 新聞分析：新聞:2330
        console.log(`📰 收到新聞分析請求：${command.stockId}`);
        await handleNewsAnalysis(replyToken, command.stockId, userId);
        continue;
      }

      if (command.type === 'politics') {
        // 政治分析：政治:2330（待實作）
        await client.replyMessage(replyToken, {
          type: 'text',
          text: `🏛️ 政治分析功能開發中...\n\n${command.stockId} 的政治分析即將推出！`
        });
        continue;
      }

      if (command.type === 'us_market') {
        // 美股對應產業分析：美股:2330（待實作）
        await client.replyMessage(replyToken, {
          type: 'text',
          text: `🇺🇸 美股對應產業分析功能開發中...\n\n${command.stockId} 的美股分析即將推出！`
        });
        continue;
      }

      if (command.type === 'discussion_start') {
        // 討論模式：討論:2330（待實作）
        await client.replyMessage(replyToken, {
          type: 'text',
          text: `💬 互動討論功能開發中...\n\n${command.stockId} 的討論模式即將推出！`
        });
        continue;
      }

      if (command.type === 'final_evaluation') {
        // 總評：總評:2330（待實作）
        await client.replyMessage(replyToken, {
          type: 'text',
          text: `📊 綜合總評功能開發中...\n\n${command.stockId} 的總評即將推出！`
        });
        continue;
      }

      if (command.type === 'feedback_positive' || command.type === 'feedback_negative') {
        // 用戶反饋（待實作）
        const feedback = command.type === 'feedback_positive' ? '肯定' : '不相信';
        await client.replyMessage(replyToken, {
          type: 'text',
          text: `👍 感謝您的反饋：${feedback}\n\n${command.stockId} 的反饋功能開發中...`
        });
        continue;
      }

      // 5. 檢查美股大盤分析指令
      if (command.type === 'us_market_overview') {
        console.log('🌎 收到美股大盤分析請求');
        const usMarketMessage = await handleUSMarketCommand();
        await client.replyMessage(replyToken, usMarketMessage);
        console.log('✅ 美股分析完成');
        continue;
      }

      // 6. 檢查快取管理指令
      if (command.type === 'clear_all_cache' || command.type === 'delete_cache') {
        const isCacheCmd = await handleCacheCommand(replyToken, text);
        if (isCacheCmd) {
          console.log('✅ 快取管理指令執行完成');
          continue;
        }
      }

      // 7. 處理股票代號查詢
      if (command.type === 'stock_query') {
        const stockId = command.stockId;

        // 驗證股票代號格式
        if (!isValidStockId(stockId)) {
          await client.replyMessage(replyToken, {
            type: 'text',
            text: `❌ 股票代號格式錯誤：${stockId}\n\n請輸入 3-5 位數字的台股代號`
          });
          continue;
        }

        // 處理股票查詢
        await handleStockQuery(replyToken, stockId, userId);
        continue;
      }

      // 8. 未知指令 - 顯示歡迎訊息
      if (command.type === 'unknown') {
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '👋 歡迎使用股市大亨 LINE Bot！\n\n' +
                '📊 基礎分析：輸入股票代號\n' +
                '例如：2330、0050、3003\n' +
                '• 即時台股資料\n' +
                '• KD、MACD 技術指標\n' +
                '• AI 預測走勢\n\n' +
                '🎯 深度分析（查詢股票後可用）：\n' +
                '• 新聞:2330 - 財經新聞分析\n' +
                '• 政治:2330 - 政治面分析\n' +
                '• 美股:2330 - 美股對應產業\n' +
                '• 討論:2330 - 互動討論\n' +
                '• 總評:2330 - 綜合評估\n\n' +
                '🌎 美股大盤：輸入「美股」\n' +
                '查看 S&P500、NASDAQ、SOXX 與台股連動\n\n' +
                '🔧 快取管理：\n' +
                '• 清除快取 - 刪除所有快取\n' +
                '• 刪除快取 2330 - 刪除特定快取'
        });
        continue;
      }
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

