/**
 * Chart Generation Module
 * 生成技術分析圖表並上傳至 Supabase Storage
 */

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { supabase } = require('./supabase-client');
const { calculateKD, calculateMACD, calculateMA } = require('./indicators');

// 圖表設定
const CHART_WIDTH = 1200;
const CHART_HEIGHT = 400;
const chartCanvas = new ChartJSNodeCanvas({ 
  width: CHART_WIDTH, 
  height: CHART_HEIGHT,
  backgroundColour: 'white'
});

/**
 * 渲染單一折線圖
 * @param {Array} labels - X 軸標籤
 * @param {Array} datasets - 資料集
 * @param {string} title - 圖表標題
 * @returns {Promise<Buffer>} - 圖表 Buffer
 */
async function renderLineChart(labels, datasets, title = '') {
  const config = {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: !!title,
          text: title,
          font: { size: 18, weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        x: {
          display: true,
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 15
          }
        },
        y: {
          display: true,
          position: 'right'
        }
      }
    }
  };
  
  return chartCanvas.renderToBuffer(config);
}

/**
 * 渲染混合圖表（柱狀 + 折線）
 * @param {Array} labels - X 軸標籤
 * @param {Array} datasets - 資料集
 * @param {string} title - 圖表標題
 * @returns {Promise<Buffer>} - 圖表 Buffer
 */
async function renderMixedChart(labels, datasets, title = '') {
  const config = {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: !!title,
          text: title,
          font: { size: 18, weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        x: {
          display: true,
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 15
          }
        },
        y: {
          display: true,
          position: 'right'
        }
      }
    }
  };
  
  return chartCanvas.renderToBuffer(config);
}

/**
 * 生成完整的技術分析圖表（價格 + KD + MACD）
 * @param {string} stockId - 股票代號
 * @param {Array} rawData - 原始股價資料
 * @param {string} stockName - 股票名稱
 * @returns {Promise<object>} - { url, path } 圖表 URL 和路徑
 */
async function generateIndicatorChart(stockId, rawData, stockName = '') {
  try {
    console.log(`📈 開始生成圖表：${stockId}`);
    
    // 只取最近 60 天的資料來繪圖（避免圖表過於擁擠）
    const displayData = rawData.slice(-60);
    const labels = displayData.map(d => moment(d.date).format('MM/DD'));
    const close = displayData.map(d => d.close);
    
    // 計算技術指標
    const { K, D } = calculateKD(displayData);
    const { MACD, Signal, Histogram } = calculateMACD(displayData);
    const ma5 = calculateMA(close, 5);
    const ma20 = calculateMA(close, 20);
    const ma60 = calculateMA(close, 60);
    
    // 1) 價格圖（收盤價 + 均線）
    const priceBuf = await renderLineChart(labels, [
      {
        label: '收盤價',
        data: close,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        spanGaps: true
      },
      {
        label: 'MA5',
        data: ma5,
        borderColor: 'rgb(255, 99, 132)',
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
        spanGaps: true,
        fill: false
      },
      {
        label: 'MA20',
        data: ma20,
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
        spanGaps: true,
        fill: false
      }
    ], `${stockId} ${stockName} - 收盤價與均線`);
    
    console.log('✅ 價格圖生成完成');

    // 2) KD 指標圖
    const kdBuf = await renderLineChart(labels, [
      {
        label: 'K',
        data: K,
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.1)',
        borderWidth: 2,
        pointRadius: 0
      },
      {
        label: 'D',
        data: D,
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.1)',
        borderWidth: 2,
        pointRadius: 0
      }
    ], 'KD 隨機指標');

    console.log('✅ KD 圖生成完成');

    // 3) MACD 指標圖（柱狀 + 折線）
    const macdBuf = await renderMixedChart(labels, [
      {
        label: 'Histogram',
        data: Histogram,
        type: 'bar',
        backgroundColor: Histogram.map(v => v >= 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'),
        borderWidth: 0
      },
      {
        label: 'MACD',
        data: MACD,
        type: 'line',
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      },
      {
        label: 'Signal',
        data: Signal,
        type: 'line',
        borderColor: 'rgb(255, 99, 132)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      }
    ], 'MACD 指標');

    console.log('✅ MACD 圖生成完成');

    // 合併三張圖成一張長圖
    const combinedHeight = CHART_HEIGHT * 3;
    const canvas = createCanvas(CHART_WIDTH, combinedHeight);
    const ctx = canvas.getContext('2d');

    // 白色背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CHART_WIDTH, combinedHeight);

    // 載入並繪製三張圖
    const img1 = await loadImage(priceBuf);
    const img2 = await loadImage(kdBuf);
    const img3 = await loadImage(macdBuf);

    ctx.drawImage(img1, 0, 0, CHART_WIDTH, CHART_HEIGHT);
    ctx.drawImage(img2, 0, CHART_HEIGHT, CHART_WIDTH, CHART_HEIGHT);
    ctx.drawImage(img3, 0, CHART_HEIGHT * 2, CHART_WIDTH, CHART_HEIGHT);

    console.log('✅ 圖表合併完成');

    // 儲存到 /tmp
    const timestamp = Date.now();
    const fileName = `chart_${stockId}_${timestamp}.png`;
    const tmpPath = path.join('/tmp', fileName);
    const outBuffer = canvas.toBuffer('image/png');
    fs.writeFileSync(tmpPath, outBuffer);

    console.log(`💾 圖表已儲存至：${tmpPath}`);

    // 上傳至 Supabase Storage
    const bucket = process.env.SUPABASE_BUCKET || 'stock-charts';
    const storagePath = `charts/${stockId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, outBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('上傳圖表失敗:', error);
      throw new Error(`上傳圖表失敗：${error.message}`);
    }

    // 取得公開 URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    console.log(`✅ 圖表已上傳：${publicUrl}`);

    // 清理暫存檔案
    try {
      fs.unlinkSync(tmpPath);
    } catch (e) {
      console.warn('清理暫存檔案失敗:', e.message);
    }

    return {
      url: publicUrl,
      path: storagePath
    };

  } catch (error) {
    console.error('生成圖表失敗:', error);
    throw error;
  }
}

module.exports = {
  generateIndicatorChart
};

