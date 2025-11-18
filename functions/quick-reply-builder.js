/**
 * Quick Reply 按鍵生成模組
 * 根據會話狀態動態生成可用的按鍵
 */

/**
 * 生成初步分析後的 Quick Reply 按鍵
 * @param {string} stockId - 股票代號
 * @param {object} session - 會話物件
 * @returns {object} - Quick Reply 物件
 */
function generateAnalysisQuickReply(stockId, session) {
  const items = [];

  // 1. 新聞分析（限 1 次）
  if (!session.news_analysis) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: '📰 新聞',
        text: `新聞:${stockId}`
      }
    });
  }

  // 2. 政治分析（限 1 次）
  if (!session.politics_analysis) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: '🏛️ 政治',
        text: `政治:${stockId}`
      }
    });
  }

  // 3. 美股分析（限 1 次）
  if (!session.us_market_analysis) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: '🇺🇸 美股',
        text: `美股:${stockId}`
      }
    });
  }

  // 4. 討論（最多 5 次）
  if (session.discussion_count < 5) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: `💬 討論 (${session.discussion_count}/5)`,
        text: `討論:${stockId}`
      }
    });
  }

  // 5. 總評（隨時可用）
  items.push({
    type: 'action',
    action: {
      type: 'message',
      label: '📊 總評',
      text: `總評:${stockId}`
    }
  });

  return {
    items: items
  };
}

/**
 * 生成討論模式的 Quick Reply 按鍵
 * @param {string} stockId - 股票代號
 * @param {number} discussionCount - 當前討論次數
 * @returns {object} - Quick Reply 物件
 */
function generateDiscussionQuickReply(stockId, discussionCount) {
  const items = [];

  // 1. 繼續討論（如果未達上限）
  if (discussionCount < 5) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: `💬 繼續討論 (${discussionCount}/5)`,
        text: `討論:${stockId}`
      }
    });
  }

  // 2. 查看總評
  items.push({
    type: 'action',
    action: {
      type: 'message',
      label: '📊 查看總評',
      text: `總評:${stockId}`
    }
  });

  // 3. 結束討論
  items.push({
    type: 'action',
    action: {
      type: 'message',
      label: '✅ 結束討論',
      text: `結束:${stockId}`
    }
  });

  return {
    items: items
  };
}

/**
 * 生成總評後的反饋 Quick Reply 按鍵
 * @param {string} stockId - 股票代號
 * @returns {object} - Quick Reply 物件
 */
function generateFeedbackQuickReply(stockId) {
  return {
    items: [
      {
        type: 'action',
        action: {
          type: 'message',
          label: '👍 好，肯定',
          text: `肯定:${stockId}`
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '👎 不好，我不相信',
          text: `不相信:${stockId}`
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '🔄 重新分析',
          text: stockId
      }
      }
    ]
  };
}

/**
 * 生成處理中的提示訊息（帶 Quick Reply）
 * @param {string} message - 提示訊息
 * @param {string} stockId - 股票代號
 * @param {string} actionLabel - 按鍵標籤
 * @param {string} actionText - 按鍵文字
 * @returns {object} - LINE 訊息物件
 */
function generateProcessingMessage(message, stockId, actionLabel, actionText) {
  return {
    type: 'text',
    text: message,
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: actionLabel,
            text: actionText || `查看:${stockId}`
          }
        }
      ]
    }
  };
}

module.exports = {
  generateAnalysisQuickReply,
  generateDiscussionQuickReply,
  generateFeedbackQuickReply,
  generateProcessingMessage
};

