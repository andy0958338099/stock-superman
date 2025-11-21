/**
 * 下載 Rich Menu 所需的圖片
 * 從 Unsplash 下載高品質的股市相關圖片
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 圖片 URL（使用 Unsplash 的免費圖片）
const IMAGES = [
  {
    // 台股分析 - 股市看板
    url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1000&q=80',
    filename: 'taiwan-stock.jpg',
    description: '台股分析背景'
  },
  {
    // 美股分析 - 華爾街/美國國旗
    url: 'https://images.unsplash.com/photo-1569025690938-a00729c9e1f9?w=1000&q=80',
    filename: 'us-stock.jpg',
    description: '美股分析背景'
  },
  {
    // 評分 - 金色星星/獎杯
    url: 'https://images.unsplash.com/photo-1569025743873-ea3a9ade89f9?w=1000&q=80',
    filename: 'rating.jpg',
    description: '評分背景'
  }
];

/**
 * 下載圖片
 */
async function downloadImage(url, filepath, description) {
  try {
    console.log(`📥 下載：${description}...`);
    
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer'
    });

    fs.writeFileSync(filepath, response.data);
    console.log(`✅ 已儲存：${filepath}\n`);
    
    return true;
  } catch (error) {
    console.error(`❌ 下載失敗：${description}`);
    console.error(`   錯誤：${error.message}\n`);
    return false;
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('🚀 開始下載 Rich Menu 圖片...\n');

  // 確保目錄存在
  const assetsDir = path.join(__dirname, '..', 'public', 'rich-menu-assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    console.log(`📁 已創建目錄：${assetsDir}\n`);
  }

  // 下載所有圖片
  let successCount = 0;
  for (const image of IMAGES) {
    const filepath = path.join(assetsDir, image.filename);
    const success = await downloadImage(image.url, filepath, image.description);
    if (success) successCount++;
  }

  console.log(`\n🎉 完成！成功下載 ${successCount}/${IMAGES.length} 張圖片`);
  
  if (successCount === IMAGES.length) {
    console.log('\n💡 接下來請執行：');
    console.log('   npm run generate:richmenu:images');
    console.log('   查看生成的 Rich Menu 圖片\n');
  } else {
    console.log('\n⚠️ 部分圖片下載失敗');
    console.log('💡 請手動將圖片放置到：');
    console.log(`   ${assetsDir}\n`);
  }
}

// 執行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 錯誤:', error);
    process.exit(1);
  });
}

module.exports = { downloadImage };

