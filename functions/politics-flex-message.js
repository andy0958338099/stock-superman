/**
 * 政治分析 Flex Message 模板
 */

/**
 * 生成政治分析 Flex Message
 * @param {object} politicsAnalysis - 政治分析結果
 * @returns {object} - LINE Flex Message
 */
function generatePoliticsFlexMessage(politicsAnalysis) {
  const { stock_id, stock_name, industry, analysis, news_count } = politicsAnalysis;

  // 風險等級顏色
  const getRiskColor = (level) => {
    if (level.includes('極高') || level.includes('高')) return '#ff4444';
    if (level.includes('中')) return '#ffbb33';
    return '#00C851';
  };

  // 趨勢顏色
  const getTrendColor = (trend) => {
    if (trend.includes('有利')) return '#00C851';
    if (trend.includes('不利')) return '#ff4444';
    return '#ffbb33';
  };

  // 建議顏色
  const getRecommendationColor = (action) => {
    if (action.includes('買進')) return '#00C851';
    if (action.includes('賣出') || action.includes('減碼')) return '#ff4444';
    return '#ffbb33';
  };

  const contents = [
    // 標題
    {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '🏛️ 政治分析',
          weight: 'bold',
          size: 'xl',
          color: '#1DB446'
        },
        {
          type: 'text',
          text: `${stock_name} (${stock_id})`,
          size: 'sm',
          color: '#999999',
          margin: 'md'
        },
        {
          type: 'text',
          text: `${industry} 產業 | ${news_count} 則國際新聞`,
          size: 'xs',
          color: '#999999',
          margin: 'sm'
        }
      ]
    },
    {
      type: 'separator',
      margin: 'xl'
    },

    // 政治摘要
    {
      type: 'box',
      layout: 'vertical',
      margin: 'xl',
      contents: [
        {
          type: 'text',
          text: '📋 政治摘要',
          weight: 'bold',
          size: 'sm',
          color: '#555555'
        },
        {
          type: 'text',
          text: analysis.summary || '無摘要',
          size: 'sm',
          color: '#666666',
          wrap: true,
          margin: 'md'
        }
      ]
    },
    {
      type: 'separator',
      margin: 'xl'
    },

    // 短期風險評估
    {
      type: 'box',
      layout: 'vertical',
      margin: 'xl',
      contents: [
        {
          type: 'text',
          text: '⚠️ 短期政治風險 (1-3個月)',
          weight: 'bold',
          size: 'sm',
          color: '#555555'
        },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          contents: [
            {
              type: 'text',
              text: analysis.short_term_risk?.level || '中',
              size: 'md',
              weight: 'bold',
              color: getRiskColor(analysis.short_term_risk?.level || '中'),
              flex: 0
            },
            {
              type: 'text',
              text: analysis.short_term_risk?.reason || '評估中',
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'md',
              flex: 1
            }
          ]
        }
      ]
    },
    {
      type: 'separator',
      margin: 'xl'
    },

    // 中長期趨勢
    {
      type: 'box',
      layout: 'vertical',
      margin: 'xl',
      contents: [
        {
          type: 'text',
          text: '📈 中長期政治趨勢 (6-12個月)',
          weight: 'bold',
          size: 'sm',
          color: '#555555'
        },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          contents: [
            {
              type: 'text',
              text: analysis.long_term_trend?.trend || '中性',
              size: 'md',
              weight: 'bold',
              color: getTrendColor(analysis.long_term_trend?.trend || '中性'),
              flex: 0
            },
            {
              type: 'text',
              text: analysis.long_term_trend?.reason || '評估中',
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'md',
              flex: 1
            }
          ]
        }
      ]
    }
  ];

  // 地緣政治風險
  if (analysis.geopolitical_risks && analysis.geopolitical_risks.length > 0) {
    contents.push(
      { type: 'separator', margin: 'xl' },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'xl',
        contents: [
          {
            type: 'text',
            text: '🌍 地緣政治風險',
            weight: 'bold',
            size: 'sm',
            color: '#ff4444'
          },
          ...analysis.geopolitical_risks.map(risk => ({
            type: 'text',
            text: `• ${risk}`,
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'md'
          }))
        ]
      }
    );
  }

  // 政治機會
  if (analysis.political_opportunities && analysis.political_opportunities.length > 0) {
    contents.push(
      { type: 'separator', margin: 'xl' },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'xl',
        contents: [
          {
            type: 'text',
            text: '✨ 政治機會',
            weight: 'bold',
            size: 'sm',
            color: '#00C851'
          },
          ...analysis.political_opportunities.map(opp => ({
            type: 'text',
            text: `• ${opp}`,
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'md'
          }))
        ]
      }
    );
  }

  // 對台灣的影響
  if (analysis.taiwan_impact && analysis.taiwan_impact.length > 0) {
    contents.push(
      { type: 'separator', margin: 'xl' },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'xl',
        contents: [
          {
            type: 'text',
            text: '🇹🇼 對台灣的影響',
            weight: 'bold',
            size: 'sm',
            color: '#1DB446'
          },
          ...analysis.taiwan_impact.map(impact => ({
            type: 'text',
            text: `• ${impact}`,
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'md'
          }))
        ]
      }
    );
  }

  // 投資建議
  if (analysis.recommendation) {
    contents.push(
      { type: 'separator', margin: 'xl' },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'xl',
        contents: [
          {
            type: 'text',
            text: '💡 投資建議',
            weight: 'bold',
            size: 'sm',
            color: '#555555'
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: analysis.recommendation.action || '持有',
                size: 'md',
                weight: 'bold',
                color: getRecommendationColor(analysis.recommendation.action || '持有'),
                flex: 0
              },
              {
                type: 'text',
                text: analysis.recommendation.reason || '評估中',
                size: 'sm',
                color: '#666666',
                wrap: true,
                margin: 'md',
                flex: 1
              }
            ]
          }
        ]
      }
    );
  }

  // 風險提示
  if (analysis.risk_warnings && analysis.risk_warnings.length > 0) {
    contents.push(
      { type: 'separator', margin: 'xl' },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'xl',
        contents: [
          {
            type: 'text',
            text: '⚠️ 風險提示',
            weight: 'bold',
            size: 'sm',
            color: '#ff4444'
          },
          ...analysis.risk_warnings.map(warning => ({
            type: 'text',
            text: `• ${warning}`,
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'md'
          }))
        ]
      }
    );
  }

  return {
    type: 'bubble',
    size: 'mega',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: contents
    }
  };
}

module.exports = {
  generatePoliticsFlexMessage
};

