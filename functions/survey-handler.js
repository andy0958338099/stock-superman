/**
 * 問卷調查處理器
 * 處理每週評分問卷的投票和統計
 */

const { createClient } = require('@supabase/supabase-js');
const { autoInitializeWeekIfNeeded } = require('./auto-init-week');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 取得當前週的資訊
 * @returns {Promise<object|null>} - 當前週資訊
 */
async function getCurrentWeek() {
  try {
    const { data, error } = await supabase
      .from('survey_weeks')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('❌ 取得當前週失敗:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ 取得當前週失敗:', error);
    return null;
  }
}

/**
 * 檢查用戶本週是否已投票
 * @param {string} userId - LINE 用戶 ID
 * @param {number} weekId - 週別 ID
 * @returns {Promise<boolean>} - 是否已投票
 */
async function hasUserVotedThisWeek(userId, weekId) {
  try {
    const { data, error } = await supabase
      .from('survey_votes')
      .select('id')
      .eq('user_id', userId)
      .eq('week_id', weekId)
      .single();

    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * 提交投票
 * @param {string} userId - LINE 用戶 ID
 * @param {number} score - 評分（1-5）
 * @returns {Promise<object>} - { success: boolean, message: string, statistics: object }
 */
async function submitVote(userId, score) {
  try {
    // 驗證評分
    if (score < 1 || score > 5) {
      return {
        success: false,
        message: '❌ 評分必須在 1-5 分之間'
      };
    }

    // 取得當前週
    const currentWeek = await getCurrentWeek();
    if (!currentWeek) {
      return {
        success: false,
        message: '❌ 無法取得當前週資訊，請稍後再試'
      };
    }

    // 檢查是否已投票
    const hasVoted = await hasUserVotedThisWeek(userId, currentWeek.id);
    if (hasVoted) {
      return {
        success: false,
        message: '⚠️ 您本週已經投票過了，每週只能投票一次'
      };
    }

    // 插入投票記錄
    const { error } = await supabase
      .from('survey_votes')
      .insert({
        user_id: userId,
        week_id: currentWeek.id,
        score: score
      });

    if (error) {
      console.error('❌ 提交投票失敗:', error);
      return {
        success: false,
        message: '❌ 投票失敗，請稍後再試'
      };
    }

    // 取得最新統計
    const statistics = await getWeekStatistics(currentWeek.id);

    console.log(`✅ 用戶 ${userId} 投票成功：${score} 分`);

    return {
      success: true,
      message: '✅ 投票成功！感謝您的反饋',
      statistics: statistics
    };

  } catch (error) {
    console.error('❌ 提交投票失敗:', error);
    return {
      success: false,
      message: '❌ 投票失敗，請稍後再試'
    };
  }
}

/**
 * 取得週別統計
 * @param {number} weekId - 週別 ID
 * @returns {Promise<object|null>} - 統計資訊
 */
async function getWeekStatistics(weekId) {
  try {
    const { data, error } = await supabase
      .from('survey_statistics')
      .select('*')
      .eq('week_id', weekId)
      .single();

    if (error) {
      console.error('❌ 取得統計失敗:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ 取得統計失敗:', error);
    return null;
  }
}

/**
 * 取得上週的統計資訊
 * @returns {Promise<object|null>} - { week: object, statistics: object }
 */
async function getLastWeekStatistics() {
  try {
    const { data: lastWeek, error } = await supabase
      .from('survey_weeks')
      .select('*')
      .eq('is_active', false)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !lastWeek) {
      console.log('⚠️ 沒有上週資料');
      return null;
    }

    const statistics = await getWeekStatistics(lastWeek.id);

    return {
      week: lastWeek,
      statistics: statistics || {
        total_votes: 0,
        average_score: 0,
        score_1_count: 0,
        score_2_count: 0,
        score_3_count: 0,
        score_4_count: 0,
        score_5_count: 0
      }
    };
  } catch (error) {
    console.error('❌ 取得上週統計失敗:', error);
    return null;
  }
}

/**
 * 取得當前週的統計資訊
 * @returns {Promise<object|null>} - { week: object, statistics: object }
 */
async function getCurrentWeekStatistics() {
  try {
    const currentWeek = await getCurrentWeek();
    if (!currentWeek) {
      return null;
    }

    const statistics = await getWeekStatistics(currentWeek.id);

    return {
      week: currentWeek,
      statistics: statistics || {
        total_votes: 0,
        average_score: 0,
        score_1_count: 0,
        score_2_count: 0,
        score_3_count: 0,
        score_4_count: 0,
        score_5_count: 0
      }
    };
  } catch (error) {
    console.error('❌ 取得當前週統計失敗:', error);
    return null;
  }
}

/**
 * 取得完整的問卷資訊（包含本週和上週）
 * 自動檢查並初始化新週
 * @returns {Promise<object|null>} - { currentWeek, lastWeek, currentStatistics, lastStatistics }
 */
async function getFullSurveyInfo() {
  try {
    // 自動檢查並初始化新週
    await autoInitializeWeekIfNeeded();

    const currentWeekData = await getCurrentWeekStatistics();
    const lastWeekData = await getLastWeekStatistics();

    return {
      currentWeek: currentWeekData?.week || null,
      currentStatistics: currentWeekData?.statistics || null,
      lastWeek: lastWeekData?.week || null,
      lastStatistics: lastWeekData?.statistics || null
    };
  } catch (error) {
    console.error('❌ 取得完整問卷資訊失敗:', error);
    return null;
  }
}

module.exports = {
  getCurrentWeek,
  hasUserVotedThisWeek,
  submitVote,
  getWeekStatistics,
  getCurrentWeekStatistics,
  getLastWeekStatistics,
  getFullSurveyInfo
};

