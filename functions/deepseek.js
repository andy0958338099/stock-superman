/**
 * DeepSeek AI Analysis Module
 * 使用 DeepSeek API 進行股票走勢分析與預測
 */

const axios = require('axios');
const { calculateKD, calculateMACD, calculateMA, analyzeKD, analyzeMACDSignal } = require('./indicators');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

// Retry 設定
const MAX_RETRIES = 2; // DeepSeek API 較慢，減少重試次數
const INITIAL_RETRY_DELAY = 2000; // 2 秒

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

    const { sp500, nasdaq, soxx, tsmAdr, twii, usdTwd, vix } = marketData;

    // 建立 AI Prompt
    const prompt = `你是一位跨市場量化分析師，請根據以下數據進行：
1. 美股主要指數的技術面分析（S&P500、NASDAQ、SOXX）
2. 台股大盤的技術面分析
3. 評估美股狀態對台股的短線（3天）與中期（10天）影響
4. 給出具體投資建議（標註風險）

=== 資料來源 ===

【台股大盤】
指數：${twii.name}
收盤：${twii.price}
日期：${twii.date}
KD：K=${twii.kd.K}, D=${twii.kd.D} (${twii.kd.status})
MACD：${twii.macd.macd} / Signal=${twii.macd.signal} / Histogram=${twii.macd.histogram} (${twii.macd.status})
均線：MA5=${twii.ma.ma5}, MA10=${twii.ma.ma10}, MA20=${twii.ma.ma20}
趨勢：${twii.trend}

【美股 S&P 500】
收盤：${sp500.price}
日期：${sp500.date}
KD：K=${sp500.kd.K}, D=${sp500.kd.D} (${sp500.kd.status})
MACD：${sp500.macd.macd} / Signal=${sp500.macd.signal} / Histogram=${sp500.macd.histogram} (${sp500.macd.status})
趨勢：${sp500.trend}

【美股 NASDAQ】
收盤：${nasdaq.price}
日期：${nasdaq.date}
KD：K=${nasdaq.kd.K}, D=${nasdaq.kd.D} (${nasdaq.kd.status})
MACD：${nasdaq.macd.macd} / Signal=${nasdaq.macd.signal} / Histogram=${nasdaq.macd.histogram} (${nasdaq.macd.status})
趨勢：${nasdaq.trend}

【美股 SOXX 半導體】
收盤：${soxx.price}
日期：${soxx.date}
KD：K=${soxx.kd.K}, D=${soxx.kd.D} (${soxx.kd.status})
MACD：${soxx.macd.macd} / Signal=${soxx.macd.signal} / Histogram=${soxx.macd.histogram} (${soxx.macd.status})
趨勢：${soxx.trend}

【TSM ADR】
收盤：$${tsmAdr.price}
日期：${tsmAdr.date}
KD：K=${tsmAdr.kd.K}, D=${tsmAdr.kd.D} (${tsmAdr.kd.status})
MACD：${tsmAdr.macd.macd} / Signal=${tsmAdr.macd.signal} / Histogram=${tsmAdr.macd.histogram} (${tsmAdr.macd.status})
趨勢：${tsmAdr.trend}

【匯率 USD/TWD】
匯率：${usdTwd.rate}
日期：${usdTwd.date}

【VIX 恐慌指數】
VIX：${vix.close}
日期：${vix.date}

=== 分析任務 ===
請以 JSON 格式回覆，包含以下欄位：
{
  "us_market_status": "多頭|空頭|盤整",
  "us_market_summary": "美股市場總結（50字內）",
  "tw_market_status": "多頭|空頭|盤整",
  "tw_market_summary": "台股市場總結（50字內）",
  "correlation_score": 0-100 (美股與台股短線連動性分數),
  "correlation_analysis": "連動性分析（50字內）",
  "tw_3day_forecast": {
    "direction": "上漲|下跌|盤整",
    "probability": 0-100,
    "reason": "理由（50字內）"
  },
  "tw_10day_forecast": {
    "direction": "上漲|下跌|盤整",
    "probability": 0-100,
    "reason": "理由（50字內）"
  },
  "strategy": "多頭策略|空頭策略|等待策略",
  "recommended_sectors": ["半導體", "金融", "AI", "原物料", "傳產"],
  "risk_factors": ["外資動向", "匯率波動", "政策風險", "量能不足", "美股回檔"],
  "key_points": ["重點1", "重點2", "重點3", "重點4", "重點5"],
  "action_plan": "具體操作建議（100字內）"
}

注意事項：
1. 基於技術指標數據進行客觀分析
2. 評估美股對台股的影響程度
3. TSM ADR 與台積電本體的差異
4. 匯率對外資買賣的影響
5. VIX 反映的市場風險偏好
6. 給出明確的風險提示`;

    // 呼叫 DeepSeek API（帶 retry）
    const result = await retryWithBackoff(async () => {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一位專業的跨市場量化分析師，擅長分析美股與台股的連動關係，並基於技術指標給出投資建議。'
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
          timeout: 15000  // 🚀 優化：從 30 秒降至 15 秒（DeepSeek 通常 3-8 秒響應）
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
      console.error('DeepSeek API 錯誤:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('DeepSeek API 無回應:', error.message);
    } else {
      console.error('DeepSeek 錯誤:', error.message);
    }

    return null;
  }
}

module.exports = {
  analyzeWithDeepSeek,
  analyzeUSMarketWithDeepSeek
};

