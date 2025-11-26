/**
 * LINE Webhook Handler
 * 處理 LINE Bot 訊息、去重、快取、回覆 Flex Message
 */

const line = require('@line/bot-sdk');
const { captureError, captureMessage } = require('./sentry');
const {
  isReplyTokenUsed,
  recordReplyToken,
  getStockCache,
  saveStockCache,
  deleteStockCache
} = require('./supabase-client');
const { fetchStockPrice, fetchStockInfo, isValidStockId, fetchStockDividend, fetchStockFinancials } = require('./finmind');
const { generateIndicatorChart } = require('./generate-chart-quickchart');
const { analyzeWithDeepSeek } = require('./deepseek');
const { analyzeKD, analyzeMACDSignal, calculateKD, calculateMACD } = require('./indicators');
const { analyzeUSMarket } = require('./us-market-analysis');
const { generateUSMarketFlexMessage } = require('./us-market-flex-message');
const {
  AnalysisStatus,
  createUSMarketAnalysisTask,
  updateTaskStatus,
  getTaskStatus,
  getUserLatestTask,
  executeUSMarketAnalysis
} = require('./us-market-async');

// 今日推薦功能
const { getTodayRecommendation } = require('./today-recommendation');
const { generateTodayRecommendationFlexMessage } = require('./today-flex-message');

// 互動式分析功能處理器
const { handleNewsAnalysis } = require('./handlers/news-handler');
const { handlePoliticsAnalysis } = require('./handlers/politics-handler');
const { handleUSMarketAnalysis } = require('./handlers/us-market-handler');
const { handleDiscussionInit, handleDiscussionOpinion } = require('./handlers/discussion-handler');
const { handleFinalReview, handleReviewVote } = require('./handlers/final-review-handler');
const { getConversationState, initConversationState, getUserActiveDiscussion, saveConversationState } = require('./conversation-state');
const { buildStockAnalysisQuickReply, buildUSMarketPollingQuickReply } = require('./quick-reply-builder');
const { getCurrentWeekStatistics, hasUserVotedThisWeek, submitVote, getFullSurveyInfo } = require('./survey-handler');
const { generateSurveyFlexMessage } = require('./survey-flex-message');

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

    // 1. 先檢查快取（6 小時有效）
    console.log('🔍 檢查美股分析快取...');
    const { getUSMarketCache } = require('./supabase-client');
    const cachedResult = await getUSMarketCache();

    if (cachedResult) {
      const cacheTime = (Date.now() - startTime) / 1000;
      console.log(`✅ 快取命中！使用快取的美股分析結果（耗時 ${cacheTime.toFixed(2)} 秒）`);
      console.log('📊 快取數據:', JSON.stringify(cachedResult).substring(0, 200) + '...');

      // 直接返回完整的 Flex Message
      return generateUSMarketFlexMessage(cachedResult);
    }

    console.log('⚠️ 快取未命中，開始異步分析...');

    // 2. 檢查是否有進行中的任務
    const existingTask = await getUserLatestTask(userId);

    if (existingTask && existingTask.status === AnalysisStatus.PROCESSING) {
      const elapsedTime = Math.floor((Date.now() - new Date(existingTask.created_at)) / 1000);
      console.log(`⏳ 用戶已有進行中的任務（已進行 ${elapsedTime} 秒）`);

      // 如果任務超過 90 秒，視為超時，創建新任務
      if (elapsedTime > 90) {
        console.log(`⚠️ 任務已超時（${elapsedTime} 秒），標記為失敗並創建新任務`);
        await updateTaskStatus(existingTask.task_id, AnalysisStatus.FAILED, null, '任務超時');
        // 繼續創建新任務（不 return）
      } else {
        // 任務仍在合理時間內，返回等待訊息
        return {
          type: 'text',
          text: `⏳ 美股分析進行中...\n\n` +
                `📊 已進行 ${elapsedTime} 秒\n` +
                `⏱️ 預計還需要 ${Math.max(0, 90 - elapsedTime)} 秒\n\n` +
                `💡 請點擊下方按鈕查看分析結果`,
          quickReply: buildUSMarketPollingQuickReply(existingTask.task_id).quickReply
        };
      }
    }

    // 3. 創建新任務
    const taskId = await createUSMarketAnalysisTask(userId);
    console.log(`✅ 創建美股分析任務：${taskId}`);

    // 4. 異步執行分析（不等待）
    executeUSMarketAnalysis(taskId).catch(err => {
      console.error('❌ 異步分析失敗:', err);
    });

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ 美股分析任務已創建（耗時 ${totalTime.toFixed(2)} 秒）`);

    // 5. 立即返回「分析中」訊息
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
            `⏱️ 預計需要 30-60 秒\n\n` +
            `💡 請在 30 秒後點擊下方按鈕查看分析結果`,
      quickReply: buildUSMarketPollingQuickReply(taskId).quickReply
    };

  } catch (error) {
    const totalTime = (Date.now() - startTime) / 1000;
    console.error(`❌ 美股分析任務創建失敗（耗時 ${totalTime.toFixed(2)} 秒）:`, error.message);
    console.error('錯誤堆疊:', error.stack);

    // 發送錯誤到 Sentry
    captureError(error, {
      user: userId,
      action: 'us_market_analysis',
      extra: { totalTime }
    });

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
        // 仍在處理中，檢查是否超時
        const elapsedTime = Math.floor((Date.now() - new Date(task.created_at)) / 1000);
        console.log(`⏳ 分析進行中（已進行 ${elapsedTime} 秒）`);

        // 如果超過 90 秒，視為超時
        if (elapsedTime > 90) {
          console.log(`⚠️ 任務已超時（${elapsedTime} 秒），標記為失敗`);
          await updateTaskStatus(task.task_id, AnalysisStatus.FAILED, null, '任務超時');

          return {
            type: 'text',
            text: `⚠️ 美股分析超時\n\n` +
                  `任務已進行 ${elapsedTime} 秒但未完成\n\n` +
                  `💡 請重新輸入「美股」開始新的分析`
          };
        }

        return {
          type: 'text',
          text: `⏳ 美股分析進行中...\n\n` +
                `📊 已進行 ${elapsedTime} 秒\n` +
                `⏱️ 預計還需要 ${Math.max(0, 90 - elapsedTime)} 秒\n\n` +
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
 * @param {object} dividendData - 股利資料（可為 null）
 * @param {object} financialData - 財務資料（可為 null）
 * @returns {object} - Flex Message 物件
 */
function createFlexMessage(stockId, stockName, latestData, kdImageUrl, macdImageUrl, kdAnalysis, macdAnalysis, aiResult, dividendData, financialData) {
  const title = `${stockId} ${stockName}`;
  const priceInfo = `收盤價：${latestData.close} | ${latestData.date}`;

  // 計算本益比（如果有 EPS 資料）
  let peRatio = null;
  if (financialData && financialData.total_eps > 0) {
    // 用近4季 EPS（年度 EPS）計算本益比
    peRatio = (latestData.close / financialData.total_eps).toFixed(2);
  }

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
        // 財務資訊區塊（如果有資料）
        ...((dividendData || financialData) ? [{
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          spacing: 'none',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              spacing: 'sm',
              contents: [
                ...(dividendData ? [
                  {
                    type: 'box',
                    layout: 'vertical',
                    flex: 1,
                    contents: [
                      {
                        type: 'text',
                        text: `💰 ${dividendData.year}年`,
                        size: 'xxs',
                        color: '#999999'
                      },
                      {
                        type: 'text',
                        text: `現金 ${dividendData.cash_dividend.toFixed(2)}`,
                        size: 'xs',
                        color: '#333333',
                        weight: 'bold'
                      },
                      {
                        type: 'text',
                        text: `配股 ${dividendData.stock_dividend.toFixed(2)}`,
                        size: 'xs',
                        color: '#333333'
                      }
                    ]
                  }
                ] : []),
                ...(financialData ? [
                  {
                    type: 'box',
                    layout: 'vertical',
                    flex: 1,
                    contents: [
                      {
                        type: 'text',
                        text: '📊 近4季',
                        size: 'xxs',
                        color: '#999999'
                      },
                      {
                        type: 'text',
                        text: `EPS ${financialData.total_eps.toFixed(2)}`,
                        size: 'xs',
                        color: '#333333',
                        weight: 'bold'
                      },
                      ...(peRatio ? [{
                        type: 'text',
                        text: `本益比 ${peRatio}`,
                        size: 'xs',
                        color: '#333333'
                      }] : [])
                    ]
                  }
                ] : [])
              ]
            }
          ]
        }, {
          type: 'separator',
          margin: 'lg'
        }] : []),
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

          // 使用與第一次查詢相同的 Flex Message 格式（包含財務資料）
          const flexMessage = createFlexMessage(
            stockId,
            cachedData.stock_info.stock_name,
            cachedData.latest_data,
            cachedData.kd_image_url,
            cachedData.macd_image_url,
            cachedData.kd_analysis,
            cachedData.macd_analysis,
            cachedData.ai_result,
            cachedData.dividend_data || null,
            cachedData.financial_data || null
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

    // 3. 抓取股票資料（包含股利和財務資料）
    const [stockData, stockInfo, dividendData, financialData] = await Promise.all([
      fetchStockPrice(stockId),
      fetchStockInfo(stockId),
      fetchStockDividend(stockId),
      fetchStockFinancials(stockId)
    ]);

    if (!stockData || stockData.length < 30) {
      throw new Error('資料不足，至少需要 30 天的歷史資料');
    }

    console.log(`✅ 已抓取 ${stockData.length} 天資料`);
    if (dividendData) {
      console.log(`✅ 股利資料：${dividendData.year}年 現金${dividendData.cash_dividend} 配股${dividendData.stock_dividend}`);
    }
    if (financialData) {
      console.log(`✅ 財務資料：近4季 EPS ${financialData.total_eps.toFixed(2)}`);
    }

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

    // 8. 儲存快取（儲存三張圖的 URL 和財務資料）
    await saveStockCache({
      stock_id: stockId,
      result_json: {
        stock_info: stockInfo,
        latest_data: latestData,
        kd_analysis: kdAnalysis,
        macd_analysis: macdAnalysis,
        ai_result: aiResult,
        dividend_data: dividendData,
        financial_data: financialData,
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

    // 9. 建立並發送 Flex Message（使用 KD + MACD 圖 + 財務資訊）
    const flexMessage = createFlexMessage(
      stockId,
      stockInfo.stock_name,
      latestData,
      chartInfo.kdImageUrl,    // KD 圖（上方）
      chartInfo.macdImageUrl,  // MACD 圖（下方）
      kdAnalysis,
      macdAnalysis,
      aiResult,
      dividendData,
      financialData
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

    // 發送錯誤到 Sentry
    captureError(error, {
      user: userId,
      stockId,
      action: 'stock_query'
    });

    // 回覆錯誤訊息
    try {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: `❌ 查詢失敗\n\n${error.message}\n\n請確認股票代號是否正確，或稍後再試。`
      });
      await recordReplyToken(replyToken); // 成功回覆後記錄 token
    } catch (replyError) {
      console.error('回覆錯誤訊息失敗:', replyError);
      captureError(replyError, {
        user: userId,
        stockId,
        action: 'reply_error_message'
      });
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

      // 7. 檢查清除快取指令（格式：清除快取:2330 或 clear:2330）
      const clearCacheMatch = text.match(/^(清除快取|清除|clear):(\d{3,5})$/i);
      if (clearCacheMatch) {
        const stockId = clearCacheMatch[2];
        console.log(`🗑️  收到清除快取請求：${stockId}`);

        try {
          const result = await deleteStockCache(stockId);
          await client.replyMessage(replyToken, {
            type: 'text',
            text: `✅ 已清除 ${stockId} 的快取\n\n` +
                  `刪除了 ${result.count} 筆資料\n\n` +
                  `現在可以重新查詢該股票，系統會抓取最新資料（包含財務資訊）`
          });
          await recordReplyToken(replyToken);
          console.log(`✅ 已清除 ${stockId} 快取`);
        } catch (error) {
          console.error('❌ 清除快取失敗:', error);
          await client.replyMessage(replyToken, {
            type: 'text',
            text: `❌ 清除快取失敗：${error.message}`
          });
          await recordReplyToken(replyToken);
        }
        continue;
      }

      // 8. 檢查問卷調查指令
      if (text === '📊 查看評分' || text === '問卷' || text === '評分' || text === '調查') {
        console.log('📊 收到問卷調查請求');
        try {
          const surveyInfo = await getFullSurveyInfo();
          if (!surveyInfo || !surveyInfo.currentWeek) {
            await client.replyMessage(replyToken, {
              type: 'text',
              text: '❌ 無法取得問卷資訊，請稍後再試'
            });
            await recordReplyToken(replyToken);
            continue;
          }

          const hasVoted = await hasUserVotedThisWeek(userId, surveyInfo.currentWeek.id);
          const surveyMessage = generateSurveyFlexMessage(
            surveyInfo.currentWeek,
            surveyInfo.currentStatistics,
            surveyInfo.lastWeek,
            surveyInfo.lastStatistics,
            hasVoted
          );

          await client.replyMessage(replyToken, surveyMessage);
          await recordReplyToken(replyToken);
          console.log('✅ 問卷調查訊息已發送');
        } catch (error) {
          console.error('❌ 處理問卷調查失敗:', error);
          await client.replyMessage(replyToken, {
            type: 'text',
            text: '❌ 處理問卷調查失敗，請稍後再試'
          });
          await recordReplyToken(replyToken);
        }
        continue;
      }

      // 8. 檢查評分提交指令
      if (text.startsWith('評分:')) {
        console.log('🗳️ 收到評分提交');
        try {
          const score = parseInt(text.split(':')[1]);
          const result = await submitVote(userId, score);

          if (result.success) {
            // 發送成功訊息和更新後的統計
            const surveyInfo = await getFullSurveyInfo();
            const surveyMessage = generateSurveyFlexMessage(
              surveyInfo.currentWeek,
              surveyInfo.currentStatistics,
              surveyInfo.lastWeek,
              surveyInfo.lastStatistics,
              true
            );

            await client.replyMessage(replyToken, [
              {
                type: 'text',
                text: `${result.message}\n\n您的評分：${score} ⭐`
              },
              surveyMessage
            ]);
          } else {
            await client.replyMessage(replyToken, {
              type: 'text',
              text: result.message
            });
          }

          await recordReplyToken(replyToken);
          console.log('✅ 評分提交處理完成');
        } catch (error) {
          console.error('❌ 處理評分提交失敗:', error);
          await client.replyMessage(replyToken, {
            type: 'text',
            text: '❌ 評分提交失敗，請稍後再試'
          });
          await recordReplyToken(replyToken);
        }
        continue;
      }

      // 9. 檢查快取管理指令
      const isCacheCmd = await handleCacheCommand(replyToken, text);
      if (isCacheCmd) {
        console.log('✅ 快取管理指令執行完成');
        continue;
      }

      // 9.5. 處理「今天」推薦指令
      if (text === '今天' || text === '今日推薦' || text === '推薦') {
        console.log('📈 收到今日推薦請求');
        try {
          // 先回覆處理中訊息
          await client.replyMessage(replyToken, {
            type: 'text',
            text: '🔍 正在為您分析今日最佳投資機會...\n\n' +
                  '⏳ 分析中，請稍候約 30-60 秒\n\n' +
                  '📊 分析項目：\n' +
                  '• 篩選 30+ 檔候選股票\n' +
                  '• 技術面指標分析（KD/MACD/MA）\n' +
                  '• 基本面評估（EPS/本益比/殖利率）\n' +
                  '• AI 智能推薦 TOP 3\n\n' +
                  '💰 為您的 5 萬元找出最佳投資標的！'
          });
          await recordReplyToken(replyToken);

          // 使用 push message 發送結果（因為 reply token 已用）
          const result = await getTodayRecommendation();
          const flexMessage = generateTodayRecommendationFlexMessage(result);

          await client.pushMessage(userId, flexMessage);
          console.log('✅ 今日推薦發送完成');
        } catch (error) {
          console.error('❌ 今日推薦失敗:', error);
          captureError(error, { action: 'today_recommendation', userId });

          // 發送錯誤訊息
          await client.pushMessage(userId, {
            type: 'text',
            text: '❌ 今日推薦暫時無法使用\n\n' +
                  '可能原因：\n' +
                  '• API 請求過於頻繁\n' +
                  '• 市場資料更新中\n\n' +
                  '請稍後再試，或直接輸入股票代號查詢！'
          });
        }
        continue;
      }

      // 10. 解析股票代號
      const stockIdMatch = text.match(/\d{3,5}/);

      // 11. 驗證股票代號
      if (!stockIdMatch) {
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '👋 歡迎使用股票超人！\n\n' +
                '🎯 今日推薦：輸入「今天」\n' +
                '為您篩選 TOP 3 高勝率股票（5萬元投資）\n\n' +
                '📊 台股分析：輸入股票代號\n' +
                '例如：2330、0050、3003\n\n' +
                '🌎 美股分析：輸入「美股」\n' +
                '查看 VIX、匯率、三大指數\n\n' +
                '✨ 功能特色：\n' +
                '• KD、MACD、MA 技術指標\n' +
                '• 股利、EPS、本益比分析\n' +
                '• AI 預測未來走勢\n' +
                '• 新聞與政治情勢分析'
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

    // 發送錯誤到 Sentry
    captureError(error, {
      action: 'webhook_handler',
      extra: {
        method: event.httpMethod,
        path: event.path
      }
    });

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

