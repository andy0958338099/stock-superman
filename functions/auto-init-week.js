/**
 * 自動檢查並初始化新週
 * 在每次查詢問卷時自動檢查是否需要初始化新週
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
 * 取得週一日期
 */
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * 檢查並自動初始化新週
 * @returns {Promise<boolean>} - 是否初始化了新週
 */
async function autoInitializeWeekIfNeeded() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const weekOfYear = getWeekNumber(now);
    const weekNumber = year * 100 + weekOfYear;

    // 檢查當前週是否已存在且為活動狀態
    const { data: currentWeek, error } = await supabase
      .from('survey_weeks')
      .select('*')
      .eq('is_active', true)
      .single();

    // 如果沒有活動週，或活動週不是當前週，則初始化新週
    if (error || !currentWeek || currentWeek.week_number !== weekNumber) {
      console.log('🔄 檢測到新週，自動初始化...');
      
      // 計算週開始和結束日期（週一到週日）
      const startDate = getMonday(now);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      // 將所有週設為非活動
      await supabase
        .from('survey_weeks')
        .update({ is_active: false })
        .neq('id', 0);

      // 插入或更新當前週
      const { data: newWeek, error: insertError } = await supabase
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

      if (insertError) {
        console.error('❌ 自動初始化新週失敗:', insertError);
        return false;
      }

      console.log(`✅ 新週已自動初始化：${weekNumber} (${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]})`);
      return true;
    }

    // 當前週已存在且正確
    console.log(`✓ 當前週已存在：${currentWeek.week_number}`);
    return false;

  } catch (error) {
    console.error('❌ 自動檢查週別失敗:', error);
    return false;
  }
}

module.exports = {
  autoInitializeWeekIfNeeded
};

