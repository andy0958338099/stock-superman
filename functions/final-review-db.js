/**
 * 總評資料庫操作模組
 * 管理股票總評的儲存、查詢和評價
 */

const { supabase } = require('./supabase-client');

/**
 * 儲存股票總評
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {object} reviewData - 總評數據
 * @param {string} userId - 創建者 ID
 * @returns {Promise<object>} - 儲存的總評
 */
async function saveFinalReview(stockId, stockName, reviewData, userId) {
  try {
    // 取得當前最新版本號
    const { data: latestReview } = await supabase
      .from('stock_final_reviews')
      .select('version')
      .eq('stock_id', stockId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const newVersion = latestReview ? latestReview.version + 1 : 1;

    // 將舊版本設為非活躍
    if (latestReview) {
      await supabase
        .from('stock_final_reviews')
        .update({ is_active: false })
        .eq('stock_id', stockId)
        .eq('is_active', true);
    }

    // 儲存新總評
    const { data, error } = await supabase
      .from('stock_final_reviews')
      .insert({
        stock_id: stockId,
        stock_name: stockName,
        version: newVersion,
        summary: reviewData.summary,
        technical_analysis: reviewData.technical_summary,
        news_analysis: reviewData.news_analysis,
        political_analysis: reviewData.political_analysis,
        us_market_analysis: reviewData.us_market_analysis,
        discussion_insights: reviewData.discussion_insights,
        final_conclusion: reviewData.final_conclusion,
        recommendation: reviewData.recommendation,
        risk_level: reviewData.confidence_level,
        created_by: userId,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ 總評已儲存：${stockId} v${newVersion}`);
    return data;

  } catch (error) {
    console.error('❌ 儲存總評失敗:', error);
    throw error;
  }
}

/**
 * 取得最佳總評（信心分數最高）
 * @param {string} stockId - 股票代號
 * @returns {Promise<object|null>} - 最佳總評或 null
 */
async function getBestReview(stockId) {
  try {
    const { data, error } = await supabase
      .from('stock_final_reviews')
      .select('*')
      .eq('stock_id', stockId)
      .eq('is_active', true)
      .order('confidence_score', { ascending: false })
      .order('total_votes', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;

  } catch (error) {
    console.error('❌ 取得最佳總評失敗:', error);
    return null;
  }
}

/**
 * 取得最新總評
 * @param {string} stockId - 股票代號
 * @returns {Promise<object|null>} - 最新總評或 null
 */
async function getLatestReview(stockId) {
  try {
    const { data, error } = await supabase
      .from('stock_final_reviews')
      .select('*')
      .eq('stock_id', stockId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;

  } catch (error) {
    console.error('❌ 取得最新總評失敗:', error);
    return null;
  }
}

/**
 * 記錄用戶評價
 * @param {string} userId - 用戶 ID
 * @param {string} reviewId - 總評 ID
 * @param {string} stockId - 股票代號
 * @param {string} vote - 評價（'positive' 或 'negative'）
 * @param {string} comment - 評論（可選）
 * @returns {Promise<boolean>} - 成功回傳 true
 */
async function recordUserVote(userId, reviewId, stockId, vote, comment = null) {
  try {
    const { error } = await supabase
      .from('user_review_votes')
      .upsert({
        user_id: userId,
        review_id: reviewId,
        stock_id: stockId,
        vote: vote,
        comment: comment
      }, {
        onConflict: 'user_id,review_id'
      });

    if (error) throw error;

    console.log(`✅ 用戶評價已記錄：${userId} - ${vote}`);
    
    // 觸發器會自動更新統計，不需要手動更新
    return true;

  } catch (error) {
    console.error('❌ 記錄用戶評價失敗:', error);
    return false;
  }
}

/**
 * 取得用戶對某總評的評價
 * @param {string} userId - 用戶 ID
 * @param {string} reviewId - 總評 ID
 * @returns {Promise<object|null>} - 評價或 null
 */
async function getUserVote(userId, reviewId) {
  try {
    const { data, error } = await supabase
      .from('user_review_votes')
      .select('*')
      .eq('user_id', userId)
      .eq('review_id', reviewId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;

  } catch (error) {
    console.error('❌ 取得用戶評價失敗:', error);
    return null;
  }
}

module.exports = {
  saveFinalReview,
  getBestReview,
  getLatestReview,
  recordUserVote,
  getUserVote
};

