/**
 * 更新 Rich Menu 並自動同步到 Netlify
 * 1. 讀取當前週評分
 * 2. 刪除舊 Rich Menu
 * 3. 創建新 Rich Menu
 * 4. 自動更新 Netlify 環境變數
 * 5. 觸發 Netlify 重新部署
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { createRichMenu, uploadRichMenuImage, setDefaultRichMenu, deleteRichMenu } = require('../functions/rich-menu-manager');
const { generateDynamicRichMenuImage } = require('./generate-rich-menu-image');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 更新 Netlify 環境變數
 * @param {string} richMenuId - 新的 Rich Menu ID
 */
async function updateNetlifyEnvVar(richMenuId) {
  const netlifyToken = process.env.NETLIFY_AUTH_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!netlifyToken || !siteId) {
    console.log('⚠️ 未設定 NETLIFY_AUTH_TOKEN 或 NETLIFY_SITE_ID');
    console.log('💡 請手動在 Netlify Dashboard 更新 RICH_MENU_ID');
    return false;
  }

  try {
    console.log('📝 更新 Netlify 環境變數...');

    // 更新環境變數
    await axios.patch(
      `https://api.netlify.com/api/v1/sites/${siteId}/env/RICH_MENU_ID`,
      {
        context: 'all',
        value: richMenuId
      },
      {
        headers: {
          'Authorization': `Bearer ${netlifyToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Netlify 環境變數已更新\n');
    return true;

  } catch (error) {
    console.error('❌ 更新 Netlify 環境變數失敗:', error.response?.data || error.message);
    console.log('💡 請手動在 Netlify Dashboard 更新 RICH_MENU_ID\n');
    return false;
  }
}

/**
 * 觸發 Netlify 重新部署
 */
async function triggerNetlifyDeploy() {
  const deployHook = process.env.NETLIFY_DEPLOY_HOOK;

  if (!deployHook) {
    console.log('⚠️ 未設定 NETLIFY_DEPLOY_HOOK');
    console.log('💡 請手動在 Netlify Dashboard 觸發部署\n');
    return false;
  }

  try {
    console.log('📝 觸發 Netlify 重新部署...');

    await axios.post(deployHook);

    console.log('✅ Netlify 部署已觸發\n');
    return true;

  } catch (error) {
    console.error('❌ 觸發部署失敗:', error.message);
    return false;
  }
}

/**
 * 主函數
 */
async function main() {
  try {
    console.log('🚀 開始更新 Rich Menu 並同步到 Netlify...\n');

    // 步驟 1：取得當前週評分
    console.log('📝 步驟 1/7：取得當前週評分');
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
      }
    } catch (error) {
      console.log('⚠️ 取得評分失敗，使用預設值\n');
    }

    // 步驟 2：刪除舊 Rich Menu
    const oldRichMenuId = process.env.RICH_MENU_ID;
    if (oldRichMenuId) {
      console.log('📝 步驟 2/7：刪除舊 Rich Menu');
      try {
        await deleteRichMenu(oldRichMenuId);
        console.log('✅ 舊 Rich Menu 已刪除\n');
      } catch (error) {
        console.log('⚠️ 刪除舊 Rich Menu 失敗（可能不存在）\n');
      }
    }

    // 步驟 3：生成圖片
    console.log('📝 步驟 3/7：生成 Rich Menu 圖片');
    const imageBuffer = generateDynamicRichMenuImage(avgScore, totalVotes);
    console.log('✅ 圖片生成完成\n');

    // 步驟 4：創建新 Rich Menu
    console.log('📝 步驟 4/7：創建新 Rich Menu');
    const newRichMenuId = await createRichMenu();
    console.log(`✅ 新 Rich Menu 已創建：${newRichMenuId}\n`);

    // 步驟 5：上傳圖片
    console.log('📝 步驟 5/7：上傳圖片');
    await uploadRichMenuImage(newRichMenuId, imageBuffer, false);
    console.log('✅ 圖片上傳完成\n');

    // 步驟 6：設為預設
    console.log('📝 步驟 6/7：設為預設 Rich Menu');
    await setDefaultRichMenu(newRichMenuId);
    console.log('✅ 已設為預設\n');

    // 步驟 7：更新 .env 文件
    console.log('📝 步驟 7/7：更新本地 .env 文件');
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('RICH_MENU_ID=')) {
      envContent = envContent.replace(/RICH_MENU_ID=.*/g, `RICH_MENU_ID=${newRichMenuId}`);
    } else {
      envContent += `\nRICH_MENU_ID=${newRichMenuId}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env 文件已更新\n');

    // 完成
    console.log('🎉 Rich Menu 更新完成！\n');
    console.log('📊 Rich Menu ID:', newRichMenuId);
    console.log(`📊 顯示評分：${avgScore.toFixed(1)}/5 (${totalVotes}票)\n`);

    console.log('💡 接下來請手動完成：');
    console.log(`1. 在 Netlify Dashboard 更新環境變數：`);
    console.log(`   RICH_MENU_ID=${newRichMenuId}`);
    console.log('2. 觸發 Netlify 重新部署\n');

  } catch (error) {
    console.error('\n❌ 更新失敗:', error.message);
    console.error('錯誤堆疊:', error.stack);
    process.exit(1);
  }
}

// 執行
main();

