/**
 * 指令路由器
 * 解析用戶輸入並路由到對應的處理函數
 */

/**
 * 解析指令類型和參數
 * @param {string} text - 用戶輸入文字
 * @returns {object} - { type, stockId, params }
 */
function parseCommand(text) {
  const trimmedText = text.trim();

  // 1. 新聞分析指令：新聞:2330
  const newsMatch = trimmedText.match(/^新聞[:：](\d{3,5})$/);
  if (newsMatch) {
    return {
      type: 'news',
      stockId: newsMatch[1]
    };
  }

  // 2. 政治分析指令：政治:2330
  const politicsMatch = trimmedText.match(/^政治[:：](\d{3,5})$/);
  if (politicsMatch) {
    return {
      type: 'politics',
      stockId: politicsMatch[1]
    };
  }

  // 3. 美股分析指令：美股:2330
  const usMarketMatch = trimmedText.match(/^美股[:：](\d{3,5})$/);
  if (usMarketMatch) {
    return {
      type: 'us_market',
      stockId: usMarketMatch[1]
    };
  }

  // 4. 討論指令：討論:2330
  const discussionMatch = trimmedText.match(/^討論[:：](\d{3,5})$/);
  if (discussionMatch) {
    return {
      type: 'discussion_start',
      stockId: discussionMatch[1]
    };
  }

  // 5. 總評指令：總評:2330
  const evalMatch = trimmedText.match(/^總評[:：](\d{3,5})$/);
  if (evalMatch) {
    return {
      type: 'final_evaluation',
      stockId: evalMatch[1]
    };
  }

  // 6. 肯定反饋：肯定:2330
  const positiveMatch = trimmedText.match(/^肯定[:：](\d{3,5})$/);
  if (positiveMatch) {
    return {
      type: 'feedback_positive',
      stockId: positiveMatch[1]
    };
  }

  // 7. 不相信反饋：不相信:2330
  const negativeMatch = trimmedText.match(/^不相信[:：](\d{3,5})$/);
  if (negativeMatch) {
    return {
      type: 'feedback_negative',
      stockId: negativeMatch[1]
    };
  }

  // 8. 結束討論：結束:2330
  const endMatch = trimmedText.match(/^結束[:：](\d{3,5})$/);
  if (endMatch) {
    return {
      type: 'end_discussion',
      stockId: endMatch[1]
    };
  }

  // 9. 查看指令（用於異步處理完成後）：查看:2330
  const viewMatch = trimmedText.match(/^查看[:：](\d{3,5})$/);
  if (viewMatch) {
    return {
      type: 'view_result',
      stockId: viewMatch[1]
    };
  }

  // 10. 美股大盤分析
  if (trimmedText === '美股' || trimmedText === '美股分析' || trimmedText === 'US' || trimmedText === 'us market') {
    return {
      type: 'us_market_overview'
    };
  }

  // 11. 快取管理指令
  if (trimmedText === '清除快取' || trimmedText === 'clear cache') {
    return {
      type: 'clear_all_cache'
    };
  }

  const deleteCacheMatch = trimmedText.match(/^刪除快取\s+(\d{3,5})$/);
  if (deleteCacheMatch) {
    return {
      type: 'delete_cache',
      stockId: deleteCacheMatch[1]
    };
  }

  // 12. 股票代號查詢（初步分析）
  const stockIdMatch = trimmedText.match(/^(\d{3,5})$/);
  if (stockIdMatch) {
    return {
      type: 'stock_query',
      stockId: stockIdMatch[1]
    };
  }

  // 13. 討論模式中的自由輸入（需要配合會話狀態判斷）
  // 這個會在主邏輯中根據會話狀態判斷
  return {
    type: 'unknown',
    text: trimmedText
  };
}

/**
 * 檢查是否為股票代號
 * @param {string} text - 文字
 * @returns {boolean}
 */
function isStockId(text) {
  return /^\d{3,5}$/.test(text.trim());
}

/**
 * 檢查是否為互動式指令
 * @param {string} text - 文字
 * @returns {boolean}
 */
function isInteractiveCommand(text) {
  const command = parseCommand(text);
  return command.type !== 'unknown' && command.type !== 'stock_query';
}

module.exports = {
  parseCommand,
  isStockId,
  isInteractiveCommand
};

