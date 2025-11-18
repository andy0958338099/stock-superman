/**
 * 政治分析模組
 * 使用 DeepSeek AI 以政治評論員角色分析國際政治對產業的影響
 */

const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

/**
 * 使用 DeepSeek AI 分析政治影響
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {string} industry - 產業類別
 * @param {Array} newsData - 國際新聞資料
 * @returns {Promise<object>} - 政治分析結果
 */
async function analyzePoliticsWithDeepSeek(stockId, stockName, industry, newsData) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未設定');
  }

  // 組織新聞內容
  const newsContent = newsData.map((news, index) => {
    return `【新聞 ${index + 1}】
標題：${news.title}
來源：${news.source}
日期：${news.publishedAt || news.published_at || '未知'}
內容：${news.description || news.content || '（無內容摘要）'}
---`;
  }).join('\n\n');

  const prompt = `你是一位資深的國際政治評論員，擁有 20 年以上的地緣政治分析經驗，專精於分析國際政治局勢對產業和企業的影響。

請以專業、客觀的角度分析以下關於 ${industry} 產業的近期國際新聞，並評估對 ${stockName}（${stockId}）的影響。

【產業資訊】
股票：${stockName}（${stockId}）
產業：${industry}

【國際新聞】
${newsContent}

【分析要求】
請從以下角度進行分析：

1. **政治摘要**（100 字內）
   - 簡述當前國際政治局勢對該產業的主要影響

2. **地緣政治風險**（條列 3-5 點）
   - 列出主要的地緣政治風險因素
   - 例如：貿易戰、制裁、區域衝突、政策變化等

3. **政治機會**（條列 2-4 點）
   - 列出可能的政治機會
   - 例如：政策支持、補貼、國際合作等

4. **對台灣的影響**（條列 2-3 點）
   - 分析對台灣該產業的具體影響
   - 對 ${stockName} 的直接或間接影響

5. **短期政治風險評估**（1-3 個月）
   - 風險等級：極高/高/中/低/極低
   - 說明理由（50 字內）

6. **中長期政治趨勢**（6-12 個月）
   - 趨勢：非常有利/有利/中性/不利/非常不利
   - 說明理由（50 字內）

7. **投資建議**
   - 建議：強力買進/買進/持有/減碼/賣出
   - 理由（100 字內）

8. **風險提示**（條列 2-3 點）
   - 投資者應注意的政治風險

請以 JSON 格式回應，格式如下：
{
  "summary": "政治摘要",
  "geopolitical_risks": ["風險1", "風險2", "風險3"],
  "political_opportunities": ["機會1", "機會2"],
  "taiwan_impact": ["影響1", "影響2"],
  "short_term_risk": {
    "level": "高",
    "reason": "理由"
  },
  "long_term_trend": {
    "trend": "有利",
    "reason": "理由"
  },
  "recommendation": {
    "action": "持有",
    "reason": "理由"
  },
  "risk_warnings": ["警告1", "警告2"]
}`;

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位資深的國際政治評論員，專精於分析地緣政治對產業和企業的影響。請以專業、客觀、深入的角度進行分析。'
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
    console.log('✅ DeepSeek 政治分析完成');

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
      news_count: newsData.length,
      news_data: newsData,
      analysis: analysisResult,
      analyzed_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ DeepSeek 政治分析失敗:', error.message);
    throw new Error(`政治分析失敗: ${error.message}`);
  }
}

module.exports = {
  analyzePoliticsWithDeepSeek
};

