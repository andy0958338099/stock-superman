/**
 * 新聞分析 Flex Message 模板
 */

/**
 * 生成新聞分析的 Flex Message
 * @param {object} newsAnalysis - 新聞分析結果
 * @returns {object} - LINE Flex Message
 */
function generateNewsFlexMessage(newsAnalysis) {
  const { stock_id, stock_name, analysis, news_count } = newsAnalysis;

  // 判斷情緒顏色
  const getSentimentColor = (sentiment) => {
    if (sentiment.includes('樂觀')) return '#00C851';
    if (sentiment.includes('悲觀')) return '#ff4444';
    return '#ffbb33';
  };

  // 判斷建議顏色
  const getRecommendationColor = (recommendation) => {
    if (recommendation.includes('買進')) return '#00C851';
    if (recommendation.includes('賣出')) return '#ff4444';
    return '#ffbb33';
  };

  return {
    type: 'bubble',
    size: 'mega',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // 標題
        {
          type: 'text',
          text: '📰 新聞分析報告',
          weight: 'bold',
          size: 'xl',
          color: '#1DB446'
        },
        {
          type: 'text',
          text: `${stock_id} ${stock_name}`,
          size: 'md',
          color: '#666666',
          margin: 'sm'
        },
        {
          type: 'text',
          text: `分析 ${news_count} 則近期新聞`,
          size: 'xs',
          color: '#aaaaaa',
          margin: 'xs'
        },
        {
          type: 'separator',
          margin: 'xl'
        },

        // 新聞摘要
        {
          type: 'box',
          layout: 'vertical',
          margin: 'xl',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: '📋 新聞摘要',
              weight: 'bold',
              size: 'md',
              color: '#333333'
            },
            {
              type: 'text',
              text: analysis.summary || '（無摘要）',
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'md'
            }
          ]
        },

        // 市場情緒
        {
          type: 'box',
          layout: 'vertical',
          margin: 'xl',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: '💭 市場情緒',
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
                  text: analysis.market_sentiment || '中性',
                  size: 'lg',
                  weight: 'bold',
                  color: getSentimentColor(analysis.market_sentiment || '中性'),
                  flex: 0
                }
              ]
            },
            {
              type: 'text',
              text: analysis.sentiment_reason || '',
              size: 'xs',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            }
          ]
        },

        // 正面因素
        {
          type: 'box',
          layout: 'vertical',
          margin: 'xl',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: '✅ 正面因素',
              weight: 'bold',
              size: 'md',
              color: '#00C851'
            },
            ...((analysis.positive_factors || []).map(factor => ({
              type: 'text',
              text: `• ${factor}`,
              size: 'xs',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            })))
          ]
        },

        // 負面因素
        {
          type: 'box',
          layout: 'vertical',
          margin: 'xl',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: '⚠️ 負面因素',
              weight: 'bold',
              size: 'md',
              color: '#ff4444'
            },
            ...((analysis.negative_factors || []).map(factor => ({
              type: 'text',
              text: `• ${factor}`,
              size: 'xs',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            })))
          ]
        },

        // 投資建議
        {
          type: 'box',
          layout: 'vertical',
          margin: 'xl',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: '💡 投資建議',
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
                  text: analysis.recommendation || '持有',
                  size: 'lg',
                  weight: 'bold',
                  color: getRecommendationColor(analysis.recommendation || '持有'),
                  flex: 0
                }
              ]
            },
            {
              type: 'text',
              text: analysis.recommendation_reason || '',
              size: 'xs',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            }
          ]
        }
      ]
    }
  };
}

module.exports = {
  generateNewsFlexMessage
};

