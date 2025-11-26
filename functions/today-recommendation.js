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

  // ============================================
  // 技術面評分（重新設計，更嚴格）
  // 基礎分 40，滿分需要多項條件同時滿足
  // ============================================
  let technicalScore = 40;

  // 1. KD 指標評分（-15 ~ +20）
  const kdAnalysis = analyzeKD(kdResult.K, kdResult.D);
  if (kdAnalysis.signal === '黃金交叉') {
    technicalScore += 20; // 最佳買點
  } else if (kdAnalysis.signal === '多頭') {
    technicalScore += 12;
  } else if (kdAnalysis.signal === '準備上攻') {
    technicalScore += 8;
  } else if (kdAnalysis.signal === '整理') {
    technicalScore += 0; // 不加分
  } else if (kdAnalysis.signal === '死亡交叉') {
    technicalScore -= 15;
  } else if (kdAnalysis.signal === '空頭') {
    technicalScore -= 10;
  }

  // 2. KD 位置風險調整（-15 ~ +8）
  if (latestK > 85) {
    technicalScore -= 15; // 嚴重超買，風險高
  } else if (latestK > 75) {
    technicalScore -= 8; // 超買區
  } else if (latestK < 20) {
    technicalScore += 8; // 超賣區，潛在反彈
  } else if (latestK < 30) {
    technicalScore += 5;
  }

  // 3. MACD 指標評分（-15 ~ +15）
  const macdAnalysis = analyzeMACDSignal(macdResult.MACD, macdResult.Signal, macdResult.Histogram);
  if (macdAnalysis.signal === '強勢多頭') {
    technicalScore += 15;
  } else if (macdAnalysis.signal === '多頭') {
    technicalScore += 10;
  } else if (macdAnalysis.signal === '轉強') {
    technicalScore += 8;
  } else if (macdAnalysis.signal === '整理') {
    technicalScore += 0;
  } else if (macdAnalysis.signal === '轉弱') {
    technicalScore -= 5;
  } else if (macdAnalysis.signal === '空頭') {
    technicalScore -= 10;
  } else if (macdAnalysis.signal === '強勢空頭') {
    technicalScore -= 15;
  }

  // 4. 均線評分（-15 ~ +15）
  if (ma5 && ma20 && ma60) {
    if (latestPrice > ma5 && ma5 > ma20 && ma20 > ma60) {
      technicalScore += 15; // 完美多頭排列
    } else if (latestPrice > ma5 && ma5 > ma20) {
      technicalScore += 10;
    } else if (latestPrice > ma20) {
      technicalScore += 5;
    } else if (latestPrice < ma5 && latestPrice > ma20) {
      technicalScore -= 3; // 跌破短均
    } else if (latestPrice < ma20 && latestPrice > ma60) {
      technicalScore -= 8; // 跌破中均
    } else if (latestPrice < ma5 && ma5 < ma20 && ma20 < ma60) {
      technicalScore -= 15; // 空頭排列
    }
  }

  // 5. 成交量評分（-5 ~ +10）
  const recentVolumes = stockData.slice(-5).map(d => d.Trading_Volume);
  const avgVolume20 = stockData.slice(-20).map(d => d.Trading_Volume).reduce((a, b) => a + b, 0) / 20;
  const avgVolume5 = recentVolumes.reduce((a, b) => a + b, 0) / 5;

  if (avgVolume5 > avgVolume20 * 2) {
    technicalScore += 10; // 爆量，關注
  } else if (avgVolume5 > avgVolume20 * 1.3) {
    technicalScore += 6;
  } else if (avgVolume5 < avgVolume20 * 0.5) {
    technicalScore -= 5; // 量縮，觀望
  }

  // 6. 近期漲跌幅風險調整（防止追高）
  const price5DaysAgo = closes[closes.length - 6] || closes[0];
  const recentGain = ((latestPrice - price5DaysAgo) / price5DaysAgo) * 100;
  if (recentGain > 15) {
    technicalScore -= 12; // 短期漲幅過大，追高風險
  } else if (recentGain > 10) {
    technicalScore -= 8;
  } else if (recentGain > 5) {
    technicalScore -= 3;
  } else if (recentGain < -10) {
    technicalScore += 5; // 超跌，可能反彈
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
 * 分析單一股票的基本面（重新設計，更嚴格）
 */
async function analyzeStockFundamentals(stockId, financialData, dividendData, latestPrice) {
  // ============================================
  // 基本面評分（重新設計）
  // 基礎分 35，需多項條件才能高分
  // ============================================
  let fundamentalScore = 35;
  let hasFinancialData = false;

  // 1. 本益比評分（-10 ~ +20）
  if (financialData && financialData.total_eps > 0) {
    hasFinancialData = true;
    const eps = financialData.total_eps;
    const peRatio = latestPrice / eps;

    if (peRatio > 0 && peRatio < 8) {
      fundamentalScore += 20; // 極低本益比（可能有風險或被低估）
    } else if (peRatio >= 8 && peRatio < 12) {
      fundamentalScore += 15; // 便宜
    } else if (peRatio >= 12 && peRatio < 16) {
      fundamentalScore += 10; // 合理
    } else if (peRatio >= 16 && peRatio < 20) {
      fundamentalScore += 5; // 稍高
    } else if (peRatio >= 20 && peRatio < 30) {
      fundamentalScore += 0; // 偏高
    } else if (peRatio >= 30) {
      fundamentalScore -= 10; // 過高
    }

    // 2. EPS 絕對值評分（0 ~ +15）
    if (eps > 5) {
      fundamentalScore += 15;
    } else if (eps > 3) {
      fundamentalScore += 10;
    } else if (eps > 1.5) {
      fundamentalScore += 5;
    } else if (eps > 0) {
      fundamentalScore += 2;
    }
  } else {
    // 無財報資料（ETF 等）扣分
    fundamentalScore -= 5;
  }

  // 3. 殖利率評分（0 ~ +15）
  if (dividendData && dividendData.cash_dividend > 0) {
    const yieldRate = (dividendData.cash_dividend / latestPrice) * 100;
    if (yieldRate > 7) {
      fundamentalScore += 15; // 超高殖利率
    } else if (yieldRate > 5) {
      fundamentalScore += 12;
    } else if (yieldRate > 4) {
      fundamentalScore += 10;
    } else if (yieldRate > 3) {
      fundamentalScore += 7;
    } else if (yieldRate > 2) {
      fundamentalScore += 4;
    }
  } else {
    // 無股利資料扣分
    fundamentalScore -= 3;
  }

  // 4. 產業風險調整（金融股/傳產/電子不同風險）
  // 這裡可以根據股票代號做產業分類調整
  // 暫時不做，保持中性

  // 5. 流動性風險（高價股風險）
  if (latestPrice > 400) {
    fundamentalScore -= 5; // 高價股，5萬元能買的張數少
  } else if (latestPrice > 300) {
    fundamentalScore -= 3;
  } else if (latestPrice < 30) {
    fundamentalScore -= 8; // 雞蛋水餃股風險
  }

  return {
    score: Math.min(100, Math.max(0, fundamentalScore)),
    eps: financialData?.total_eps || 0,
    peRatio: financialData?.total_eps > 0 ? (latestPrice / financialData.total_eps).toFixed(2) : null,
    cashDividend: dividendData?.cash_dividend || 0,
    yieldRate: dividendData?.cash_dividend > 0 ? ((dividendData.cash_dividend / latestPrice) * 100).toFixed(2) : null,
    hasFinancialData
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
你是一位謹慎保守的投資顧問，專門為股市新手（本金 5 萬元）提供務實建議。

重要原則：
- 股市有風險，沒有「必賺」的投資
- 15天是短期，波動風險大
- 信心指數要誠實，不要過度樂觀
- 技術面評分 70 以下表示趨勢不明確
- 基本面評分 60 以下表示價值一般

以下是今日篩選出的 TOP 3 候選股票：
${stockSummaries}

請根據以下標準給出信心指數：
- 9-10分：技術面+基本面都 > 80，極度看好（非常罕見）
- 7-8分：綜合評分 > 70，趨勢明確
- 5-6分：綜合評分 50-70，中性觀望
- 3-4分：綜合評分 < 50，建議觀望
- 1-2分：不建議買入

請為每檔股票提供：
1. 推薦理由（30字內，技術面+基本面綜合，要誠實說明優缺點）
2. 15日目標價（保守估計，漲幅不超過 5-8%）
3. 建議買入價位（回檔 2-3% 再買）
4. 風險提示（30字內，主要風險）
5. 信心指數（1-10分，要合理！）
6. 適合投資金額（以5萬元為基準，分散風險）

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
  "marketOutlook": "整體市場觀點（50字內，要誠實）",
  "investmentStrategy": "投資策略建議（50字內，強調風險控制）"
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
            content: '你是謹慎保守的投資顧問。信心指數要誠實合理（一般股票 5-7 分，很少超過 8 分）。不要過度樂觀，要強調風險。目標價漲幅通常 3-6%，最高不超過 8%。'
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

