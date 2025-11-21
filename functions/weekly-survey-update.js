/**
 * 每週問卷更新 Function
 * 用於每週一自動更新問卷週別和 Rich Menu 圖片
 * 可以透過 Netlify Scheduled Functions 或手動觸發
 */

const { createClient } = require('@supabase/supabase-js');
const { generateDynamicRichMenuImage } = require('../scripts/generate-rich-menu-image');
const { uploadRichMenuImage } = require('./rich-menu-manager');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 初始化新的一週
 */
async function initializeNewWeek() {
  try {
    console.log('📅 初始化新的一週...');

    const now = new Date();
    const year = now.getFullYear();
    const weekOfYear = getWeekNumber(now);
    const weekNumber = year * 100 + weekOfYear;

    // 計算週開始和結束日期（週一到週日）
    const startDate = getMonday(now);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    // 將所有週設為非活動
    await supabase
      .from('survey_weeks')
      .update({ is_active: false })
      .neq('id', 0); // 更新所有記錄

    // 插入或更新當前週
    const { data, error } = await supabase
      .from('survey_weeks')
      .upsert({
        week_number: weekNumber,
        year: year,
        week_of_year: weekOfYear,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        is_active: true
      }, {
        onConflict: 'year,week_of_year'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ 初始化新週失敗:', error);
      return null;
    }

    console.log(`✅ 新週已初始化：${weekNumber} (${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]})`);
    return data;

  } catch (error) {
    console.error('❌ 初始化新週失敗:', error);
    return null;
  }
}

/**
 * 更新 Rich Menu 圖片（顯示最新評分）
 * 優先顯示上週評分，如果沒有則顯示當前週評分
 */
async function updateRichMenuWithScore(richMenuId) {
  try {
    console.log('🖼️ 更新 Rich Menu 圖片...');

    // 步驟 1: 嘗試取得上週的統計
    const { data: lastWeek, error: lastWeekError } = await supabase
      .from('survey_weeks')
      .select('id')
      .eq('is_active', false)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    let avgScore = 0;
    let totalVotes = 0;
    let weekType = '預設';

    if (!lastWeekError && lastWeek) {
      // 有上週資料，嘗試取得上週統計
      const { data: lastWeekStats, error: lastWeekStatsError } = await supabase
        .from('survey_statistics')
        .select('*')
        .eq('week_id', lastWeek.id)
        .single();

      if (!lastWeekStatsError && lastWeekStats) {
        avgScore = parseFloat(lastWeekStats.average_score) || 0;
        totalVotes = lastWeekStats.total_votes || 0;
        weekType = '上週';
        console.log(`✅ 使用上週評分：${avgScore.toFixed(1)}/5 (${totalVotes}票)`);
      }
    }

    // 步驟 2: 如果沒有上週資料，使用當前週資料
    if (totalVotes === 0) {
      console.log('⚠️ 沒有上週資料，嘗試使用當前週資料...');

      const { data: currentWeek, error: currentWeekError } = await supabase
        .from('survey_weeks')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!currentWeekError && currentWeek) {
        const { data: currentWeekStats, error: currentWeekStatsError } = await supabase
          .from('survey_statistics')
          .select('*')
          .eq('week_id', currentWeek.id)
          .single();

        if (!currentWeekStatsError && currentWeekStats) {
          avgScore = parseFloat(currentWeekStats.average_score) || 0;
          totalVotes = currentWeekStats.total_votes || 0;
          weekType = '本週';
          console.log(`✅ 使用本週評分：${avgScore.toFixed(1)}/5 (${totalVotes}票)`);
        }
      }
    }

    // 步驟 3: 如果還是沒有資料，使用預設值
    if (totalVotes === 0) {
      console.log('⚠️ 沒有任何評分資料，使用預設評分');
      weekType = '預設';
    }

    // 生成新的 Rich Menu 圖片
    const imageBuffer = generateDynamicRichMenuImage(avgScore, totalVotes);

    // 上傳圖片
    await uploadRichMenuImage(richMenuId, imageBuffer);

    console.log(`✅ Rich Menu 圖片已更新（${weekType}評分：${avgScore.toFixed(1)}/5，投票數：${totalVotes}）`);

  } catch (error) {
    console.error('❌ 更新 Rich Menu 圖片失敗:', error);
  }
}

/**
 * 取得週數（ISO 8601）
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * 取得週一的日期
 */
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  try {
    console.log('🔔 每週問卷更新 Function 被觸發');

    // 初始化新的一週
    const newWeek = await initializeNewWeek();
    if (!newWeek) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '初始化新週失敗' })
      };
    }

    // 更新 Rich Menu 圖片（如果有提供 Rich Menu ID）
    const richMenuId = process.env.RICH_MENU_ID;
    if (richMenuId) {
      await updateRichMenuWithScore(richMenuId);
    } else {
      console.log('⚠️ 未設定 RICH_MENU_ID 環境變數，跳過 Rich Menu 更新');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '每週問卷更新完成',
        week: newWeek
      })
    };

  } catch (error) {
    console.error('❌ 每週問卷更新失敗:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

