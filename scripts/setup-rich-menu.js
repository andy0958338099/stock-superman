/**
 * Rich Menu 設置腳本
 * 創建並設置 LINE Rich Menu
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createRichMenu, uploadRichMenuImage, setDefaultRichMenu } = require('../functions/rich-menu-manager');
const { generateRichMenuImage } = require('./generate-rich-menu-image');

async function setupRichMenu() {
  try {
    console.log('🚀 開始設置 Rich Menu...\n');

    // 步驟 1：生成 Rich Menu 圖片
    console.log('📝 步驟 1/3：生成 Rich Menu 圖片');
    const imagePath = generateRichMenuImage();
    const imageBuffer = fs.readFileSync(imagePath);
    console.log('✅ 圖片生成完成\n');

    // 步驟 2：創建 Rich Menu
    console.log('📝 步驟 2/3：創建 Rich Menu');
    const richMenuId = await createRichMenu();
    console.log(`✅ Rich Menu 創建完成：${richMenuId}\n`);

    // 步驟 3：上傳圖片
    console.log('📝 步驟 3/3：上傳 Rich Menu 圖片');
    await uploadRichMenuImage(richMenuId, imageBuffer);
    console.log('✅ 圖片上傳完成\n');

    // 步驟 4：設定為預設 Rich Menu
    console.log('📝 步驟 4/4：設定為預設 Rich Menu');
    await setDefaultRichMenu(richMenuId);
    console.log('✅ 預設 Rich Menu 設定完成\n');

    console.log('🎉 Rich Menu 設置完成！');
    console.log(`\n📊 Rich Menu ID: ${richMenuId}`);
    console.log('\n💡 提示：');
    console.log('1. 請到 LINE Developers Console 確認 Rich Menu 是否正確顯示');
    console.log('2. 在 LINE 中打開您的 Bot，應該會看到底部的功能選單');
    console.log('3. 點擊選單中的按鈕測試功能是否正常');

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

