/**
 * 新聞分析處理器
 * 處理用戶點擊「新聞」按鈕的邏輯
 */

const { searchFinancialNews, formatSearchResults } = require('../google-search');
const { analyzeFinancialNews } = require('../deepseek');
const { getConversationState, markFeatureUsed, checkFeatureAvailability } = require('../conversation-state');
const { buildStockAnalysisQuickReply } = require('../quick-reply-builder');

/**
 * 處理新聞分析請求
 * @param {string} userId - LINE 用戶 ID
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @returns {Promise<object>} - LINE 回覆訊息
 */
async function handleNewsAnalysis(userId, stockId, stockName) {
  try {
    console.log(`📰 處理新聞分析：${userId} - ${stockId}`);

    // 1. 檢查功能是否可用
    const state = await getConversationState(userId, stockId);
    const availability = checkFeatureAvailability(state, 'news');
    
    if (!availability.available) {
      // 即使功能不可用，也要顯示 Quick Reply
      const quickReply = buildStockAnalysisQuickReply(stockId, state);

      return {
        type: 'text',
        text: `⚠️ ${availability.reason}\n\n💡 您可以繼續探索其他分析`,
        quickReply: quickReply?.quickReply
      };
    }

    // 2. 搜尋財經新聞
    let newsResults;
    try {
      newsResults = await searchFinancialNews(stockId, stockName);
      
      if (!newsResults || newsResults.length === 0) {
        const quickReply = buildStockAnalysisQuickReply(stockId, state);
        return {
          type: 'text',
          text: `⚠️ 找不到 ${stockName}(${stockId}) 的相關新聞\n\n請稍後再試或查詢其他股票。\n\n💡 您可以繼續探索其他分析`,
          quickReply: quickReply?.quickReply
        };
      }
    } catch (searchError) {
      console.error('❌ 新聞搜尋失敗:', searchError);
      const quickReply = buildStockAnalysisQuickReply(stockId, state);
      return {
        type: 'text',
        text: `❌ 新聞搜尋失敗：${searchError.message}\n\n請檢查 Google Search API 設定。\n\n💡 您可以繼續探索其他分析`,
        quickReply: quickReply?.quickReply
      };
    }

    // 3. 格式化新聞內容
    const newsContent = formatSearchResults(newsResults);

    // 4. 使用 DeepSeek 分析新聞
    let analysis;
    try {
      analysis = await analyzeFinancialNews(stockId, stockName, newsContent);
    } catch (aiError) {
      console.error('❌ AI 分析失敗:', aiError);
      // 如果 AI 分析失敗，至少返回新聞列表並保持 Quick Reply
      const quickReply = buildStockAnalysisQuickReply(stockId, state);
      return {
        type: 'text',
        text: `📰 ${stockName}(${stockId}) 最新財經新聞\n\n${newsContent}\n\n⚠️ AI 分析暫時無法使用\n\n💡 您可以繼續探索其他分析`,
        quickReply: quickReply?.quickReply
      };
    }

    // 5. 標記功能已使用並儲存內容
    await markFeatureUsed(userId, stockId, 'news', analysis);

    // 6. 取得更新後的狀態
    const updatedState = await getConversationState(userId, stockId);

    // 7. 建立回覆訊息
    const replyText = `📰 ${stockName}(${stockId}) 財經新聞分析\n\n` +
                      `【AI 專家分析】\n${analysis}\n\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      `💡 您可以繼續探索其他分析`;

    // 8. 附加 Quick Reply 按鈕
    const quickReply = buildStockAnalysisQuickReply(stockId, updatedState);

    return {
      type: 'text',
      text: replyText,
      quickReply: quickReply?.quickReply
    };

  } catch (error) {
    console.error('❌ 新聞分析處理失敗:', error);

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
      return {
        type: 'text',
        text: `❌ 處理失敗：${error.message}\n\n請稍後再試。`
      };
    }
  }
}

module.exports = {
  handleNewsAnalysis
};

