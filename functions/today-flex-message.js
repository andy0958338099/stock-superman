/**
 * 今日推薦 Flex Message 模板
 * 展示 TOP 3 推薦股票
 */

/**
 * 生成單一股票推薦卡片
 */
function generateStockCard(recommendation, stockData) {
  const { rank, stockId, stockName, reason, targetPrice, buyPrice, risk, confidence, allocationPercent, expectedReturn } = recommendation;
  const { latestPrice, technicalAnalysis, fundamentalAnalysis, totalScore } = stockData;

  // 安全取值
  const safeTargetPrice = targetPrice || latestPrice * 1.05;
  const safeBuyPrice = buyPrice || latestPrice * 0.97;
  const safeAllocationPercent = allocationPercent || 33;
  const safeConfidence = confidence || 5;

  // 計算預期漲幅
  const expectedGain = ((safeTargetPrice - latestPrice) / latestPrice * 100).toFixed(1);
  
  // 信心指數顏色
  const getConfidenceColor = (conf) => {
    if (conf >= 8) return '#00C851';
    if (conf >= 6) return '#ffbb33';
    return '#ff4444';
  };
  
  // 排名顏色
  const getRankColor = (r) => {
    if (r === 1) return '#FFD700';
    if (r === 2) return '#C0C0C0';
    return '#CD7F32';
  };
  
  // 排名 emoji
  const getRankEmoji = (r) => {
    if (r === 1) return '🥇';
    if (r === 2) return '🥈';
    return '🥉';
  };

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: `${getRankEmoji(rank)} 第 ${rank} 名`,
          weight: 'bold',
          size: 'lg',
          color: getRankColor(rank)
        },
        {
          type: 'text',
          text: `信心 ${safeConfidence}/10`,
          size: 'sm',
          color: getConfidenceColor(safeConfidence),
          align: 'end'
        }
      ],
      backgroundColor: '#1a1a2e'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        // 股票名稱
        {
          type: 'text',
          text: `${stockName}（${stockId}）`,
          weight: 'bold',
          size: 'xl',
          color: '#ffffff'
        },
        // 股價資訊
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: `現價 ${latestPrice}`,
              size: 'lg',
              color: '#00ff88',
              weight: 'bold'
            },
            {
              type: 'text',
              text: `目標 ${safeTargetPrice}`,
              size: 'lg',
              color: '#ffbb33',
              align: 'end'
            }
          ]
        },
        {
          type: 'separator',
          color: '#333333'
        },
        // 推薦理由
        {
          type: 'text',
          text: '📌 推薦理由',
          size: 'sm',
          color: '#aaaaaa'
        },
        {
          type: 'text',
          text: reason,
          size: 'sm',
          color: '#ffffff',
          wrap: true
        },
        // 技術指標
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '技術面', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: `${technicalAnalysis.score}分`, size: 'sm', color: '#00ff88', weight: 'bold' }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '基本面', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: `${fundamentalAnalysis.score}分`, size: 'sm', color: '#00ff88', weight: 'bold' }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '預期漲幅', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: `+${expectedGain}%`, size: 'sm', color: '#ffbb33', weight: 'bold' }
              ]
            }
          ]
        },
        {
          type: 'separator',
          color: '#333333'
        },
        // 操作建議
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '建議買入', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: `${safeBuyPrice} 元`, size: 'sm', color: '#00C851', weight: 'bold' }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '建議比例', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: `${safeAllocationPercent}%`, size: 'sm', color: '#ffffff', weight: 'bold' }
              ]
            }
          ]
        }
      ],
      backgroundColor: '#1a1a2e'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `⚠️ ${risk}`,
          size: 'xs',
          color: '#ff6b6b',
          wrap: true
        }
      ],
      backgroundColor: '#1a1a2e'
    }
  };
}

/**
 * 生成今日推薦的完整 Flex Message（Carousel）
 */
function generateTodayRecommendationFlexMessage(result) {
  const { date, updateTime, top3Stocks, aiRecommendation, fromCache, cacheRemaining } = result;

  // 生成 3 張股票卡片
  const stockCards = aiRecommendation.recommendations.map((rec, index) => {
    return generateStockCard(rec, top3Stocks[index]);
  });

  // 快取狀態文字
  const cacheStatus = fromCache
    ? `📦 快取資料（剩餘 ${cacheRemaining || 0} 分鐘更新）`
    : `⚡ 即時分析`;

  // 加入總結卡片
  const summaryCard = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '📊 今日投資策略',
          weight: 'bold',
          size: 'lg',
          color: '#FFD700'
        },
        {
          type: 'text',
          text: `${date} ${updateTime} 更新`,
          size: 'xs',
          color: '#aaaaaa'
        },
        {
          type: 'text',
          text: cacheStatus,
          size: 'xxs',
          color: fromCache ? '#888888' : '#00ff88'
        }
      ],
      backgroundColor: '#1a1a2e'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        // 市場觀點
        {
          type: 'text',
          text: '🌐 市場觀點',
          size: 'sm',
          color: '#00ff88',
          weight: 'bold'
        },
        {
          type: 'text',
          text: aiRecommendation.marketOutlook,
          size: 'sm',
          color: '#ffffff',
          wrap: true
        },
        {
          type: 'separator',
          color: '#333333',
          margin: 'md'
        },
        // 投資策略
        {
          type: 'text',
          text: '💡 投資策略',
          size: 'sm',
          color: '#ffbb33',
          weight: 'bold'
        },
        {
          type: 'text',
          text: aiRecommendation.investmentStrategy,
          size: 'sm',
          color: '#ffffff',
          wrap: true
        },
        {
          type: 'separator',
          color: '#333333',
          margin: 'md'
        },
        // 資金配置
        {
          type: 'text',
          text: '💰 建議資金配置比例',
          size: 'sm',
          color: '#00C851',
          weight: 'bold'
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'sm',
          contents: aiRecommendation.recommendations.map(rec => ({
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: `${rec.stockName}`,
                size: 'sm',
                color: '#ffffff',
                flex: 2
              },
              {
                type: 'text',
                text: `${rec.allocationPercent || 33}%`,
                size: 'sm',
                color: '#00ff88',
                align: 'end',
                flex: 1
              }
            ]
          }))
        },
        {
          type: 'separator',
          color: '#333333',
          margin: 'md'
        },
        // 風險提醒
        {
          type: 'text',
          text: '⚠️ 風險提醒',
          size: 'sm',
          color: '#ff6b6b',
          weight: 'bold'
        },
        {
          type: 'text',
          text: '投資有風險，本推薦僅供參考。建議設定停損（-5%）停利（+10%），分批布局降低風險。',
          size: 'xs',
          color: '#aaaaaa',
          wrap: true
        }
      ],
      backgroundColor: '#1a1a2e'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '👈 左滑查看詳細推薦',
          size: 'xs',
          color: '#888888',
          align: 'center'
        }
      ],
      backgroundColor: '#1a1a2e'
    }
  };

  return {
    type: 'flex',
    altText: `📈 今日推薦 TOP 3（${date}）`,
    contents: {
      type: 'carousel',
      contents: [summaryCard, ...stockCards]
    }
  };
}

module.exports = {
  generateTodayRecommendationFlexMessage,
  generateStockCard
};

