/**
 * Chart Generation Module (QuickChart Version)
 * 使用 QuickChart.io 雲端服務生成圖表，無需 canvas 依賴
 */

const axios = require('axios');
const { calculateKD, calculateMACD, calculateMA } = require('./indicators');

/**
 * 使用 QuickChart.io 生成技術指標圖表
 * @param {string} stockId - 股票代號
 * @param {Array} rawData - 原始股價資料（至少 60 天）
 * @param {string} stockName - 股票名稱
 * @returns {Promise<object>} - { imageUrl, kdAnalysis, macdAnalysis }
 */
async function generateIndicatorChart(stockId, rawData, stockName = '') {
  try {
    console.log(`📊 開始生成圖表：${stockId}`);

    // 取最近 60 天資料
    const recentData = rawData.slice(-60);
    const dates = recentData.map(d => d.date.substring(5)); // MM-DD
    const close = recentData.map(d => d.close);
    const high = recentData.map(d => d.high);
    const low = recentData.map(d => d.low);

    // 計算技術指標
    const { K, D } = calculateKD(recentData);
    const { MACD, Signal, Histogram } = calculateMACD(recentData);
    const ma5 = calculateMA(close, 5);
    const ma20 = calculateMA(close, 20);
    const ma60 = calculateMA(close, 60);

    // 建立 Chart.js 配置
    const chartConfig = {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: '收盤價',
            data: close,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            yAxisID: 'y'
          },
          {
            label: 'MA5',
            data: ma5,
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 1,
            pointRadius: 0,
            yAxisID: 'y'
          },
          {
            label: 'MA20',
            data: ma20,
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1,
            pointRadius: 0,
            yAxisID: 'y'
          },
          {
            label: 'K',
            data: K,
            borderColor: 'rgb(255, 206, 86)',
            borderWidth: 1.5,
            pointRadius: 0,
            yAxisID: 'y1',
            hidden: true
          },
          {
            label: 'D',
            data: D,
            borderColor: 'rgb(153, 102, 255)',
            borderWidth: 1.5,
            pointRadius: 0,
            yAxisID: 'y1',
            hidden: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `${stockId} ${stockName} - 技術分析`,
            font: { size: 16 }
          },
          legend: {
            display: true,
            position: 'bottom'
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: '股價' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'KD' },
            min: 0,
            max: 100,
            grid: { drawOnChartArea: false }
          }
        }
      }
    };

    // 使用 QuickChart.io 生成圖表
    const quickChartUrl = 'https://quickchart.io/chart';
    const chartUrl = `${quickChartUrl}?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=800&height=500&backgroundColor=white`;

    console.log('✅ 圖表 URL 已生成');

    // 分析 KD 和 MACD
    const latestK = K[K.length - 1];
    const latestD = D[D.length - 1];
    const latestMACD = MACD[MACD.length - 1];
    const latestSignal = Signal[Signal.length - 1];

    const kdAnalysis = analyzeKD(latestK, latestD);
    const macdAnalysis = analyzeMACD(latestMACD, latestSignal);

    return {
      imageUrl: chartUrl,
      kdAnalysis,
      macdAnalysis,
      latestData: recentData[recentData.length - 1]
    };

  } catch (error) {
    console.error('❌ 圖表生成失敗:', error);
    throw error;
  }
}

function analyzeKD(K, D) {
  let signal = '中性';
  let description = '';

  if (K > 80 && D > 80) {
    signal = '超買';
    description = 'KD 值在高檔區，可能面臨回檔壓力';
  } else if (K < 20 && D < 20) {
    signal = '超賣';
    description = 'KD 值在低檔區，可能出現反彈機會';
  } else if (K > D && K < 50) {
    signal = '黃金交叉';
    description = 'K 線向上突破 D 線，偏多訊號';
  } else if (K < D && K > 50) {
    signal = '死亡交叉';
    description = 'K 線向下跌破 D 線，偏空訊號';
  }

  return { K: K.toFixed(1), D: D.toFixed(1), signal, description };
}

function analyzeMACD(MACD, Signal) {
  let signal = '中性';
  let description = '';

  if (MACD > Signal && MACD > 0) {
    signal = '強勢多頭';
    description = 'MACD 在零軸上方且高於訊號線';
  } else if (MACD < Signal && MACD < 0) {
    signal = '弱勢空頭';
    description = 'MACD 在零軸下方且低於訊號線';
  } else if (MACD > Signal) {
    signal = '黃金交叉';
    description = 'MACD 向上突破訊號線';
  } else if (MACD < Signal) {
    signal = '死亡交叉';
    description = 'MACD 向下跌破訊號線';
  }

  return { MACD: MACD.toFixed(2), Signal: Signal.toFixed(2), signal, description };
}

module.exports = {
  generateIndicatorChart
};

