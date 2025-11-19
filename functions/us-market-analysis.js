/**
 * 美股市場分析模組
 * 整合美股指數、台股大盤、匯率、VIX 等資料進行跨市場分析
 */

const { fetchStockPrice, fetchUSStockPrice, fetchExchangeRate, fetchVIX } = require('./finmind');
const { calculateKD, calculateMACD, calculateMA } = require('./indicators');
const { analyzeUSMarketWithDeepSeek } = require('./deepseek');
const { getUSMarketCache, saveUSMarketCache } = require('./supabase-client');
const moment = require('moment');

/**
 * 延遲函數
 * @param {number} ms - 延遲毫秒數
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 抓取並分析美股市場資料
 * @returns {Promise<object>} - 完整的美股分析結果
 */
async function analyzeUSMarket() {
  const startTime = Date.now();

  try {
    console.log('🌎 開始美股市場分析...');

    // 1. 檢查快取
    console.log('📊 檢查快取...');
    const cachedResult = await getUSMarketCache();
    if (cachedResult) {
      const cacheTime = (Date.now() - startTime) / 1000;
      console.log(`✅ 使用快取的美股分析結果（耗時 ${cacheTime.toFixed(2)} 秒）`);
      return cachedResult;
    }

    console.log('📊 快取未命中，開始抓取資料...');
    console.log('⏱️ 預計需要 15-25 秒，請稍候...');

    const endDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(6, 'months').format('YYYY-MM-DD');

    // 2. 序列抓取資料（避免觸發 API 頻率限制）
    console.log('📊 抓取 S&P 500...');
    const sp500Data = await fetchUSStockPrice('^GSPC', startDate, endDate);
    await delay(500); // 延遲 500ms

    console.log('📊 抓取 NASDAQ...');
    const nasdaqData = await fetchUSStockPrice('^IXIC', startDate, endDate);
    await delay(500);

    console.log('📊 抓取 SOXX...');
    const soxxData = await fetchUSStockPrice('^SOX', startDate, endDate);
    await delay(500);

    console.log('📊 抓取 TSM ADR...');
    const tsmAdrData = await fetchUSStockPrice('TSM', startDate, endDate);
    await delay(500);

    console.log('📊 抓取台股加權...');
    const twiiData = await fetchStockPrice('TAIEX', startDate, endDate);
    await delay(500);

    console.log('📊 抓取匯率...');
    const usdTwdData = await fetchExchangeRate(startDate, endDate);
    await delay(500);

    console.log('📊 抓取 VIX...');
    const vixData = await fetchVIX(startDate, endDate);

    console.log('✅ 所有資料抓取完成，開始計算技術指標...');

    // 檢查資料是否有效
    console.log(`📊 資料筆數檢查：`);
    console.log(`  - S&P 500: ${sp500Data.length} 筆`);
    console.log(`  - NASDAQ: ${nasdaqData.length} 筆`);
    console.log(`  - SOXX: ${soxxData.length} 筆`);
    console.log(`  - TSM ADR: ${tsmAdrData.length} 筆`);
    console.log(`  - 台股加權: ${twiiData.length} 筆`);
    console.log(`  - USD/TWD: ${usdTwdData.length} 筆`);
    console.log(`  - VIX: ${vixData.length} 筆`);

    // 計算美股指標
    console.log('📊 計算 S&P 500 指標...');
    const sp500Analysis = calculateIndicators(sp500Data, 'S&P 500');
    console.log('📊 計算 NASDAQ 指標...');
    const nasdaqAnalysis = calculateIndicators(nasdaqData, 'NASDAQ');
    console.log('📊 計算 SOXX 指標...');
    const soxxAnalysis = calculateIndicators(soxxData, 'SOXX');
    console.log('📊 計算 TSM ADR 指標...');
    const tsmAdrAnalysis = calculateIndicators(tsmAdrData, 'TSM ADR');
    console.log('📊 計算台股加權指標...');
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
    console.log('🤖 開始 AI 分析...');
    const aiAnalysis = await analyzeUSMarketWithDeepSeek(analysisData);

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ 美股市場分析完成（總耗時 ${totalTime.toFixed(2)} 秒）`);

    const result = {
      success: true,
      data: analysisData,
      analysis: aiAnalysis,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    // 3. 儲存快取（6 小時有效，統一快取時間）
    console.log('💾 儲存快取...');
    await saveUSMarketCache(result);
    console.log('✅ 快取已儲存，6 小時內查詢將秒回');

    return result;

  } catch (error) {
    const totalTime = (Date.now() - startTime) / 1000;
    console.error(`❌ 美股市場分析失敗（耗時 ${totalTime.toFixed(2)} 秒）:`, error.message);
    console.error('錯誤堆疊:', error.stack);

    // 提供更詳細的錯誤訊息
    if (error.message && error.message.includes('timeout')) {
      throw new Error('請求超時：資料抓取時間過長，請稍後再試');
    } else if (error.message && error.message.includes('FinMind')) {
      throw new Error('FinMind API 請求失敗，可能是頻率限制或配額用完，請等待 1-2 分鐘後再試');
    } else if (error.message && error.message.includes('DeepSeek')) {
      throw new Error('DeepSeek AI 分析失敗，請稍後再試');
    } else if (error.message && error.message.includes('資料不足')) {
      throw new Error('資料不足：無法計算技術指標，請稍後再試');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('網路連線超時，請檢查網路狀態後再試');
    } else {
      throw new Error(`分析失敗：${error.message || '未知錯誤'}`);
    }
  }
}

/**
 * 計算單一指數的技術指標
 * @param {Array} priceData - 價格資料
 * @param {string} name - 指數名稱
 * @returns {object} - 技術指標分析結果
 */
function calculateIndicators(priceData, name) {
  try {
    console.log(`  📈 ${name}: 開始計算指標（總資料: ${priceData.length} 筆）`);

    // 取最近 60 天資料計算指標
    const recentData = priceData.slice(-60);

    if (!recentData || recentData.length < 20) {
      console.error(`  ❌ ${name}: 資料不足（只有 ${recentData.length} 筆）`);
      throw new Error(`${name} 資料不足，無法計算指標（需要至少 20 筆，目前只有 ${recentData.length} 筆）`);
    }

    console.log(`  📊 ${name}: 使用最近 ${recentData.length} 筆資料計算指標`);

    // 檢查資料格式
    const firstData = recentData[0];
    console.log(`  📊 ${name}: 第一筆資料 = ${JSON.stringify(firstData)}`);

    if (!firstData.close || !firstData.high || !firstData.low) {
      console.error(`  ❌ ${name}: 資料格式錯誤，缺少必要欄位`);
      throw new Error(`${name} 資料格式錯誤`);
    }

    // 計算 KD（返回 { K: [], D: [], RSV: [] }）
    const kdResult = calculateKD(recentData);
    const latestKValue = kdResult.K[kdResult.K.length - 1];
    const latestDValue = kdResult.D[kdResult.D.length - 1];

    // 計算 MACD（返回 { MACD: [], Signal: [], Histogram: [] }）
    const macdResult = calculateMACD(recentData);
    const latestMACDValue = macdResult.MACD[macdResult.MACD.length - 1];
    const latestSignalValue = macdResult.Signal[macdResult.Signal.length - 1];
    const latestHistogramValue = macdResult.Histogram[macdResult.Histogram.length - 1];

    // 計算 MA（返回數值陣列）
    const closes = recentData.map(d => d.close);
    const ma5 = calculateMA(closes, 5);
    const ma10 = calculateMA(closes, 10);
    const ma20 = calculateMA(closes, 20);

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
    if (latestKValue > 80 && latestDValue > 80) {
      kdStatus = '超買';
    } else if (latestKValue < 20 && latestDValue < 20) {
      kdStatus = '超賣';
    } else if (latestKValue > latestDValue) {
      kdStatus = '偏多';
    } else {
      kdStatus = '偏空';
    }

    // 判斷 MACD 狀態
    let macdStatus = '中性';
    if (latestHistogramValue > 0 && latestMACDValue > latestSignalValue) {
      macdStatus = '多頭';
    } else if (latestHistogramValue < 0 && latestMACDValue < latestSignalValue) {
      macdStatus = '空頭';
    }

    const result = {
      name,
      price: latestPrice.close.toFixed(2),
      date: latestPrice.date,
      kd: {
        K: latestKValue.toFixed(2),
        D: latestDValue.toFixed(2),
        status: kdStatus
      },
      macd: {
        macd: latestMACDValue.toFixed(2),
        signal: latestSignalValue.toFixed(2),
        histogram: latestHistogramValue.toFixed(2),
        status: macdStatus
      },
      ma: {
        ma5: latestMA5.toFixed(2),
        ma10: latestMA10.toFixed(2),
        ma20: latestMA20.toFixed(2)
      },
      trend
    };

    console.log(`  ✅ ${name}: 計算完成`);
    console.log(`     價格: ${result.price}, KD: ${result.kd.K}/${result.kd.D}, 趨勢: ${result.trend}`);

    return result;

  } catch (error) {
    console.error(`  ❌ 計算 ${name} 指標失敗:`, error.message);
    console.error(`  錯誤堆疊:`, error.stack);
    throw error;
  }
}

module.exports = {
  analyzeUSMarket,
  calculateIndicators
};

