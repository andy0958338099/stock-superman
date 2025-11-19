/**
 * 對話狀態管理模組
 * 管理用戶與股票的互動狀態
 */

const { supabase } = require('./supabase-client');

/**
 * 取得用戶對話狀態
 * @param {string} userId - LINE 用戶 ID
 * @param {string} stockId - 股票代號
 * @returns {Promise<object|null>} - 對話狀態或 null
 */
async function getConversationState(userId, stockId) {
  try {
    const { data, error } = await supabase
      .from('user_conversation_state')
      .select('*')
      .eq('user_id', userId)
      .eq('stock_id', stockId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = 沒有資料
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ 取得對話狀態失敗:', error);
    return null;
  }
}

/**
 * 儲存或更新對話狀態
 * @param {string} userId - LINE 用戶 ID
 * @param {string} stockId - 股票代號
 * @param {object} stateData - 狀態資料
 * @returns {Promise<boolean>} - 成功回傳 true
 */
async function saveConversationState(userId, stockId, stateData) {
  try {
    const { error } = await supabase
      .from('user_conversation_state')
      .upsert({
        user_id: userId,
        stock_id: stockId,
        ...stateData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,stock_id'
      });

    if (error) throw error;

    console.log(`✅ 對話狀態已儲存：${userId} - ${stockId}`);
    return true;
  } catch (error) {
    console.error('❌ 儲存對話狀態失敗:', error);
    return false;
  }
}

/**
 * 初始化對話狀態
 * @param {string} userId - LINE 用戶 ID
 * @param {string} stockId - 股票代號
 * @param {string} technicalAnalysis - 技術分析內容
 * @returns {Promise<object>} - 初始化的狀態
 */
async function initConversationState(userId, stockId, technicalAnalysis) {
  const initialState = {
    current_stage: 'initial',
    news_used: false,
    politics_used: false,
    discussion_count: 0,
    discussion_history: [],
    technical_analysis: technicalAnalysis
  };

  await saveConversationState(userId, stockId, initialState);
  return initialState;
}

/**
 * 檢查功能是否可用
 * @param {object} state - 對話狀態
 * @param {string} feature - 功能名稱（'news', 'politics', 'discussion'）
 * @returns {object} - { available: boolean, reason: string }
 */
function checkFeatureAvailability(state, feature) {
  if (!state) {
    return { available: true, reason: '' };
  }

  switch (feature) {
    case 'news':
      if (state.news_used) {
        return { available: false, reason: '新聞分析已使用過，每支股票限用 1 次' };
      }
      return { available: true, reason: '' };

    case 'politics':
      if (state.politics_used) {
        return { available: false, reason: '政治分析已使用過，每支股票限用 1 次' };
      }
      return { available: true, reason: '' };

    case 'discussion':
      if (state.discussion_count >= 5) {
        return { available: false, reason: '討論次數已達上限（5 次）' };
      }
      return { available: true, reason: '' };

    default:
      return { available: true, reason: '' };
  }
}

/**
 * 更新功能使用狀態
 * @param {string} userId - LINE 用戶 ID
 * @param {string} stockId - 股票代號
 * @param {string} feature - 功能名稱
 * @param {object} content - 內容資料
 * @returns {Promise<boolean>} - 成功回傳 true
 */
async function markFeatureUsed(userId, stockId, feature, content = null) {
  try {
    const state = await getConversationState(userId, stockId);
    if (!state) {
      console.error('❌ 找不到對話狀態');
      return false;
    }

    const updateData = {
      current_stage: feature
    };

    switch (feature) {
      case 'news':
        updateData.news_used = true;
        if (content) updateData.news_content = content;
        break;

      case 'politics':
        updateData.politics_used = true;
        if (content) updateData.politics_content = content;
        break;

      case 'us_market':
        if (content) updateData.us_market_content = content;
        break;

      case 'discussion':
        updateData.discussion_count = (state.discussion_count || 0) + 1;
        if (content) {
          const history = state.discussion_history || [];
          history.push(content);
          updateData.discussion_history = history;
        }
        break;
    }

    return await saveConversationState(userId, stockId, updateData);
  } catch (error) {
    console.error('❌ 更新功能使用狀態失敗:', error);
    return false;
  }
}

/**
 * 清除對話狀態
 * @param {string} userId - LINE 用戶 ID
 * @param {string} stockId - 股票代號
 * @returns {Promise<boolean>} - 成功回傳 true
 */
async function clearConversationState(userId, stockId) {
  try {
    const { error } = await supabase
      .from('user_conversation_state')
      .delete()
      .eq('user_id', userId)
      .eq('stock_id', stockId);

    if (error) throw error;

    console.log(`✅ 對話狀態已清除：${userId} - ${stockId}`);
    return true;
  } catch (error) {
    console.error('❌ 清除對話狀態失敗:', error);
    return false;
  }
}

/**
 * 取得用戶當前的討論狀態（不需要股票代號）
 * @param {string} userId - LINE 用戶 ID
 * @returns {Promise<object|null>} - 討論狀態或 null
 */
async function getUserActiveDiscussion(userId) {
  try {
    const { data, error } = await supabase
      .from('user_conversation_state')
      .select('*')
      .eq('user_id', userId)
      .eq('current_stage', 'discussion_waiting')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = 沒有資料
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ 取得用戶討論狀態失敗:', error);
    return null;
  }
}

module.exports = {
  getConversationState,
  saveConversationState,
  initConversationState,
  checkFeatureAvailability,
  markFeatureUsed,
  clearConversationState,
  getUserActiveDiscussion
};

