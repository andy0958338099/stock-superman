/**
 * 總評功能處理器
 * 處理用戶點擊「總評」按鈕和評價的邏輯
 */

const { generateFinalReview } = require('../deepseek');
const { getConversationState } = require('../conversation-state');
const { saveFinalReview, getLatestReview, recordUserVote } = require('../final-review-db');
const { buildReviewVotingQuickReply } = require('../quick-reply-builder');

/**
 * 處理總評請求
 * @param {string} userId - LINE 用戶 ID
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @returns {Promise<object>} - LINE 回覆訊息
 */
async function handleFinalReview(userId, stockId, stockName) {
  try {
    console.log(`📊 處理總評請求：${userId} - ${stockId}`);

    // 1. 取得對話狀態
    const state = await getConversationState(userId, stockId);
    
    if (!state || !state.technical_analysis) {
      return {
        type: 'text',
        text: `⚠️ 請先查詢股票代號 ${stockId} 取得技術分析`
      };
    }

    // 2. 取得先前的總評（如果有）
    const previousReview = await getLatestReview(stockId);
    const previousReviewText = previousReview ? 
      `${previousReview.summary}\n\n建議：${previousReview.recommendation}` : null;

    // 3. 整理討論洞察
    let discussionInsights = null;
    if (state.discussion_history && state.discussion_history.length > 0) {
      discussionInsights = state.discussion_history.map((h, i) => 
        `討論 ${i + 1}：\n用戶：${h.user_opinion}\nAI：${h.ai_analysis}`
      ).join('\n\n');
    }

    // 4. 準備所有數據
    const allData = {
      technicalAnalysis: state.technical_analysis,
      newsAnalysis: state.news_content || null,
      politicalAnalysis: state.politics_content || null,
      usMarketAnalysis: state.us_market_content || null,
      discussionInsights: discussionInsights,
      previousReview: previousReviewText
    };

    // 5. 使用 DeepSeek 生成總評
    let review;
    try {
      review = await generateFinalReview(stockId, stockName, allData);
    } catch (aiError) {
      console.error('❌ AI 總評生成失敗:', aiError);
      return {
        type: 'text',
        text: `❌ AI 總評生成失敗：${aiError.message}\n\n請稍後再試。`
      };
    }

    // 6. 儲存總評到資料庫
    let savedReview;
    try {
      savedReview = await saveFinalReview(stockId, stockName, {
        summary: review.summary,
        technical_summary: review.technical_summary,
        news_analysis: state.news_content,
        political_analysis: state.politics_content,
        us_market_analysis: state.us_market_content,
        discussion_insights: discussionInsights,
        final_conclusion: review.final_conclusion,
        recommendation: review.recommendation,
        confidence_level: review.confidence_level
      }, userId);
    } catch (dbError) {
      console.error('❌ 總評儲存失敗:', dbError);
      // 即使儲存失敗，仍然返回總評給用戶
    }

    // 7. 建立回覆訊息
    const replyText = `📊 ${stockName}(${stockId}) 綜合總評\n\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      `【摘要】\n${review.summary}\n\n` +
                      `【技術面】\n${review.technical_summary}\n\n` +
                      `【基本面】\n${review.fundamental_summary || '無'}\n\n` +
                      `【風險評估】\n${review.risk_assessment}\n\n` +
                      `【機會評估】\n${review.opportunity_assessment}\n\n` +
                      `【最終結論】\n${review.final_conclusion}\n\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      `💡 建議：${review.recommendation}\n` +
                      `📈 目標價：${review.target_price_range || 'N/A'}\n` +
                      `🛑 停損價：${review.stop_loss_price || 'N/A'}\n` +
                      `⏰ 時間：${review.time_horizon || 'N/A'}\n` +
                      `🎯 信心：${review.confidence_level}\n\n` +
                      `【操作建議】\n${review.action_plan}\n\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      `💬 請評價這份總評`;

    // 8. 附加評價 Quick Reply 按鈕
    const quickReply = buildReviewVotingQuickReply(stockId);

    // 9. 儲存 review_id 到狀態（用於後續評價）
    if (savedReview) {
      await getConversationState(userId, stockId); // 確保狀態存在
      // 可以考慮在狀態中儲存 review_id，但目前用 latest review 也可以
    }

    return {
      type: 'text',
      text: replyText,
      quickReply: quickReply?.quickReply
    };

  } catch (error) {
    console.error('❌ 總評處理失敗:', error);
    return {
      type: 'text',
      text: `❌ 處理失敗：${error.message}\n\n請稍後再試。`
    };
  }
}

/**
 * 處理用戶評價
 * @param {string} userId - LINE 用戶 ID
 * @param {string} stockId - 股票代號
 * @param {string} vote - 評價（'好' 或 '不好'）
 * @returns {Promise<object>} - LINE 回覆訊息
 */
async function handleReviewVote(userId, stockId, vote) {
  try {
    console.log(`👍 處理評價：${userId} - ${stockId} - ${vote}`);

    // 1. 取得最新總評
    const latestReview = await getLatestReview(stockId);
    
    if (!latestReview) {
      return {
        type: 'text',
        text: `⚠️ 找不到 ${stockId} 的總評\n\n請先查看總評再進行評價。`
      };
    }

    // 2. 轉換評價
    const voteValue = vote === '好' ? 'positive' : 'negative';

    // 3. 記錄評價
    const success = await recordUserVote(userId, latestReview.id, stockId, voteValue);

    if (!success) {
      return {
        type: 'text',
        text: `❌ 評價記錄失敗\n\n請稍後再試。`
      };
    }

    // 4. 回覆感謝訊息
    const replyText = vote === '好' ?
      `👍 感謝您的肯定！\n\n您的評價將幫助我們優化分析品質。\n\n您可以繼續查詢其他股票代號。` :
      `👎 感謝您的反饋！\n\n我們會持續改進分析品質。\n\n您可以點擊「重新生成總評」或查詢其他股票代號。`;

    return {
      type: 'text',
      text: replyText
    };

  } catch (error) {
    console.error('❌ 評價處理失敗:', error);
    return {
      type: 'text',
      text: `❌ 處理失敗：${error.message}\n\n請稍後再試。`
    };
  }
}

module.exports = {
  handleFinalReview,
  handleReviewVote
};

