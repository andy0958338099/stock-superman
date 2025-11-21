/**
 * Rich Menu 設置腳本
 * 創建並設置 LINE Rich Menu
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { createRichMenu, uploadRichMenuImage, setDefaultRichMenu, deleteRichMenu } = require('../functions/rich-menu-manager');
const { generateRichMenuImage, generateDynamicRichMenuImage } = require('./generate-rich-menu-image');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupRichMenu() {
  try {
    console.log('🚀 開始設置 Rich Menu...\n');

    // 步驟 0：刪除舊的 Rich Menu（如果存在）
    const oldRichMenuId = process.env.RICH_MENU_ID;
    if (oldRichMenuId) {
      console.log('📝 步驟 0：刪除舊的 Rich Menu');
      try {
        await deleteRichMenu(oldRichMenuId);
        console.log('✅ 舊 Rich Menu 已刪除\n');
      } catch (error) {
        console.log('⚠️ 刪除舊 Rich Menu 失敗（可能不存在）\n');
      }
    }

    // 步驟 1：取得當前週評分
    console.log('📝 步驟 1/5：取得當前週評分');
    let avgScore = 0;
    let totalVotes = 0;

    try {
      const { data: currentWeek } = await supabase
        .from('survey_weeks')
        .select('id')
        .eq('is_active', true)
        .single();

      if (currentWeek) {
        const { data: stats } = await supabase
          .from('survey_statistics')
          .select('*')
          .eq('week_id', currentWeek.id)
          .single();

        if (stats) {
          avgScore = parseFloat(stats.average_score) || 0;
          totalVotes = stats.total_votes || 0;
          console.log(`✅ 當前週評分：${avgScore.toFixed(1)}/5 (${totalVotes}票)\n`);
        } else {
          console.log('⚠️ 當前週尚無評分，使用預設值\n');
        }
      } else {
        console.log('⚠️ 找不到當前週，使用預設值\n');
      }
    } catch (error) {
      console.log('⚠️ 取得評分失敗，使用預設值\n');
    }

    // 步驟 2：生成 Rich Menu 圖片（使用當前評分）
    console.log('📝 步驟 2/5：生成 Rich Menu 圖片');
    const imageBuffer = generateDynamicRichMenuImage(avgScore, totalVotes);
    console.log('✅ 圖片生成完成\n');

    // 步驟 3：創建 Rich Menu
    console.log('📝 步驟 3/5：創建 Rich Menu');
    const richMenuId = await createRichMenu();
    console.log(`✅ Rich Menu 創建完成：${richMenuId}\n`);

    // 步驟 4：上傳圖片
    console.log('📝 步驟 4/5：上傳 Rich Menu 圖片');
    await uploadRichMenuImage(richMenuId, imageBuffer, false);
    console.log('✅ 圖片上傳完成\n');

    // 步驟 5：設定為預設 Rich Menu
    console.log('📝 步驟 5/5：設定為預設 Rich Menu');
    await setDefaultRichMenu(richMenuId);
    console.log('✅ 預設 Rich Menu 設定完成\n');

    console.log('🎉 Rich Menu 設置完成！');
    console.log(`\n📊 Rich Menu ID: ${richMenuId}`);
    console.log(`📊 顯示評分：${avgScore.toFixed(1)}/5 (${totalVotes}票)`);
    console.log('\n💡 提示：');
    console.log('1. 請將以下內容添加到 .env 文件：');
    console.log(`   RICH_MENU_ID=${richMenuId}`);
    console.log('2. 在 Netlify 環境變數中也要添加 RICH_MENU_ID');
    console.log('3. 在 LINE 中打開您的 Bot，應該會看到底部的功能選單');
    console.log('4. 點擊選單中的按鈕測試功能是否正常');
    console.log('\n💡 更新評分：');
    console.log('   每次需要更新評分時，重新執行 npm run setup:richmenu');

  } catch (error) {
    console.error('\n❌ 設置 Rich Menu 失敗:', error);
    console.error('\n💡 請檢查：');
    console.error('1. 環境變數是否正確設定（LINE_CHANNEL_ACCESS_TOKEN）');
    console.error('2. LINE Channel Access Token 是否有效');
    console.error('3. 網路連線是否正常');
    process.exit(1);
  }
}

// 執行設置
setupRichMenu();

