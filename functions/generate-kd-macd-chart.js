const { createCanvas } = require('canvas');
const moment = require('moment');
const { calculateKD, calculateMACD, calculateMA } = require('./indicators');

/**
 * 生成 KD/MACD 三區域圖表
 * @param {string} stockId - 股票代號
 * @param {Array} stockData - 股票資料
 * @param {string} stockName - 股票名稱
 * @returns {Buffer} - PNG 圖片 Buffer
 */
async function generateKDMACDChart(stockId, stockData, stockName) {
  try {
    console.log(`📊 開始生成 KD/MACD 圖表：${stockId}`);

    // 取最近 60 天資料
    const recentData = stockData.slice(-60);
    
    // 計算指標
    const { K, D } = calculateKD(recentData);
    const { MACD, Signal, Histogram } = calculateMACD(recentData);
    const MA5 = calculateMA(recentData, 5);
    const MA20 = calculateMA(recentData, 20);
    const MA60 = calculateMA(recentData, 60);

    // 建立 Canvas
    const width = 1200;
    const height = 900;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // 定義三個區域
    const padding = { top: 60, right: 80, bottom: 60, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    
    const priceHeight = 360; // 40%
    const kdHeight = 270;    // 30%
    const macdHeight = 270;  // 30%

    const priceTop = padding.top;
    const kdTop = priceTop + priceHeight;
    const macdTop = kdTop + kdHeight;

    // 繪製標題
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${stockId} ${stockName} - 技術分析`, width / 2, 35);

    // 繪製三個區域
    drawPriceChart(ctx, recentData, MA5, MA20, MA60, padding.left, priceTop, chartWidth, priceHeight);
    drawKDChart(ctx, K, D, padding.left, kdTop, chartWidth, kdHeight);
    drawMACDChart(ctx, MACD, Signal, Histogram, padding.left, macdTop, chartWidth, macdHeight);

    // 繪製 X 軸標籤（共用）
    drawXAxisLabels(ctx, recentData, padding.left, macdTop + macdHeight, chartWidth);

    console.log('✅ KD/MACD 圖表生成完成');

    return canvas.toBuffer('image/png');

  } catch (error) {
    console.error('❌ 圖表生成失敗:', error);
    throw error;
  }
}

/**
 * 繪製價格圖表（上區）
 */
function drawPriceChart(ctx, data, MA5, MA20, MA60, x, y, width, height) {
  const closes = data.map(d => d.close);
  const allPrices = [...closes, ...MA5.filter(v => v !== null), ...MA20.filter(v => v !== null), ...MA60.filter(v => v !== null)];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;

  // 繪製背景框
  ctx.strokeStyle = '#E0E0E0';
  ctx.strokeRect(x, y, width, height);

  // 繪製標題
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('收盤價 & 均線', x + 10, y + 20);

  // 繪製圖例
  ctx.font = '12px Arial';
  ctx.fillStyle = '#00BCD4'; ctx.fillText('收盤價', x + 150, y + 20);
  ctx.fillStyle = '#FF5722'; ctx.fillText('MA5', x + 220, y + 20);
  ctx.fillStyle = '#2196F3'; ctx.fillText('MA20', x + 270, y + 20);
  ctx.fillStyle = '#9C27B0'; ctx.fillText('MA60', x + 320, y + 20);

  // 繪製線條
  drawLine(ctx, closes, x, y + 30, width, height - 30, minPrice, maxPrice, '#00BCD4', 2);
  drawLine(ctx, MA5, x, y + 30, width, height - 30, minPrice, maxPrice, '#FF5722', 1.5);
  drawLine(ctx, MA20, x, y + 30, width, height - 30, minPrice, maxPrice, '#2196F3', 1.5);
  drawLine(ctx, MA60, x, y + 30, width, height - 30, minPrice, maxPrice, '#9C27B0', 1.5);

  // 繪製 Y 軸標籤
  drawYAxisLabels(ctx, minPrice, maxPrice, x + width + 10, y + 30, height - 30);
}

/**
 * 繪製 KD 圖表（中區）
 */
function drawKDChart(ctx, K, D, x, y, width, height) {
  // 繪製背景框
  ctx.strokeStyle = '#E0E0E0';
  ctx.strokeRect(x, y, width, height);

  // 繪製標題
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('KD 指標', x + 10, y + 20);

  // 繪製圖例
  ctx.font = '12px Arial';
  ctx.fillStyle = '#FFC107'; ctx.fillText('K', x + 100, y + 20);
  ctx.fillStyle = '#9C27B0'; ctx.fillText('D', x + 130, y + 20);

  // 繪製參考線（20, 50, 80）
  ctx.strokeStyle = '#E0E0E0';
  ctx.setLineDash([5, 5]);
  [20, 50, 80].forEach(level => {
    const yPos = y + 30 + (height - 30) * (1 - level / 100);
    ctx.beginPath();
    ctx.moveTo(x, yPos);
    ctx.lineTo(x + width, yPos);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // 繪製 K、D 線
  drawLine(ctx, K, x, y + 30, width, height - 30, 0, 100, '#FFC107', 2);
  drawLine(ctx, D, x, y + 30, width, height - 30, 0, 100, '#9C27B0', 2);

  // 繪製 Y 軸標籤
  drawYAxisLabels(ctx, 0, 100, x + width + 10, y + 30, height - 30);
}

/**
 * 繪製 MACD 圖表（下區）
 */
function drawMACDChart(ctx, MACD, Signal, Histogram, x, y, width, height) {
  const allValues = [...MACD, ...Signal, ...Histogram];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);

  // 繪製背景框
  ctx.strokeStyle = '#E0E0E0';
  ctx.strokeRect(x, y, width, height);

  // 繪製標題
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('MACD', x + 10, y + 20);

  // 繪製圖例
  ctx.font = '12px Arial';
  ctx.fillStyle = '#4CAF50'; ctx.fillText('MACD', x + 80, y + 20);
  ctx.fillStyle = '#FF5722'; ctx.fillText('Signal', x + 140, y + 20);
  ctx.fillStyle = '#2196F3'; ctx.fillText('Histogram', x + 200, y + 20);

  // 繪製 0 軸線
  const zeroY = y + 30 + (height - 30) * (1 - (0 - minValue) / (maxValue - minValue));
  ctx.strokeStyle = '#000000';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x, zeroY);
  ctx.lineTo(x + width, zeroY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 繪製 Histogram（柱狀圖）
  const barWidth = width / Histogram.length;
  Histogram.forEach((value, i) => {
    const barHeight = Math.abs(value) / (maxValue - minValue) * (height - 30);
    const barX = x + i * barWidth;
    const barY = value >= 0 ? zeroY - barHeight : zeroY;

    ctx.fillStyle = value >= 0 ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)';
    ctx.fillRect(barX, barY, barWidth * 0.8, barHeight);
  });

  // 繪製 MACD、Signal 線
  drawLine(ctx, MACD, x, y + 30, width, height - 30, minValue, maxValue, '#4CAF50', 2);
  drawLine(ctx, Signal, x, y + 30, width, height - 30, minValue, maxValue, '#FF5722', 2);

  // 繪製 Y 軸標籤
  drawYAxisLabels(ctx, minValue, maxValue, x + width + 10, y + 30, height - 30);
}

/**
 * 繪製線條
 */
function drawLine(ctx, data, x, y, width, height, minValue, maxValue, color, lineWidth) {
  const range = maxValue - minValue;
  if (range === 0) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  let started = false;
  data.forEach((value, i) => {
    if (value === null || value === undefined) return;

    const xPos = x + (i / (data.length - 1)) * width;
    const yPos = y + height - ((value - minValue) / range) * height;

    if (!started) {
      ctx.moveTo(xPos, yPos);
      started = true;
    } else {
      ctx.lineTo(xPos, yPos);
    }
  });

  ctx.stroke();
}

/**
 * 繪製 Y 軸標籤
 */
function drawYAxisLabels(ctx, minValue, maxValue, x, y, height) {
  ctx.fillStyle = '#666666';
  ctx.font = '11px Arial';
  ctx.textAlign = 'left';

  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const value = minValue + (maxValue - minValue) * (i / steps);
    const yPos = y + height - (i / steps) * height;
    ctx.fillText(value.toFixed(1), x, yPos + 4);
  }
}

/**
 * 繪製 X 軸標籤
 */
function drawXAxisLabels(ctx, data, x, y, width) {
  ctx.fillStyle = '#666666';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';

  const step = Math.ceil(data.length / 10); // 顯示 10 個標籤
  data.forEach((d, i) => {
    if (i % step === 0) {
      const xPos = x + (i / (data.length - 1)) * width;
      const label = moment(d.date).format('MM/DD');
      ctx.fillText(label, xPos, y + 20);
    }
  });
}

module.exports = { generateKDMACDChart };

