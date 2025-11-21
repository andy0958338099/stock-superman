/**
 * 手動更新 Rich Menu 圖片（顯示當前週評分）
 * 用於測試或手動更新 Rich Menu
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { createRichMenu, uploadRichMenuImage, setDefaultRichMenu, deleteRichMenu } = require('../functions/rich-menu-manager');
const { generateDynamicRichMenuImage } = require('./generate-rich-menu-image');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 更新 Rich Menu 圖片（顯示當前週評分）
 */
async function updateRichMenuWithCurrentScore() {
  try {
    console.log('🚀 開始更新 Rich Menu 圖片（當前週評分）...\n');

    // 檢查 RICH_MENU_ID
    const richMenuId = process.env.RICH_MENU_ID;
    if (!richMenuId) {
      console.error('❌ 錯誤：未設定 RICH_MENU_ID 環境變數');
      console.log('💡 請在 .env 文件中添加：');
      console.log('   RICH_MENU_ID=your_rich_menu_id');
      process.exit(1);
    }

    console.log(`📊 Rich Menu ID: ${richMenuId}\n`);

    // 步驟 1: 取得當前週資料
    console.log('📝 步驟 1: 取得當前週資料');
    const { data: currentWeek, error: currentWeekError } = await supabase
      .from('survey_weeks')
      .select('*')
      .eq('is_active', true)
      .single();

    if (currentWeekError || !currentWeek) {
      console.error('❌ 無法取得當前週資料:', currentWeekError?.message);
      console.log('💡 請確認：');
      console.log('   1. 資料庫表 survey_weeks 是否存在');
      console.log('   2. 是否已執行 SELECT initialize_current_week();');
      process.exit(1);
    }

    console.log(`✅ 當前週：${currentWeek.week_number} (${currentWeek.start_date} ~ ${currentWeek.end_date})\n`);

    // 步驟 2: 取得當前週統計
    console.log('📝 步驟 2: 取得當前週統計');
    const { data: stats, error: statsError } = await supabase
      .from('survey_statistics')
      .select('*')
      .eq('week_id', currentWeek.id)
      .single();

    let avgScore = 0;
    let totalVotes = 0;

    if (statsError || !stats) {
      console.log('⚠️ 當前週尚無統計資料（使用預設值）');
      console.log('   平均分數: 0.0/5');
      console.log('   投票人數: 0\n');
    } else {
      avgScore = parseFloat(stats.average_score) || 0;
      totalVotes = stats.total_votes || 0;
      console.log(`✅ 當前週統計：`);
      console.log(`   平均分數: ${avgScore.toFixed(1)}/5`);
      console.log(`   投票人數: ${totalVotes}`);
      console.log(`   5分: ${stats.score_5_count}票`);
      console.log(`   4分: ${stats.score_4_count}票`);
      console.log(`   3分: ${stats.score_3_count}票`);
      console.log(`   2分: ${stats.score_2_count}票`);
      console.log(`   1分: ${stats.score_1_count}票\n`);
    }

    // 步驟 3: 生成 Rich Menu 圖片
    console.log('📝 步驟 3: 生成 Rich Menu 圖片');
    const imageBuffer = generateDynamicRichMenuImage(avgScore, totalVotes);
    console.log(`✅ 圖片已生成（${imageBuffer.length} bytes）\n`);

    // 步驟 4: 刪除舊 Rich Menu
    console.log('📝 步驟 4: 刪除舊 Rich Menu');
    try {
      await deleteRichMenu(richMenuId);
      console.log('✅ 舊 Rich Menu 已刪除\n');
    } catch (error) {
      console.log('⚠️ 刪除舊 Rich Menu 失敗（可能不存在）\n');
    }

    // 步驟 5: 創建新 Rich Menu
    console.log('📝 步驟 5: 創建新 Rich Menu');
    const newRichMenuId = await createRichMenu();
    console.log(`✅ 新 Rich Menu 已創建：${newRichMenuId}\n`);

    // 步驟 6: 上傳圖片
    console.log('📝 步驟 6: 上傳 Rich Menu 圖片');
    await uploadRichMenuImage(newRichMenuId, imageBuffer, false);
    console.log('✅ 圖片上傳成功\n');

    // 步驟 7: 設為預設 Rich Menu
    console.log('📝 步驟 7: 設為預設 Rich Menu');
    await setDefaultRichMenu(newRichMenuId);
    console.log('✅ 已設為預設 Rich Menu\n');

    // 完成
    console.log('🎉 Rich Menu 更新完成！\n');
    console.log('📊 顯示資訊：');
    console.log(`   評分: ${avgScore.toFixed(1)}/5`);
    console.log(`   投票數: ${totalVotes}`);
    console.log(`   週別: ${currentWeek.week_number}\n`);
    console.log('💡 提示：');
    console.log('   1. 請在 LINE 中打開 Bot 查看更新後的 Rich Menu');
    console.log('   2. 如果沒有立即更新，請關閉並重新打開 LINE App');
    console.log('   3. 或者封鎖 Bot 後再解除封鎖\n');

  } catch (error) {
    console.error('\n❌ 更新失敗:', error.message);
    console.error('錯誤堆疊:', error.stack);
    console.log('\n💡 請檢查：');
    console.log('   1. .env 文件中的環境變數是否正確');
    console.log('   2. Supabase 資料庫是否正常運行');
    console.log('   3. RICH_MENU_ID 是否有效');
    console.log('   4. LINE Channel Access Token 是否有效\n');
    process.exit(1);
  }
}

// 執行更新
updateRichMenuWithCurrentScore();

