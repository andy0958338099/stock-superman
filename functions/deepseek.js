/**
 * DeepSeek AI Analysis Module
 * 使用 DeepSeek API 進行股票走勢分析與預測
 */

const axios = require('axios');
const { calculateKD, calculateMACD, calculateMA, analyzeKD, analyzeMACDSignal } = require('./indicators');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

// Retry 設定
const MAX_RETRIES = 1; // 美股分析 prompt 較長，只重試 1 次避免超時
const INITIAL_RETRY_DELAY = 1000; // 1 秒（加快重試速度）

/**
 * 延遲函數
 * @param {number} ms - 延遲毫秒數
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 帶有 exponential backoff 的 retry 機制（針對 AI API）
 * @param {Function} fn - 要執行的異步函數
 * @param {number} maxRetries - 最大重試次數
 * @param {string} operationName - 操作名稱（用於日誌）
 * @returns {Promise<any>} - 函數執行結果
 */
async function retryWithBackoff(fn, maxRetries = MAX_RETRIES, operationName = 'AI API request') {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 如果是最後一次嘗試，直接拋出錯誤
      if (attempt === maxRetries) {
        console.error(`❌ ${operationName} 失敗（已重試 ${maxRetries} 次）:`, error.message);
        throw error;
      }

      // 計算延遲時間（exponential backoff）
      const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);

      // 判斷是否應該重試
      const shouldRetry =
        error.code === 'ECONNABORTED' || // 超時
        error.code === 'ENOTFOUND' ||    // DNS 錯誤
        error.code === 'ECONNRESET' ||   // 連線重置
        (error.response && error.response.status >= 500) || // 伺服器錯誤
        (error.response && error.response.status === 429);   // 頻率限制

      if (!shouldRetry) {
        console.error(`❌ ${operationName} 失敗（不可重試的錯誤）:`, error.message);
        throw error;
      }

      console.warn(`⚠️ ${operationName} 失敗（第 ${attempt}/${maxRetries} 次），${delayMs}ms 後重試...`);
      await delay(delayMs);
    }
  }

  throw lastError;
}

/**
 * 使用 DeepSeek 分析股票未來 10 天走勢
 * @param {string} stockId - 股票代號
 * @param {Array} rawData - 原始股價資料（至少 30 天）
 * @param {string} stockName - 股票名稱
 * @returns {Promise<object>} - AI 分析結果
 */
async function analyzeWithDeepSeek(stockId, rawData, stockName = '') {
  try {
    if (!DEEPSEEK_API_KEY) {
      console.warn('⚠️ DeepSeek API Key 未設定，跳過 AI 分析');
      return null;
    }

    console.log(`🤖 開始 DeepSeek AI 分析：${stockId}`);

    // 取最近 40 天資料進行分析
    const recentData = rawData.slice(-40);
    
    // 計算技術指標
    const close = recentData.map(d => d.close);
    const { K, D } = calculateKD(recentData);
    const { MACD, Signal, Histogram } = calculateMACD(recentData);
    const ma5 = calculateMA(close, 5);
    const ma20 = calculateMA(close, 20);
    const ma60 = calculateMA(close, 60);
    
    // 取得最新數據
    const latest = recentData[recentData.length - 1];
    const kdAnalysis = analyzeKD(K, D);
    const macdAnalysis = analyzeMACDSignal(MACD, Signal, Histogram);
    
    // 建立分析用的資料摘要
    const dataSummary = recentData.slice(-10).map((d, i) => {
      const idx = recentData.length - 10 + i;
      return `${d.date}: 收${d.close}, K=${K[idx]?.toFixed(1)}, D=${D[idx]?.toFixed(1)}, MACD=${MACD[idx]?.toFixed(2)}`;
    }).join('\n');
    
    // 建立 AI Prompt
    const prompt = `你是一位專業的台股技術分析師。請根據以下資料，分析股票未來 10 個交易日的走勢。

【股票資訊】
代號：${stockId}
名稱：${stockName || stockId}
最新日期：${latest.date}
最新收盤價：${latest.close}

【最近 10 日資料】
${dataSummary}

【技術指標現況】
• KD 指標：K=${kdAnalysis.K}, D=${kdAnalysis.D}
  狀態：${kdAnalysis.signal} - ${kdAnalysis.description}

• MACD 指標：MACD=${macdAnalysis.MACD}, Signal=${macdAnalysis.Signal}, Histogram=${macdAnalysis.Histogram}
  狀態：${macdAnalysis.signal} - ${macdAnalysis.description}

• 均線：MA5=${ma5[ma5.length-1]?.toFixed(2)}, MA20=${ma20[ma20.length-1]?.toFixed(2)}, MA60=${ma60[ma60.length-1]?.toFixed(2)}

【分析要求】
請以 JSON 格式回覆，包含以下欄位：
{
  "probability_up": 未來10日上漲機率(0-100),
  "probability_flat": 未來10日持平機率(0-100),
  "probability_down": 未來10日下跌機率(0-100),
  "support_levels": [支撐價位1, 支撐價位2, 支撐價位3],
  "resistance_levels": [壓力價位1, 壓力價位2, 壓力價位3],
  "reasons": ["理由1", "理由2", "理由3", "理由4", "理由5"],
  "recommendation": "watch|buy|avoid",
  "explanation": "建議說明（50字內）",
  "trend_summary": "趨勢總結（30字內）"
}

注意事項：
1. 僅根據提供的技術指標數據分析，不要提及外部消息或基本面
2. 保守評估，避免過度樂觀或悲觀
3. 支撐壓力位要合理（接近當前價格）
4. 理由要具體提及技術指標的訊號
5. 三個機率總和必須為 100`;

    // 呼叫 DeepSeek API（帶 retry）
    const result = await retryWithBackoff(async () => {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一位專業的台股技術分析師，擅長使用 KD、MACD、均線等技術指標進行短期走勢預測。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000  // 🚀 優化：從 30 秒降至 15 秒（DeepSeek 通常 3-8 秒響應）
        }
      );

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('DeepSeek API 回應格式錯誤');
      }

      const content = response.data.choices[0].message.content;
      return JSON.parse(content);
    }, MAX_RETRIES, `DeepSeek 分析 ${stockId}`);

    console.log('✅ DeepSeek 分析完成');
    console.log(`   趨勢：UP ${result.probability_up}% / FLAT ${result.probability_flat}% / DOWN ${result.probability_down}%`);
    console.log(`   建議：${result.recommendation}`);

    return {
      ...result,
      timestamp: new Date().toISOString(),
      model: 'deepseek-chat'
    };

  } catch (error) {
    if (error.response) {
      console.error('DeepSeek API 錯誤:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('DeepSeek API 無回應:', error.message);
    } else {
      console.error('DeepSeek 錯誤:', error.message);
    }
    
    // 回傳 null 而非拋出錯誤，讓主流程可以繼續
    return null;
  }
}

/**
 * 使用 DeepSeek 進行美股跨市場分析
 * @param {object} marketData - 包含美股、台股、匯率、VIX 等資料
 * @returns {Promise<object>} - AI 跨市場分析結果
 */
async function analyzeUSMarketWithDeepSeek(marketData) {
  try {
    if (!DEEPSEEK_API_KEY) {
      console.warn('⚠️ DeepSeek API Key 未設定，跳過 AI 分析');
      return null;
    }

    console.log('🤖 開始 DeepSeek 美股跨市場分析...');

    const { sp500, nasdaq, tsmAdr, twii, usdTwd, vix } = marketData;

    // 建立 AI Prompt（極簡版：只保留核心數據，大幅減少 token）
    const prompt = `跨市場分析師，分析美股→台股。

【數據】
台股：${twii.price} (${twii.trend}, KD=${twii.kd.K}/${twii.kd.D})
S&P：${sp500.price} (${sp500.trend}, KD=${sp500.kd.K}/${sp500.kd.D})
NASDAQ：${nasdaq.price} (${nasdaq.trend}, KD=${nasdaq.kd.K}/${nasdaq.kd.D})
TSM ADR：${tsmAdr.price} (${tsmAdr.trend}, KD=${tsmAdr.kd.K}/${tsmAdr.kd.D})
VIX：${vix.close}
匯率：${usdTwd.rate}

【JSON 回覆】
{
  "us_market_status": "多頭|空頭|盤整",
  "us_market_summary": "美股總結（40字）",
  "tw_market_status": "多頭|空頭|盤整",
  "tw_market_summary": "台股總結（40字）",
  "transmission_analysis": {
    "index_to_tw_weights": "指數→權值（40字）",
    "tech_to_semiconductor": "科技→半導體（40字）",
    "risk_to_capital": "風險→資金（40字）",
    "futures_to_gap": "期貨→跳空（40字）"
  },
  "sector_impact": {
    "positive": ["類股1", "類股2"],
    "negative": ["類股1"],
    "potential_stocks": "潛在個股（30字）"
  },
  "correlation_score": 0-100,
  "correlation_analysis": "連動分析（30字）",
  "forecast": {
    "short_term_1_3days": {
      "direction": "偏多|偏空|震盪",
      "probability": 0-100,
      "scenario": "情境（40字）",
      "trigger_condition": "觸發條件（30字）"
    },
    "mid_term_1week": {
      "direction": "偏多|偏空|震盪",
      "probability": 0-100,
      "reason": "理由（30字）"
    }
  },
  "strategy": "多頭|空頭|等待|區間",
  "key_levels": "關鍵價位（30字）",
  "watch_sectors": ["類股1", "類股2"],
  "risk_factors": ["風險1", "風險2"],
  "action_plan": "操作建議（60字）",
  "opportunity_alert": "機會（30字）",
  "risk_alert": "風險（30字）"
}

要求：機率輸出、情境分析、市場動機語氣`;

    // 呼叫 DeepSeek API（帶 retry）
    const result = await retryWithBackoff(async () => {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '跨市場量化分析師，分析美股→台股傳導。要求：1)傳導鏈分析 2)類股影響 3)機率輸出 4)市場動機語氣'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,  // 🚀 優化：從 0.7 降至 0.5，減少隨機性，加快生成
          max_tokens: 1200,  // 🚀 優化：從 1500 降至 1200，進一步加快響應
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000  // 🚀 優化：從 25 秒降至 20 秒，更快失敗觸發 fallback
        }
      );

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('DeepSeek API 回應格式錯誤');
      }

      const content = response.data.choices[0].message.content;
      return JSON.parse(content);
    }, MAX_RETRIES, 'DeepSeek 美股分析');

    console.log('✅ DeepSeek 美股分析完成');
    console.log(`   美股狀態：${result.us_market_status}`);
    console.log(`   台股狀態：${result.tw_market_status}`);
    console.log(`   連動性：${result.correlation_score}分`);
    console.log(`   策略：${result.strategy}`);

    return {
      ...result,
      timestamp: new Date().toISOString(),
      model: 'deepseek-chat'
    };

  } catch (error) {
    if (error.response) {
      console.error('❌ DeepSeek API 錯誤:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ DeepSeek API 無回應（可能超時）:', error.message);
    } else {
      console.error('❌ DeepSeek 錯誤:', error.message);
    }

    // 🚀 優化：返回簡化版分析，避免完全失敗
    console.log('⚠️ 返回簡化版美股分析（AI 分析失敗）');
    return generateFallbackUSMarketAnalysis(marketData);
  }
}

/**
 * 生成簡化版美股分析（當 AI 失敗時使用）
 * @param {object} marketData - 市場數據
 * @returns {object} - 簡化版分析結果
 */
function generateFallbackUSMarketAnalysis(marketData) {
  const { sp500, nasdaq, tsmAdr, twii, usdTwd, vix } = marketData;

  // 簡單判斷趨勢
  const usStatus = (sp500.trend === '多頭' && nasdaq.trend === '多頭') ? '多頭' :
                   (sp500.trend === '空頭' && nasdaq.trend === '空頭') ? '空頭' : '盤整';
  const twStatus = twii.trend;

  // 計算連動分數（基於趨勢一致性）
  const correlationScore = (usStatus === twStatus) ? 75 : 50;

  // 判斷短線方向
  const shortDirection = (usStatus === '多頭') ? '偏多' : (usStatus === '空頭') ? '偏空' : '震盪';
  const shortProbability = (usStatus === '多頭' || usStatus === '空頭') ? 60 : 50;

  return {
    us_market_status: usStatus,
    us_market_summary: `S&P ${sp500.trend}、NASDAQ ${nasdaq.trend}，VIX ${vix.close}`,
    tw_market_status: twStatus,
    tw_market_summary: `台股 ${twii.trend}，指數 ${twii.price}`,
    correlation_score: correlationScore,
    correlation_analysis: `美台市場${usStatus === twStatus ? '同步' : '分歧'}，連動性${correlationScore > 60 ? '較高' : '中等'}`,
    transmission_analysis: {
      index_to_tw_weights: usStatus === '多頭' ? '美股指數走強，外資買盤增加，台股權值股受惠' : '美股指數走弱，外資賣壓增加，台股權值股承壓',
      tech_to_semiconductor: tsmAdr.trend === '多頭' ? 'TSM ADR 走強，台積電供應鏈受惠，半導體族群偏多' : 'TSM ADR 走弱，半導體族群承壓',
      risk_to_capital: vix.close < 20 ? 'VIX 低於 20，市場風險偏好提升，資金回流新興市場' : 'VIX 高於 20，避險情緒升溫，資金轉向防禦',
      futures_to_gap: usStatus === '多頭' ? '美股期貨偏強，台股明日高開機率提高' : '美股期貨偏弱，台股明日低開機率提高'
    },
    sector_impact: {
      positive: usStatus === '多頭' ? ['半導體', '電子'] : ['金融', '傳產'],
      negative: usStatus === '多頭' ? ['高殖利率股'] : ['電子', '半導體'],
      potential_stocks: usStatus === '多頭' ? '台積電、聯發科等科技龍頭' : '金融股、傳產股'
    },
    forecast: {
      short_term_1_3days: {
        direction: shortDirection,
        probability: shortProbability,
        scenario: `美股${usStatus}，台股短線${shortDirection}機率${shortProbability}%`,
        trigger_condition: '關注美股盤後走勢與台指期夜盤'
      },
      mid_term_1week: {
        direction: '震盪',
        probability: 55,
        reason: '等待更多市場訊號'
      }
      // 🚀 移除 swing_10days，減少生成內容
    },
    strategy: usStatus === '多頭' ? '多頭策略' : usStatus === '空頭' ? '空頭策略' : '等待策略',
    key_levels: '關注台指 18500 支撐與 18800 壓力',
    watch_sectors: ['半導體', '電子', '金融'],
    risk_factors: ['美股波動', '外資動向', '匯率變化'],
    action_plan: `美股${usStatus}，建議${usStatus === '多頭' ? '偏多操作' : usStatus === '空頭' ? '偏空操作' : '觀望為主'}，注意風險控管`,
    opportunity_alert: usStatus === '多頭' ? '美股走強，台股補漲機會' : '市場震盪，等待明確訊號',
    risk_alert: usStatus === '空頭' ? '美股走弱，留意台股回檔風險' : 'VIX 波動，注意風險控管'
  };
}

/**
 * 財經新聞分析（財經專家角色）
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {string} newsContent - 新聞內容
 * @returns {Promise<string>} - 分析結果
 */
async function analyzeFinancialNews(stockId, stockName, newsContent) {
  try {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API Key 未設定');
    }

    console.log(`🤖 DeepSeek 財經新聞分析：${stockId}`);

    const prompt = `你是一位資深財經專家，以下是關於 ${stockName}(${stockId}) 的 6 則最新新聞：

${newsContent}

請以財經專家的角度分析這些新聞，給予唯恐天下不亂但不違背事實的結論。

要求：
1. 分析新聞對股價的潛在影響（正面/負面/中性）
2. 指出關鍵風險和機會
3. 語氣要有衝擊力但基於事實
4. 結論要明確且有態度
5. 字數控制在 300 字內

請直接輸出分析內容，不要使用 JSON 格式。`;

    const result = await retryWithBackoff(async () => {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一位資深財經專家，擅長從新聞中洞察股市機會與風險，語氣犀利但基於事實。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('DeepSeek API 回應格式錯誤');
      }

      return response.data.choices[0].message.content;
    }, MAX_RETRIES, `DeepSeek 財經新聞分析 ${stockId}`);

    console.log('✅ DeepSeek 財經新聞分析完成');
    return result;

  } catch (error) {
    console.error('❌ DeepSeek 財經新聞分析失敗:', error.message);
    throw error;
  }
}

/**
 * 政治新聞分析（政治評論員角色）
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {string} industry - 產業類別
 * @param {string} politicalNews - 政治新聞內容
 * @returns {Promise<string>} - 分析結果
 */
async function analyzePoliticalNews(stockId, stockName, industry, politicalNews) {
  try {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API Key 未設定');
    }

    console.log(`🤖 DeepSeek 政治新聞分析：${stockId}`);

    const prompt = `你是一位犀利的政治評論員，以下是關於 ${industry} 產業的 6 則國際情勢新聞：

${politicalNews}

請以政治評論員的角度分析這些新聞對 ${stockName}(${stockId}) 的影響，給予語不驚人死不休但不違背事實的結論。

要求：
1. 分析國際政治對產業的影響
2. 指出地緣政治風險
3. 語氣要犀利但基於事實
4. 結論要有洞察力
5. 字數控制在 300 字內

請直接輸出分析內容，不要使用 JSON 格式。`;

    const result = await retryWithBackoff(async () => {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一位犀利的政治評論員，擅長分析國際情勢對產業的影響，語不驚人死不休但不違背事實。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('DeepSeek API 回應格式錯誤');
      }

      return response.data.choices[0].message.content;
    }, MAX_RETRIES, `DeepSeek 政治新聞分析 ${stockId}`);

    console.log('✅ DeepSeek 政治新聞分析完成');
    return result;

  } catch (error) {
    console.error('❌ DeepSeek 政治新聞分析失敗:', error.message);
    throw error;
  }
}

/**
 * 美股關聯分析（美股狂熱評論員角色）
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {object} usMarketData - 美股市場數據
 * @returns {Promise<string>} - 分析結果
 */
async function analyzeUSMarketRelation(stockId, stockName, usMarketData) {
  try {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API Key 未設定');
    }

    console.log(`🤖 DeepSeek 美股關聯分析：${stockId}`);

    const prompt = `你是一位美股狂熱評論員，以下是美股市場數據：

【美股市場狀態】
${JSON.stringify(usMarketData, null, 2)}

請分析美股市場與 ${stockName}(${stockId}) 的關聯性。

要求：
1. 分析美股走勢對該股票的影響
2. 指出相關產業鏈的連動
3. 語氣要熱情但基於數據
4. 結論要有前瞻性
5. 字數控制在 300 字內

請直接輸出分析內容，不要使用 JSON 格式。`;

    const result = await retryWithBackoff(async () => {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一位美股狂熱評論員，擅長分析美股與台股的連動關係，語氣熱情但基於數據。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('DeepSeek API 回應格式錯誤');
      }

      return response.data.choices[0].message.content;
    }, MAX_RETRIES, `DeepSeek 美股關聯分析 ${stockId}`);

    console.log('✅ DeepSeek 美股關聯分析完成');
    return result;

  } catch (error) {
    console.error('❌ DeepSeek 美股關聯分析失敗:', error.message);
    throw error;
  }
}

/**
 * 用戶論點分析（中性質疑者角色）
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {string} userOpinion - 用戶看法
 * @param {Array} discussionHistory - 討論歷史
 * @returns {Promise<string>} - 分析結果
 */
async function analyzeUserOpinion(stockId, stockName, userOpinion, discussionHistory = []) {
  try {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API Key 未設定');
    }

    // 計算當前是第幾輪討論（從 1 開始）
    const currentRound = discussionHistory.length + 1;
    console.log(`🤖 DeepSeek 用戶論點分析：${stockId} - 第 ${currentRound} 輪`);

    // 建立討論歷史上下文
    let historyContext = '';
    if (discussionHistory.length > 0) {
      historyContext = '\n\n【先前討論記錄】\n' +
        discussionHistory.map((h, i) =>
          `第 ${i + 1} 輪：\n用戶觀點：${h.user}\n您的回應：${h.ai}`
        ).join('\n\n');
    }

    // 根據輪次設計不同的角色和任務
    const roundStrategies = {
      1: {
        role: '資深股市營業員（傾聽者）',
        systemPrompt: '你是一位擁有 20 年經驗的頂級股市營業員，現在扮演「傾聽者」角色。你的任務是理解客戶的核心論點，找出他的關鍵假設，並用溫和的方式探索他的想法。',
        task: `【第 1 輪：初步看法 - 理解與探索】

用戶對 ${stockName}(${stockId}) 的初步看法：
"${userOpinion}"

請執行以下任務：
1. **重述論點**：用一句話總結用戶的核心觀點
2. **找出關鍵假設**：他的論點基於哪些假設？（例如：產業趨勢、公司競爭力、市場情緒）
3. **探索性提問**：提出 2-3 個開放性問題，引導他深入思考

語氣：溫和、專業、探索性
字數：200-250 字
格式：直接輸出分析內容，不要使用 JSON`,
        temperature: 0.7
      },
      2: {
        role: '資深股市營業員（風險顧問）',
        systemPrompt: '你是一位擁有 20 年經驗的頂級股市營業員，現在扮演「風險顧問」角色。你見過太多投資者因為忽略風險而虧損，你的任務是犀利地挑戰用戶的風險評估，提出可能被忽略的風險。',
        task: `【第 2 輪：風險評估 - 挑戰與質疑】

用戶對 ${stockName}(${stockId}) 的風險評估：
"${userOpinion}"
${historyContext}

請執行以下任務：
1. **風險盲點**：指出用戶可能忽略的 2-3 個重要風險（產業風險、公司風險、市場風險、政策風險）
2. **反面證據**：提出可能與用戶風險評估相反的證據或歷史案例
3. **最壞情境**：如果最壞的情況發生，可能的損失是多少？如何應對？

語氣：犀利、批判性，但不失專業
字數：250-300 字
格式：直接輸出分析內容，不要使用 JSON`,
        temperature: 0.8
      },
      3: {
        role: '資深股市營業員（機會分析師）',
        systemPrompt: '你是一位擁有 20 年經驗的頂級股市營業員，現在扮演「機會分析師」角色。你的任務是引導用戶看到潛在機會，提供新的視角，幫助他發現被忽略的成長動能。',
        task: `【第 3 輪：機會分析 - 引導與啟發】

用戶對 ${stockName}(${stockId}) 的機會分析：
"${userOpinion}"
${historyContext}

請執行以下任務：
1. **機會盲點**：指出用戶可能忽略的 2-3 個潛在機會（新產品、新市場、產業趨勢、技術突破）
2. **新視角**：提供一個用戶可能沒想到的機會角度（例如：產業鏈上下游、國際擴張、併購整合）
3. **催化劑**：列出 3 個可能觸發股價上漲的關鍵催化劑和時間點

語氣：啟發性、引導性，像一位良師
字數：250-300 字
格式：直接輸出分析內容，不要使用 JSON`,
        temperature: 0.75
      },
      4: {
        role: '資深股市營業員（策略教練）',
        systemPrompt: '你是一位擁有 20 年經驗的頂級股市營業員，現在扮演「策略教練」角色。你的任務是評估用戶的進出場策略，提供優化建議，確保策略的可執行性和風險控管。',
        task: `【第 4 輪：進出場策略 - 策略優化】

用戶對 ${stockName}(${stockId}) 的進出場策略：
"${userOpinion}"
${historyContext}

請執行以下任務：
1. **策略評估**：評估用戶的進場價位、停損點、目標價是否合理？
2. **優化建議**：提供 2-3 個策略優化建議（例如：分批進場、動態停損、加碼條件）
3. **執行計畫**：建議具體的執行步驟和時間表
4. **風險控管**：建議持倉比例和資金管理策略

語氣：專業、實用、可執行
字數：300-350 字
格式：直接輸出分析內容，不要使用 JSON`,
        temperature: 0.7
      },
      5: {
        role: '資深股市營業員（決策顧問）',
        systemPrompt: '你是一位擁有 20 年經驗的頂級股市營業員，現在扮演「決策顧問」角色。經過 4 輪討論，現在是時候給出明確的結論和操作建議了。不要模糊不清，要果斷、明確。',
        task: `【第 5 輪：最終決策 - 明確結論】

用戶對 ${stockName}(${stockId}) 的最終決策：
"${userOpinion}"
${historyContext}

這是最後一輪討論，請給出明確的結論：

1. **最終判斷**：基於所有討論，這支股票值得投資嗎？（明確回答：值得/不值得/需要觀察）
2. **操作建議**：
   - 如果值得：建議進場價位、停損點、目標價、持有期間
   - 如果不值得：明確說明原因，建議替代方案
   - 如果需要觀察：列出 3 個關鍵觀察指標和觸發條件
3. **風險控管**：給出具體的風險控管建議（例如：持倉比例、停損停利點）
4. **一句話總結**：用一句話總結你的建議

語氣：果斷、明確、專業，不存在模糊不清的說法
字數：300-400 字
格式：直接輸出分析內容，使用清晰的段落結構`,
        temperature: 0.6
      }
    };

    // 取得當前輪次的策略（如果超過 5 輪，使用第 5 輪的策略）
    const strategy = roundStrategies[Math.min(currentRound, 5)];

    const result = await retryWithBackoff(async () => {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: strategy.systemPrompt
            },
            {
              role: 'user',
              content: strategy.task
            }
          ],
          temperature: strategy.temperature,
          max_tokens: 1200
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('DeepSeek API 回應格式錯誤');
      }

      return response.data.choices[0].message.content;
    }, MAX_RETRIES, `DeepSeek 用戶論點分析 ${stockId}`);

    console.log('✅ DeepSeek 用戶論點分析完成');
    return result;

  } catch (error) {
    console.error('❌ DeepSeek 用戶論點分析失敗:', error.message);
    throw error;
  }
}

/**
 * 綜合總評分析（投資顧問角色）
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {object} allData - 所有分析數據
 * @returns {Promise<object>} - 總評結果（維基百科式架構）
 */
async function generateFinalReview(stockId, stockName, allData) {
  try {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API Key 未設定');
    }

    console.log(`🤖 DeepSeek 綜合總評分析：${stockId}`);

    const {
      technicalAnalysis,
      newsAnalysis,
      politicalAnalysis,
      usMarketAnalysis,
      discussionInsights,
      previousReview
    } = allData;

    const prompt = `你是一位資深投資顧問，請綜合以下所有資訊對 ${stockName}(${stockId}) 做出完整評估：

【技術分析】
${technicalAnalysis || '無'}

【新聞分析】
${newsAnalysis || '無'}

【政治分析】
${politicalAnalysis || '無'}

【美股分析】
${usMarketAnalysis || '無'}

【討論洞察】
${discussionInsights || '無'}

${previousReview ? `【先前總評】\n${previousReview}` : ''}

請以維基百科式的結構化方式，提出勇敢且有決心的投資方向建議。

要求以 JSON 格式回覆：
{
  "summary": "摘要（100字內）",
  "technical_summary": "技術面總結（80字內）",
  "fundamental_summary": "基本面總結（80字內）",
  "risk_assessment": "風險評估（100字內）",
  "opportunity_assessment": "機會評估（100字內）",
  "final_conclusion": "最終結論（150字內）",
  "recommendation": "買入|持有|賣出|觀望",
  "confidence_level": "高|中|低",
  "target_price_range": "目標價區間（如：100-120）",
  "stop_loss_price": "停損價位",
  "time_horizon": "短線|中線|長線",
  "key_factors": ["關鍵因素1", "關鍵因素2", "關鍵因素3"],
  "action_plan": "具體操作建議（150字內）"
}

注意事項：
1. 綜合所有面向的分析
2. 明確指出買入/持有/賣出/觀望建議
3. 說明理由和風險
4. 給予具體操作建議
5. 勇敢且有決心，但基於數據`;

    const result = await retryWithBackoff(async () => {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一位資深投資顧問，擅長綜合各方面資訊做出明確的投資建議，勇敢且有決心。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000 // 總評需要更多時間
        }
      );

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('DeepSeek API 回應格式錯誤');
      }

      const content = response.data.choices[0].message.content;
      return JSON.parse(content);
    }, MAX_RETRIES, `DeepSeek 綜合總評 ${stockId}`);

    console.log('✅ DeepSeek 綜合總評完成');
    console.log(`   建議：${result.recommendation}`);
    console.log(`   信心：${result.confidence_level}`);

    return result;

  } catch (error) {
    console.error('❌ DeepSeek 綜合總評失敗:', error.message);
    throw error;
  }
}

module.exports = {
  analyzeWithDeepSeek,
  analyzeUSMarketWithDeepSeek,
  analyzeFinancialNews,
  analyzePoliticalNews,
  analyzeUSMarketRelation,
  analyzeUserOpinion,
  generateFinalReview
};

