/**
 * 新聞分析模組
 * 使用 DeepSeek AI 以財經專家角色分析新聞
 */

const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * 使用 DeepSeek 分析新聞（財經專家角色）
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {Array} newsData - 新聞資料陣列
 * @returns {Promise<object>} - 分析結果
 */
async function analyzeNewsWithDeepSeek(stockId, stockName, newsData) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未設定');
  }

  try {
    console.log(`🤖 DeepSeek 開始分析 ${stockId} 的新聞...`);

    // 整理新聞內容
    const newsContent = newsData.map((news, index) => {
      return `【新聞 ${index + 1}】
標題：${news.title}
來源：${news.source}
日期：${news.published_at}
內容：${news.content || '（無內容摘要）'}
---`;
    }).join('\n\n');

    // 建立 Prompt
    const prompt = `你是一位資深的台灣股市財經專家，擁有 20 年以上的投資經驗。請以專業、客觀的角度分析以下關於 ${stockName}（${stockId}）的近期新聞。

【新聞資料】
${newsContent}

【分析要求】
請從以下角度進行分析：

1. **新聞摘要**（100 字內）
   - 用一段話總結這些新聞的核心內容

2. **正面因素**（條列 3-5 點）
   - 從新聞中找出對股價有利的因素
   - 每點用一句話說明

3. **負面因素**（條列 3-5 點）
   - 從新聞中找出對股價不利的因素
   - 每點用一句話說明

4. **市場情緒**（選擇一個）
   - 極度樂觀 / 樂觀 / 中性 / 悲觀 / 極度悲觀
   - 並說明理由（50 字內）

5. **短期影響**（1-2 週）
   - 預測這些新聞對股價的短期影響
   - 給出具體的價格區間或漲跌幅預估

6. **中期影響**（1-3 個月）
   - 預測這些新聞對公司營運的中期影響
   - 評估是否會影響基本面

7. **投資建議**（選擇一個）
   - 強力買進 / 買進 / 持有 / 賣出 / 強力賣出
   - 並說明理由（100 字內）

8. **風險提示**（條列 2-3 點）
   - 指出投資人需要注意的風險

請以 JSON 格式回應，格式如下：
{
  "summary": "新聞摘要",
  "positive_factors": ["正面因素1", "正面因素2", ...],
  "negative_factors": ["負面因素1", "負面因素2", ...],
  "market_sentiment": "市場情緒",
  "sentiment_reason": "情緒理由",
  "short_term_impact": "短期影響預測",
  "mid_term_impact": "中期影響預測",
  "recommendation": "投資建議",
  "recommendation_reason": "建議理由",
  "risk_warnings": ["風險1", "風險2", ...]
}`;

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位資深的台灣股市財經專家，擁有 20 年以上的投資經驗。你的分析客觀、專業，並且能夠從多個角度評估新聞對股價的影響。'
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
        timeout: 60000 // 60 秒超時
      }
    );

    const aiContent = response.data.choices[0].message.content;
    console.log('🤖 DeepSeek 原始回應:', aiContent);

    // 解析 JSON 回應
    let analysisResult;
    try {
      // 嘗試提取 JSON（可能包含在 markdown 代碼塊中）
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = JSON.parse(aiContent);
      }
    } catch (parseError) {
      console.error('❌ 解析 JSON 失敗，使用原始文字');
      analysisResult = {
        summary: aiContent,
        raw_response: aiContent
      };
    }

    console.log('✅ DeepSeek 新聞分析完成');

    return {
      stock_id: stockId,
      stock_name: stockName,
      news_count: newsData.length,
      news_data: newsData,
      analysis: analysisResult,
      analyzed_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ DeepSeek 新聞分析失敗:', error);
    throw new Error(`DeepSeek 新聞分析失敗: ${error.message}`);
  }
}

module.exports = {
  analyzeNewsWithDeepSeek
};

