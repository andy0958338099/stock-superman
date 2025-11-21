/**
 * 更新 Rich Menu 圖片腳本
 * 使用現有的 Rich Menu ID 更新圖片，無需重新創建
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { uploadRichMenuImage } = require('../functions/rich-menu-manager');
const { generateRichMenuImage } = require('./generate-rich-menu-image');

async function updateRichMenuImage() {
  try {
    console.log('🚀 開始更新 Rich Menu 圖片...\n');

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

    // 步驟 1：生成新圖片
    console.log('📝 步驟 1/2：生成 Rich Menu 圖片');
    const imagePath = generateRichMenuImage();
    const imageBuffer = fs.readFileSync(imagePath);
    console.log('✅ 圖片生成完成\n');

    // 步驟 2：上傳圖片
    console.log('📝 步驟 2/2：上傳 Rich Menu 圖片');
    await uploadRichMenuImage(richMenuId, imageBuffer);
    console.log('✅ 圖片上傳完成\n');

    console.log('🎉 Rich Menu 圖片更新完成！');
    console.log('\n💡 提示：');
    console.log('1. 在 LINE 中重新打開您的 Bot，應該會看到更新後的選單');
    console.log('2. 如果沒有更新，請嘗試：');
    console.log('   - 關閉並重新打開 LINE App');
    console.log('   - 封鎖後再解除封鎖 Bot');

  } catch (error) {
    console.error('\n❌ 更新 Rich Menu 圖片失敗:', error);
    console.error('\n💡 請檢查：');
    console.error('1. RICH_MENU_ID 是否正確');
    console.error('2. LINE Channel Access Token 是否有效');
    console.error('3. 網路連線是否正常');
    console.error('4. Rich Menu 是否仍然存在（可能已被刪除）');
    process.exit(1);
  }
}

// 執行更新
updateRichMenuImage();

