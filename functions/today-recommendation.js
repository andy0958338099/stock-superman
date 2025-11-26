/**
 * 今日推薦模組 - 為小資族（5萬元）篩選 TOP 3 高勝率股票
 * 策略：技術面 + 基本面 + 新聞面 + AI 綜合評分
 */

const axios = require('axios');
const moment = require('moment');
const { fetchStockPrice, fetchStockInfo, fetchStockDividend, fetchStockFinancials } = require('./finmind');
const { calculateKD, calculateMACD, analyzeKD, analyzeMACDSignal } = require('./indicators');
const { searchNews } = require('./deepseek');

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// 候選股票池（台灣50成分股 + 熱門中小型股）
// 股價範圍約 50-500 元，適合小資族
const CANDIDATE_STOCKS = [
  // 權值股（股價較高，但知名度高）
  '2330', // 台積電
  '2317', // 鴻海
  '2454', // 聯發科
  // 金融股（穩定配息）
  '2881', // 富邦金
  '2882', // 國泰金
  '2891', // 中信金
  '2886', // 兆豐金
  '2884', // 玉山金
  // 電子股（成長性）
  '2308', // 台達電
  '2382', // 廣達
  '2357', // 華碩
  '3008', // 大立光
  '2912', // 統一超
  // 傳產股（穩定）
  '1301', // 台塑
  '1303', // 南亞
  '2002', // 中鋼
  '1216', // 統一
  // 中小型成長股
  '3037', // 欣興
  '2603', // 長榮
  '2609', // 陽明
  '2615', // 萬海
  '3711', // 日月光投控
  '2303', // 聯電
  '2395', // 研華
  '6505', // 台塑化
  '2801', // 彰銀
  '5880', // 合庫金
  // ETF（分散風險）
  '0050', // 台灣50
  '0056', // 高股息
  '00878', // 國泰永續高股息
  '00919', // 群益台灣精選高息
];

/**
 * 計算移動平均線
 */
function calculateMA(prices, period) {
  if (prices.length < period) return null;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * 分析單一股票的技術面
 */
async function analyzeStockTechnicals(stockId, stockData) {
  const closes = stockData.map(d => d.close);
  const latestPrice = closes[closes.length - 1];

  // 計算技術指標（返回的是陣列）
  const kdResult = calculateKD(stockData);
  const macdResult = calculateMACD(stockData);

  // 取最新值（陣列最後一個元素）
  const latestK = kdResult.K[kdResult.K.length - 1] || 50;
  const latestD = kdResult.D[kdResult.D.length - 1] || 50;
  const latestMACD = macdResult.MACD[macdResult.MACD.length - 1] || 0;
  const latestSignal = macdResult.Signal[macdResult.Signal.length - 1] || 0;
  const latestHistogram = macdResult.Histogram[macdResult.Histogram.length - 1] || 0;

  // 計算均線
  const ma5 = calculateMA(closes, 5);
  const ma20 = calculateMA(closes, 20);
  const ma60 = calculateMA(closes, 60);

  // 技術面評分（滿分 100）
  let technicalScore = 50; // 基礎分

  // KD 評分（0-25分）- 傳入陣列給 analyzeKD
  const kdAnalysis = analyzeKD(kdResult.K, kdResult.D);
  if (kdAnalysis.signal === '多頭' || kdAnalysis.signal === '黃金交叉') {
    technicalScore += 20;
  } else if (kdAnalysis.signal === '準備上攻') {
    technicalScore += 15;
  } else if (kdAnalysis.signal === '整理') {
    technicalScore += 5;
  } else if (kdAnalysis.signal === '空頭' || kdAnalysis.signal === '死亡交叉') {
    technicalScore -= 15;
  }

  // 避免超買超賣（使用最新 K 值）
  if (latestK > 80) technicalScore -= 10; // 超買區
  if (latestK < 20) technicalScore += 10; // 超賣區（可能反彈）

  // MACD 評分（0-25分）- 傳入陣列給 analyzeMACDSignal
  const macdAnalysis = analyzeMACDSignal(macdResult.MACD, macdResult.Signal, macdResult.Histogram);
  if (macdAnalysis.signal === '多頭' || macdAnalysis.signal === '強勢多頭') {
    technicalScore += 20;
  } else if (macdAnalysis.signal === '轉強') {
    technicalScore += 15;
  } else if (macdAnalysis.signal === '整理') {
    technicalScore += 5;
  } else if (macdAnalysis.signal === '空頭' || macdAnalysis.signal === '強勢空頭') {
    technicalScore -= 15;
  }

  // 均線評分（0-25分）
  if (ma5 && ma20 && ma60) {
    // 多頭排列：股價 > MA5 > MA20 > MA60
    if (latestPrice > ma5 && ma5 > ma20 && ma20 > ma60) {
      technicalScore += 25;
    } else if (latestPrice > ma5 && ma5 > ma20) {
      technicalScore += 15;
    } else if (latestPrice > ma20) {
      technicalScore += 10;
    } else if (latestPrice < ma5 && ma5 < ma20 && ma20 < ma60) {
      technicalScore -= 20; // 空頭排列
    }
  }

  // 成交量評分（0-15分）
  const recentVolumes = stockData.slice(-5).map(d => d.Trading_Volume);
  const avgVolume20 = stockData.slice(-20).map(d => d.Trading_Volume).reduce((a, b) => a + b, 0) / 20;
  const avgVolume5 = recentVolumes.reduce((a, b) => a + b, 0) / 5;

  if (avgVolume5 > avgVolume20 * 1.5) {
    technicalScore += 15; // 量增
  } else if (avgVolume5 > avgVolume20) {
    technicalScore += 10;
  }

  return {
    score: Math.min(100, Math.max(0, technicalScore)),
    K: latestK,
    D: latestD,
    MACD: latestMACD,
    Signal: latestSignal,
    kdSignal: kdAnalysis.signal,
    macdSignal: macdAnalysis.signal,
    ma5, ma20, ma60,
    latestPrice,
    priceAboveMA: latestPrice > ma20
  };
}

/**
 * 分析單一股票的基本面
 */
async function analyzeStockFundamentals(stockId, financialData, dividendData, latestPrice) {
  let fundamentalScore = 50; // 基礎分

  // EPS 評分（0-30分）
  if (financialData && financialData.total_eps > 0) {
    const eps = financialData.total_eps;
    const peRatio = latestPrice / eps;

    // 本益比評分
    if (peRatio > 0 && peRatio < 12) {
      fundamentalScore += 30; // 低本益比，便宜
    } else if (peRatio >= 12 && peRatio < 18) {
      fundamentalScore += 20; // 合理本益比
    } else if (peRatio >= 18 && peRatio < 25) {
      fundamentalScore += 10; // 稍高但可接受
    } else if (peRatio >= 25) {
      fundamentalScore -= 10; // 過高
    }

    // EPS 正成長加分
    if (eps > 3) fundamentalScore += 10;
  }

  // 股利評分（0-20分）
  if (dividendData && dividendData.cash_dividend > 0) {
    const yieldRate = (dividendData.cash_dividend / latestPrice) * 100;
    if (yieldRate > 5) {
      fundamentalScore += 20; // 高殖利率
    } else if (yieldRate > 3) {
      fundamentalScore += 15;
    } else if (yieldRate > 2) {
      fundamentalScore += 10;
    }
  }

  return {
    score: Math.min(100, Math.max(0, fundamentalScore)),
    eps: financialData?.total_eps || 0,
    peRatio: financialData?.total_eps > 0 ? (latestPrice / financialData.total_eps).toFixed(2) : null,
    cashDividend: dividendData?.cash_dividend || 0,
    yieldRate: dividendData?.cash_dividend > 0 ? ((dividendData.cash_dividend / latestPrice) * 100).toFixed(2) : null
  };
}

/**
 * 篩選並分析所有候選股票
 */
async function screenStocks() {
  console.log('🔍 開始篩選股票...');
  const results = [];

  // 並行處理所有候選股票（每批 5 個，避免 API 過載）
  const batchSize = 5;
  for (let i = 0; i < CANDIDATE_STOCKS.length; i += batchSize) {
    const batch = CANDIDATE_STOCKS.slice(i, i + batchSize);
    const batchPromises = batch.map(async (stockId) => {
      try {
        // 並行抓取所有資料
        const [stockData, stockInfo, dividendData, financialData] = await Promise.all([
          fetchStockPrice(stockId),
          fetchStockInfo(stockId),
          fetchStockDividend(stockId),
          fetchStockFinancials(stockId)
        ]);

        if (!stockData || stockData.length < 60) {
          console.log(`⚠️ ${stockId} 資料不足，跳過`);
          return null;
        }

        const latestPrice = stockData[stockData.length - 1].close;

        // 價格篩選：5萬元至少能買 100 股（1張）
        // 上限 500 元（5萬可買 1 張）
        if (latestPrice > 500) {
          console.log(`⚠️ ${stockId} 股價 ${latestPrice} 超過 500 元，跳過`);
          return null;
        }

        // 技術面分析
        const technicalAnalysis = await analyzeStockTechnicals(stockId, stockData);

        // 基本面分析
        const fundamentalAnalysis = await analyzeStockFundamentals(
          stockId, financialData, dividendData, latestPrice
        );

        // 綜合評分（技術面 60%、基本面 40%）
        const totalScore = technicalAnalysis.score * 0.6 + fundamentalAnalysis.score * 0.4;

        return {
          stockId,
          stockName: stockInfo?.stock_name || stockId,
          latestPrice,
          latestDate: stockData[stockData.length - 1].date,
          technicalAnalysis,
          fundamentalAnalysis,
          totalScore
        };
      } catch (error) {
        console.warn(`⚠️ 分析 ${stockId} 失敗:`, error.message);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(r => r !== null));

    // 批次間延遲，避免 API 過載
    if (i + batchSize < CANDIDATE_STOCKS.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 按綜合評分排序
  results.sort((a, b) => b.totalScore - a.totalScore);

  console.log(`✅ 篩選完成，共 ${results.length} 檔股票`);
  return results;
}

/**
 * 使用 DeepSeek AI 生成最終推薦
 */
async function generateAIRecommendation(topStocks) {
  const stockSummaries = topStocks.map((stock, index) => {
    // 安全取值，確保是數字
    const kValue = typeof stock.technicalAnalysis.K === 'number' ? stock.technicalAnalysis.K.toFixed(1) : 'N/A';
    const dValue = typeof stock.technicalAnalysis.D === 'number' ? stock.technicalAnalysis.D.toFixed(1) : 'N/A';
    const epsValue = typeof stock.fundamentalAnalysis.eps === 'number' ? stock.fundamentalAnalysis.eps.toFixed(2) : '0.00';
    const totalScoreValue = typeof stock.totalScore === 'number' ? stock.totalScore.toFixed(1) : '0.0';

    return `
【第 ${index + 1} 名】${stock.stockName}（${stock.stockId}）
- 股價：${stock.latestPrice} 元
- 技術面評分：${stock.technicalAnalysis.score}/100
  - KD：${stock.technicalAnalysis.kdSignal}（K=${kValue}, D=${dValue}）
  - MACD：${stock.technicalAnalysis.macdSignal}
  - 均線：${stock.technicalAnalysis.priceAboveMA ? '站上 MA20' : '跌破 MA20'}
- 基本面評分：${stock.fundamentalAnalysis.score}/100
  - EPS：${epsValue} 元
  - 本益比：${stock.fundamentalAnalysis.peRatio || 'N/A'}
  - 現金股利：${stock.fundamentalAnalysis.cashDividend} 元
  - 殖利率：${stock.fundamentalAnalysis.yieldRate || 'N/A'}%
- 綜合評分：${totalScoreValue}/100
    `;
  }).join('\n');

  const prompt = `
你是一位資深投資顧問，專門為小資族（本金 5 萬元）提供投資建議。

以下是今日篩選出的 TOP 3 候選股票：
${stockSummaries}

請為每檔股票提供：
1. 推薦理由（30字內，技術面+基本面綜合）
2. 15日目標價（根據技術面計算合理目標）
3. 建議買入價位（回檔到哪個價位可以買）
4. 風險提示（30字內，主要風險）
5. 信心指數（1-10分）
6. 適合投資金額（以5萬元為基準，建議分配）

請以 JSON 格式回覆：
{
  "recommendations": [
    {
      "rank": 1,
      "stockId": "股票代號",
      "stockName": "股票名稱",
      "reason": "推薦理由",
      "targetPrice": 目標價數字,
      "buyPrice": 建議買入價數字,
      "risk": "風險提示",
      "confidence": 信心指數數字,
      "suggestedAmount": 建議投資金額數字,
      "expectedReturn": "預期報酬率"
    }
  ],
  "marketOutlook": "整體市場觀點（50字內）",
  "investmentStrategy": "投資策略建議（50字內）"
}
`;

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是專業的投資顧問，為小資族提供務實、保守但有成長潛力的投資建議。分析要專業但易懂，避免過度樂觀。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ AI 推薦生成失敗:', error.message);
    // 返回基本推薦（無 AI 分析）
    return {
      recommendations: topStocks.map((stock, index) => ({
        rank: index + 1,
        stockId: stock.stockId,
        stockName: stock.stockName,
        reason: `技術面評分 ${stock.technicalAnalysis.score}，基本面評分 ${stock.fundamentalAnalysis.score}`,
        targetPrice: Math.round(stock.latestPrice * 1.08),
        buyPrice: Math.round(stock.latestPrice * 0.97),
        risk: '市場波動風險',
        confidence: Math.round(stock.totalScore / 10),
        suggestedAmount: Math.round(50000 / 3),
        expectedReturn: '+5-10%'
      })),
      marketOutlook: '市場觀望中，建議分批布局',
      investmentStrategy: '分散投資，設定停損停利'
    };
  }
}

/**
 * 主函數：取得今日推薦
 */
async function getTodayRecommendation() {
  console.log('🚀 開始生成今日推薦...');
  const startTime = Date.now();

  try {
    // 1. 篩選股票
    const screenedStocks = await screenStocks();

    if (screenedStocks.length === 0) {
      throw new Error('無符合條件的股票');
    }

    // 2. 取得 TOP 3
    const top3 = screenedStocks.slice(0, 3);
    console.log('📊 TOP 3 股票:', top3.map(s => `${s.stockName}(${s.stockId}): ${s.totalScore.toFixed(1)}分`).join(', '));

    // 3. AI 生成最終推薦
    const aiRecommendation = await generateAIRecommendation(top3);

    // 4. 整合結果
    const result = {
      date: moment().format('YYYY-MM-DD'),
      updateTime: moment().format('HH:mm'),
      top3Stocks: top3,
      aiRecommendation,
      processingTime: Date.now() - startTime
    };

    console.log(`✅ 今日推薦生成完成，耗時 ${result.processingTime}ms`);
    return result;
  } catch (error) {
    console.error('❌ 今日推薦生成失敗:', error.message);
    throw error;
  }
}

module.exports = {
  getTodayRecommendation,
  screenStocks,
  CANDIDATE_STOCKS
};

