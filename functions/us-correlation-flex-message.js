/**
 * 美股對應產業分析 Flex Message 模板
 * （與 us-market-flex-message.js 不同，這是針對個股的美股產業對應分析）
 */

/**
 * 生成美股對應產業分析 Flex Message
 * @param {object} usMarketAnalysis - 美股分析結果
 * @returns {object} - LINE Flex Message
 */
function generateUSCorrelationFlexMessage(usMarketAnalysis) {
  const { stock_id, stock_name, industry, us_market, us_market_data, analysis } = usMarketAnalysis;

  // 展望顏色
  const getOutlookColor = (outlook) => {
    if (outlook.includes('樂觀')) return '#00C851';
    if (outlook.includes('悲觀')) return '#ff4444';
    return '#ffbb33';
  };

  // 建議顏色
  const getRecommendationColor = (action) => {
    if (action.includes('買進')) return '#00C851';
    if (action.includes('賣出') || action.includes('減碼')) return '#ff4444';
    return '#ffbb33';
  };

  // 漲跌顏色
  const getChangeColor = (changePercent) => {
    if (!changePercent) return '#666666';
    const value = parseFloat(changePercent);
    if (value > 0) return '#00C851';
    if (value < 0) return '#ff4444';
    return '#666666';
  };

  const contents = [
    // 標題
    {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '🇺🇸 美股產業對應',
          weight: 'bold',
          size: 'xl',
          color: '#0066CC'
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
          text: `${industry} 產業 → ${us_market}`,
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

    // 美股指標表現
    {
      type: 'box',
      layout: 'vertical',
      margin: 'xl',
      contents: [
        {
          type: 'text',
          text: `📊 ${us_market} 表現`,
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
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '最新價格',
                  size: 'xs',
                  color: '#999999'
                },
                {
                  type: 'text',
                  text: `$${us_market_data.latestPrice || 'N/A'}`,
                  size: 'md',
                  weight: 'bold',
                  color: '#333333',
                  margin: 'xs'
                }
              ],
              flex: 1
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '漲跌幅',
                  size: 'xs',
                  color: '#999999'
                },
                {
                  type: 'text',
                  text: `${us_market_data.changePercent || 'N/A'}%`,
                  size: 'md',
                  weight: 'bold',
                  color: getChangeColor(us_market_data.changePercent),
                  margin: 'xs'
                }
              ],
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

    // 美股產業摘要
    {
      type: 'box',
      layout: 'vertical',
      margin: 'xl',
      contents: [
        {
          type: 'text',
          text: '📋 美股產業摘要',
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

    // 短期展望
    {
      type: 'box',
      layout: 'vertical',
      margin: 'xl',
      contents: [
        {
          type: 'text',
          text: '📈 短期展望 (1-3個月)',
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
              text: analysis.short_term_outlook?.outlook || '中性',
              size: 'md',
              weight: 'bold',
              color: getOutlookColor(analysis.short_term_outlook?.outlook || '中性'),
              flex: 0
            },
            {
              type: 'text',
              text: analysis.short_term_outlook?.reason || '評估中',
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

    // 中期展望
    {
      type: 'box',
      layout: 'vertical',
      margin: 'xl',
      contents: [
        {
          type: 'text',
          text: '📊 中期展望 (3-6個月)',
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
              text: analysis.mid_term_outlook?.outlook || '中性',
              size: 'md',
              weight: 'bold',
              color: getOutlookColor(analysis.mid_term_outlook?.outlook || '中性'),
              flex: 0
            },
            {
              type: 'text',
              text: analysis.mid_term_outlook?.reason || '評估中',
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

  // 美股產業優勢
  if (analysis.us_advantages && analysis.us_advantages.length > 0) {
    contents.push(
      { type: 'separator', margin: 'xl' },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'xl',
        contents: [
          {
            type: 'text',
            text: '✅ 美股產業優勢',
            weight: 'bold',
            size: 'sm',
            color: '#00C851'
          },
          ...analysis.us_advantages.slice(0, 3).map(adv => ({
            type: 'text',
            text: `• ${adv}`,
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'md'
          }))
        ]
      }
    );
  }

  // 美股產業挑戰
  if (analysis.us_challenges && analysis.us_challenges.length > 0) {
    contents.push(
      { type: 'separator', margin: 'xl' },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'xl',
        contents: [
          {
            type: 'text',
            text: '⚠️ 美股產業挑戰',
            weight: 'bold',
            size: 'sm',
            color: '#ff4444'
          },
          ...analysis.us_challenges.slice(0, 3).map(challenge => ({
            type: 'text',
            text: `• ${challenge}`,
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'md'
          }))
        ]
      }
    );
  }

  // 對台股的連動性
  if (analysis.taiwan_correlation && analysis.taiwan_correlation.length > 0) {
    contents.push(
      { type: 'separator', margin: 'xl' },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'xl',
        contents: [
          {
            type: 'text',
            text: '🔗 對台股的連動性',
            weight: 'bold',
            size: 'sm',
            color: '#0066CC'
          },
          ...analysis.taiwan_correlation.map(corr => ({
            type: 'text',
            text: `• ${corr}`,
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

  // 關鍵觀察指標
  if (analysis.key_indicators && analysis.key_indicators.length > 0) {
    contents.push(
      { type: 'separator', margin: 'xl' },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'xl',
        contents: [
          {
            type: 'text',
            text: '🔍 關鍵觀察指標',
            weight: 'bold',
            size: 'sm',
            color: '#555555'
          },
          ...analysis.key_indicators.map(indicator => ({
            type: 'text',
            text: `• ${indicator}`,
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
  generateUSCorrelationFlexMessage
};

