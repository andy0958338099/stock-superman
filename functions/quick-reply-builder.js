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

  // 3. 討論按鈕（最多 5 次）
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

  // 6. 分享給朋友們按鈕（永遠顯示）
  // 注意：Quick Reply 最多只能有 13 個按鈕，所以我們確保不超過限制
  if (items.length < 13) {
    const shareText = encodeURIComponent('推薦超好用的股票大亨！https://line.me/R/ti/p/@754zptsk');
    items.push({
      type: 'action',
      action: {
        type: 'uri',
        label: '📤 分享給朋友們',
        uri: `https://line.me/R/share?text=${shareText}`
      }
    });
  }

  // 如果沒有任何按鈕，返回 null
  if (items.length === 0) {
    return null;
  }

  return {
    quickReply: {
      items: items
    }
  };
}

/**
 * 建立討論提示的 Quick Reply（根據輪次提供不同範例）
 * @param {string} stockId - 股票代號
 * @param {number} round - 討論輪次（1-5）
 * @returns {object} - LINE Quick Reply 物件
 */
function buildDiscussionPromptQuickReply(stockId, round = 1) {
  // 根據輪次定義不同的範例
  const examples = {
    1: [
      { label: '💡 範例：我認為會漲', text: '我認為這支股票會漲，因為技術面轉強' },
      { label: '💡 範例：我認為會跌', text: '我認為這支股票會跌，因為基本面轉弱' }
    ],
    2: [
      { label: '💡 範例：產業風險', text: '我最擔心的風險是產業競爭加劇' },
      { label: '💡 範例：政策風險', text: '我認為最大的風險是政策變化' }
    ],
    3: [
      { label: '💡 範例：成長機會', text: '我看到的機會是新產品即將推出' },
      { label: '💡 範例：市場機會', text: '我認為最大的機會是市場需求增加' }
    ],
    4: [
      { label: '💡 範例：買進策略', text: '我會在價格跌到 500 元時買進' },
      { label: '💡 範例：停損策略', text: '我的停損點設在 450 元' }
    ],
    5: [
      { label: '💡 範例：買進決策', text: '綜合考量後，我決定買進並持有 3 個月' },
      { label: '💡 範例：觀望決策', text: '綜合考量後，我決定先觀望等待更好時機' }
    ]
  };

  const roundExamples = examples[round] || examples[1];

  return {
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: roundExamples[0].label,
            text: roundExamples[0].text
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: roundExamples[1].label,
            text: roundExamples[1].text
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
        },
        {
          type: 'action',
          action: {
            type: 'uri',
            label: '📤 分享給朋友們',
            uri: `https://line.me/R/share?text=${encodeURIComponent('推薦超好用的股票大亨！https://line.me/R/ti/p/@754zptsk')}`
          }
        }
      ]
    }
  };
}

/**
 * 建立繼續討論的 Quick Reply（根據輪次顯示不同主題）
 * @param {string} stockId - 股票代號
 * @param {number} discussionCount - 當前討論次數
 * @returns {object} - LINE Quick Reply 物件
 */
function buildContinueDiscussionQuickReply(stockId, discussionCount) {
  const items = [];

  // 定義下一輪的主題
  const nextThemes = {
    1: '風險評估',
    2: '機會分析',
    3: '進出場策略',
    4: '最終決策'
  };

  // 如果還沒達到 5 次，顯示繼續討論（帶主題提示）
  if (discussionCount < 5) {
    const nextTheme = nextThemes[discussionCount] || '繼續討論';
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: `💬 ${nextTheme} (${discussionCount}/5)`,
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

  // 分享給朋友們按鈕
  const shareText = encodeURIComponent('推薦超好用的股票大亨！https://line.me/R/ti/p/@754zptsk');
  items.push({
    type: 'action',
    action: {
      type: 'uri',
      label: '📤 分享給朋友們',
      uri: `https://line.me/R/share?text=${shareText}`
    }
  });

  return {
    quickReply: {
      items: items
    }
  };
}

/**
 * 建立美股分析輪詢的 Quick Reply
 * @param {string} taskId - 任務 ID（可選）
 * @returns {object} - LINE Quick Reply 物件
 */
function buildUSMarketPollingQuickReply(taskId = null) {
  return {
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '📊 查看美股分析',
            text: taskId ? `查看美股分析:${taskId}` : '查看美股分析'
          }
        },
        {
          type: 'action',
          action: {
            type: 'uri',
            label: '📤 分享給朋友們',
            uri: `https://line.me/R/share?text=${encodeURIComponent('推薦超好用的股票大亨！https://line.me/R/ti/p/@754zptsk')}`
          }
        }
      ]
    }
  };
}

module.exports = {
  buildStockAnalysisQuickReply,
  buildDiscussionPromptQuickReply,
  buildReviewVotingQuickReply,
  buildContinueDiscussionQuickReply,
  buildUSMarketPollingQuickReply
};

