/**
 * 美股市場分析 Flex Message 模板
 */

/**
 * 生成美股市場分析的 Flex Message
 * @param {object} analysisResult - 美股分析結果
 * @returns {object} - LINE Flex Message
 */
function generateUSMarketFlexMessage(analysisResult) {
  const { data, analysis } = analysisResult;
  
  if (!analysis) {
    // 如果沒有 AI 分析，回傳簡單訊息
    return {
      type: 'text',
      text: '❌ 美股分析暫時無法使用，請稍後再試'
    };
  }

  const { sp500, nasdaq, soxx, tsmAdr, twii, usdTwd, vix } = data;

  // 判斷趨勢顏色
  const getTrendColor = (status) => {
    if (status === '多頭') return '#00C851';
    if (status === '空頭') return '#ff4444';
    return '#ffbb33';
  };

  // 判斷趨勢 Emoji
  const getTrendEmoji = (status) => {
    if (status === '多頭') return '📈';
    if (status === '空頭') return '📉';
    return '➡️';
  };

  return {
    type: 'flex',
    altText: '🌎 美股市場分析報告',
    contents: {
      type: 'bubble',
      size: 'mega',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          // 標題
          {
            type: 'text',
            text: '🌎 美股市場分析',
            weight: 'bold',
            size: 'xl',
            color: '#1DB446'
          },
          {
            type: 'text',
            text: `更新時間：${analysisResult.timestamp}`,
            size: 'xs',
            color: '#aaaaaa',
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'xl'
          },
          
          // 美股市場狀態
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '📊 美股市場狀態',
                weight: 'bold',
                size: 'md',
                color: '#333333'
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '整體趨勢',
                    size: 'sm',
                    color: '#555555',
                    flex: 0
                  },
                  {
                    type: 'text',
                    text: `${getTrendEmoji(analysis.us_market_status)} ${analysis.us_market_status}`,
                    size: 'sm',
                    color: getTrendColor(analysis.us_market_status),
                    align: 'end',
                    weight: 'bold'
                  }
                ]
              },
              {
                type: 'text',
                text: analysis.us_market_summary,
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'sm'
              }
            ]
          },

          // 美股指數詳情
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '📈 美股指數',
                weight: 'bold',
                size: 'md',
                color: '#333333'
              },
              generateIndexBox('S&P 500', sp500),
              generateIndexBox('NASDAQ', nasdaq),
              generateIndexBox('SOXX', soxx),
              generateIndexBox('TSM ADR', tsmAdr)
            ]
          },

          // 台股市場狀態
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '🇹🇼 台股市場狀態',
                weight: 'bold',
                size: 'md',
                color: '#333333'
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '整體趨勢',
                    size: 'sm',
                    color: '#555555',
                    flex: 0
                  },
                  {
                    type: 'text',
                    text: `${getTrendEmoji(analysis.tw_market_status)} ${analysis.tw_market_status}`,
                    size: 'sm',
                    color: getTrendColor(analysis.tw_market_status),
                    align: 'end',
                    weight: 'bold'
                  }
                ]
              },
              {
                type: 'text',
                text: analysis.tw_market_summary,
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'sm'
              }
            ]
          },

          // 連動性分析
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '🔗 美台連動性',
                weight: 'bold',
                size: 'md',
                color: '#333333'
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '連動分數',
                    size: 'sm',
                    color: '#555555',
                    flex: 0
                  },
                  {
                    type: 'text',
                    text: `${analysis.correlation_score} 分`,
                    size: 'sm',
                    color: '#1DB446',
                    align: 'end',
                    weight: 'bold'
                  }
                ]
              },
              {
                type: 'text',
                text: analysis.correlation_analysis,
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'sm'
              }
            ]
          },

          // 走勢預測
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '🔮 台股走勢預測',
                weight: 'bold',
                size: 'md',
                color: '#333333'
              },
              // 3天預測
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'xs',
                paddingAll: '12px',
                backgroundColor: '#e8f5e9',
                cornerRadius: '8px',
                contents: [
                  {
                    type: 'text',
                    text: '📅 未來 3 天',
                    size: 'sm',
                    weight: 'bold',
                    color: '#2e7d32'
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'sm',
                    contents: [
                      {
                        type: 'text',
                        text: analysis.tw_3day_forecast.direction,
                        size: 'sm',
                        color: '#333333',
                        weight: 'bold'
                      },
                      {
                        type: 'text',
                        text: `機率 ${analysis.tw_3day_forecast.probability}%`,
                        size: 'sm',
                        color: '#666666',
                        align: 'end'
                      }
                    ]
                  },
                  {
                    type: 'text',
                    text: analysis.tw_3day_forecast.reason,
                    size: 'xs',
                    color: '#666666',
                    wrap: true,
                    margin: 'sm'
                  }
                ]
              },
              // 10天預測
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'xs',
                paddingAll: '12px',
                backgroundColor: '#e3f2fd',
                cornerRadius: '8px',
                contents: [
                  {
                    type: 'text',
                    text: '📅 未來 10 天',
                    size: 'sm',
                    weight: 'bold',
                    color: '#1565c0'
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'sm',
                    contents: [
                      {
                        type: 'text',
                        text: analysis.tw_10day_forecast.direction,
                        size: 'sm',
                        color: '#333333',
                        weight: 'bold'
                      },
                      {
                        type: 'text',
                        text: `機率 ${analysis.tw_10day_forecast.probability}%`,
                        size: 'sm',
                        color: '#666666',
                        align: 'end'
                      }
                    ]
                  },
                  {
                    type: 'text',
                    text: analysis.tw_10day_forecast.reason,
                    size: 'xs',
                    color: '#666666',
                    wrap: true,
                    margin: 'sm'
                  }
                ]
              }
            ]
          },

          // 投資策略
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '💡 投資策略',
                weight: 'bold',
                size: 'md',
                color: '#333333'
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '建議策略',
                    size: 'sm',
                    color: '#555555',
                    flex: 0
                  },
                  {
                    type: 'text',
                    text: analysis.strategy,
                    size: 'sm',
                    color: '#1DB446',
                    align: 'end',
                    weight: 'bold'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'xs',
                contents: [
                  {
                    type: 'text',
                    text: '推薦族群',
                    size: 'xs',
                    color: '#555555'
                  },
                  {
                    type: 'text',
                    text: analysis.recommended_sectors.join('、'),
                    size: 'sm',
                    color: '#333333',
                    wrap: true,
                    margin: 'xs'
                  }
                ]
              }
            ]
          },

          // 風險提示
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            paddingAll: '12px',
            backgroundColor: '#fff3e0',
            cornerRadius: '8px',
            contents: [
              {
                type: 'text',
                text: '⚠️ 風險提示',
                weight: 'bold',
                size: 'sm',
                color: '#e65100'
              },
              {
                type: 'text',
                text: analysis.risk_factors.map(r => `• ${r}`).join('\n'),
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'sm'
              }
            ]
          },

          // 關鍵重點
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '🎯 關鍵重點',
                weight: 'bold',
                size: 'md',
                color: '#333333'
              },
              {
                type: 'text',
                text: analysis.key_points.map((p, i) => `${i + 1}. ${p}`).join('\n'),
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'md'
              }
            ]
          },

          // 操作建議
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            paddingAll: '12px',
            backgroundColor: '#e8f5e9',
            cornerRadius: '8px',
            contents: [
              {
                type: 'text',
                text: '📋 操作建議',
                weight: 'bold',
                size: 'sm',
                color: '#2e7d32'
              },
              {
                type: 'text',
                text: analysis.action_plan,
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'sm'
              }
            ]
          }
        ]
      }
    }
  };
}

/**
 * 生成單一指數資訊框
 */
function generateIndexBox(name, indexData) {
  const getTrendColor = (trend) => {
    if (trend === '多頭') return '#00C851';
    if (trend === '空頭') return '#ff4444';
    return '#ffbb33';
  };

  return {
    type: 'box',
    layout: 'vertical',
    margin: 'md',
    spacing: 'sm',
    paddingAll: '12px',
    backgroundColor: '#f8f9fa',
    cornerRadius: '8px',
    contents: [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: name,
            weight: 'bold',
            size: 'sm',
            color: '#333333'
          },
          {
            type: 'text',
            text: indexData.price,
            size: 'sm',
            color: '#333333',
            align: 'end',
            weight: 'bold'
          }
        ]
      },
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'sm',
        contents: [
          {
            type: 'text',
            text: `KD: ${indexData.kd.K}/${indexData.kd.D}`,
            size: 'xs',
            color: '#666666',
            flex: 1
          },
          {
            type: 'text',
            text: indexData.trend,
            size: 'xs',
            color: getTrendColor(indexData.trend),
            align: 'end',
            weight: 'bold'
          }
        ]
      }
    ]
  };
}

module.exports = {
  generateUSMarketFlexMessage
};

