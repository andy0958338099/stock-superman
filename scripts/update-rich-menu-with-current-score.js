/**
 * 更新 Rich Menu 圖片並顯示當前評分
 * 從 Supabase 取得當前週的評分統計，並更新 Rich Menu 圖片
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { uploadRichMenuImage } = require('../functions/rich-menu-manager');
const { generateDynamicRichMenuImage } = require('./generate-rich-menu-image');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateRichMenuWithCurrentScore() {
  try {
    console.log('🚀 開始更新 Rich Menu 圖片（顯示當前評分）...\n');

    // 檢查 Rich Menu ID
    const richMenuId = process.env.RICH_MENU_ID;
    if (!richMenuId) {
      console.error('❌ 錯誤：未設定 RICH_MENU_ID 環境變數');
      console.log('\n💡 請先執行以下步驟：');
      console.log('1. 執行 npm run setup:richmenu 創建 Rich Menu');
      console.log('2. 將得到的 Rich Menu ID 設定到 .env 或 Netlify 環境變數');
      console.log('   RICH_MENU_ID=richmenu-xxxxxxxxxxxxx');
      process.exit(1);
    }

    console.log(`📊 使用 Rich Menu ID: ${richMenuId}\n`);

    // 步驟 1：取得當前週資訊
    console.log('📝 步驟 1/3：取得當前週資訊');
    const { data: currentWeek, error: weekError } = await supabase
      .from('survey_weeks')
      .select('*')
      .eq('is_active', true)
      .single();

    if (weekError || !currentWeek) {
      console.log('⚠️ 沒有當前週資料，使用預設評分（0/5, 0票）');
      const imageBuffer = generateDynamicRichMenuImage(0, 0);
      await uploadRichMenuImage(richMenuId, imageBuffer);
      console.log('✅ Rich Menu 圖片已更新（預設評分）\n');
      return;
    }

    console.log(`✅ 當前週：${currentWeek.week_number} (${currentWeek.start_date} ~ ${currentWeek.end_date})\n`);

    // 步驟 2：取得當前週統計
    console.log('📝 步驟 2/3：取得當前週統計');
    const { data: stats, error: statsError } = await supabase
      .from('survey_statistics')
      .select('*')
      .eq('week_id', currentWeek.id)
      .single();

    let avgScore = 0;
    let totalVotes = 0;

    if (statsError || !stats) {
      console.log('⚠️ 沒有統計資料，使用預設評分（0/5, 0票）');
    } else {
      avgScore = parseFloat(stats.average_score) || 0;
      totalVotes = stats.total_votes || 0;
      console.log(`✅ 當前評分：${avgScore.toFixed(1)}/5 (${totalVotes}票)`);
      console.log(`   ⭐⭐⭐⭐⭐ 5分：${stats.score_5_count || 0}票`);
      console.log(`   ⭐⭐⭐⭐ 4分：${stats.score_4_count || 0}票`);
      console.log(`   ⭐⭐⭐ 3分：${stats.score_3_count || 0}票`);
      console.log(`   ⭐⭐ 2分：${stats.score_2_count || 0}票`);
      console.log(`   ⭐ 1分：${stats.score_1_count || 0}票\n`);
    }

    // 步驟 3：生成並上傳圖片
    console.log('📝 步驟 3/3：生成並上傳 Rich Menu 圖片');
    const imageBuffer = generateDynamicRichMenuImage(avgScore, totalVotes);
    await uploadRichMenuImage(richMenuId, imageBuffer);
    console.log('✅ Rich Menu 圖片已上傳\n');

    console.log('🎉 Rich Menu 圖片更新完成！');
    console.log(`\n📊 最終顯示：${avgScore > 0 ? avgScore.toFixed(1) : '--'}/5 (${totalVotes}票)`);
    console.log('\n💡 提示：');
    console.log('1. 在 LINE 中重新打開您的 Bot，應該會看到更新後的評分');
    console.log('2. 如果沒有更新，請嘗試關閉並重新打開 LINE App');

  } catch (error) {
    console.error('\n❌ 更新 Rich Menu 圖片失敗:', error);
    console.error('\n💡 請檢查：');
    console.error('1. Supabase 連線是否正常');
    console.error('2. survey_weeks 和 survey_statistics 表是否存在');
    console.error('3. RICH_MENU_ID 是否正確');
    console.error('4. LINE Channel Access Token 是否有效');
    process.exit(1);
  }
}

// 執行更新
updateRichMenuWithCurrentScore();

