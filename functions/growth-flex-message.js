/**
 * 高成長推薦 Flex Message 模板
 * 展示被低估的電子股 TOP 3
 */

/**
 * 生成單一股票卡片
 */
function generateGrowthStockCard(recommendation, stockData) {
  const { rank, stockId, stockName, sector, reason, targetPrice, buyPrice, risk, confidence, allocationPercent, expectedReturn, catalyst } = recommendation;
  const { latestPrice, undervalueScore, momentumScore, fundamentals, pricePosition, recentGain, newsSentiment } = stockData;

  const safeTargetPrice = targetPrice || latestPrice * 1.1;
  const safeBuyPrice = buyPrice || latestPrice * 0.97;
  const safeConfidence = confidence || 5;
  const safeAllocation = allocationPercent || 33;
  const expectedGain = ((safeTargetPrice - latestPrice) / latestPrice * 100).toFixed(1);

  const getRankEmoji = (r) => r === 1 ? '🥇' : r === 2 ? '🥈' : '🥉';
  const getRankColor = (r) => r === 1 ? '#FFD700' : r === 2 ? '#C0C0C0' : '#CD7F32';
  const getConfidenceColor = (c) => c >= 7 ? '#00C851' : c >= 5 ? '#ffbb33' : '#ff4444';
  const getSentimentColor = (s) => s >= 60 ? '#00C851' : s >= 40 ? '#ffbb33' : '#ff4444';

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: `${getRankEmoji(rank)} 第 ${rank} 名`, weight: 'bold', size: 'lg', color: getRankColor(rank) },
        { type: 'text', text: `信心 ${safeConfidence}/10`, size: 'sm', color: getConfidenceColor(safeConfidence), align: 'end', gravity: 'center' }
      ],
      backgroundColor: '#1a1a2e'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        // 股票名稱與產業
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: `${stockName}（${stockId}）`, weight: 'bold', size: 'xl', color: '#ffffff', flex: 3 },
            { type: 'text', text: sector || '電子', size: 'xs', color: '#00bfff', align: 'end', gravity: 'center', flex: 1 }
          ]
        },
        // 現價與目標價
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: `現價 ${latestPrice}`, size: 'md', color: '#aaaaaa' },
            { type: 'text', text: `目標 ${Math.round(safeTargetPrice)}`, size: 'md', color: '#00ff88', align: 'end', weight: 'bold' }
          ]
        },
        { type: 'separator', color: '#333333' },
        // 推薦理由
        { type: 'text', text: '💎 低估原因', size: 'sm', color: '#00bfff', weight: 'bold' },
        { type: 'text', text: reason || '基本面佳，價格尚未反映', size: 'sm', color: '#ffffff', wrap: true },
        // 啟動催化劑
        { type: 'text', text: `🚀 催化劑：${catalyst || '產業需求回升'}`, size: 'xs', color: '#ffbb33', margin: 'sm' },
        { type: 'separator', color: '#333333' },
        // 評分
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'box', layout: 'vertical',
              contents: [
                { type: 'text', text: '低估', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: `${undervalueScore}分`, size: 'sm', color: '#00ff88', weight: 'bold' }
              ]
            },
            {
              type: 'box', layout: 'vertical',
              contents: [
                { type: 'text', text: '動能', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: `${momentumScore}分`, size: 'sm', color: '#00bfff', weight: 'bold' }
              ]
            },
            {
              type: 'box', layout: 'vertical',
              contents: [
                { type: 'text', text: '新聞', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: newsSentiment.sentiment, size: 'sm', color: getSentimentColor(newsSentiment.score), weight: 'bold' }
              ]
            },
            {
              type: 'box', layout: 'vertical',
              contents: [
                { type: 'text', text: '漲幅', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: `+${expectedGain}%`, size: 'sm', color: '#ffbb33', weight: 'bold' }
              ]
            }
          ]
        },
        { type: 'separator', color: '#333333' },
        // 數據
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'box', layout: 'vertical',
              contents: [
                { type: 'text', text: '本益比', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: `${fundamentals.peRatio}`, size: 'sm', color: '#ffffff', weight: 'bold' }
              ]
            },
            {
              type: 'box', layout: 'vertical',
              contents: [
                { type: 'text', text: '52週位置', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: `${pricePosition.position}%`, size: 'sm', color: pricePosition.position < 50 ? '#00ff88' : '#ffbb33', weight: 'bold' }
              ]
            },
            {
              type: 'box', layout: 'vertical',
              contents: [
                { type: 'text', text: '近5日', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: `${recentGain.gain5d}%`, size: 'sm', color: parseFloat(recentGain.gain5d) > 0 ? '#ff6b6b' : '#00ff88', weight: 'bold' }
              ]
            }
          ]
        },
        { type: 'separator', color: '#333333' },
        // 操作建議
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'box', layout: 'vertical',
              contents: [
                { type: 'text', text: '建議買入', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: `${Math.round(safeBuyPrice)} 元`, size: 'sm', color: '#00C851', weight: 'bold' }
              ]
            },
            {
              type: 'box', layout: 'vertical',
              contents: [
                { type: 'text', text: '建議比例', size: 'xs', color: '#aaaaaa' },
                { type: 'text', text: `${safeAllocation}%`, size: 'sm', color: '#ffffff', weight: 'bold' }
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
        { type: 'text', text: `⚠️ ${risk || '市場波動風險'}`, size: 'xs', color: '#ff6b6b', align: 'center' }
      ],
      backgroundColor: '#1a1a2e'
    }
  };
}

/**
 * 生成完整 Flex Message
 */
function generateGrowthRecommendationFlexMessage(result) {
  const { date, updateTime, top3Stocks, aiRecommendation, fromCache, cacheRemaining } = result;

  const stockCards = aiRecommendation.recommendations.map((rec, index) =>
    generateGrowthStockCard(rec, top3Stocks[index])
  );

  // 快取狀態文字
  const cacheStatus = fromCache
    ? `📦 快取資料（剩餘 ${cacheRemaining || 0} 分鐘更新）`
    : `⚡ 即時分析`;

  const summaryCard = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '🚀 高成長電子股', weight: 'bold', size: 'lg', color: '#00bfff' },
        { type: 'text', text: `${date} ${updateTime} 更新`, size: 'xs', color: '#aaaaaa' },
        { type: 'text', text: cacheStatus, size: 'xxs', color: fromCache ? '#888888' : '#00ff88' }
      ],
      backgroundColor: '#1a1a2e'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        { type: 'text', text: '💎 尋找被低估的寶石', size: 'md', color: '#ffffff', weight: 'bold' },
        { type: 'text', text: '篩選條件：', size: 'xs', color: '#aaaaaa', margin: 'md' },
        { type: 'text', text: '• 電子股（半導體/AI/伺服器）', size: 'xs', color: '#ffffff' },
        { type: 'text', text: '• 本益比低於同業平均', size: 'xs', color: '#ffffff' },
        { type: 'text', text: '• 股價尚未飆漲啟動', size: 'xs', color: '#ffffff' },
        { type: 'text', text: '• 新聞情緒正向', size: 'xs', color: '#ffffff' },
        { type: 'separator', color: '#333333', margin: 'md' },
        { type: 'text', text: '📈 產業展望', size: 'sm', color: '#00bfff', weight: 'bold' },
        { type: 'text', text: aiRecommendation.sectorOutlook || '電子產業持續成長', size: 'sm', color: '#ffffff', wrap: true },
        { type: 'separator', color: '#333333', margin: 'md' },
        { type: 'text', text: '📊 投資策略', size: 'sm', color: '#ffbb33', weight: 'bold' },
        { type: 'text', text: aiRecommendation.investmentStrategy || '分批布局，逢低加碼', size: 'sm', color: '#ffffff', wrap: true },
        { type: 'separator', color: '#333333', margin: 'md' },
        { type: 'text', text: '💰 建議資金配置', size: 'sm', color: '#00C851', weight: 'bold' },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'sm',
          contents: aiRecommendation.recommendations.map(rec => ({
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: rec.stockName, size: 'sm', color: '#ffffff', flex: 2 },
              { type: 'text', text: `${rec.allocationPercent || 33}%`, size: 'sm', color: '#00ff88', align: 'end', flex: 1 }
            ]
          }))
        },
        { type: 'separator', color: '#333333', margin: 'md' },
        { type: 'text', text: '⚠️ 風險提醒', size: 'sm', color: '#ff6b6b', weight: 'bold' },
        { type: 'text', text: '高成長股波動較大，建議設定停損（-8%）停利（+15%），分批進場。', size: 'xs', color: '#aaaaaa', wrap: true }
      ],
      backgroundColor: '#1a1a2e'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '👈 左滑查看詳細推薦', size: 'xs', color: '#888888', align: 'center' }
      ],
      backgroundColor: '#1a1a2e'
    }
  };

  return {
    type: 'flex',
    altText: `🚀 高成長電子股 TOP 3（${date}）`,
    contents: {
      type: 'carousel',
      contents: [summaryCard, ...stockCards]
    },
    quickReply: {
      items: [
        {
          type: 'action',
          action: { type: 'message', label: '🎯 今天', text: '今天' }
        },
        {
          type: 'action',
          action: { type: 'message', label: '🚀 高成長', text: '高成長' }
        },
        {
          type: 'action',
          action: { type: 'message', label: '🔥 瘋狂', text: '瘋狂' }
        },
        {
          type: 'action',
          action: {
            type: 'uri',
            label: '📤 分享給朋友',
            uri: `https://line.me/R/share?text=${encodeURIComponent('🚀 推薦超好用的 AI 股票分析！\n\n📈 每日精選 TOP 3 高勝率股票\n🔥 高成長、瘋狂策略任你選\n\n立即加入 👉 https://line.me/R/ti/p/@754zptsk')}`
          }
        }
      ]
    }
  };
}

module.exports = { generateGrowthRecommendationFlexMessage, generateGrowthStockCard };
