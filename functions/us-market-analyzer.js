/**
 * 美股對應產業分析模組
 * 使用 DeepSeek AI 以美股評論員角色分析美股產業對台股的影響
 */

const axios = require('axios');
const { fetchUSStockPrice } = require('./finmind-api');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * 使用 DeepSeek AI 分析美股產業影響
 * @param {string} stockId - 台股代號
 * @param {string} stockName - 台股名稱
 * @param {string} industry - 產業類別
 * @param {string} usMarket - 美股對應 ETF/指數
 * @param {object} usMarketData - 美股市場資料
 * @returns {Promise<object>} - 美股分析結果
 */
async function analyzeUSMarketWithDeepSeek(stockId, stockName, industry, usMarket, usMarketData) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未設定');
  }

  // 組織美股資料
  const marketInfo = `
【美股對應指標】
指標：${usMarket}
名稱：${usMarketData.name || usMarket}
說明：${usMarketData.description || '美股產業指標'}

【近期表現】
最新價格：$${usMarketData.latestPrice || 'N/A'}
漲跌幅：${usMarketData.changePercent || 'N/A'}%
52週高點：$${usMarketData.week52High || 'N/A'}
52週低點：$${usMarketData.week52Low || 'N/A'}
`;

  const prompt = `你是一位資深的美股市場評論員，擁有 20 年以上的美股投資經驗，專精於分析美股產業趨勢對全球相關產業的影響。

請以專業、客觀的角度分析美股 ${industry} 產業的表現，並評估對台股 ${stockName}（${stockId}）的影響。

【台股資訊】
股票：${stockName}（${stockId}）
產業：${industry}

${marketInfo}

【分析要求】
請從以下角度進行分析：

1. **美股產業摘要**（100 字內）
   - 簡述美股該產業的當前狀況和趨勢

2. **美股產業優勢**（條列 3-5 點）
   - 列出美股該產業的主要優勢和機會
   - 例如：技術領先、市場需求、政策支持等

3. **美股產業挑戰**（條列 2-4 點）
   - 列出美股該產業面臨的挑戰
   - 例如：競爭加劇、成本上升、監管壓力等

4. **對台股的連動性**（條列 2-3 點）
   - 分析美股該產業對台股 ${stockName} 的影響
   - 說明連動關係（正相關/負相關/弱相關）

5. **短期展望**（1-3 個月）
   - 展望：非常樂觀/樂觀/中性/悲觀/非常悲觀
   - 說明理由（50 字內）

6. **中期展望**（3-6 個月）
   - 展望：非常樂觀/樂觀/中性/悲觀/非常悲觀
   - 說明理由（50 字內）

7. **投資建議**
   - 建議：強力買進/買進/持有/減碼/賣出
   - 理由（100 字內）

8. **關鍵觀察指標**（條列 2-3 點）
   - 投資者應關注的美股指標

請以 JSON 格式回應，格式如下：
{
  "summary": "美股產業摘要",
  "us_advantages": ["優勢1", "優勢2", "優勢3"],
  "us_challenges": ["挑戰1", "挑戰2"],
  "taiwan_correlation": ["連動性1", "連動性2"],
  "short_term_outlook": {
    "outlook": "樂觀",
    "reason": "理由"
  },
  "mid_term_outlook": {
    "outlook": "中性",
    "reason": "理由"
  },
  "recommendation": {
    "action": "持有",
    "reason": "理由"
  },
  "key_indicators": ["指標1", "指標2"]
}`;

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位資深的美股市場評論員，專精於分析美股產業趨勢對全球相關產業的影響。請以專業、客觀、深入的角度進行分析。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    console.log('✅ DeepSeek 美股分析完成');

    // 解析 JSON（支援 markdown 代碼塊）
    let analysisResult;
    try {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[1]);
      } else {
        analysisResult = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('⚠️ JSON 解析失敗，使用原始回應');
      analysisResult = {
        summary: aiResponse.substring(0, 200),
        raw_response: aiResponse
      };
    }

    return {
      stock_id: stockId,
      stock_name: stockName,
      industry: industry,
      us_market: usMarket,
      us_market_data: usMarketData,
      analysis: analysisResult,
      analyzed_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ DeepSeek 美股分析失敗:', error.message);
    throw new Error(`美股分析失敗: ${error.message}`);
  }
}

module.exports = {
  analyzeUSMarketWithDeepSeek
};

