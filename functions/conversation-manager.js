/**
 * 對話會話管理模組
 * 負責管理用戶的多輪對話狀態
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 取得或建立對話會話
 * @param {string} userId - LINE User ID
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @returns {Promise<object>} - 會話物件
 */
async function getOrCreateSession(userId, stockId, stockName = null) {
  try {
    // 1. 查找現有的 active 會話
    const { data: existingSession, error: fetchError } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('stock_id', stockId)
      .in('status', ['active', 'in_discussion'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSession && !fetchError) {
      console.log(`✅ 找到現有會話：${existingSession.id}`);
      return existingSession;
    }

    // 2. 建立新會話
    const { data: newSession, error: createError } = await supabase
      .from('conversation_sessions')
      .insert({
        user_id: userId,
        stock_id: stockId,
        stock_name: stockName,
        status: 'active',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 小時後過期
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ 建立會話失敗:', createError);
      throw createError;
    }

    console.log(`✅ 建立新會話：${newSession.id}`);
    return newSession;

  } catch (error) {
    console.error('❌ getOrCreateSession 錯誤:', error);
    throw error;
  }
}

/**
 * 更新會話的初步分析結果
 * @param {string} sessionId - 會話 ID
 * @param {object} analysisResult - 分析結果
 */
async function updateInitialAnalysis(sessionId, analysisResult) {
  try {
    const { error } = await supabase
      .from('conversation_sessions')
      .update({
        initial_analysis: analysisResult
      })
      .eq('id', sessionId);

    if (error) throw error;
    console.log(`✅ 更新初步分析：${sessionId}`);
  } catch (error) {
    console.error('❌ updateInitialAnalysis 錯誤:', error);
    throw error;
  }
}

/**
 * 更新會話的新聞分析結果
 * @param {string} sessionId - 會話 ID
 * @param {object} newsAnalysis - 新聞分析結果
 */
async function updateNewsAnalysis(sessionId, newsAnalysis) {
  try {
    const { error } = await supabase
      .from('conversation_sessions')
      .update({
        news_analysis: newsAnalysis,
        news_analyzed_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;
    console.log(`✅ 更新新聞分析：${sessionId}`);
  } catch (error) {
    console.error('❌ updateNewsAnalysis 錯誤:', error);
    throw error;
  }
}

/**
 * 更新會話的政治分析結果
 * @param {string} sessionId - 會話 ID
 * @param {object} politicsAnalysis - 政治分析結果
 */
async function updatePoliticsAnalysis(sessionId, politicsAnalysis) {
  try {
    const { error } = await supabase
      .from('conversation_sessions')
      .update({
        politics_analysis: politicsAnalysis,
        politics_analyzed_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;
    console.log(`✅ 更新政治分析：${sessionId}`);
  } catch (error) {
    console.error('❌ updatePoliticsAnalysis 錯誤:', error);
    throw error;
  }
}

/**
 * 更新會話的美股分析結果
 * @param {string} sessionId - 會話 ID
 * @param {object} usMarketAnalysis - 美股分析結果
 */
async function updateUSMarketAnalysis(sessionId, usMarketAnalysis) {
  try {
    const { error } = await supabase
      .from('conversation_sessions')
      .update({
        us_market_analysis: usMarketAnalysis,
        us_market_analyzed_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;
    console.log(`✅ 更新美股分析：${sessionId}`);
  } catch (error) {
    console.error('❌ updateUSMarketAnalysis 錯誤:', error);
    throw error;
  }
}

/**
 * 新增討論記錄
 * @param {string} sessionId - 會話 ID
 * @param {string} userInput - 用戶輸入
 * @param {object} aiResponse - AI 回應
 * @returns {Promise<number>} - 當前討論次數
 */
async function addDiscussion(sessionId, userInput, aiResponse) {
  try {
    // 1. 取得當前會話
    const { data: session, error: fetchError } = await supabase
      .from('conversation_sessions')
      .select('discussion_count, discussion_history')
      .eq('id', sessionId)
      .single();

    if (fetchError) throw fetchError;

    // 2. 檢查討論次數限制
    if (session.discussion_count >= 5) {
      throw new Error('已達到討論次數上限（5 次）');
    }

    // 3. 新增討論記錄
    const newDiscussion = {
      round: session.discussion_count + 1,
      user_input: userInput,
      ai_response: aiResponse,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...(session.discussion_history || []), newDiscussion];

    const { error: updateError } = await supabase
      .from('conversation_sessions')
      .update({
        discussion_count: session.discussion_count + 1,
        discussion_history: updatedHistory,
        status: 'in_discussion'
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    console.log(`✅ 新增討論記錄：第 ${session.discussion_count + 1} 輪`);
    return session.discussion_count + 1;

  } catch (error) {
    console.error('❌ addDiscussion 錯誤:', error);
    throw error;
  }
}

/**
 * 更新會話的總評結果
 * @param {string} sessionId - 會話 ID
 * @param {object} finalEvaluation - 總評結果
 */
async function updateFinalEvaluation(sessionId, finalEvaluation) {
  try {
    const { error } = await supabase
      .from('conversation_sessions')
      .update({
        final_evaluation: finalEvaluation,
        final_evaluation_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;
    console.log(`✅ 更新總評：${sessionId}`);
  } catch (error) {
    console.error('❌ updateFinalEvaluation 錯誤:', error);
    throw error;
  }
}

/**
 * 更新用戶反饋
 * @param {string} sessionId - 會話 ID
 * @param {string} feedback - 反饋類型（positive / negative）
 */
async function updateUserFeedback(sessionId, feedback) {
  try {
    const { error } = await supabase
      .from('conversation_sessions')
      .update({
        user_feedback: feedback,
        user_feedback_at: new Date().toISOString(),
        status: 'completed',
        session_end_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;
    console.log(`✅ 更新用戶反饋：${sessionId} - ${feedback}`);
  } catch (error) {
    console.error('❌ updateUserFeedback 錯誤:', error);
    throw error;
  }
}

/**
 * 取得會話資訊
 * @param {string} sessionId - 會話 ID
 * @returns {Promise<object>} - 會話物件
 */
async function getSession(sessionId) {
  try {
    const { data, error } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ getSession 錯誤:', error);
    throw error;
  }
}

/**
 * 檢查功能是否已使用
 * @param {object} session - 會話物件
 * @param {string} feature - 功能名稱（news, politics, us_market）
 * @returns {boolean} - 是否已使用
 */
function isFeatureUsed(session, feature) {
  switch (feature) {
    case 'news':
      return !!session.news_analysis;
    case 'politics':
      return !!session.politics_analysis;
    case 'us_market':
      return !!session.us_market_analysis;
    default:
      return false;
  }
}

/**
 * 檢查是否可以繼續討論
 * @param {object} session - 會話物件
 * @returns {boolean} - 是否可以繼續討論
 */
function canContinueDiscussion(session) {
  return session.discussion_count < 5;
}

/**
 * 記錄用戶互動
 * @param {string} sessionId - 會話 ID
 * @param {string} userId - 用戶 ID
 * @param {string} stockId - 股票代號
 * @param {string} interactionType - 互動類型
 * @param {string} userInput - 用戶輸入
 * @param {object} aiResponse - AI 回應
 * @param {number} processingTime - 處理時間（毫秒）
 */
async function logInteraction(sessionId, userId, stockId, interactionType, userInput, aiResponse, processingTime = null) {
  try {
    const { error } = await supabase
      .from('user_interactions')
      .insert({
        session_id: sessionId,
        user_id: userId,
        stock_id: stockId,
        interaction_type: interactionType,
        user_input: userInput,
        ai_response: aiResponse,
        processing_time_ms: processingTime
      });

    if (error) throw error;
    console.log(`✅ 記錄互動：${interactionType}`);
  } catch (error) {
    console.error('❌ logInteraction 錯誤:', error);
    // 不拋出錯誤，避免影響主流程
  }
}

/**
 * 清理過期會話
 */
async function cleanupExpiredSessions() {
  try {
    const { error } = await supabase.rpc('cleanup_expired_sessions');
    if (error) throw error;
    console.log('✅ 清理過期會話完成');
  } catch (error) {
    console.error('❌ cleanupExpiredSessions 錯誤:', error);
  }
}

module.exports = {
  getOrCreateSession,
  getSession,
  updateInitialAnalysis,
  updateNewsAnalysis,
  updatePoliticsAnalysis,
  updateUSMarketAnalysis,
  updateFinalEvaluation,
  updateUserFeedback,
  addDiscussion,
  isFeatureUsed,
  canContinueDiscussion,
  logInteraction,
  cleanupExpiredSessions
};

