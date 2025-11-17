/**
 * 美股市場分析模組
 * 整合美股指數、台股大盤、匯率、VIX 等資料進行跨市場分析
 */

const { fetchStockPrice, fetchUSStockPrice, fetchExchangeRate, fetchVIX } = require('./finmind');
const { calculateKD, calculateMACD, calculateMA } = require('./indicators');
const { analyzeUSMarketWithDeepSeek } = require('./deepseek');
const moment = require('moment');

/**
 * 抓取並分析美股市場資料
 * @returns {Promise<object>} - 完整的美股分析結果
 */
async function analyzeUSMarket() {
  try {
    console.log('🌎 開始美股市場分析...');

    const endDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(6, 'months').format('YYYY-MM-DD');

    // 並行抓取所有資料
    const [
      sp500Data,
      nasdaqData,
      soxxData,
      tsmAdrData,
      twiiData,
      usdTwdData,
      vixData
    ] = await Promise.all([
      fetchUSStockPrice('^GSPC', startDate, endDate),   // S&P 500
      fetchUSStockPrice('^IXIC', startDate, endDate),   // NASDAQ
      fetchUSStockPrice('^SOX', startDate, endDate),    // SOXX 半導體指數
      fetchUSStockPrice('TSM', startDate, endDate),     // TSM ADR
      fetchStockPrice('TAIEX', startDate, endDate),     // 台股加權指數
      fetchExchangeRate(startDate, endDate),            // USD/TWD 匯率
      fetchVIX(startDate, endDate)                      // VIX 恐慌指數
    ]);

    console.log('✅ 所有資料抓取完成，開始計算技術指標...');

    // 計算美股指標
    const sp500Analysis = calculateIndicators(sp500Data, 'S&P 500');
    const nasdaqAnalysis = calculateIndicators(nasdaqData, 'NASDAQ');
    const soxxAnalysis = calculateIndicators(soxxData, 'SOXX');
    const tsmAdrAnalysis = calculateIndicators(tsmAdrData, 'TSM ADR');
    const twiiAnalysis = calculateIndicators(twiiData, '台股加權');

    // 取得最新匯率和 VIX
    const latestUsdTwd = usdTwdData[usdTwdData.length - 1];
    const latestVix = vixData[vixData.length - 1];

    console.log('✅ 技術指標計算完成，準備 AI 分析...');

    // 組合資料給 DeepSeek
    const analysisData = {
      sp500: sp500Analysis,
      nasdaq: nasdaqAnalysis,
      soxx: soxxAnalysis,
      tsmAdr: tsmAdrAnalysis,
      twii: twiiAnalysis,
      usdTwd: latestUsdTwd,
      vix: latestVix
    };

    // 使用 DeepSeek 進行跨市場分析
    const aiAnalysis = await analyzeUSMarketWithDeepSeek(analysisData);

    console.log('✅ 美股市場分析完成');

    return {
      success: true,
      data: analysisData,
      analysis: aiAnalysis,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
    };

  } catch (error) {
    console.error('❌ 美股市場分析失敗:', error);
    throw error;
  }
}

/**
 * 計算單一指數的技術指標
 * @param {Array} priceData - 價格資料
 * @param {string} name - 指數名稱
 * @returns {object} - 技術指標分析結果
 */
function calculateIndicators(priceData, name) {
  // 取最近 60 天資料計算指標
  const recentData = priceData.slice(-60);
  
  // 計算 KD
  const kdData = calculateKD(recentData);
  const latestKD = kdData[kdData.length - 1];
  
  // 計算 MACD
  const macdData = calculateMACD(recentData);
  const latestMACD = macdData[macdData.length - 1];
  
  // 計算 MA
  const ma5 = calculateMA(recentData, 5);
  const ma10 = calculateMA(recentData, 10);
  const ma20 = calculateMA(recentData, 20);
  
  const latestPrice = recentData[recentData.length - 1];
  const latestMA5 = ma5[ma5.length - 1];
  const latestMA10 = ma10[ma10.length - 1];
  const latestMA20 = ma20[ma20.length - 1];

  // 判斷趨勢
  let trend = '盤整';
  if (latestPrice.close > latestMA5 && latestMA5 > latestMA10 && latestMA10 > latestMA20) {
    trend = '多頭';
  } else if (latestPrice.close < latestMA5 && latestMA5 < latestMA10 && latestMA10 < latestMA20) {
    trend = '空頭';
  }

  // 判斷 KD 狀態
  let kdStatus = '中性';
  if (latestKD.K > 80 && latestKD.D > 80) {
    kdStatus = '超買';
  } else if (latestKD.K < 20 && latestKD.D < 20) {
    kdStatus = '超賣';
  } else if (latestKD.K > latestKD.D) {
    kdStatus = '偏多';
  } else {
    kdStatus = '偏空';
  }

  // 判斷 MACD 狀態
  let macdStatus = '中性';
  if (latestMACD.histogram > 0 && latestMACD.macd > latestMACD.signal) {
    macdStatus = '多頭';
  } else if (latestMACD.histogram < 0 && latestMACD.macd < latestMACD.signal) {
    macdStatus = '空頭';
  }

  return {
    name,
    price: latestPrice.close.toFixed(2),
    date: latestPrice.date,
    kd: {
      K: latestKD.K.toFixed(2),
      D: latestKD.D.toFixed(2),
      status: kdStatus
    },
    macd: {
      macd: latestMACD.macd.toFixed(2),
      signal: latestMACD.signal.toFixed(2),
      histogram: latestMACD.histogram.toFixed(2),
      status: macdStatus
    },
    ma: {
      ma5: latestMA5.toFixed(2),
      ma10: latestMA10.toFixed(2),
      ma20: latestMA20.toFixed(2)
    },
    trend
  };
}

module.exports = {
  analyzeUSMarket,
  calculateIndicators
};

