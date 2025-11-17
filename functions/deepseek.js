/**
 * DeepSeek AI Analysis Module
 * 使用 DeepSeek API 進行股票走勢分析與預測
 */

const axios = require('axios');
const { calculateKD, calculateMACD, calculateMA, analyzeKD, analyzeMACDSignal } = require('./indicators');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

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

    // 呼叫 DeepSeek API
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
        timeout: 30000
      }
    );

    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      throw new Error('DeepSeek API 回應格式錯誤');
    }

    const content = response.data.choices[0].message.content;
    const result = JSON.parse(content);

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

module.exports = {
  analyzeWithDeepSeek
};

