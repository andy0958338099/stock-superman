// ============================================
// 總評分析器
// 整合所有分析結果，提供綜合評估
// ============================================

const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * 使用 DeepSeek AI 生成綜合總評
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {object} sessionData - 完整的會話資料
 * @returns {object} 總評結果
 */
async function generateComprehensiveEvaluation(stockId, stockName, sessionData) {
  try {
    // 建立完整的分析摘要
    const analysisSummary = buildAnalysisSummary(sessionData);
    
    const prompt = `你是一位資深的股票分析師，現在要為 ${stockId} ${stockName} 提供綜合評估報告。

【已完成的分析】
${analysisSummary}

【總評要求】
請整合以上所有分析，提供一份完整且有決心的投資評估報告：

1. 執行摘要（150 字內）
   - 用最精煉的語言總結這支股票的投資價值
   - 必須明確表達立場（看好/中性/看淡）

2. 核心優勢（條列 3-5 點）
   - 這支股票最突出的優勢
   - 為什麼值得關注

3. 主要風險（條列 3-5 點）
   - 最需要警惕的風險
   - 可能影響投資的負面因素

4. 技術面評估
   - 當前技術指標的綜合判斷
   - 短期走勢預測（1-3 個月）

5. 基本面評估
   - 產業地位和競爭力
   - 長期成長潛力（6-12 個月）

6. 市場環境評估
   - 總體經濟和政治環境影響
   - 國際市場連動性

7. 投資建議（必須明確且有決心）
   - 明確的操作建議（積極買進/逢低布局/觀望/減碼/出場）
   - 建議的進場時機和價位區間
   - 建議的持有期間
   - 建議的停損停利點

8. 風險等級評估
   - 給予風險等級：低風險/中低風險/中風險/中高風險/高風險
   - 說明風險等級的理由

9. 適合投資人類型
   - 這支股票適合什麼類型的投資人
   - 不適合什麼類型的投資人

10. 關鍵觀察指標（條列 3-5 點）
    - 後續需要持續追蹤的關鍵指標
    - 什麼情況下需要調整策略

請以 JSON 格式回應，格式如下：
{
  "executiveSummary": "執行摘要",
  "stance": "看好/中性/看淡",
  "coreStrengths": ["優勢1", "優勢2", "優勢3"],
  "majorRisks": ["風險1", "風險2", "風險3"],
  "technicalAssessment": {
    "summary": "技術面綜合判斷",
    "shortTermOutlook": "短期走勢預測"
  },
  "fundamentalAssessment": {
    "industryPosition": "產業地位",
    "growthPotential": "成長潛力"
  },
  "marketEnvironment": {
    "macroImpact": "總體環境影響",
    "internationalCorrelation": "國際連動性"
  },
  "investmentRecommendation": {
    "action": "操作建議",
    "entryTiming": "進場時機",
    "priceRange": "價位區間",
    "holdingPeriod": "持有期間",
    "stopLoss": "停損點",
    "takeProfit": "停利點"
  },
  "riskLevel": "風險等級",
  "riskLevelReason": "風險等級理由",
  "suitableInvestors": ["適合類型1", "適合類型2"],
  "unsuitableInvestors": ["不適合類型1", "不適合類型2"],
  "keyIndicators": ["指標1", "指標2", "指標3"]
}

注意：
- 必須勇敢且有決心地給出明確建議
- 不要模稜兩可，要有清晰的立場
- 建議必須具體可執行
- 同時要充分揭露風險`;

    console.log('📤 發送總評分析請求到 DeepSeek API...');

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位資深的股票分析師，以專業、客觀、有決心的態度提供投資建議。你不會模稜兩可，而是會基於分析給出明確的建議，同時充分揭露風險。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 90000
      }
    );

    const content = response.data.choices[0].message.content;
    console.log('✅ DeepSeek API 回應成功');

    // 解析 JSON 回應
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('無法解析 DeepSeek 回應的 JSON 格式');
    }

    const evaluation = JSON.parse(jsonMatch[0]);

    return {
      stockId,
      stockName,
      evaluation,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ DeepSeek 總評分析失敗:', error.message);
    throw error;
  }
}

/**
 * 建立分析摘要
 */
function buildAnalysisSummary(sessionData) {
  const parts = [];
  
  // 初步技術分析
  if (sessionData.initial_analysis) {
    parts.push('【技術分析】');
    parts.push('✅ 已完成 KD、MACD、MA 等技術指標分析');
  }
  
  // 新聞分析
  if (sessionData.news_analysis) {
    const news = sessionData.news_analysis;
    parts.push('\n【新聞分析】');
    parts.push(`市場情緒：${news.marketSentiment || '未知'}`);
    parts.push(`短期展望：${news.shortTermOutlook || '未知'}`);
  }
  
  // 政治分析
  if (sessionData.politics_analysis) {
    const politics = sessionData.politics_analysis;
    parts.push('\n【政治分析】');
    parts.push(`短期風險：${politics.shortTermRisk || '未知'}`);
    parts.push(`長期趨勢：${politics.longTermTrend || '未知'}`);
  }
  
  // 美股分析
  if (sessionData.us_market_analysis) {
    const usMarket = sessionData.us_market_analysis;
    parts.push('\n【美股分析】');
    parts.push(`短期展望：${usMarket.shortTermOutlook || '未知'}`);
    parts.push(`中期展望：${usMarket.midTermOutlook || '未知'}`);
  }
  
  // 討論記錄
  if (sessionData.discussion_history && sessionData.discussion_history.length > 0) {
    parts.push('\n【討論記錄】');
    parts.push(`共進行了 ${sessionData.discussion_history.length} 輪討論`);
    sessionData.discussion_history.forEach((record, index) => {
      parts.push(`第 ${index + 1} 輪：${record.userMessage?.substring(0, 50) || ''}...`);
    });
  }
  
  return parts.join('\n');
}

module.exports = {
  generateComprehensiveEvaluation
};

