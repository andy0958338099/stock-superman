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
      ...state,
      current_stage: 'discussion_waiting'  // 確保 current_stage 不會被 state 覆蓋
    });

    // 3. 根據討論輪次提供不同的引導主題
    const discussionCount = state?.discussion_count || 0;
    const nextRound = discussionCount + 1;

    // 定義 5 個不同的討論主題
    const discussionThemes = {
      1: {
        title: '初步看法',
        prompt: `請分享您對 ${stockName}(${stockId}) 的**初步看法**：`,
        examples: [
          '• 我認為這支股票會漲，因為技術面轉強...',
          '• 我擔心這支股票會跌，因為基本面轉弱...',
          '• 我對這支股票的第一印象是...'
        ],
        hint: '💡 專家會傾聽您的想法並提供初步反饋'
      },
      2: {
        title: '風險評估',
        prompt: `請分享您對 ${stockName}(${stockId}) 的**風險評估**：`,
        examples: [
          '• 我最擔心的風險是產業競爭加劇...',
          '• 我認為最大的風險是政策變化...',
          '• 我對這支股票的疑慮是...'
        ],
        hint: '💡 專家會質疑您的風險評估並提供不同角度'
      },
      3: {
        title: '機會分析',
        prompt: `請分享您對 ${stockName}(${stockId}) 的**機會分析**：`,
        examples: [
          '• 我看到的機會是新產品即將推出...',
          '• 我認為最大的機會是市場需求增加...',
          '• 我對這支股票的期待是...'
        ],
        hint: '💡 專家會挑戰您的機會分析並提供反思'
      },
      4: {
        title: '進出場策略',
        prompt: `請分享您對 ${stockName}(${stockId}) 的**進出場策略**：`,
        examples: [
          '• 我會在價格跌到 XXX 元時買進...',
          '• 我的停損點設在 XXX 元...',
          '• 我的目標價是 XXX 元...'
        ],
        hint: '💡 專家會分析您的策略並提供優化建議'
      },
      5: {
        title: '最終決策',
        prompt: `請分享您對 ${stockName}(${stockId}) 的**最終決策**：`,
        examples: [
          '• 綜合考量後，我決定買進/持有/賣出...',
          '• 我的投資比例是...',
          '• 我的持有期間是...'
        ],
        hint: '💡 專家會總結您的決策並提供最終建議'
      }
    };

    const theme = discussionThemes[nextRound] || discussionThemes[1];

    const replyText = `💬 討論模式 (${discussionCount}/5) - ${theme.title}\n\n` +
                      `${theme.prompt}\n\n` +
                      `例如：\n` +
                      theme.examples.map(ex => ex).join('\n') + '\n\n' +
                      theme.hint;

    // 4. 附加範例 Quick Reply（根據主題調整）
    const quickReply = buildDiscussionPromptQuickReply(stockId, nextRound);

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

    // 6. 更新狀態（保留所有現有狀態）
    await saveConversationState(userId, stockId, {
      ...state,
      current_stage: 'discussion',
      discussion_count: discussionCount + 1,
      discussion_history: discussionHistory
    });

    // 7. 建立回覆訊息（根據輪次顯示不同的角色和主題）
    const newCount = discussionCount + 1;
    const discussionThemes = {
      1: { role: '傾聽者', theme: '初步看法' },
      2: { role: '風險顧問', theme: '風險評估' },
      3: { role: '機會分析師', theme: '機會分析' },
      4: { role: '策略教練', theme: '進出場策略' },
      5: { role: '決策顧問', theme: '最終決策' }
    };
    const themeInfo = discussionThemes[newCount] || discussionThemes[1];

    let replyText = `💬 討論 ${newCount}/5 - ${themeInfo.theme}\n\n` +
                    `【您的看法】\n${userOpinion}\n\n` +
                    `【${themeInfo.role}回應】\n${analysis}\n\n` +
                    `━━━━━━━━━━━━━━━\n`;

    if (newCount < 5) {
      replyText += `💡 繼續討論或查看其他分析`;
    } else {
      replyText += `✅ 討論完成！建議查看「📊 總評」整合所有分析`;
    }

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

