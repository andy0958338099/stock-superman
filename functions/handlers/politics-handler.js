/**
 * 政治分析處理器
 * 處理用戶點擊「政治」按鈕的邏輯
 */

const { searchPoliticalNews, formatSearchResults, getIndustryCategory } = require('../google-search');
const { analyzePoliticalNews } = require('../deepseek');
const { getConversationState, markFeatureUsed, checkFeatureAvailability } = require('../conversation-state');
const { buildStockAnalysisQuickReply } = require('../quick-reply-builder');

/**
 * 處理政治分析請求
 * @param {string} userId - LINE 用戶 ID
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @returns {Promise<object>} - LINE 回覆訊息
 */
async function handlePoliticsAnalysis(userId, stockId, stockName) {
  try {
    console.log(`🌍 處理政治分析：${userId} - ${stockId}`);

    // 1. 檢查功能是否可用
    const state = await getConversationState(userId, stockId);
    const availability = checkFeatureAvailability(state, 'politics');
    
    if (!availability.available) {
      const quickReply = buildStockAnalysisQuickReply(stockId, state);
      return {
        type: 'text',
        text: `⚠️ ${availability.reason}\n\n💡 您可以繼續探索其他分析`,
        quickReply: quickReply?.quickReply
      };
    }

    // 2. 取得產業類別
    const industry = getIndustryCategory(stockId);

    // 3. 搜尋政治新聞
    let newsResults;
    try {
      newsResults = await searchPoliticalNews(stockId, stockName, industry);
      
      if (!newsResults || newsResults.length === 0) {
        const quickReply = buildStockAnalysisQuickReply(stockId, state);
        return {
          type: 'text',
          text: `⚠️ 找不到 ${industry} 產業的相關國際新聞\n\n請稍後再試或查詢其他股票。\n\n💡 您可以繼續探索其他分析`,
          quickReply: quickReply?.quickReply
        };
      }
    } catch (searchError) {
      console.error('❌ 政治新聞搜尋失敗:', searchError);
      const quickReply = buildStockAnalysisQuickReply(stockId, state);
      return {
        type: 'text',
        text: `❌ 新聞搜尋失敗：${searchError.message}\n\n請檢查 Google Search API 設定。\n\n💡 您可以繼續探索其他分析`,
        quickReply: quickReply?.quickReply
      };
    }

    // 4. 格式化新聞內容
    const newsContent = formatSearchResults(newsResults);

    // 5. 使用 DeepSeek 分析政治新聞
    let analysis;
    try {
      analysis = await analyzePoliticalNews(stockId, stockName, industry, newsContent);
    } catch (aiError) {
      console.error('❌ AI 分析失敗:', aiError);
      // 如果 AI 分析失敗，至少返回新聞列表並保持 Quick Reply
      const quickReply = buildStockAnalysisQuickReply(stockId, state);
      return {
        type: 'text',
        text: `🌍 ${industry} 產業國際情勢新聞\n\n${newsContent}\n\n⚠️ AI 分析暫時無法使用\n\n💡 您可以繼續探索其他分析`,
        quickReply: quickReply?.quickReply
      };
    }

    // 6. 標記功能已使用並儲存內容
    await markFeatureUsed(userId, stockId, 'politics', analysis);

    // 7. 取得更新後的狀態
    const updatedState = await getConversationState(userId, stockId);

    // 8. 建立回覆訊息
    const replyText = `🌍 ${stockName}(${stockId}) 政治情勢分析\n\n` +
                      `【產業類別】${industry}\n\n` +
                      `【專家說法】\n${analysis}\n\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      `💡 您可以繼續探索其他分析`;

    // 9. 附加 Quick Reply 按鈕
    const quickReply = buildStockAnalysisQuickReply(stockId, updatedState);

    return {
      type: 'text',
      text: replyText,
      quickReply: quickReply?.quickReply
    };

  } catch (error) {
    console.error('❌ 政治分析處理失敗:', error);

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
  handlePoliticsAnalysis
};

