/**
 * 測試問卷系統
 * 檢查資料庫表是否存在，當前週是否已初始化
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSurveySystem() {
  console.log('🧪 開始測試問卷系統...\n');

  try {
    // 測試 1: 檢查 survey_weeks 表
    console.log('📝 測試 1: 檢查 survey_weeks 表');
    const { data: weeks, error: weeksError } = await supabase
      .from('survey_weeks')
      .select('*')
      .limit(5);

    if (weeksError) {
      console.error('❌ survey_weeks 表不存在或無法訪問:', weeksError.message);
      console.log('\n💡 解決方案：');
      console.log('1. 在 Supabase SQL Editor 執行 supabase/migrations/reset_weekly_survey.sql');
      console.log('2. 或執行 supabase/migrations/create_weekly_survey.sql\n');
      return;
    }

    console.log(`✅ survey_weeks 表存在，共有 ${weeks.length} 筆記錄`);
    if (weeks.length > 0) {
      console.log('   最新記錄:', JSON.stringify(weeks[0], null, 2));
    }
    console.log();

    // 測試 2: 檢查當前週
    console.log('📝 測試 2: 檢查當前週');
    const { data: currentWeek, error: currentWeekError } = await supabase
      .from('survey_weeks')
      .select('*')
      .eq('is_active', true)
      .single();

    if (currentWeekError) {
      console.error('❌ 沒有當前週:', currentWeekError.message);
      console.log('\n💡 解決方案：');
      console.log('在 Supabase SQL Editor 執行：');
      console.log('SELECT initialize_current_week();\n');
      return;
    }

    console.log('✅ 當前週已初始化');
    console.log(`   週別編號: ${currentWeek.week_number}`);
    console.log(`   年份: ${currentWeek.year}`);
    console.log(`   第幾週: ${currentWeek.week_of_year}`);
    console.log(`   開始日期: ${currentWeek.start_date}`);
    console.log(`   結束日期: ${currentWeek.end_date}`);
    console.log();

    // 測試 3: 檢查 survey_votes 表
    console.log('📝 測試 3: 檢查 survey_votes 表');
    const { data: votes, error: votesError } = await supabase
      .from('survey_votes')
      .select('*')
      .limit(5);

    if (votesError) {
      console.error('❌ survey_votes 表不存在或無法訪問:', votesError.message);
      return;
    }

    console.log(`✅ survey_votes 表存在，共有 ${votes.length} 筆投票記錄`);
    console.log();

    // 測試 4: 檢查 survey_statistics 表
    console.log('📝 測試 4: 檢查 survey_statistics 表');
    const { data: stats, error: statsError } = await supabase
      .from('survey_statistics')
      .select('*')
      .eq('week_id', currentWeek.id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('❌ survey_statistics 表不存在或無法訪問:', statsError.message);
      return;
    }

    if (!stats) {
      console.log('⚠️ 當前週尚無統計資料（正常，等待第一筆投票）');
    } else {
      console.log('✅ 當前週統計資料');
      console.log(`   總投票數: ${stats.total_votes}`);
      console.log(`   平均分數: ${stats.average_score}`);
      console.log(`   5分: ${stats.score_5_count}票`);
      console.log(`   4分: ${stats.score_4_count}票`);
      console.log(`   3分: ${stats.score_3_count}票`);
      console.log(`   2分: ${stats.score_2_count}票`);
      console.log(`   1分: ${stats.score_1_count}票`);
    }
    console.log();

    // 測試 5: 測試 getCurrentWeekStatistics 函數
    console.log('📝 測試 5: 測試 getCurrentWeekStatistics 函數');
    const { getCurrentWeekStatistics } = require('../functions/survey-handler');
    const weekStats = await getCurrentWeekStatistics();

    if (!weekStats) {
      console.error('❌ getCurrentWeekStatistics 返回 null');
      return;
    }

    console.log('✅ getCurrentWeekStatistics 函數正常');
    console.log('   返回資料:', JSON.stringify(weekStats, null, 2));
    console.log();

    // 總結
    console.log('🎉 問卷系統測試完成！');
    console.log('\n📊 系統狀態：');
    console.log(`   ✅ 資料庫表: 正常`);
    console.log(`   ✅ 當前週: ${currentWeek.week_number} (${currentWeek.start_date} ~ ${currentWeek.end_date})`);
    console.log(`   ✅ 投票記錄: ${votes.length} 筆`);
    console.log(`   ✅ 統計資料: ${stats ? '已初始化' : '等待第一筆投票'}`);
    console.log('\n💡 系統已就緒，可以開始使用問卷功能！');

  } catch (error) {
    console.error('\n❌ 測試失敗:', error);
    console.error('❌ 錯誤堆疊:', error.stack);
    console.log('\n💡 請檢查：');
    console.log('1. .env 文件中的 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 是否正確');
    console.log('2. Supabase 資料庫是否正常運行');
    console.log('3. 是否已執行資料庫遷移腳本');
  }
}

// 執行測試
testSurveySystem();

