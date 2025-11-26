/**
 * 高成長推薦模組 - 找出被低估的電子股
 * 策略：低本益比 + 正向新聞 + 數據良好 + 尚未啟動
 * 快取：4 小時有效，避免浪費 API Token
 */

const axios = require('axios');
const moment = require('moment');
const { fetchStockPrice, fetchStockInfo, fetchStockDividend, fetchStockFinancials } = require('./finmind');
const { calculateKD, calculateMACD, analyzeKD, analyzeMACDSignal } = require('./indicators');
const { searchNews } = require('./deepseek');
const { CACHE_KEYS, getRecommendationCache, saveRecommendationCache } = require('./recommendation-cache');

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// 電子股候選池（精選 12 檔，減少 API 請求）
const ELECTRONICS_STOCKS = [
  // 半導體（最重要）
  { id: '2330', name: '台積電', sector: '半導體' },
  { id: '2303', name: '聯電', sector: '半導體' },
  { id: '2454', name: '聯發科', sector: 'IC設計' },
  { id: '3711', name: '日月光投控', sector: '封測' },
  // AI/伺服器（熱門題材）
  { id: '2317', name: '鴻海', sector: '組裝' },
  { id: '2382', name: '廣達', sector: 'AI伺服器' },
  { id: '3231', name: '緯創', sector: 'AI伺服器' },
  { id: '2356', name: '英業達', sector: '伺服器' },
  // PC/零組件
  { id: '2357', name: '華碩', sector: 'PC' },
  { id: '2308', name: '台達電', sector: '電源' },
  { id: '3037', name: '欣興', sector: 'PCB' },
  { id: '2395', name: '研華', sector: '工業電腦' },
];

/**
 * 分析新聞情緒
 */
async function analyzeNewsSentiment(stockId, stockName) {
  try {
    const newsResult = await searchNews(`${stockName} ${stockId} 股票`);
    if (!newsResult || !newsResult.news || newsResult.news.length === 0) {
      return { score: 50, sentiment: '中性', newsCount: 0 };
    }

    // 分析新聞標題的情緒
    const positiveKeywords = ['成長', '獲利', '創新高', '突破', '利多', '看好', '訂單', '出貨', '擴產', 'AI', '需求強勁', '營收增', '毛利率', '上調', '目標價'];
    const negativeKeywords = ['衰退', '虧損', '下滑', '利空', '看淡', '砍單', '庫存', '下修', '裁員', '競爭', '跌', '減少', '警示'];

    let positiveCount = 0;
    let negativeCount = 0;

    newsResult.news.forEach(news => {
      const title = news.title || '';
      positiveKeywords.forEach(kw => { if (title.includes(kw)) positiveCount++; });
      negativeKeywords.forEach(kw => { if (title.includes(kw)) negativeCount++; });
    });

    const sentimentScore = 50 + (positiveCount * 8) - (negativeCount * 10);
    const finalScore = Math.min(100, Math.max(0, sentimentScore));

    let sentiment = '中性';
    if (finalScore >= 70) sentiment = '正向';
    else if (finalScore >= 60) sentiment = '偏多';
    else if (finalScore <= 30) sentiment = '負向';
    else if (finalScore <= 40) sentiment = '偏空';

    return { score: finalScore, sentiment, newsCount: newsResult.news.length, headlines: newsResult.news.slice(0, 3).map(n => n.title) };
  } catch (error) {
    console.error(`❌ 新聞分析失敗 ${stockId}:`, error.message);
    return { score: 50, sentiment: '無資料', newsCount: 0 };
  }
}

/**
 * 計算股價位置（相對52週高低點）
 */
function calculatePricePosition(stockData) {
  if (!stockData || stockData.length < 60) return { position: 50, high52w: 0, low52w: 0 };

  const prices = stockData.map(d => d.close);
  const high52w = Math.max(...prices);
  const low52w = Math.min(...prices);
  const currentPrice = prices[prices.length - 1];
  const position = ((currentPrice - low52w) / (high52w - low52w)) * 100;

  return { position: Math.round(position), high52w, low52w, currentPrice };
}

/**
 * 分析單一電子股
 */
async function analyzeElectronicsStock(stock) {
  const { id: stockId, name: stockName, sector } = stock;
  console.log(`📊 分析 ${stockName}(${stockId})...`);

  try {
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

    // 1. 技術面分析
    const kdResult = calculateKD(stockData);
    const macdResult = calculateMACD(stockData);

    // 防護：確保陣列存在且有資料
    const kArray = kdResult?.K || [];
    const dArray = kdResult?.D || [];
    const macdArray = macdResult?.MACD || [];
    const signalArray = macdResult?.Signal || [];
    const histogramArray = macdResult?.Histogram || [];

    const latestK = kArray.length > 0 ? kArray[kArray.length - 1] : 50;
    const latestD = dArray.length > 0 ? dArray[dArray.length - 1] : 50;
    const latestMACD = macdArray.length > 0 ? macdArray[macdArray.length - 1] : 0;
    const latestSignal = signalArray.length > 0 ? signalArray[signalArray.length - 1] : 0;

    // 2. 價格位置（相對52週）
    const pricePosition = calculatePricePosition(stockData);

    // 3. 近期漲幅
    const price5dAgo = stockData[stockData.length - 6]?.close || latestPrice;
    const price20dAgo = stockData[stockData.length - 21]?.close || latestPrice;
    const gain5d = ((latestPrice - price5dAgo) / price5dAgo) * 100;
    const gain20d = ((latestPrice - price20dAgo) / price20dAgo) * 100;

    // 4. 基本面
    const eps = financialData?.total_eps || 0;
    const peRatio = eps > 0 ? latestPrice / eps : 999;
    const cashDividend = dividendData?.cash_dividend || 0;
    const yieldRate = cashDividend > 0 ? (cashDividend / latestPrice) * 100 : 0;

    // 5. 新聞情緒（限制 API 頻率，只對前 10 名分析）
    // 先用技術+基本面篩選，後面再加新聞分析
    const newsSentiment = { score: 50, sentiment: '待分析', newsCount: 0 };

    // 計算低估分數（電子股平均PE約15-20）
    let undervalueScore = 40;

    // 本益比評分（電子股特化）
    if (peRatio < 10) undervalueScore += 25;        // 嚴重低估
    else if (peRatio < 12) undervalueScore += 20;   // 明顯低估
    else if (peRatio < 15) undervalueScore += 15;   // 輕微低估
    else if (peRatio < 20) undervalueScore += 5;    // 合理
    else if (peRatio > 30) undervalueScore -= 15;   // 過高
    else if (peRatio > 25) undervalueScore -= 10;   // 偏高

    // EPS 成長性
    if (eps > 10) undervalueScore += 15;
    else if (eps > 5) undervalueScore += 10;
    else if (eps > 2) undervalueScore += 5;
    else if (eps < 0) undervalueScore -= 20;

    // 價格位置評分（找尚未啟動的）
    let momentumScore = 40;

    // 相對52週位置
    if (pricePosition.position < 30) momentumScore += 20;       // 低檔
    else if (pricePosition.position < 50) momentumScore += 10;  // 中低檔
    else if (pricePosition.position > 85) momentumScore -= 20;  // 已飆高
    else if (pricePosition.position > 70) momentumScore -= 10;  // 高檔

    // 近期漲幅（尚未啟動）
    if (gain5d < 3 && gain5d > -3) momentumScore += 15;         // 盤整
    else if (gain5d < 5 && gain5d > 0) momentumScore += 10;     // 小漲
    else if (gain5d > 10) momentumScore -= 20;                  // 已飆漲
    else if (gain5d > 7) momentumScore -= 10;                   // 漲多

    // KD 位置（未超買）
    if (latestK < 50 && latestK > latestD) momentumScore += 15; // 低檔黃金交叉
    else if (latestK < 30) momentumScore += 10;                 // 超賣區
    else if (latestK > 80) momentumScore -= 15;                 // 超買區
    else if (latestK > 70) momentumScore -= 5;                  // 偏高

    // MACD
    if (latestMACD > latestSignal && latestMACD < 0) momentumScore += 10; // 即將翻多
    else if (latestMACD > 0 && latestMACD > latestSignal) momentumScore += 5;

    // 綜合評分
    const totalScore = undervalueScore * 0.5 + momentumScore * 0.5;

    return {
      stockId,
      stockName,
      sector,
      latestPrice,
      undervalueScore: Math.min(100, Math.max(0, undervalueScore)),
      momentumScore: Math.min(100, Math.max(0, momentumScore)),
      totalScore,
      technicals: {
        K: latestK,
        D: latestD,
        MACD: latestMACD,
        signal: latestSignal,
        kdSignal: kArray.length > 0 ? analyzeKD(kArray, dArray) : { signal: '資料不足', description: '' },
        macdSignal: macdArray.length > 0 ? analyzeMACDSignal(macdArray, signalArray, histogramArray) : { signal: '資料不足', description: '' }
      },
      fundamentals: {
        eps,
        peRatio: peRatio < 999 ? peRatio.toFixed(1) : 'N/A',
        cashDividend,
        yieldRate: yieldRate.toFixed(2)
      },
      pricePosition,
      recentGain: { gain5d: gain5d.toFixed(1), gain20d: gain20d.toFixed(1) },
      newsSentiment
    };
  } catch (error) {
    console.error(`❌ 分析 ${stockId} 失敗:`, error.message);
    return null;
  }
}

/**
 * 篩選高成長電子股
 */
async function screenGrowthStocks() {
  console.log('🚀 開始篩選高成長電子股...');

  const results = [];
  // 一次只處理 2 檔，避免 API 超限
  const batchSize = 2;

  for (let i = 0; i < ELECTRONICS_STOCKS.length; i += batchSize) {
    const batch = ELECTRONICS_STOCKS.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(stock => analyzeElectronicsStock(stock)));
    results.push(...batchResults.filter(r => r !== null));

    // 每批次之間等待 1.5 秒，避免 API 超限
    if (i + batchSize < ELECTRONICS_STOCKS.length) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // 依綜合評分排序
  results.sort((a, b) => b.totalScore - a.totalScore);
  console.log(`✅ 完成篩選，共 ${results.length} 檔股票`);

  return results;
}

/**
 * 為 TOP 3 加入新聞分析
 */
async function addNewsAnalysis(topStocks) {
  console.log('📰 為 TOP 3 加入新聞分析...');

  for (const stock of topStocks) {
    const sentiment = await analyzeNewsSentiment(stock.stockId, stock.stockName);
    stock.newsSentiment = sentiment;

    // 根據新聞調整分數
    if (sentiment.score >= 70) stock.totalScore += 5;
    else if (sentiment.score >= 60) stock.totalScore += 2;
    else if (sentiment.score <= 30) stock.totalScore -= 5;
    else if (sentiment.score <= 40) stock.totalScore -= 2;

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // 重新排序
  topStocks.sort((a, b) => b.totalScore - a.totalScore);
  return topStocks;
}

/**
 * AI 生成推薦
 */
async function generateGrowthAIRecommendation(topStocks) {
  const stockSummaries = topStocks.map((stock, index) => `
【第 ${index + 1} 名】${stock.stockName}（${stock.stockId}）- ${stock.sector}
- 股價：${stock.latestPrice} 元
- 低估評分：${stock.undervalueScore}/100
- 動能評分：${stock.momentumScore}/100
- 本益比：${stock.fundamentals.peRatio}（電子股平均約15-20）
- EPS：${stock.fundamentals.eps} 元
- 殖利率：${stock.fundamentals.yieldRate}%
- 52週位置：${stock.pricePosition.position}%（低=尚未啟動）
- 近5日漲幅：${stock.recentGain.gain5d}%
- KD：${Math.round(stock.technicals.K || 50)}/${Math.round(stock.technicals.D || 50)}
- 新聞情緒：${stock.newsSentiment.sentiment}（${stock.newsSentiment.score}分）
  `).join('\n');

  const prompt = `
你是電子股投資專家，專門找出被市場低估、尚未啟動的成長股。

以下是篩選出的 TOP 3 低估電子股：
${stockSummaries}

請分析：
1. 為什麼被低估？（產業地位、獲利能力 vs 股價）
2. 成長潛力在哪？（AI、半導體、伺服器趨勢）
3. 什麼時候可能啟動？（技術面訊號）

信心指數標準：
- 8-10分：嚴重低估 + 新聞正向 + 即將啟動（罕見）
- 6-7分：明顯低估 + 基本面佳
- 4-5分：輕微低估 + 觀望中
- 1-3分：風險較高

請以 JSON 格式回覆：
{
  "recommendations": [
    {
      "rank": 1,
      "stockId": "股票代號",
      "stockName": "股票名稱",
      "sector": "產業",
      "reason": "被低估原因與成長潛力（40字內）",
      "targetPrice": 目標價,
      "buyPrice": 建議買入價,
      "risk": "主要風險（20字內）",
      "confidence": 信心指數,
      "allocationPercent": 配置比例,
      "expectedReturn": "預期報酬率",
      "catalyst": "啟動催化劑（15字內）"
    }
  ],
  "sectorOutlook": "電子產業展望（50字內）",
  "investmentStrategy": "投資策略建議（50字內）"
}
`;

  try {
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是謹慎的電子股分析師，專找低估成長股。信心指數要合理（多數在5-7分），目標價漲幅5-15%。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    }, {
      headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' }
    });

    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error('❌ AI 推薦失敗:', error.message);
    return {
      recommendations: topStocks.map((stock, index) => ({
        rank: index + 1,
        stockId: stock.stockId,
        stockName: stock.stockName,
        sector: stock.sector,
        reason: `低估評分 ${stock.undervalueScore}，本益比 ${stock.fundamentals.peRatio}`,
        targetPrice: Math.round(stock.latestPrice * 1.1),
        buyPrice: Math.round(stock.latestPrice * 0.97),
        risk: '市場波動風險',
        confidence: Math.min(7, Math.round(stock.totalScore / 15)),
        allocationPercent: Math.round(100 / topStocks.length),
        expectedReturn: '+5-10%',
        catalyst: '產業需求回升'
      })),
      sectorOutlook: '電子產業觀望中',
      investmentStrategy: '分批布局，逢低加碼'
    };
  }
}

/**
 * 主函數：取得高成長推薦（帶快取）
 */
async function getGrowthRecommendation() {
  console.log('🚀 開始取得高成長推薦...');

  // 1. 先檢查快取
  const cached = await getRecommendationCache(CACHE_KEYS.GROWTH_RECOMMENDATION);
  if (cached) {
    console.log(`✅ 使用快取結果（已存在 ${cached.cacheAge} 分鐘，剩餘 ${cached.cacheRemaining} 分鐘）`);
    return cached;
  }

  console.log('⚡ 快取不存在或已過期，重新分析...');
  const startTime = Date.now();

  try {
    // 2. 篩選股票
    const screenedStocks = await screenGrowthStocks();
    if (screenedStocks.length === 0) throw new Error('無符合條件的股票');

    // 3. 取 TOP 5 加入新聞分析
    let top5 = screenedStocks.slice(0, 5);
    top5 = await addNewsAnalysis(top5);

    // 4. 取最終 TOP 3
    const top3 = top5.slice(0, 3);
    console.log('📊 TOP 3:', top3.map(s => `${s.stockName}: ${s.totalScore.toFixed(1)}分`).join(', '));

    // 5. AI 推薦
    const aiRecommendation = await generateGrowthAIRecommendation(top3);

    // 6. 整合結果（使用台北時間 UTC+8）
    const taipeiTime = moment().utcOffset(8);
    const result = {
      date: taipeiTime.format('YYYY-MM-DD'),
      updateTime: taipeiTime.format('HH:mm'),
      top3Stocks: top3,
      aiRecommendation,
      processingTime: Date.now() - startTime,
      fromCache: false
    };

    console.log(`✅ 高成長推薦生成完成，耗時 ${result.processingTime}ms`);

    // 7. 儲存快取
    await saveRecommendationCache(CACHE_KEYS.GROWTH_RECOMMENDATION, result);

    return result;
  } catch (error) {
    console.error('❌ 高成長推薦失敗:', error.message);
    throw error;
  }
}

module.exports = { getGrowthRecommendation };

