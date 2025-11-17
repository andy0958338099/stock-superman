/**
 * Chart Generation Module (QuickChart Version)
 * 使用 QuickChart.io 雲端服務生成圖表，無需 canvas 依賴
 */

const axios = require('axios');
const { calculateKD, calculateMACD, calculateMA } = require('./indicators');

/**
 * 使用 QuickChart.io 生成技術指標圖表（三張圖）
 * @param {string} stockId - 股票代號
 * @param {Array} rawData - 原始股價資料（至少 60 天）
 * @param {string} stockName - 股票名稱
 * @returns {Promise<object>} - { priceImageUrl, kdImageUrl, macdImageUrl, kdAnalysis, macdAnalysis }
 */
async function generateIndicatorChart(stockId, rawData, stockName = '') {
  try {
    console.log(`📊 開始生成圖表：${stockId}`);

    // 取最近 30 天資料
    const recentData = rawData.slice(-30);
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

    // === 圖表 1：價格 + MA ===
    const priceChartConfig = {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: '收盤價',
            data: close,
            borderColor: 'rgb(0, 188, 212)',
            backgroundColor: 'rgba(0, 188, 212, 0.1)',
            borderWidth: 2.5,
            pointRadius: 0,
            fill: true
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
            borderColor: 'rgb(33, 150, 243)',
            borderWidth: 1.5,
            pointRadius: 0
          },
          {
            label: 'MA60',
            data: ma60,
            borderColor: 'rgb(156, 39, 176)',
            borderWidth: 1.5,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `${stockId} ${stockName} - 股價走勢`,
            font: { size: 18, weight: 'bold' }
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: { font: { size: 12 } }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: '股價 (元)', font: { size: 14 } },
            grid: { color: 'rgba(0, 0, 0, 0.1)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    };

    // === 圖表 2：KD 指標（高可讀性版）===
    const kdChartConfig = {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'K',
            data: K,
            borderColor: 'rgb(255, 193, 7)',
            backgroundColor: 'rgba(255, 193, 7, 0.15)',
            borderWidth: 2.5,
            pointRadius: 0,
            fill: true,
            tension: 0.2
          },
          {
            label: 'D',
            data: D,
            borderColor: 'rgb(156, 39, 176)',
            backgroundColor: 'rgba(156, 39, 176, 0.15)',
            borderWidth: 2.5,
            pointRadius: 0,
            fill: true,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `${stockId} ${stockName} - KD`,
            font: { size: 16, weight: 'bold' },
            padding: { top: 5, bottom: 5 }
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              font: { size: 10 },
              padding: 8,
              boxWidth: 15,
              boxHeight: 10,
              usePointStyle: false
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            min: 0,
            max: 100,
            ticks: {
              stepSize: 20,
              font: { size: 10, weight: 'bold' },
              color: '#333',
              padding: 5,
              callback: function(value) {
                return value;
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
              lineWidth: 1,
              drawBorder: true
            },
            border: {
              display: true,
              color: '#666',
              width: 1.5
            }
          },
          x: {
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: { size: 9 },
              maxRotation: 45,
              minRotation: 45,
              autoSkip: true,
              maxTicksLimit: 6,
              padding: 5
            },
            border: {
              display: true,
              color: '#666',
              width: 1.5
            }
          }
        },
        layout: {
          padding: {
            left: 5,
            right: 15,
            top: 5,
            bottom: 5
          }
        }
      }
    };

    // === 圖表 3：MACD Histogram（只顯示柱狀圖）===
    const macdChartConfig = {
      type: 'bar',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'MACD Histogram',
            data: Histogram,
            backgroundColor: Histogram.map(v => v >= 0 ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)'),
            borderWidth: 0,
            barPercentage: 0.9,
            categoryPercentage: 0.95
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `${stockId} ${stockName} - MACD Histogram`,
            font: { size: 16, weight: 'bold' },
            padding: { top: 5, bottom: 5 }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            ticks: {
              font: { size: 10, weight: 'bold' },
              color: '#333',
              padding: 5,
              maxTicksLimit: 5,
              callback: function(value) {
                return value.toFixed(2);
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
              lineWidth: 1,
              drawBorder: true,
              drawTicks: true
            },
            border: {
              display: true,
              color: '#666',
              width: 1.5
            }
          },
          x: {
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: { size: 9 },
              maxRotation: 45,
              minRotation: 45,
              autoSkip: true,
              maxTicksLimit: 6,
              padding: 5
            },
            border: {
              display: true,
              color: '#666',
              width: 1.5
            }
          }
        },
        layout: {
          padding: {
            left: 5,
            right: 15,
            top: 5,
            bottom: 5
          }
        }
      }
    };

    // 使用 QuickChart.io POST API 生成三張圖的短網址
    console.log('📤 呼叫 QuickChart API 生成三張圖...');

    const [priceResponse, kdResponse, macdResponse] = await Promise.all([
      axios.post('https://quickchart.io/chart/create', {
        chart: priceChartConfig,
        width: 800,
        height: 300,
        backgroundColor: 'white'
      }),
      axios.post('https://quickchart.io/chart/create', {
        chart: kdChartConfig,
        width: 800,
        height: 250,
        backgroundColor: 'white'
      }),
      axios.post('https://quickchart.io/chart/create', {
        chart: macdChartConfig,
        width: 800,
        height: 200,
        backgroundColor: 'white'
      })
    ]);

    const priceImageUrl = priceResponse.data.url;
    const kdImageUrl = kdResponse.data.url;
    const macdImageUrl = macdResponse.data.url;

    console.log('✅ 三張圖表短網址已生成');
    console.log('  價格圖:', priceImageUrl);
    console.log('  KD圖:', kdImageUrl);
    console.log('  MACD圖:', macdImageUrl);

    // 分析 KD 和 MACD
    const latestK = K[K.length - 1];
    const latestD = D[D.length - 1];
    const latestMACD = MACD[MACD.length - 1];
    const latestSignal = Signal[Signal.length - 1];

    const kdAnalysis = analyzeKD(latestK, latestD);
    const macdAnalysis = analyzeMACD(latestMACD, latestSignal);

    return {
      priceImageUrl,
      kdImageUrl,
      macdImageUrl,
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

