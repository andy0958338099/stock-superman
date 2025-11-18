// ============================================
// 互動討論分析器
// 使用 DeepSeek AI 以「投資顧問」角色與用戶討論
// ============================================

const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

/**
 * 使用 DeepSeek AI 分析用戶的討論內容
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {object} sessionData - 會話資料（包含所有已完成的分析）
 * @param {string} userMessage - 用戶的討論內容
 * @param {array} discussionHistory - 討論歷史記錄
 * @returns {object} 討論分析結果
 */
async function analyzeDiscussionWithDeepSeek(stockId, stockName, sessionData, userMessage, discussionHistory) {
  try {
    // 建立上下文摘要
    const contextSummary = buildContextSummary(sessionData);
    
    // 建立討論歷史摘要
    const historyText = buildHistoryText(discussionHistory);
    
    const prompt = `你是一位資深的投資顧問，正在與投資人討論 ${stockId} ${stockName} 的投資觀點。

【已完成的分析】
${contextSummary}

【討論歷史】
${historyText}

【用戶最新觀點】
${userMessage}

【分析要求】
請以專業且友善的態度回應用戶，並提供以下分析：

1. 觀點摘要（50 字內）
   - 簡要總結用戶的核心觀點

2. 合理性分析（條列 2-3 點）
   - 分析用戶觀點的合理之處
   - 指出有數據或邏輯支持的部分

3. 潛在盲點（條列 2-3 點）
   - 指出用戶可能忽略的風險
   - 提醒需要注意的面向

4. 補充觀點（條列 2-3 點）
   - 提供額外的分析角度
   - 補充用戶未考慮到的因素

5. 反問問題（1-2 個）
   - 提出引導性問題，幫助用戶深入思考
   - 問題應該具體且有助於決策

6. 風險提醒（條列 1-2 點）
   - 根據用戶觀點，提醒最重要的風險

7. 建議方向
   - 給予具體的建議（例如：繼續觀察、謹慎進場、等待更好時機等）

請以 JSON 格式回應，格式如下：
{
  "viewpointSummary": "用戶觀點摘要",
  "reasonablePoints": ["合理點1", "合理點2"],
  "potentialBlindSpots": ["盲點1", "盲點2"],
  "additionalPerspectives": ["補充觀點1", "補充觀點2"],
  "reflectiveQuestions": ["問題1", "問題2"],
  "riskWarnings": ["風險1", "風險2"],
  "recommendation": "建議方向"
}

注意：
- 保持客觀中立，不做絕對的買賣建議
- 語氣要專業但友善，像是在與朋友討論
- 如果用戶觀點有明顯錯誤，要委婉指出
- 鼓勵用戶多角度思考，而非單一觀點`;

    console.log('📤 發送討論分析請求到 DeepSeek API...');

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位資深的投資顧問，擅長與投資人進行深度討論，幫助他們全面思考投資決策。'
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

    const content = response.data.choices[0].message.content;
    console.log('✅ DeepSeek API 回應成功');

    // 解析 JSON 回應
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('無法解析 DeepSeek 回應的 JSON 格式');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      stockId,
      stockName,
      userMessage,
      discussionRound: discussionHistory.length + 1,
      analysis,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ DeepSeek 討論分析失敗:', error.message);
    throw error;
  }
}

/**
 * 建立上下文摘要
 */
function buildContextSummary(sessionData) {
  const parts = [];
  
  if (sessionData.initial_analysis) {
    parts.push('✅ 初步技術分析已完成');
  }
  
  if (sessionData.news_analysis) {
    parts.push('✅ 新聞分析已完成');
  }
  
  if (sessionData.politics_analysis) {
    parts.push('✅ 政治分析已完成');
  }
  
  if (sessionData.us_market_analysis) {
    parts.push('✅ 美股分析已完成');
  }
  
  return parts.length > 0 ? parts.join('\n') : '尚未完成其他分析';
}

/**
 * 建立討論歷史摘要
 */
function buildHistoryText(discussionHistory) {
  if (!discussionHistory || discussionHistory.length === 0) {
    return '（這是第一輪討論）';
  }
  
  return discussionHistory.map((record, index) => {
    return `第 ${index + 1} 輪：
用戶：${record.userMessage}
顧問：${record.analysis?.recommendation || '（無建議）'}`;
  }).join('\n\n');
}

module.exports = {
  analyzeDiscussionWithDeepSeek
};

