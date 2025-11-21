/**
 * 更新 Rich Menu 圖片（根據評分選擇對應圖片）
 * 使用預先準備好的圖片，根據評分範圍選擇對應的圖片
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { generateDynamicRichMenuImage } = require('./generate-rich-menu-image');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 根據評分和投票數選擇對應的圖片
 * @param {number} avgScore - 平均分數 (0-5)
 * @param {number} totalVotes - 總投票數
 * @returns {Buffer} - 圖片 Buffer
 */
function getScoreImage(avgScore, totalVotes) {
  console.log(`🎨 選擇評分圖片（評分：${avgScore.toFixed(1)}/5，投票數：${totalVotes}）`);

  // 如果沒有投票，使用預設圖片
  if (totalVotes === 0) {
    console.log('📊 使用預設圖片（無投票）');
    return generateDynamicRichMenuImage(0, 0);
  }

  // 根據評分範圍選擇圖片
  // 評分範圍：0-1, 1-2, 2-3, 3-4, 4-5
  let scoreRange;
  if (avgScore < 1) {
    scoreRange = '0-1';
  } else if (avgScore < 2) {
    scoreRange = '1-2';
  } else if (avgScore < 3) {
    scoreRange = '2-3';
  } else if (avgScore < 4) {
    scoreRange = '3-4';
  } else {
    scoreRange = '4-5';
  }

  console.log(`📊 評分範圍：${scoreRange}`);

  // 檢查是否有預先準備的圖片
  const imagePath = path.join(__dirname, '..', 'public', 'rich-menu-images', `score-${scoreRange}.png`);
  
  if (fs.existsSync(imagePath)) {
    console.log(`✅ 使用預先準備的圖片：${imagePath}`);
    return fs.readFileSync(imagePath);
  }

  // 如果沒有預先準備的圖片，動態生成
  console.log('⚠️ 找不到預先準備的圖片，動態生成...');
  return generateDynamicRichMenuImage(avgScore, totalVotes);
}

/**
 * 上傳 Rich Menu 圖片（使用 LINE API 直接替換）
 * @param {string} richMenuId - Rich Menu ID
 * @param {Buffer} imageBuffer - 圖片 Buffer
 */
async function uploadRichMenuImageDirect(richMenuId, imageBuffer) {
  try {
    console.log(`🖼️ 上傳 Rich Menu 圖片：${richMenuId}`);

    // LINE API 允許直接 POST 覆蓋圖片（如果已存在）
    const response = await axios.post(
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      imageBuffer,
      {
        headers: {
          'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          'Content-Type': 'image/png'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    console.log('✅ Rich Menu 圖片上傳成功');
    return true;

  } catch (error) {
    // 如果錯誤是「圖片已存在」，這是預期的，我們需要用其他方法
    if (error.response?.data?.message?.includes('already been uploaded')) {
      console.log('⚠️ 圖片已存在，無法直接覆蓋');
      console.log('💡 LINE API 不支持直接替換圖片，需要刪除 Rich Menu 後重新創建');
      return false;
    }
    
    console.error('❌ 上傳 Rich Menu 圖片失敗:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 更新 Rich Menu 圖片（顯示當前週評分）
 */
async function updateRichMenuWithScore() {
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
      console.error('❌ 無法取得當前週資料');
      console.log('💡 使用預設圖片（無評分）\n');
      const imageBuffer = getScoreImage(0, 0);
      await uploadRichMenuImageDirect(richMenuId, imageBuffer);
      return;
    }

    console.log(`✅ 當前週：${currentWeek.week_number}\n`);

    // 步驟 2: 取得當前週統計
    console.log('📝 步驟 2: 取得當前週統計');
    const { data: stats, error: statsError } = await supabase
      .from('survey_statistics')
      .select('*')
      .eq('week_id', currentWeek.id)
      .single();

    let avgScore = 0;
    let totalVotes = 0;

    if (!statsError && stats) {
      avgScore = parseFloat(stats.average_score) || 0;
      totalVotes = stats.total_votes || 0;
      console.log(`✅ 評分：${avgScore.toFixed(1)}/5 (${totalVotes}票)\n`);
    } else {
      console.log('⚠️ 尚無統計資料\n');
    }

    // 步驟 3: 選擇對應的圖片
    console.log('📝 步驟 3: 選擇對應的圖片');
    const imageBuffer = getScoreImage(avgScore, totalVotes);
    console.log();

    // 步驟 4: 上傳圖片
    console.log('📝 步驟 4: 上傳圖片');
    const success = await uploadRichMenuImageDirect(richMenuId, imageBuffer);
    
    if (!success) {
      console.log('\n⚠️ 無法直接更新圖片');
      console.log('💡 解決方案：');
      console.log('   1. 執行 npm run setup:richmenu 重新創建 Rich Menu');
      console.log('   2. 或在 LINE Developers Console 手動刪除 Rich Menu 後重新創建\n');
      process.exit(1);
    }

    console.log('\n🎉 Rich Menu 更新完成！');
    console.log(`📊 顯示評分：${avgScore.toFixed(1)}/5 (${totalVotes}票)\n`);

  } catch (error) {
    console.error('\n❌ 更新失敗:', error.message);
    process.exit(1);
  }
}

// 執行更新
updateRichMenuWithScore();

