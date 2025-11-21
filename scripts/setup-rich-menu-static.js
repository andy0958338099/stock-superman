/**
 * 創建固定的 Rich Menu（不顯示即時評分）
 * 這個 Rich Menu 的 ID 永遠不會改變
 * 評分顯示固定文字「點擊查看」
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createRichMenu, uploadRichMenuImage, setDefaultRichMenu, deleteRichMenu } = require('../functions/rich-menu-manager');
const { generateRichMenuImage } = require('./generate-rich-menu-image');

async function setupStaticRichMenu() {
  try {
    console.log('🚀 開始設置固定 Rich Menu（不顯示即時評分）...\n');

    // 步驟 1：刪除舊 Rich Menu（如果存在）
    const oldRichMenuId = process.env.RICH_MENU_ID;
    if (oldRichMenuId) {
      console.log('📝 步驟 1：刪除舊 Rich Menu');
      try {
        await deleteRichMenu(oldRichMenuId);
        console.log('✅ 舊 Rich Menu 已刪除\n');
      } catch (error) {
        console.log('⚠️ 刪除舊 Rich Menu 失敗（可能不存在）\n');
      }
    }

    // 步驟 2：生成固定圖片（不顯示評分）
    console.log('📝 步驟 2：生成 Rich Menu 圖片');
    const imagePath = generateRichMenuImage();
    const imageBuffer = fs.readFileSync(imagePath);
    console.log('✅ 圖片生成完成\n');

    // 步驟 3：創建 Rich Menu
    console.log('📝 步驟 3：創建 Rich Menu');
    const richMenuId = await createRichMenu();
    console.log(`✅ Rich Menu 已創建：${richMenuId}\n`);

    // 步驟 4：上傳圖片
    console.log('📝 步驟 4：上傳圖片');
    await uploadRichMenuImage(richMenuId, imageBuffer, false);
    console.log('✅ 圖片上傳完成\n');

    // 步驟 5：設為預設
    console.log('📝 步驟 5：設為預設 Rich Menu');
    await setDefaultRichMenu(richMenuId);
    console.log('✅ 已設為預設\n');

    // 步驟 6：更新 .env 文件
    console.log('📝 步驟 6：更新 .env 文件');
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('RICH_MENU_ID=')) {
      envContent = envContent.replace(/RICH_MENU_ID=.*/g, `RICH_MENU_ID=${richMenuId}`);
    } else {
      envContent += `\nRICH_MENU_ID=${richMenuId}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env 文件已更新\n');

    // 完成
    console.log('🎉 固定 Rich Menu 設置完成！\n');
    console.log('📊 Rich Menu ID:', richMenuId);
    console.log('📊 評分顯示：固定文字「點擊查看」\n');

    console.log('💡 重要提示：');
    console.log('1. 這個 Rich Menu ID 永遠不會改變');
    console.log('2. 請將以下內容添加到 Netlify 環境變數：');
    console.log(`   RICH_MENU_ID=${richMenuId}`);
    console.log('3. 以後不需要再更新這個環境變數');
    console.log('4. 用戶點擊「本週評分」按鈕會看到即時評分\n');

    console.log('💡 如果需要顯示即時評分：');
    console.log('   使用 npm run setup:richmenu（但需要每次更新 Netlify 環境變數）\n');

  } catch (error) {
    console.error('\n❌ 設置失敗:', error.message);
    console.error('錯誤堆疊:', error.stack);
    process.exit(1);
  }
}

// 執行
setupStaticRichMenu();

