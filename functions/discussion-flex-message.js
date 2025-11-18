// ============================================
// 討論分析 Flex Message 模板
// ============================================

/**
 * 生成討論分析的 Flex Message
 * @param {object} discussionResult - 討論分析結果
 * @returns {object} Flex Message 物件
 */
function generateDiscussionFlexMessage(discussionResult) {
  const { stockId, stockName, userMessage, discussionRound, analysis } = discussionResult;
  
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
              text: '💬',
              size: 'xl',
              weight: 'bold',
              flex: 0
            },
            {
              type: 'text',
              text: '互動討論',
              size: 'xl',
              weight: 'bold',
              margin: 'md',
              flex: 1
            },
            {
              type: 'text',
              text: `第 ${discussionRound}/5 輪`,
              size: 'sm',
              color: '#999999',
              align: 'end',
              flex: 0
            }
          ]
        },
        {
          type: 'text',
          text: `${stockId} ${stockName}`,
          size: 'sm',
          color: '#999999',
          margin: 'md'
        }
      ],
      backgroundColor: '#6C5CE7',
      paddingAll: '20px'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // 用戶觀點
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📝 您的觀點',
              size: 'md',
              weight: 'bold',
              color: '#6C5CE7'
            },
            {
              type: 'text',
              text: userMessage.length > 100 ? userMessage.substring(0, 100) + '...' : userMessage,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            }
          ],
          margin: 'none',
          paddingAll: '15px',
          backgroundColor: '#F5F3FF',
          cornerRadius: '10px'
        },
        
        // 觀點摘要
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '💡 觀點摘要',
              size: 'md',
              weight: 'bold',
              color: '#333333'
            },
            {
              type: 'text',
              text: analysis.viewpointSummary,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            }
          ],
          margin: 'lg'
        },
        
        // 合理性分析
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '✅ 合理之處',
              size: 'md',
              weight: 'bold',
              color: '#00C851'
            },
            ...analysis.reasonablePoints.map(point => ({
              type: 'text',
              text: `• ${point}`,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            }))
          ],
          margin: 'lg'
        },
        
        // 潛在盲點
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '⚠️ 潛在盲點',
              size: 'md',
              weight: 'bold',
              color: '#ffbb33'
            },
            ...analysis.potentialBlindSpots.map(point => ({
              type: 'text',
              text: `• ${point}`,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            }))
          ],
          margin: 'lg'
        },
        
        // 補充觀點
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🔍 補充觀點',
              size: 'md',
              weight: 'bold',
              color: '#0099FF'
            },
            ...analysis.additionalPerspectives.map(point => ({
              type: 'text',
              text: `• ${point}`,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            }))
          ],
          margin: 'lg'
        }
      ],
      paddingAll: '20px'
    },
    footer: generateFooter(analysis, discussionRound),
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
function generateFooter(analysis, discussionRound) {
  const contents = [];
  
  // 反問問題
  if (analysis.reflectiveQuestions && analysis.reflectiveQuestions.length > 0) {
    contents.push({
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '🤔 請思考',
          size: 'md',
          weight: 'bold',
          color: '#6C5CE7'
        },
        ...analysis.reflectiveQuestions.map(question => ({
          type: 'text',
          text: `❓ ${question}`,
          size: 'sm',
          color: '#666666',
          wrap: true,
          margin: 'sm'
        }))
      ],
      margin: 'none'
    });
  }
  
  // 風險提醒
  contents.push({
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: '⚠️ 風險提醒',
        size: 'md',
        weight: 'bold',
        color: '#ff4444'
      },
      ...analysis.riskWarnings.map(warning => ({
        type: 'text',
        text: `• ${warning}`,
        size: 'sm',
        color: '#666666',
        wrap: true,
        margin: 'sm'
      }))
    ],
    margin: 'lg'
  });
  
  // 建議方向
  contents.push({
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: '💡 建議方向',
        size: 'md',
        weight: 'bold',
        color: '#333333'
      },
      {
        type: 'text',
        text: analysis.recommendation,
        size: 'sm',
        color: '#666666',
        wrap: true,
        margin: 'sm'
      }
    ],
    margin: 'lg',
    paddingAll: '15px',
    backgroundColor: '#FFF9E6',
    cornerRadius: '10px'
  });
  
  // 繼續討論提示
  if (discussionRound < 5) {
    contents.push({
      type: 'text',
      text: `💬 您還可以繼續討論 ${5 - discussionRound} 次`,
      size: 'xs',
      color: '#999999',
      align: 'center',
      margin: 'lg'
    });
  } else {
    contents.push({
      type: 'text',
      text: '✅ 討論已達上限，建議查看總評',
      size: 'xs',
      color: '#999999',
      align: 'center',
      margin: 'lg'
    });
  }
  
  return {
    type: 'box',
    layout: 'vertical',
    contents: contents,
    paddingAll: '20px'
  };
}

module.exports = {
  generateDiscussionFlexMessage
};

