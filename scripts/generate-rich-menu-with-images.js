/**
 * 使用真實圖片生成 Rich Menu
 * 將三張圖片合併成一張 Rich Menu 圖片
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Rich Menu 尺寸
const WIDTH = 2500;
const HEIGHT = 843;
const COLS = 3;
const CELL_WIDTH = WIDTH / COLS;
const CELL_HEIGHT = HEIGHT;

/**
 * 生成帶圖片的 Rich Menu
 */
async function generateRichMenuWithImages() {
  try {
    console.log('🎨 開始生成 Rich Menu 圖片（使用真實圖片）...\n');

    // 創建 Canvas
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // 填充白色背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // 圖片配置
    const images = [
      {
        path: path.join(__dirname, '..', 'public', 'rich-menu-assets', 'taiwan-stock.jpg'),
        title: '台股分析',
        subtitle: '輸入股票代號',
        color: '#FFFFFF',
        textShadow: true,
        gradient: {
          start: '#00C853',
          end: '#1B5E20'
        },
        icon: '📈'
      },
      {
        path: path.join(__dirname, '..', 'public', 'rich-menu-assets', 'us-stock.jpg'),
        title: '美股分析',
        subtitle: 'S&P500 / NASDAQ',
        color: '#FFFFFF',
        textShadow: true,
        gradient: {
          start: '#1976D2',
          end: '#0D47A1'
        },
        icon: '🇺🇸'
      },
      {
        path: path.join(__dirname, '..', 'public', 'rich-menu-assets', 'rating.jpg'),
        title: '本週評分',
        subtitle: '點擊查看',
        color: '#FFFFFF',
        textShadow: true,
        gradient: {
          start: '#FFB300',
          end: '#F57C00'
        },
        icon: '⭐'
      }
    ];

    // 處理每個格子
    for (let i = 0; i < images.length; i++) {
      const item = images[i];
      const x = i * CELL_WIDTH;
      const y = 0;

      console.log(`📝 處理第 ${i + 1} 個格子：${item.title}`);

      // 嘗試載入圖片
      let imageLoaded = false;
      if (fs.existsSync(item.path)) {
        try {
          const img = await loadImage(item.path);

          // 計算圖片縮放比例（保持比例，填滿格子）
          const scale = Math.max(CELL_WIDTH / img.width, CELL_HEIGHT / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;

          // 居中繪製
          const imgX = x + (CELL_WIDTH - scaledWidth) / 2;
          const imgY = y + (CELL_HEIGHT - scaledHeight) / 2;

          // 降低圖片質量以減小檔案大小
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, imgX, imgY, scaledWidth, scaledHeight);

          // 添加半透明遮罩（增加遮罩強度以減少細節）
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fillRect(x, y, CELL_WIDTH, CELL_HEIGHT);

          imageLoaded = true;
          console.log(`✅ 圖片已載入：${item.title}`);
        } catch (error) {
          console.log(`⚠️ 載入圖片失敗：${item.title}，使用漸變背景`);
        }
      }

      // 如果圖片未載入，使用漸變背景
      if (!imageLoaded) {
        console.log(`📊 使用漸變背景：${item.title}`);
        const gradient = ctx.createLinearGradient(x, y, x, y + CELL_HEIGHT);
        gradient.addColorStop(0, item.gradient.start);
        gradient.addColorStop(1, item.gradient.end);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, CELL_WIDTH, CELL_HEIGHT);

        // 繪製大圖標
        ctx.font = 'bold 280px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillText(item.icon, x + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 - 50);
      }

      // 繪製半透明底部區域（用於文字）
      const textAreaHeight = 220;
      const textGradient = ctx.createLinearGradient(x, y + CELL_HEIGHT - textAreaHeight, x, y + CELL_HEIGHT);
      textGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      textGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.7)');
      textGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
      ctx.fillStyle = textGradient;
      ctx.fillRect(x, y + CELL_HEIGHT - textAreaHeight, CELL_WIDTH, textAreaHeight);

      // 繪製標題（帶陰影）
      ctx.font = 'bold 75px "PingFang TC", "Microsoft JhengHei", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (item.textShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      ctx.fillStyle = item.color;
      ctx.fillText(item.title, x + CELL_WIDTH / 2, y + CELL_HEIGHT - 120);

      // 重置陰影
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 繪製副標題
      ctx.font = '48px "PingFang TC", "Microsoft JhengHei", Arial, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(item.subtitle, x + CELL_WIDTH / 2, y + CELL_HEIGHT - 55);

      // 繪製分隔線
      if (i < images.length - 1) {
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + CELL_WIDTH, y);
        ctx.lineTo(x + CELL_WIDTH, y + CELL_HEIGHT);
        ctx.stroke();
      }
    }

    // 儲存圖片（使用 JPEG 格式以減小檔案大小）
    const outputPath = path.join(__dirname, '..', 'public', 'rich-menu.jpg');
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });
    fs.writeFileSync(outputPath, buffer);

    const fileSizeKB = (buffer.length / 1024).toFixed(2);
    const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(2);

    console.log('\n✅ Rich Menu 圖片已生成');
    console.log(`📁 儲存位置：${outputPath}`);
    console.log(`📊 尺寸：${WIDTH} x ${HEIGHT} px`);
    console.log(`💾 檔案大小：${fileSizeKB} KB (${fileSizeMB} MB)`);

    if (buffer.length > 1024 * 1024) {
      console.log('⚠️ 警告：檔案大小超過 1MB，LINE API 可能拒絕上傳');
    } else {
      console.log('✅ 檔案大小符合 LINE API 限制（< 1MB）');
    }
    console.log('');

    return outputPath;

  } catch (error) {
    console.error('❌ 生成 Rich Menu 圖片失敗:', error);
    throw error;
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  generateRichMenuWithImages()
    .then(() => {
      console.log('🎉 完成！');
    })
    .catch(error => {
      console.error('❌ 錯誤:', error);
      process.exit(1);
    });
}

module.exports = { generateRichMenuWithImages };

