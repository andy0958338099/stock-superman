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

  // 使用中等版本，包含更多信息但避免超過 LINE 限制
  console.log('📊 使用中等版 Flex Message（平衡信息量與大小限制）');
  return generateMediumUSMarketFlexMessage(analysisResult);

  const { sp500, nasdaq, tsmAdr, twii, usdTwd, vix } = data;

  // 判斷趨勢顏色
  const getTrendColor = (status) => {
    if (status === '多頭') return '#00C851';
    if (status === '空頭') return '#ff4444';
    return '#ffbb33';
  };

  // 判斷趨勢 Emoji
  const getTrendEmoji = (status) => {
    if (status === '多頭' || status === '偏多') return '📈';
    if (status === '空頭' || status === '偏空') return '📉';
    return '➡️';
  };

  // 生成傳導分析區塊
  const generateTransmissionBox = (title, content) => {
    return {
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      spacing: 'xs',
      paddingAll: '10px',
      backgroundColor: '#f5f5f5',
      cornerRadius: '6px',
      contents: [
        {
          type: 'text',
          text: title,
          size: 'xs',
          color: '#1DB446',
          weight: 'bold'
        },
        {
          type: 'text',
          text: content,
          size: 'xs',
          color: '#666666',
          wrap: true,
          margin: 'xs'
        }
      ]
    };
  };

  // 生成類股標籤
  const generateSectorTag = (sector, type) => {
    const colors = {
      positive: '#00C851',
      negative: '#ff4444',
      neutral: '#ffbb33'
    };
    return {
      type: 'text',
      text: sector,
      size: 'xs',
      color: '#ffffff',
      backgroundColor: colors[type] || '#999999',
      paddingAll: '4px',
      paddingStart: '8px',
      paddingEnd: '8px',
      cornerRadius: '4px',
      flex: 0,
      margin: 'xs'
    };
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

          // 傳導分析（新增）
          ...(analysis.transmission_analysis &&
              analysis.transmission_analysis.index_to_tw_weights ? [{
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '🔄 美股→台股傳導分析',
                weight: 'bold',
                size: 'md',
                color: '#333333'
              },
              ...(analysis.transmission_analysis.index_to_tw_weights ? [generateTransmissionBox('📊 指數→權值股', analysis.transmission_analysis.index_to_tw_weights)] : []),
              ...(analysis.transmission_analysis.tech_to_semiconductor ? [generateTransmissionBox('💻 科技股→半導體', analysis.transmission_analysis.tech_to_semiconductor)] : []),
              ...(analysis.transmission_analysis.risk_to_capital ? [generateTransmissionBox('⚠️ 風險→資金偏好', analysis.transmission_analysis.risk_to_capital)] : []),
              ...(analysis.transmission_analysis.futures_to_gap ? [generateTransmissionBox('🌙 期貨→跳空機率', analysis.transmission_analysis.futures_to_gap)] : [])
            ]
          }] : []),

          // 類股影響（新增）
          ...(analysis.sector_impact && analysis.sector_impact.positive && Array.isArray(analysis.sector_impact.positive) && analysis.sector_impact.positive.length > 0 ? [{
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '📈 類股影響分析',
                weight: 'bold',
                size: 'md',
                color: '#333333'
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '✅ 受惠類股',
                    size: 'xs',
                    color: '#00C851',
                    weight: 'bold'
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    spacing: 'xs',
                    wrap: true,
                    contents: analysis.sector_impact.positive.map(sector => generateSectorTag(sector, 'positive'))
                  }
                ]
              },
              ...(analysis.sector_impact.negative && Array.isArray(analysis.sector_impact.negative) && analysis.sector_impact.negative.length > 0 ? [{
                type: 'box',
                layout: 'vertical',
                margin: 'sm',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '⚠️ 受壓類股',
                    size: 'xs',
                    color: '#ff4444',
                    weight: 'bold'
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    spacing: 'xs',
                    wrap: true,
                    contents: analysis.sector_impact.negative.map(sector => generateSectorTag(sector, 'negative'))
                  }
                ]
              }] : []),
              ...(analysis.sector_impact.potential_stocks ? [{
                type: 'text',
                text: `💡 ${analysis.sector_impact.potential_stocks}`,
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'sm'
              }] : [])
            ]
          }] : []),

          // 走勢預測（支持新舊格式）
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
              // 短線 1-3 天預測（新格式）
              ...(analysis.forecast && analysis.forecast.short_term_1_3days ? [{
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
                    text: '📅 短線（1-3 天）',
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
                        text: `${getTrendEmoji(analysis.forecast.short_term_1_3days.direction)} ${analysis.forecast.short_term_1_3days.direction}`,
                        size: 'sm',
                        color: '#333333',
                        weight: 'bold'
                      },
                      {
                        type: 'text',
                        text: `機率 ${analysis.forecast.short_term_1_3days.probability}%`,
                        size: 'sm',
                        color: '#666666',
                        align: 'end'
                      }
                    ]
                  },
                  ...(analysis.forecast.short_term_1_3days.scenario ? [{
                    type: 'text',
                    text: `📌 ${analysis.forecast.short_term_1_3days.scenario}`,
                    size: 'xs',
                    color: '#666666',
                    wrap: true,
                    margin: 'sm'
                  }] : []),
                  ...(analysis.forecast.short_term_1_3days.trigger_condition ? [{
                    type: 'text',
                    text: `🎯 ${analysis.forecast.short_term_1_3days.trigger_condition}`,
                    size: 'xs',
                    color: '#1DB446',
                    wrap: true,
                    margin: 'xs',
                    weight: 'bold'
                  }] : [])
                ]
              }] :
              // 舊格式 3 天預測（向後兼容）
              analysis.tw_3day_forecast ? [{
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
              }] : []),
              // 中期 1 週預測（新格式）
              ...(analysis.forecast && analysis.forecast.mid_term_1week ? [{
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
                    text: '📅 中期（1 週）',
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
                        text: `${getTrendEmoji(analysis.forecast.mid_term_1week.direction)} ${analysis.forecast.mid_term_1week.direction}`,
                        size: 'sm',
                        color: '#333333',
                        weight: 'bold'
                      },
                      {
                        type: 'text',
                        text: `機率 ${analysis.forecast.mid_term_1week.probability}%`,
                        size: 'sm',
                        color: '#666666',
                        align: 'end'
                      }
                    ]
                  },
                  {
                    type: 'text',
                    text: analysis.forecast.mid_term_1week.reason,
                    size: 'xs',
                    color: '#666666',
                    wrap: true,
                    margin: 'sm'
                  }
                ]
              }] :
              // 舊格式 10 天預測（向後兼容）
              analysis.tw_10day_forecast ? [{
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
              }] : []),
              // 🚀 移除波段 10 天預測，減少 AI 生成時間
            ]
          },

          // 機會與風險警示（新增）
          ...(analysis.opportunity_alert || analysis.risk_alert ? [{
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '⚡ 市場警示',
                weight: 'bold',
                size: 'md',
                color: '#333333'
              },
              ...(analysis.opportunity_alert ? [{
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'xs',
                paddingAll: '10px',
                backgroundColor: '#e8f5e9',
                cornerRadius: '6px',
                contents: [
                  {
                    type: 'text',
                    text: '🎯 機會警示',
                    size: 'xs',
                    color: '#00C851',
                    weight: 'bold'
                  },
                  {
                    type: 'text',
                    text: analysis.opportunity_alert,
                    size: 'xs',
                    color: '#333333',
                    wrap: true,
                    margin: 'xs'
                  }
                ]
              }] : []),
              ...(analysis.risk_alert ? [{
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'xs',
                paddingAll: '10px',
                backgroundColor: '#ffebee',
                cornerRadius: '6px',
                contents: [
                  {
                    type: 'text',
                    text: '⚠️ 風險警示',
                    size: 'xs',
                    color: '#ff4444',
                    weight: 'bold'
                  },
                  {
                    type: 'text',
                    text: analysis.risk_alert,
                    size: 'xs',
                    color: '#333333',
                    wrap: true,
                    margin: 'xs'
                  }
                ]
              }] : [])
            ]
          }] : []),

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
              ...(analysis.key_levels ? [{
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'xs',
                contents: [
                  {
                    type: 'text',
                    text: '🎯 關鍵價位',
                    size: 'xs',
                    color: '#555555'
                  },
                  {
                    type: 'text',
                    text: analysis.key_levels,
                    size: 'sm',
                    color: '#1DB446',
                    wrap: true,
                    margin: 'xs',
                    weight: 'bold'
                  }
                ]
              }] : []),
              ...(analysis.watch_sectors && Array.isArray(analysis.watch_sectors) && analysis.watch_sectors.length > 0 ? [{
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'xs',
                contents: [
                  {
                    type: 'text',
                    text: '👀 值得觀察',
                    size: 'xs',
                    color: '#555555'
                  },
                  {
                    type: 'text',
                    text: analysis.watch_sectors.join('、'),
                    size: 'sm',
                    color: '#333333',
                    wrap: true,
                    margin: 'xs'
                  }
                ]
              }] :
              // 舊格式推薦族群（向後兼容）
              (analysis.recommended_sectors && Array.isArray(analysis.recommended_sectors) && analysis.recommended_sectors.length > 0) ? [{
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
              }] : [])
            ]
          },

          // 風險提示
          ...(analysis.risk_factors && Array.isArray(analysis.risk_factors) && analysis.risk_factors.length > 0 ? [{
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
          }] : []),

          // 關鍵重點
          // 關鍵重點（條件式渲染）
          ...(analysis.key_points && Array.isArray(analysis.key_points) && analysis.key_points.length > 0 ? [{
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
          }] : []),

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

/**
 * 生成中等版美股市場分析 Flex Message（平衡信息量與大小）
 * @param {object} analysisResult - 美股分析結果
 * @returns {object} - LINE Flex Message
 */
function generateMediumUSMarketFlexMessage(analysisResult) {
  const { data, analysis } = analysisResult;
  const { sp500, nasdaq, tsmAdr, twii, usdTwd, vix } = data;

  // 判斷趨勢顏色
  const getTrendColor = (status) => {
    if (status === '多頭' || status === '偏多') return '#00C851';
    if (status === '空頭' || status === '偏空') return '#ff4444';
    return '#ffbb33';
  };

  // 判斷趨勢 Emoji
  const getTrendEmoji = (status) => {
    if (status === '多頭' || status === '偏多') return '📈';
    if (status === '空頭' || status === '偏空') return '📉';
    return '➡️';
  };

  // 格式化時間
  const now = new Date();
  const formattedTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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
            text: `更新：${formattedTime}`,
            size: 'xs',
            color: '#aaaaaa',
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'xl'
          },

          // 美股狀態
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '📊 美股市場',
                weight: 'bold',
                size: 'md'
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
              ...(analysis.us_market_summary && analysis.us_market_summary.trim() ? [{
                type: 'text',
                text: analysis.us_market_summary,
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'sm'
              }] : [])
            ]
          },

          // 台股狀態
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '🇹🇼 台股市場',
                weight: 'bold',
                size: 'md'
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
              ...(analysis.tw_market_summary && analysis.tw_market_summary.trim() ? [{
                type: 'text',
                text: analysis.tw_market_summary,
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'sm'
              }] : [])
            ]
          },

          // VIX 恐慌指數和匯率
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '📊 市場指標',
                weight: 'bold',
                size: 'md'
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: 'VIX 恐慌指數',
                    size: 'sm',
                    color: '#555555',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: vix && vix.close ? vix.close.toFixed(2) : '0.00',
                    size: 'sm',
                    color: vix && vix.close > 20 ? '#ff4444' : (vix && vix.close > 15 ? '#ffbb33' : '#00C851'),
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
                    text: 'USD/TWD 匯率',
                    size: 'sm',
                    color: '#555555',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: usdTwd && usdTwd.rate ? usdTwd.rate.toFixed(2) : '0.00',
                    size: 'sm',
                    color: '#333333',
                    align: 'end',
                    weight: 'bold'
                  }
                ]
              },
              {
                type: 'text',
                text: vix && vix.close ? (vix.close > 20 ? '⚠️ 市場恐慌情緒較高' : (vix.close > 15 ? '⚡ 市場波動適中' : '✅ 市場情緒穩定')) : '⚠️ VIX 資料未取得',
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'sm'
              }
            ]
          },

          // 連動性
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '🔗 美台連動',
                weight: 'bold',
                size: 'md'
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
              ...(analysis.correlation_analysis && analysis.correlation_analysis.trim() ? [{
                type: 'text',
                text: analysis.correlation_analysis,
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'sm'
              }] : [])
            ]
          },

          // 短線預測
          ...(analysis.forecast && analysis.forecast.short_term_1_3days ? [{
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '🔮 短線預測（1-3天）',
                weight: 'bold',
                size: 'md'
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: `${getTrendEmoji(analysis.forecast.short_term_1_3days.direction)} ${analysis.forecast.short_term_1_3days.direction}`,
                    size: 'sm',
                    weight: 'bold'
                  },
                  {
                    type: 'text',
                    text: `機率 ${analysis.forecast.short_term_1_3days.probability}%`,
                    size: 'sm',
                    color: '#666666',
                    align: 'end'
                  }
                ]
              },
              ...(analysis.forecast.short_term_1_3days.reason && analysis.forecast.short_term_1_3days.reason.trim() ? [{
                type: 'text',
                text: `📌 ${analysis.forecast.short_term_1_3days.reason}`,
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'sm'
              }] : []),
              ...(analysis.forecast.short_term_1_3days.key_observation && analysis.forecast.short_term_1_3days.key_observation.trim() ? [{
                type: 'text',
                text: `🎯 ${analysis.forecast.short_term_1_3days.key_observation}`,
                size: 'xs',
                color: '#1DB446',
                wrap: true,
                margin: 'xs',
                weight: 'bold'
              }] : [])
            ]
          }] : []),

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
                size: 'md'
              },
              {
                type: 'text',
                text: (analysis.strategy && analysis.strategy.trim()) ? analysis.strategy : '請謹慎操作，等待市場明確訊號',
                size: 'sm',
                color: '#333333',
                wrap: true,
                margin: 'md'
              },
              ...(analysis.key_levels && analysis.key_levels.trim() ? [{
                type: 'text',
                text: `🎯 ${analysis.key_levels}`,
                size: 'xs',
                color: '#1DB446',
                wrap: true,
                margin: 'sm',
                weight: 'bold'
              }] : [])
            ]
          },

          // 風險提示
          ...(analysis.risk_factors && Array.isArray(analysis.risk_factors) && analysis.risk_factors.length > 0 ? [{
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
                text: analysis.risk_factors.slice(0, 4).map(r => `• ${r}`).join('\n'),
                size: 'xs',
                color: '#333333',
                wrap: true,
                margin: 'sm'
              }
            ]
          }] : []),

          // 免責聲明
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            paddingAll: '10px',
            backgroundColor: '#f5f5f5',
            cornerRadius: '6px',
            contents: [
              {
                type: 'text',
                text: '⚠️ 本分析僅供參考，不構成投資建議',
                size: 'xxs',
                color: '#999999',
                align: 'center'
              }
            ]
          }
        ]
      }
    }
  };
}

/**
 * 生成簡化版美股市場分析 Flex Message（用於內容過大時）
 * @param {object} analysisResult - 美股分析結果
 * @returns {object} - LINE Flex Message
 */
function generateSimplifiedUSMarketFlexMessage(analysisResult) {
  const { data, analysis } = analysisResult;
  const { sp500, nasdaq, tsmAdr, twii, usdTwd, vix } = data;

  // 判斷趨勢顏色
  const getTrendColor = (status) => {
    if (status === '多頭' || status === '偏多') return '#00C851';
    if (status === '空頭' || status === '偏空') return '#ff4444';
    return '#ffbb33';
  };

  // 判斷趨勢 Emoji
  const getTrendEmoji = (status) => {
    if (status === '多頭' || status === '偏多') return '📈';
    if (status === '空頭' || status === '偏空') return '📉';
    return '➡️';
  };

  // 格式化時間
  const now = new Date();
  const formattedTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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
            text: `更新：${formattedTime}`,
            size: 'xs',
            color: '#aaaaaa',
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'xl'
          },

          // 美股狀態
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '📊 美股市場',
                weight: 'bold',
                size: 'md'
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
              // 只有當 summary 不為空時才顯示
              ...(analysis.us_market_summary && analysis.us_market_summary.trim() ? [{
                type: 'text',
                text: analysis.us_market_summary,
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'sm'
              }] : [])
            ]
          },

          // 台股狀態
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '🇹🇼 台股市場',
                weight: 'bold',
                size: 'md'
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
              }
            ]
          },

          // VIX 恐慌指數和匯率
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '📊 市場指標',
                weight: 'bold',
                size: 'md'
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: 'VIX',
                    size: 'sm',
                    color: '#555555',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: vix && vix.close ? vix.close.toFixed(2) : '0.00',
                    size: 'sm',
                    color: vix && vix.close > 20 ? '#ff4444' : '#00C851',
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
                    text: 'USD/TWD',
                    size: 'sm',
                    color: '#555555',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: usdTwd && usdTwd.rate ? usdTwd.rate.toFixed(2) : '0.00',
                    size: 'sm',
                    color: '#333333',
                    align: 'end',
                    weight: 'bold'
                  }
                ]
              }
            ]
          },

          // 連動性
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '🔗 美台連動',
                weight: 'bold',
                size: 'md'
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
              }
            ]
          },

          // 短線預測
          ...(analysis.forecast && analysis.forecast.short_term_1_3days ? [{
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '🔮 短線預測（1-3天）',
                weight: 'bold',
                size: 'md'
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: `${getTrendEmoji(analysis.forecast.short_term_1_3days.direction)} ${analysis.forecast.short_term_1_3days.direction}`,
                    size: 'sm',
                    weight: 'bold'
                  },
                  {
                    type: 'text',
                    text: `機率 ${analysis.forecast.short_term_1_3days.probability}%`,
                    size: 'sm',
                    color: '#666666',
                    align: 'end'
                  }
                ]
              },
              // 只有當 reason 不為空時才顯示
              ...(analysis.forecast.short_term_1_3days.reason && analysis.forecast.short_term_1_3days.reason.trim() ? [{
                type: 'text',
                text: analysis.forecast.short_term_1_3days.reason,
                size: 'xs',
                color: '#666666',
                wrap: true,
                margin: 'sm'
              }] : [])
            ]
          }] : []),

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
                size: 'md'
              },
              {
                type: 'text',
                text: (analysis.strategy && analysis.strategy.trim()) ? analysis.strategy : '請謹慎操作，等待市場明確訊號',
                size: 'sm',
                color: '#333333',
                wrap: true,
                margin: 'md'
              }
            ]
          },

          // 風險提示
          ...(analysis.risk_factors && Array.isArray(analysis.risk_factors) && analysis.risk_factors.length > 0 ? [{
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
                text: analysis.risk_factors.slice(0, 3).map(r => `• ${r}`).join('\n'),
                size: 'xs',
                color: '#333333',
                wrap: true,
                margin: 'sm'
              }
            ]
          }] : []),

          // 免責聲明
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            paddingAll: '10px',
            backgroundColor: '#f5f5f5',
            cornerRadius: '6px',
            contents: [
              {
                type: 'text',
                text: '⚠️ 本分析僅供參考，不構成投資建議',
                size: 'xxs',
                color: '#999999',
                align: 'center'
              }
            ]
          }
        ]
      }
    }
  };
}

module.exports = {
  generateUSMarketFlexMessage,
  generateSimplifiedUSMarketFlexMessage
};

