/**
 * 討論功能處理器
 * 處理用戶點擊「討論」按鈕和提交意見的邏輯
 */

const { analyzeUserOpinion } = require('../deepseek');
const { getConversationState, saveConversationState, checkFeatureAvailability } = require('../conversation-state');
const { buildDiscussionPromptQuickReply, buildContinueDiscussionQuickReply, buildStockAnalysisQuickReply } = require('../quick-reply-builder');

/**
 * 處理討論初始化（用戶點擊「討論」按鈕）
 * @param {string} userId - LINE 用戶 ID
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @returns {Promise<object>} - LINE 回覆訊息
 */
async function handleDiscussionInit(userId, stockId, stockName) {
  try {
    console.log(`💬 初始化討論：${userId} - ${stockId}`);

    // 1. 檢查功能是否可用
    const state = await getConversationState(userId, stockId);
    const availability = checkFeatureAvailability(state, 'discussion');
    
    if (!availability.available) {
      const quickReply = buildStockAnalysisQuickReply(stockId, state);
      return {
        type: 'text',
        text: `⚠️ ${availability.reason}\n\n💡 您可以繼續探索其他分析`,
        quickReply: quickReply?.quickReply
      };
    }

    // 2. 設定討論狀態
    await saveConversationState(userId, stockId, {
      current_stage: 'discussion_waiting',
      ...state
    });

    // 3. 提示用戶輸入意見
    const discussionCount = state?.discussion_count || 0;
    const replyText = `💬 討論模式 (${discussionCount}/5)\n\n` +
                      `請分享您對 ${stockName}(${stockId}) 的看法：\n\n` +
                      `例如：\n` +
                      `• 我認為這支股票會漲，因為...\n` +
                      `• 我擔心這支股票會跌，因為...\n` +
                      `• 我對這支股票的疑問是...\n\n` +
                      `💡 AI 會分析您的論點並提供中性質疑`;

    // 4. 附加範例 Quick Reply
    const quickReply = buildDiscussionPromptQuickReply(stockId);

    return {
      type: 'text',
      text: replyText,
      quickReply: quickReply?.quickReply
    };

  } catch (error) {
    console.error('❌ 討論初始化失敗:', error);
    return {
      type: 'text',
      text: `❌ 處理失敗：${error.message}\n\n請稍後再試。`
    };
  }
}

/**
 * 處理用戶提交的討論意見
 * @param {string} userId - LINE 用戶 ID
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {string} userOpinion - 用戶意見
 * @returns {Promise<object>} - LINE 回覆訊息
 */
async function handleDiscussionOpinion(userId, stockId, stockName, userOpinion) {
  try {
    console.log(`💬 處理討論意見：${userId} - ${stockId}`);

    // 1. 取得當前狀態
    const state = await getConversationState(userId, stockId);
    
    if (!state || state.current_stage !== 'discussion_waiting') {
      return {
        type: 'text',
        text: `⚠️ 請先點擊「討論」按鈕開始討論`
      };
    }

    // 2. 檢查討論次數
    const discussionCount = state.discussion_count || 0;
    if (discussionCount >= 5) {
      return {
        type: 'text',
        text: `⚠️ 討論次數已達上限（5 次）\n\n您可以查看總評或查詢新的股票代號。`
      };
    }

    // 3. 取得討論歷史
    const discussionHistory = state.discussion_history || [];
    const historyForAI = discussionHistory.map(h => ({
      user: h.user_opinion,
      ai: h.ai_analysis
    }));

    // 4. 使用 DeepSeek 分析用戶意見
    let analysis;
    try {
      analysis = await analyzeUserOpinion(stockId, stockName, userOpinion, historyForAI);
    } catch (aiError) {
      console.error('❌ AI 分析失敗:', aiError);
      return {
        type: 'text',
        text: `❌ AI 分析暫時無法使用：${aiError.message}\n\n請稍後再試。`
      };
    }

    // 5. 更新討論歷史
    const newDiscussionEntry = {
      user_opinion: userOpinion,
      ai_analysis: analysis,
      timestamp: new Date().toISOString()
    };
    
    discussionHistory.push(newDiscussionEntry);

    // 6. 更新狀態
    await saveConversationState(userId, stockId, {
      current_stage: 'discussion',
      discussion_count: discussionCount + 1,
      discussion_history: discussionHistory
    });

    // 7. 建立回覆訊息
    const newCount = discussionCount + 1;
    const replyText = `💬 討論 ${newCount}/5\n\n` +
                      `【您的看法】\n${userOpinion}\n\n` +
                      `【AI 分析師回應】\n${analysis}\n\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      `💡 ${newCount < 5 ? '您可以繼續討論或查看其他分析' : '討論已達上限，建議查看總評'}`;

    // 8. 附加 Quick Reply 按鈕
    const quickReply = buildContinueDiscussionQuickReply(stockId, newCount);

    return {
      type: 'text',
      text: replyText,
      quickReply: quickReply?.quickReply
    };

  } catch (error) {
    console.error('❌ 討論意見處理失敗:', error);
    return {
      type: 'text',
      text: `❌ 處理失敗：${error.message}\n\n請稍後再試。`
    };
  }
}

module.exports = {
  handleDiscussionInit,
  handleDiscussionOpinion
};

