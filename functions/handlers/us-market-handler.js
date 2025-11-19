/**
 * 美股關聯分析處理器
 * 處理用戶點擊「美股」按鈕的邏輯
 */

const { getUSMarketCache } = require('../supabase-client');
const { analyzeUSMarketRelation } = require('../deepseek');
const { getConversationState, markFeatureUsed } = require('../conversation-state');
const { buildStockAnalysisQuickReply } = require('../quick-reply-builder');

/**
 * 處理美股關聯分析請求
 * @param {string} userId - LINE 用戶 ID
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @returns {Promise<object>} - LINE 回覆訊息
 */
async function handleUSMarketAnalysis(userId, stockId, stockName) {
  try {
    console.log(`🇺🇸 處理美股關聯分析：${userId} - ${stockId}`);

    // 1. 取得美股市場數據（從快取）
    const usMarketData = await getUSMarketCache();

    if (!usMarketData || !usMarketData.result_json) {
      // 取得當前狀態以顯示 Quick Reply
      const state = await getConversationState(userId, stockId);
      const quickReply = buildStockAnalysisQuickReply(stockId, state);

      return {
        type: 'text',
        text: `⚠️ 美股市場數據暫時無法取得\n\n` +
              `請先查詢「美股」取得最新數據，或稍後再試。\n\n` +
              `💡 您可以繼續探索其他分析`,
        quickReply: quickReply?.quickReply
      };
    }

    // 2. 使用 DeepSeek 分析美股與該股票的關聯
    let analysis;
    try {
      analysis = await analyzeUSMarketRelation(stockId, stockName, usMarketData.result_json);
    } catch (aiError) {
      console.error('❌ AI 分析失敗:', aiError);

      // 如果 AI 分析失敗，返回基本的美股數據並保持 Quick Reply
      const state = await getConversationState(userId, stockId);
      const quickReply = buildStockAnalysisQuickReply(stockId, state);
      const marketSummary = usMarketData.result_json;

      return {
        type: 'text',
        text: `🇺🇸 美股市場概況\n\n` +
              `S&P 500: ${marketSummary.sp500?.price || 'N/A'}\n` +
              `NASDAQ: ${marketSummary.nasdaq?.price || 'N/A'}\n` +
              `SOXX: ${marketSummary.soxx?.price || 'N/A'}\n\n` +
              `⚠️ AI 關聯分析暫時無法使用\n\n` +
              `💡 您可以繼續探索其他分析`,
        quickReply: quickReply?.quickReply
      };
    }

    // 3. 標記功能已使用並儲存內容
    await markFeatureUsed(userId, stockId, 'us_market', analysis);

    // 4. 取得更新後的狀態
    const state = await getConversationState(userId, stockId);

    // 5. 建立回覆訊息
    const replyText = `🇺🇸 ${stockName}(${stockId}) 美股關聯分析\n\n` +
                      `【AI 美股評論員分析】\n${analysis}\n\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      `💡 您可以繼續探索其他分析`;

    // 6. 附加 Quick Reply 按鈕
    const quickReply = buildStockAnalysisQuickReply(stockId, state);

    return {
      type: 'text',
      text: replyText,
      quickReply: quickReply?.quickReply
    };

  } catch (error) {
    console.error('❌ 美股關聯分析處理失敗:', error);

    // 即使發生錯誤，也要保持 Quick Reply
    try {
      const state = await getConversationState(userId, stockId);
      const quickReply = buildStockAnalysisQuickReply(stockId, state);

      return {
        type: 'text',
        text: `❌ 處理失敗：${error.message}\n\n請稍後再試。\n\n💡 您可以繼續探索其他分析`,
        quickReply: quickReply?.quickReply
      };
    } catch (stateError) {
      // 如果連狀態都取不到，就只返回錯誤訊息
      return {
        type: 'text',
        text: `❌ 處理失敗：${error.message}\n\n請稍後再試。`
      };
    }
  }
}

module.exports = {
  handleUSMarketAnalysis
};

