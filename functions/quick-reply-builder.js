/**
 * Quick Reply 按鈕生成器
 * 根據對話狀態動態生成 Quick Reply 按鈕
 */

/**
 * 建立股票分析的 Quick Reply 按鈕
 * @param {string} stockId - 股票代號
 * @param {object} state - 對話狀態
 * @returns {object} - LINE Quick Reply 物件
 */
function buildStockAnalysisQuickReply(stockId, state = null) {
  const items = [];

  // 1. 新聞按鈕（限用 1 次）
  if (!state || !state.news_used) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: '📰 新聞',
        text: `新聞:${stockId}`
      }
    });
  }

  // 2. 政治按鈕（限用 1 次）
  if (!state || !state.politics_used) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: '🌍 政治',
        text: `政治:${stockId}`
      }
    });
  }

  // 3. 美股按鈕（無限制）
  items.push({
    type: 'action',
    action: {
      type: 'message',
      label: '🇺🇸 美股',
      text: `美股:${stockId}`
    }
  });

  // 4. 討論按鈕（最多 5 次）
  const discussionCount = state?.discussion_count || 0;
  if (discussionCount < 5) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: `💬 討論 (${discussionCount}/5)`,
        text: `討論:${stockId}`
      }
    });
  }

  // 5. 總評按鈕（永遠顯示）
  items.push({
    type: 'action',
    action: {
      type: 'message',
      label: '📊 總評',
      text: `總評:${stockId}`
    }
  });

  // 如果沒有任何按鈕，返回 null
  if (items.length === 0) {
    return null;
  }

  return {
    type: 'text',
    quickReply: {
      items: items
    }
  };
}

/**
 * 建立討論提示的 Quick Reply
 * @param {string} stockId - 股票代號
 * @returns {object} - LINE Quick Reply 物件
 */
function buildDiscussionPromptQuickReply(stockId) {
  return {
    type: 'text',
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '💡 範例：我認為會漲',
            text: '我認為這支股票會漲，因為技術面轉強'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '💡 範例：我認為會跌',
            text: '我認為這支股票會跌，因為基本面轉弱'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '🔙 返回',
            text: stockId
          }
        }
      ]
    }
  };
}

/**
 * 建立總評評價的 Quick Reply
 * @param {string} stockId - 股票代號
 * @returns {object} - LINE Quick Reply 物件
 */
function buildReviewVotingQuickReply(stockId) {
  return {
    type: 'text',
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '👍 好，肯定',
            text: `評價:${stockId}:好`
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '👎 不好，我不相信',
            text: `評價:${stockId}:不好`
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '🔄 重新生成總評',
            text: `總評:${stockId}`
          }
        }
      ]
    }
  };
}

/**
 * 建立繼續討論的 Quick Reply
 * @param {string} stockId - 股票代號
 * @param {number} discussionCount - 當前討論次數
 * @returns {object} - LINE Quick Reply 物件
 */
function buildContinueDiscussionQuickReply(stockId, discussionCount) {
  const items = [];

  // 如果還沒達到 5 次，顯示繼續討論
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

  // 總評按鈕
  items.push({
    type: 'action',
    action: {
      type: 'message',
      label: '📊 查看總評',
      text: `總評:${stockId}`
    }
  });

  // 返回按鈕
  items.push({
    type: 'action',
    action: {
      type: 'message',
      label: '🔙 返回',
      text: stockId
    }
  });

  return {
    type: 'text',
    quickReply: {
      items: items
    }
  };
}

module.exports = {
  buildStockAnalysisQuickReply,
  buildDiscussionPromptQuickReply,
  buildReviewVotingQuickReply,
  buildContinueDiscussionQuickReply
};

