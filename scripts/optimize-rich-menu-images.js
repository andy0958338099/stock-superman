/**
 * 優化 Rich Menu 圖片
 * 將原始圖片縮小並壓縮，以符合 LINE API 的大小限制
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

/**
 * 優化單張圖片
 */
async function optimizeImage(inputPath, outputPath, maxWidth = 800) {
  try {
    console.log(`📝 優化圖片：${path.basename(inputPath)}`);
    
    const img = await loadImage(inputPath);
    
    // 計算縮放比例
    const scale = maxWidth / img.width;
    const newWidth = Math.floor(img.width * scale);
    const newHeight = Math.floor(img.height * scale);
    
    // 創建 Canvas
    const canvas = createCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    
    // 繪製縮小的圖片
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, newWidth, newHeight);
    
    // 儲存為 JPEG（質量 0.7）
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.7 });
    fs.writeFileSync(outputPath, buffer);
    
    const originalSize = fs.statSync(inputPath).size;
    const newSize = buffer.length;
    const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);
    
    console.log(`   原始：${(originalSize / 1024).toFixed(1)} KB`);
    console.log(`   優化：${(newSize / 1024).toFixed(1)} KB`);
    console.log(`   減少：${reduction}%\n`);
    
    return true;
  } catch (error) {
    console.error(`❌ 優化失敗：${error.message}\n`);
    return false;
  }
}

/**
 * 優化所有圖片
 */
async function optimizeAllImages() {
  console.log('🚀 開始優化 Rich Menu 圖片...\n');
  
  const assetsDir = path.join(__dirname, '..', 'public', 'rich-menu-assets');
  const images = ['taiwan-stock.jpg', 'us-stock.jpg', 'rating.jpg'];
  
  for (const filename of images) {
    const inputPath = path.join(assetsDir, filename);
    const outputPath = path.join(assetsDir, `optimized-${filename}`);
    
    if (fs.existsSync(inputPath)) {
      await optimizeImage(inputPath, outputPath, 600);
    } else {
      console.log(`⚠️ 找不到圖片：${filename}\n`);
    }
  }
  
  console.log('🎉 優化完成！');
  console.log('💡 優化後的圖片已保存為 optimized-*.jpg');
  console.log('💡 如果效果滿意，可以替換原始圖片\n');
}

// 執行
if (require.main === module) {
  optimizeAllImages().catch(error => {
    console.error('❌ 錯誤:', error);
    process.exit(1);
  });
}

module.exports = { optimizeImage, optimizeAllImages };

