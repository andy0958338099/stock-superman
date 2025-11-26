/**
 * 瘋狂推薦模組 - 找出最瘋狂的電子股
 * 策略：高波動 + 強動能 + 量價齊揚 + 技術面轉強
 * 適合：積極型投資者，高風險高報酬
 * 快取：4 小時有效
 */

const axios = require('axios');
const moment = require('moment');
const { fetchStockPrice, fetchStockInfo, fetchStockDividend, fetchStockFinancials } = require('./finmind');
const { calculateKD, calculateMACD, analyzeKD, analyzeMACDSignal } = require('./indicators');
const { searchNews } = require('./deepseek');
const { CACHE_KEYS, getRecommendationCache, saveRecommendationCache } = require('./recommendation-cache');

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// 瘋狂股候選池（高波動電子股）
const CRAZY_STOCKS = [
  { id: '2330', name: '台積電', sector: '半導體' },
  { id: '2454', name: '聯發科', sector: '半導體' },
  { id: '3661', name: '世芯-KY', sector: 'IC設計' },
  { id: '2379', name: '瑞昱', sector: 'IC設計' },
  { id: '3034', name: '聯詠', sector: 'IC設計' },
  { id: '2382', name: '廣達', sector: 'AI伺服器' },
  { id: '2317', name: '鴻海', sector: 'AI伺服器' },
  { id: '3017', name: '奇鋐', sector: '散熱' },
  { id: '6669', name: '緯穎', sector: 'AI伺服器' },
  { id: '2345', name: '智邦', sector: '網通' },
  { id: '3533', name: '嘉澤', sector: '連接器' },
  { id: '6285', name: '啟碁', sector: '網通' },
];

// 新增快取 Key
const CRAZY_CACHE_KEY = 'CRAZY_RECOMMENDATION';

/**
 * 計算波動率
 */
function calculateVolatility(stockData, days = 20) {
  if (stockData.length < days) return 0;
  const recentData = stockData.slice(-days);
  const returns = [];
  for (let i = 1; i < recentData.length; i++) {
    const ret = (recentData[i].close - recentData[i-1].close) / recentData[i-1].close;
    returns.push(ret);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100; // 年化波動率 %
}

/**
 * 計算成交量變化
 */
function calculateVolumeChange(stockData, days = 5) {
  if (stockData.length < days + 20) return 1;
  const recentVol = stockData.slice(-days).reduce((a, b) => a + b.Trading_Volume, 0) / days;
  const avgVol = stockData.slice(-25, -5).reduce((a, b) => a + b.Trading_Volume, 0) / 20;
  return avgVol > 0 ? recentVol / avgVol : 1;
}

/**
 * 分析單一股票的瘋狂程度
 */
async function analyzeCrazyStock(stockId, stockName, sector) {
  try {
    console.log(`📊 分析 ${stockName}(${stockId})...`);

    const [stockData, stockInfo, dividendData, financialData] = await Promise.all([
      fetchStockPrice(stockId),
      fetchStockInfo(stockId),
      fetchStockDividend(stockId),
      fetchStockFinancials(stockId)
    ]);

    if (!stockData || stockData.length < 60) {
      console.log(`⚠️ ${stockId} 資料不足`);
      return null;
    }

    const latestPrice = stockData[stockData.length - 1].close;

    // 技術指標（使用陣列，避免之前的錯誤）
    const kdResult = calculateKD(stockData);
    const macdResult = calculateMACD(stockData);

    const kArray = kdResult?.K || [];
    const dArray = kdResult?.D || [];
    const macdArray = macdResult?.MACD || [];
    const signalArray = macdResult?.Signal || [];
    const histogramArray = macdResult?.Histogram || [];

    const latestK = kArray.length > 0 ? kArray[kArray.length - 1] : 50;
    const latestD = dArray.length > 0 ? dArray[dArray.length - 1] : 50;
    const latestMACD = macdArray.length > 0 ? macdArray[macdArray.length - 1] : 0;
    const latestSignal = signalArray.length > 0 ? signalArray[signalArray.length - 1] : 0;
    const latestHistogram = histogramArray.length > 0 ? histogramArray[histogramArray.length - 1] : 0;

    // 瘋狂指標計算
    const volatility = calculateVolatility(stockData, 20);
    const volumeRatio = calculateVolumeChange(stockData, 5);

    // 近期漲幅
    const price5dAgo = stockData[stockData.length - 6]?.close || latestPrice;
    const price20dAgo = stockData[stockData.length - 21]?.close || latestPrice;
    const gain5d = ((latestPrice - price5dAgo) / price5dAgo) * 100;
    const gain20d = ((latestPrice - price20dAgo) / price20dAgo) * 100;

    // 基本面
    const eps = financialData?.total_eps || 0;
    const peRatio = eps > 0 ? latestPrice / eps : 999;

    // ============================================
    // 瘋狂評分（越瘋狂越高分）
    // ============================================
    let crazyScore = 30; // 基礎分

    // 1. 波動率評分（高波動 = 瘋狂）
    if (volatility > 50) crazyScore += 25;
    else if (volatility > 40) crazyScore += 20;
    else if (volatility > 30) crazyScore += 15;
    else if (volatility > 20) crazyScore += 10;

    // 2. 成交量爆發
    if (volumeRatio > 3) crazyScore += 25;
    else if (volumeRatio > 2) crazyScore += 20;
    else if (volumeRatio > 1.5) crazyScore += 15;
    else if (volumeRatio > 1.2) crazyScore += 10;

    // 3. 近期漲幅（動能）
    if (gain5d > 15) crazyScore += 20;
    else if (gain5d > 10) crazyScore += 15;
    else if (gain5d > 5) crazyScore += 10;
    else if (gain5d > 0) crazyScore += 5;
    if (gain5d < -10) crazyScore -= 15; // 暴跌扣分

    // 4. 技術面動能
    if (latestK > 80 && latestK > latestD) crazyScore += 15; // 強勢
    else if (latestK > 50 && latestK > latestD) crazyScore += 10;
    if (latestMACD > 0 && latestHistogram > 0) crazyScore += 10;

    // 5. 量價配合加分
    if (gain5d > 5 && volumeRatio > 1.5) crazyScore += 10;

    const totalScore = Math.min(100, Math.max(0, crazyScore));

    return {
      stockId,
      stockName,
      sector,
      latestPrice,
      crazyScore: totalScore,
      volatility: volatility.toFixed(1),
      volumeRatio: volumeRatio.toFixed(2),
      technicals: {
        K: latestK,
        D: latestD,
        MACD: latestMACD,
        signal: latestSignal,
        kdSignal: kArray.length > 0 ? analyzeKD(kArray, dArray) : { signal: '資料不足', description: '' },
        macdSignal: macdArray.length > 0 ? analyzeMACDSignal(macdArray, signalArray, histogramArray) : { signal: '資料不足', description: '' }
      },
      momentum: {
        gain5d: gain5d.toFixed(1),
        gain20d: gain20d.toFixed(1)
      },
      fundamentals: {
        eps,
        peRatio: peRatio < 999 ? peRatio.toFixed(1) : 'N/A'
      }
    };
  } catch (error) {
    console.error(`❌ 分析 ${stockId} 失敗:`, error.message);
    return null;
  }
}

/**
 * 篩選瘋狂股票
 */
async function screenCrazyStocks() {
  console.log('🔥 開始篩選瘋狂電子股...');
  const results = [];

  // 批次處理（避免 API 超限）
  const batchSize = 2;
  for (let i = 0; i < CRAZY_STOCKS.length; i += batchSize) {
    const batch = CRAZY_STOCKS.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(s => analyzeCrazyStock(s.id, s.name, s.sector))
    );
    results.push(...batchResults.filter(r => r !== null));

    if (i + batchSize < CRAZY_STOCKS.length) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // 按瘋狂程度排序
  results.sort((a, b) => b.crazyScore - a.crazyScore);
  console.log(`✅ 完成篩選，共 ${results.length} 檔股票`);
  return results;
}

/**
 * AI 生成瘋狂推薦
 */
async function generateCrazyAIRecommendation(topStocks) {
  const stockSummaries = topStocks.map((stock, index) => `
【第 ${index + 1} 名】${stock.stockName}（${stock.stockId}）- ${stock.sector}
- 股價：${stock.latestPrice} 元
- 瘋狂指數：${stock.crazyScore}/100 🔥
- 波動率：${stock.volatility}%
- 成交量倍數：${stock.volumeRatio}x
- 近5日漲幅：${stock.momentum.gain5d}%
- 近20日漲幅：${stock.momentum.gain20d}%
- KD：${Math.round(stock.technicals.K || 50)}/${Math.round(stock.technicals.D || 50)}
- 本益比：${stock.fundamentals.peRatio}
  `).join('\n');

  const prompt = `
你是激進型電子股交易專家，專門找出爆發力最強的瘋狂股票。

以下是今日篩選出的 TOP 3 瘋狂電子股：
${stockSummaries}

請為每檔股票提供：
1. 瘋狂原因（為什麼動能這麼強）
2. 爆發潛力（還能漲多少）
3. 激進目標價（樂觀情況）
4. 停損價位（必須設定！）
5. 信心指數（1-10，瘋狂程度）
6. 風險警告（必須明確）

回覆格式（JSON）：
{
  "recommendations": [
    {
      "rank": 1,
      "stockId": "2330",
      "stockName": "台積電",
      "crazyReason": "量價齊揚，外資狂買",
      "explosivePotential": "突破前高後有望挑戰新高",
      "aggressiveTarget": 1200,
      "stopLoss": 1050,
      "confidence": 8,
      "riskWarning": "追高風險大，注意回檔",
      "allocationPercent": 40
    }
  ],
  "marketMomentum": "市場情緒高漲",
  "tradingStrategy": "追強不追弱，嚴設停損"
}`;

  try {
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error('❌ AI 推薦失敗:', error.message);
    return {
      recommendations: topStocks.map((stock, index) => ({
        rank: index + 1,
        stockId: stock.stockId,
        stockName: stock.stockName,
        crazyReason: `瘋狂指數 ${stock.crazyScore}，波動率 ${stock.volatility}%`,
        explosivePotential: '動能強勁',
        aggressiveTarget: Math.round(stock.latestPrice * 1.1),
        stopLoss: Math.round(stock.latestPrice * 0.95),
        confidence: Math.min(10, Math.round(stock.crazyScore / 10)),
        riskWarning: '高波動高風險，請謹慎操作',
        allocationPercent: Math.round(100 / topStocks.length)
      })),
      marketMomentum: '市場波動劇烈',
      tradingStrategy: '嚴設停損，控制倉位'
    };
  }
}

/**
 * 主函數：取得瘋狂推薦（帶快取）
 */
async function getCrazyRecommendation() {
  console.log('🔥 開始取得瘋狂推薦...');

  // 1. 先檢查快取
  const cached = await getRecommendationCache(CRAZY_CACHE_KEY);
  if (cached) {
    console.log(`✅ 使用快取結果（已存在 ${cached.cacheAge} 分鐘）`);
    return cached;
  }

  console.log('⚡ 快取不存在或已過期，重新分析...');
  const startTime = Date.now();

  try {
    // 2. 篩選股票
    const screenedStocks = await screenCrazyStocks();
    if (screenedStocks.length === 0) throw new Error('無符合條件的股票');

    // 3. 取 TOP 3
    const top3 = screenedStocks.slice(0, 3);
    console.log('🔥 TOP 3:', top3.map(s => `${s.stockName}: ${s.crazyScore}分`).join(', '));

    // 4. AI 推薦
    const aiRecommendation = await generateCrazyAIRecommendation(top3);

    // 5. 整合結果（使用台北時間 UTC+8）
    const taipeiTime = moment().utcOffset(8);
    const result = {
      date: taipeiTime.format('YYYY-MM-DD'),
      updateTime: taipeiTime.format('HH:mm'),
      top3Stocks: top3,
      aiRecommendation,
      processingTime: Date.now() - startTime,
      fromCache: false
    };

    console.log(`✅ 瘋狂推薦生成完成，耗時 ${result.processingTime}ms`);

    // 6. 儲存快取
    await saveRecommendationCache(CRAZY_CACHE_KEY, result);

    return result;
  } catch (error) {
    console.error('❌ 瘋狂推薦失敗:', error.message);
    throw error;
  }
}

module.exports = { getCrazyRecommendation, CRAZY_CACHE_KEY };
