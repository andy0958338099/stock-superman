/**
 * Rich Menu 圖片生成器
 * 使用 Canvas 生成 Rich Menu 的佔位圖片
 * 尺寸：2500 x 1686 px
 * 布局：3x2 網格
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Rich Menu 尺寸
const WIDTH = 2500;
const HEIGHT = 843;
const COLS = 3;
const ROWS = 1;
const CELL_WIDTH = WIDTH / COLS;
const CELL_HEIGHT = HEIGHT / ROWS;

// 顏色配置
const COLORS = {
  background: '#FFFFFF',
  border: '#E0E0E0',
  primary: '#1DB446',
  secondary: '#00C851',
  text: '#333333',
  textSecondary: '#666666'
};

// 功能配置
const MENU_ITEMS = [
  { row: 0, col: 0, icon: '📊', title: '台股分析', subtitle: '輸入股票代號', color: '#1DB446' },
  { row: 0, col: 1, icon: '🌎', title: '美股分析', subtitle: 'S&P500 / NASDAQ', color: '#2196F3' },
  { row: 0, col: 2, icon: '⭐', title: '本週評分', subtitle: '4.2/5 (128票)', color: '#FF9800' }
];

/**
 * 生成 Rich Menu 圖片
 */
function generateRichMenuImage() {
  console.log('🎨 開始生成 Rich Menu 圖片...');

  // 創建 Canvas
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // 填充背景
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 繪製每個格子
  MENU_ITEMS.forEach(item => {
    const x = item.col * CELL_WIDTH;
    const y = item.row * CELL_HEIGHT;

    // 繪製格子背景
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(x, y, CELL_WIDTH, CELL_HEIGHT);

    // 繪製邊框
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, CELL_WIDTH, CELL_HEIGHT);

    // 繪製圖標（使用文字模擬）
    ctx.font = 'bold 180px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = item.color;
    ctx.fillText(item.icon, x + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 - 100);

    // 繪製標題
    ctx.font = 'bold 80px Arial';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(item.title, x + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 + 120);

    // 繪製副標題
    ctx.font = '50px Arial';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText(item.subtitle, x + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 + 200);
  });

  // 保存圖片
  const outputDir = path.join(__dirname, '../public');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'rich-menu.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ Rich Menu 圖片已生成：${outputPath}`);
  console.log(`📏 尺寸：${WIDTH} x ${HEIGHT} px`);
  console.log(`📦 檔案大小：${(buffer.length / 1024).toFixed(2)} KB`);

  return outputPath;
}

/**
 * 生成動態評分的 Rich Menu 圖片
 * @param {number} avgScore - 平均分數
 * @param {number} totalVotes - 總投票數
 */
function generateDynamicRichMenuImage(avgScore, totalVotes) {
  console.log(`🎨 生成動態 Rich Menu 圖片（評分：${avgScore}/5，投票數：${totalVotes}）...`);

  // 創建 Canvas
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // 填充背景
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 更新評分格子的副標題
  const updatedMenuItems = MENU_ITEMS.map(item => {
    if (item.row === 0 && item.col === 2) {
      return {
        ...item,
        subtitle: `${avgScore.toFixed(1)}/5 (${totalVotes}票)`
      };
    }
    return item;
  });

  // 繪製每個格子
  updatedMenuItems.forEach(item => {
    const x = item.col * CELL_WIDTH;
    const y = item.row * CELL_HEIGHT;

    // 繪製格子背景
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(x, y, CELL_WIDTH, CELL_HEIGHT);

    // 繪製邊框
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, CELL_WIDTH, CELL_HEIGHT);

    // 繪製圖標
    ctx.font = 'bold 180px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = item.color;
    ctx.fillText(item.icon, x + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 - 100);

    // 繪製標題
    ctx.font = 'bold 80px Arial';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(item.title, x + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 + 120);

    // 繪製副標題
    ctx.font = '50px Arial';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText(item.subtitle, x + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 + 200);
  });

  // 保存圖片
  const outputDir = path.join(__dirname, '../public');
  const outputPath = path.join(outputDir, 'rich-menu-dynamic.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ 動態 Rich Menu 圖片已生成：${outputPath}`);

  return buffer;
}

// 如果直接執行此腳本
if (require.main === module) {
  generateRichMenuImage();
}

module.exports = {
  generateRichMenuImage,
  generateDynamicRichMenuImage
};

