/**
 * 瘋狂推薦 Flex Message 模板
 * 展示 TOP 3 瘋狂電子股
 */

/**
 * 生成瘋狂股票卡片
 */
function generateCrazyStockCard(recommendation, stockData) {
  const { rank, stockId, stockName, crazyReason, explosivePotential, aggressiveTarget, stopLoss, confidence, riskWarning, allocationPercent } = recommendation;
  const { latestPrice, crazyScore, volatility, volumeRatio, momentum, technicals } = stockData;

  const safeTarget = aggressiveTarget || Math.round(latestPrice * 1.1);
  const safeStopLoss = stopLoss || Math.round(latestPrice * 0.95);
  const safeConfidence = confidence || 5;
  const expectedGain = ((safeTarget - latestPrice) / latestPrice * 100).toFixed(1);

  const getRankEmoji = (r) => r === 1 ? '🔥' : r === 2 ? '💥' : '⚡';
  const getConfidenceColor = (c) => c >= 8 ? '#ff4444' : c >= 6 ? '#ff8800' : '#ffbb33';

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: getRankEmoji(rank), size: 'xl', flex: 0 },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: `${stockName}`, weight: 'bold', size: 'lg', color: '#ff4444' },
            { type: 'text', text: `${stockId} | 瘋狂指數 ${crazyScore}`, size: 'xs', color: '#ffaa00' }
          ],
          flex: 1,
          margin: 'md'
        }
      ],
      backgroundColor: '#1a1a2e',
      paddingAll: 'lg'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        // 價格資訊
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '現價', size: 'sm', color: '#888888', flex: 1 },
            { type: 'text', text: `$${latestPrice}`, size: 'lg', weight: 'bold', color: '#ffffff', align: 'end', flex: 2 }
          ]
        },
        // 瘋狂指標
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '波動率', size: 'xs', color: '#888888', flex: 1 },
            { type: 'text', text: `${volatility}%`, size: 'sm', color: '#ff6b6b', align: 'end', flex: 1 },
            { type: 'text', text: '量能', size: 'xs', color: '#888888', flex: 1 },
            { type: 'text', text: `${volumeRatio}x`, size: 'sm', color: '#ff6b6b', align: 'end', flex: 1 }
          ]
        },
        // 近期漲幅
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '5日漲幅', size: 'xs', color: '#888888', flex: 1 },
            { type: 'text', text: `${momentum.gain5d}%`, size: 'sm', color: parseFloat(momentum.gain5d) > 0 ? '#00ff88' : '#ff4444', align: 'end', flex: 1 },
            { type: 'text', text: '20日漲幅', size: 'xs', color: '#888888', flex: 1 },
            { type: 'text', text: `${momentum.gain20d}%`, size: 'sm', color: parseFloat(momentum.gain20d) > 0 ? '#00ff88' : '#ff4444', align: 'end', flex: 1 }
          ]
        },
        { type: 'separator', color: '#333333' },
        // 瘋狂原因
        { type: 'text', text: '🔥 瘋狂原因', size: 'sm', color: '#ff8800', weight: 'bold' },
        { type: 'text', text: crazyReason || '動能強勁', size: 'sm', color: '#ffffff', wrap: true },
        // 爆發潛力
        { type: 'text', text: '💥 爆發潛力', size: 'sm', color: '#ff4444', weight: 'bold', margin: 'md' },
        { type: 'text', text: explosivePotential || '持續觀察', size: 'sm', color: '#ffffff', wrap: true },
        { type: 'separator', color: '#333333', margin: 'md' },
        // 目標價與停損
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '激進目標', size: 'xs', color: '#00ff88' },
                { type: 'text', text: `$${safeTarget}`, size: 'md', weight: 'bold', color: '#00ff88' },
                { type: 'text', text: `+${expectedGain}%`, size: 'xs', color: '#00ff88' }
              ],
              flex: 1
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '停損價', size: 'xs', color: '#ff4444' },
                { type: 'text', text: `$${safeStopLoss}`, size: 'md', weight: 'bold', color: '#ff4444' },
                { type: 'text', text: '必設！', size: 'xs', color: '#ff4444' }
              ],
              flex: 1
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '瘋狂度', size: 'xs', color: getConfidenceColor(safeConfidence) },
                { type: 'text', text: `${safeConfidence}/10`, size: 'md', weight: 'bold', color: getConfidenceColor(safeConfidence) },
                { type: 'text', text: '🔥', size: 'xs' }
              ],
              flex: 1
            }
          ]
        }
      ],
      backgroundColor: '#16213e'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `⚠️ ${riskWarning || '高風險高報酬'}`, size: 'xs', color: '#ff6b6b', wrap: true }
      ],
      backgroundColor: '#1a1a2e'
    }
  };
}

/**
 * 生成完整 Flex Message
 */
function generateCrazyRecommendationFlexMessage(result) {
  const { date, updateTime, top3Stocks, aiRecommendation, fromCache, cacheRemaining } = result;

  const stockCards = aiRecommendation.recommendations.map((rec, index) =>
    generateCrazyStockCard(rec, top3Stocks[index])
  );

  const cacheStatus = fromCache 
    ? `📦 快取（剩餘 ${cacheRemaining || 0} 分鐘）` 
    : `⚡ 即時分析`;

  const summaryCard = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '🔥 瘋狂電子股', weight: 'bold', size: 'lg', color: '#ff4444' },
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
        { type: 'text', text: '💥 高波動・高動能・高風險', size: 'md', color: '#ff8800', weight: 'bold' },
        { type: 'text', text: '篩選條件：', size: 'xs', color: '#aaaaaa', margin: 'md' },
        { type: 'text', text: '• 波動率 > 20%（年化）', size: 'xs', color: '#ffffff' },
        { type: 'text', text: '• 成交量爆發 > 1.2x', size: 'xs', color: '#ffffff' },
        { type: 'text', text: '• 近期動能強勁', size: 'xs', color: '#ffffff' },
        { type: 'text', text: '• 技術面轉強', size: 'xs', color: '#ffffff' },
        { type: 'separator', color: '#333333', margin: 'md' },
        { type: 'text', text: '📈 市場動能', size: 'sm', color: '#ff4444', weight: 'bold' },
        { type: 'text', text: aiRecommendation.marketMomentum || '市場波動劇烈', size: 'sm', color: '#ffffff', wrap: true },
        { type: 'separator', color: '#333333', margin: 'md' },
        { type: 'text', text: '⚡ 交易策略', size: 'sm', color: '#ffaa00', weight: 'bold' },
        { type: 'text', text: aiRecommendation.tradingStrategy || '嚴設停損', size: 'sm', color: '#ffffff', wrap: true },
        { type: 'separator', color: '#333333', margin: 'md' },
        { type: 'text', text: '⚠️ 風險警告', size: 'sm', color: '#ff4444', weight: 'bold' },
        { type: 'text', text: '瘋狂股適合短線操作，必須嚴格設定停損！追高風險極大，請控制倉位！', size: 'xs', color: '#ff6b6b', wrap: true }
      ],
      backgroundColor: '#16213e'
    }
  };

  return {
    type: 'flex',
    altText: `🔥 瘋狂電子股推薦 ${date}`,
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
          action: { type: 'message', label: '📊 熱門', text: '熱門' }
        },
        {
          type: 'action',
          action: { type: 'message', label: '📚 功能說明', text: '功能說明' }
        }
      ]
    }
  };
}

module.exports = { generateCrazyRecommendationFlexMessage };

