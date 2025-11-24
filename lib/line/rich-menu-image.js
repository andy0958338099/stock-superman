/**
 * Rich Menu 圖片生成器
 * 使用 SVG 生成 Rich Menu 圖片，然後轉換為 PNG
 */

/**
 * 生成股市大亨 Rich Menu 圖片（SVG）
 * @param {Object} options - 選項
 * @param {number} options.avgScore - 平均評分（可選）
 * @param {number} options.totalVotes - 總投票數（可選）
 * @returns {string} SVG 字串
 */
function generateStockRichMenuSVG(options = {}) {
  const { avgScore, totalVotes } = options;
  
  // 如果有評分數據，顯示評分；否則顯示「點擊查看」
  const scoreText = (avgScore !== undefined && totalVotes !== undefined)
    ? `${avgScore.toFixed(1)}/5 (${totalVotes}票)`
    : '點擊查看';

  return `
<svg width="2500" height="843" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <rect width="2500" height="843" fill="#FFFFFF"/>
  
  <!-- 分隔線 -->
  <line x1="833" y1="0" x2="833" y2="843" stroke="#E5E7EB" stroke-width="2"/>
  <line x1="1667" y1="0" x2="1667" y2="843" stroke="#E5E7EB" stroke-width="2"/>
  
  <!-- 第一個按鈕：台股分析 -->
  <rect x="0" y="0" width="833" height="843" fill="#1DB446" opacity="0.1"/>
  <text x="416" y="350" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="#1DB446" text-anchor="middle">📊</text>
  <text x="416" y="480" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="#1DB446" text-anchor="middle">台股分析</text>
  <text x="416" y="550" font-family="Arial, sans-serif" font-size="36" fill="#6B7280" text-anchor="middle">輸入股票代號</text>
  
  <!-- 第二個按鈕：美股分析 -->
  <rect x="833" y="0" width="834" height="843" fill="#2196F3" opacity="0.1"/>
  <text x="1250" y="350" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="#2196F3" text-anchor="middle">🇺🇸</text>
  <text x="1250" y="480" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="#2196F3" text-anchor="middle">美股分析</text>
  <text x="1250" y="550" font-family="Arial, sans-serif" font-size="36" fill="#6B7280" text-anchor="middle">S&amp;P500 / NASDAQ</text>
  
  <!-- 第三個按鈕：查看評分 -->
  <rect x="1667" y="0" width="833" height="843" fill="#FF9800" opacity="0.1"/>
  <text x="2083" y="350" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="#FF9800" text-anchor="middle">⭐</text>
  <text x="2083" y="480" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="#FF9800" text-anchor="middle">本週評分</text>
  <text x="2083" y="550" font-family="Arial, sans-serif" font-size="36" fill="#6B7280" text-anchor="middle">${scoreText}</text>
</svg>
  `.trim();
}

/**
 * 將 SVG 轉換為 PNG Buffer
 * 需要在 Node.js 環境中使用 sharp 套件
 * @param {string} svg - SVG 字串
 * @returns {Promise<Buffer>} PNG Buffer
 */
async function svgToPngBuffer(svg) {
  try {
    const sharp = require('sharp');
    const buffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    return buffer;
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
    throw new Error('請安裝 sharp 套件：npm install sharp');
  }
}

/**
 * 生成股市大亨 Rich Menu 圖片 Buffer
 * @param {Object} options - 選項
 * @param {number} options.avgScore - 平均評分（可選）
 * @param {number} options.totalVotes - 總投票數（可選）
 * @returns {Promise<Buffer>} PNG Buffer
 */
async function generateStockRichMenuImage(options = {}) {
  const svg = generateStockRichMenuSVG(options);
  return svgToPngBuffer(svg);
}

/**
 * 生成靜態 Rich Menu 圖片（不顯示評分數字）
 * @returns {Promise<Buffer>} PNG Buffer
 */
async function generateStaticRichMenuImage() {
  return generateStockRichMenuImage();
}

/**
 * 生成動態 Rich Menu 圖片（顯示評分數字）
 * @param {number} avgScore - 平均評分
 * @param {number} totalVotes - 總投票數
 * @returns {Promise<Buffer>} PNG Buffer
 */
async function generateDynamicRichMenuImage(avgScore, totalVotes) {
  return generateStockRichMenuImage({ avgScore, totalVotes });
}

module.exports = {
  generateStockRichMenuSVG,
  svgToPngBuffer,
  generateStockRichMenuImage,
  generateStaticRichMenuImage,
  generateDynamicRichMenuImage,
};

