// ============================================
// 總評 Flex Message 模板
// ============================================

/**
 * 生成總評的 Flex Message
 * @param {object} evaluationResult - 總評結果
 * @returns {object} Flex Message 物件
 */
function generateEvaluationFlexMessage(evaluationResult) {
  const { stockId, stockName, evaluation } = evaluationResult;
  
  // 根據立場決定顏色
  const stanceColor = getStanceColor(evaluation.stance);
  const stanceEmoji = getStanceEmoji(evaluation.stance);
  
  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '📊',
              size: 'xl',
              weight: 'bold',
              flex: 0
            },
            {
              type: 'text',
              text: '綜合總評',
              size: 'xl',
              weight: 'bold',
              margin: 'md',
              flex: 1
            },
            {
              type: 'text',
              text: stanceEmoji,
              size: 'xl',
              align: 'end',
              flex: 0
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: `${stockId} ${stockName}`,
              size: 'sm',
              color: '#FFFFFF',
              flex: 1
            },
            {
              type: 'text',
              text: evaluation.stance,
              size: 'md',
              weight: 'bold',
              color: '#FFFFFF',
              align: 'end',
              flex: 0
            }
          ],
          margin: 'md'
        }
      ],
      backgroundColor: stanceColor,
      paddingAll: '20px'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // 執行摘要
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📋 執行摘要',
              size: 'md',
              weight: 'bold',
              color: '#333333'
            },
            {
              type: 'text',
              text: evaluation.executiveSummary,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            }
          ],
          margin: 'none',
          paddingAll: '15px',
          backgroundColor: '#F8F9FA',
          cornerRadius: '10px'
        },
        
        // 核心優勢
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '💪 核心優勢',
              size: 'md',
              weight: 'bold',
              color: '#00C851'
            },
            ...evaluation.coreStrengths.slice(0, 5).map(strength => ({
              type: 'text',
              text: `✓ ${strength}`,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            }))
          ],
          margin: 'lg'
        },
        
        // 主要風險
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '⚠️ 主要風險',
              size: 'md',
              weight: 'bold',
              color: '#ff4444'
            },
            ...evaluation.majorRisks.slice(0, 5).map(risk => ({
              type: 'text',
              text: `✗ ${risk}`,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            }))
          ],
          margin: 'lg'
        },
        
        // 技術面評估
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📈 技術面評估',
              size: 'md',
              weight: 'bold',
              color: '#0099FF'
            },
            {
              type: 'text',
              text: `綜合判斷：${evaluation.technicalAssessment.summary}`,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            },
            {
              type: 'text',
              text: `短期展望：${evaluation.technicalAssessment.shortTermOutlook}`,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            }
          ],
          margin: 'lg'
        },
        
        // 基本面評估
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🏢 基本面評估',
              size: 'md',
              weight: 'bold',
              color: '#6C5CE7'
            },
            {
              type: 'text',
              text: `產業地位：${evaluation.fundamentalAssessment.industryPosition}`,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            },
            {
              type: 'text',
              text: `成長潛力：${evaluation.fundamentalAssessment.growthPotential}`,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            }
          ],
          margin: 'lg'
        }
      ],
      paddingAll: '20px'
    },
    footer: generateFooter(evaluation),
    styles: {
      footer: {
        separator: true
      }
    }
  };
}

/**
 * 生成 Footer 區塊
 */
function generateFooter(evaluation) {
  return {
    type: 'box',
    layout: 'vertical',
    contents: [
      // 投資建議
      {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '💡 投資建議',
            size: 'md',
            weight: 'bold',
            color: '#333333'
          },
          {
            type: 'text',
            text: `操作：${evaluation.investmentRecommendation.action}`,
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'sm',
            weight: 'bold'
          },
          {
            type: 'text',
            text: `時機：${evaluation.investmentRecommendation.entryTiming}`,
            size: 'xs',
            color: '#666666',
            wrap: true,
            margin: 'xs'
          },
          {
            type: 'text',
            text: `價位：${evaluation.investmentRecommendation.priceRange}`,
            size: 'xs',
            color: '#666666',
            wrap: true,
            margin: 'xs'
          },
          {
            type: 'text',
            text: `期間：${evaluation.investmentRecommendation.holdingPeriod}`,
            size: 'xs',
            color: '#666666',
            wrap: true,
            margin: 'xs'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: `停損：${evaluation.investmentRecommendation.stopLoss}`,
                size: 'xs',
                color: '#ff4444',
                flex: 1
              },
              {
                type: 'text',
                text: `停利：${evaluation.investmentRecommendation.takeProfit}`,
                size: 'xs',
                color: '#00C851',
                flex: 1
              }
            ],
            margin: 'xs'
          }
        ],
        margin: 'none',
        paddingAll: '15px',
        backgroundColor: '#FFF9E6',
        cornerRadius: '10px'
      },

      // 風險等級
      {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '⚠️ 風險等級',
                size: 'md',
                weight: 'bold',
                color: '#333333',
                flex: 1
              },
              {
                type: 'text',
                text: evaluation.riskLevel,
                size: 'md',
                weight: 'bold',
                color: getRiskLevelColor(evaluation.riskLevel),
                align: 'end',
                flex: 0
              }
            ]
          },
          {
            type: 'text',
            text: evaluation.riskLevelReason,
            size: 'xs',
            color: '#666666',
            wrap: true,
            margin: 'sm'
          }
        ],
        margin: 'lg'
      },

      // 適合投資人
      {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '👥 適合投資人',
            size: 'md',
            weight: 'bold',
            color: '#333333'
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '✓ 適合',
                size: 'xs',
                color: '#00C851',
                weight: 'bold'
              },
              ...evaluation.suitableInvestors.map(type => ({
                type: 'text',
                text: `• ${type}`,
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'xs'
              }))
            ],
            margin: 'sm'
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '✗ 不適合',
                size: 'xs',
                color: '#ff4444',
                weight: 'bold'
              },
              ...evaluation.unsuitableInvestors.map(type => ({
                type: 'text',
                text: `• ${type}`,
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'xs'
              }))
            ],
            margin: 'sm'
          }
        ],
        margin: 'lg'
      },

      // 關鍵觀察指標
      {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🔍 關鍵觀察指標',
            size: 'md',
            weight: 'bold',
            color: '#333333'
          },
          ...evaluation.keyIndicators.slice(0, 5).map(indicator => ({
            type: 'text',
            text: `• ${indicator}`,
            size: 'xs',
            color: '#666666',
            wrap: true,
            margin: 'sm'
          }))
        ],
        margin: 'lg'
      },

      // 反饋提示
      {
        type: 'text',
        text: '請回覆「好，肯定」或「不好，我不相信」',
        size: 'xs',
        color: '#999999',
        align: 'center',
        margin: 'xl'
      }
    ],
    paddingAll: '20px'
  };
}

/**
 * 根據立場取得顏色
 */
function getStanceColor(stance) {
  if (stance.includes('看好')) return '#00C851';
  if (stance.includes('看淡')) return '#ff4444';
  return '#ffbb33';
}

/**
 * 根據立場取得 Emoji
 */
function getStanceEmoji(stance) {
  if (stance.includes('看好')) return '📈';
  if (stance.includes('看淡')) return '📉';
  return '➡️';
}

/**
 * 根據風險等級取得顏色
 */
function getRiskLevelColor(riskLevel) {
  if (riskLevel.includes('低')) return '#00C851';
  if (riskLevel.includes('高')) return '#ff4444';
  return '#ffbb33';
}

module.exports = {
  generateEvaluationFlexMessage
};

