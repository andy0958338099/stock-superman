/**
 * 問卷調查 Flex Message 生成器
 * 生成評分問卷和統計結果的 Flex Message
 */

/**
 * 生成評分問卷 Flex Message
 * @param {object} weekInfo - 週別資訊
 * @param {object} statistics - 統計資訊
 * @param {boolean} hasVoted - 用戶是否已投票
 * @returns {object} - LINE Flex Message
 */
function generateSurveyFlexMessage(weekInfo, statistics, hasVoted = false) {
  const avgScore = statistics?.average_score || 0;
  const totalVotes = statistics?.total_votes || 0;

  // 計算信心指數（0-100）
  const confidenceIndex = avgScore > 0 ? Math.round((avgScore / 5) * 100) : 0;

  // 決定顏色
  let scoreColor = '#999999';
  let confidenceText = '尚無評分';
  if (avgScore >= 4) {
    scoreColor = '#00C851';
    confidenceText = '高度可信';
  } else if (avgScore >= 3) {
    scoreColor = '#ffbb33';
    confidenceText = '中等可信';
  } else if (avgScore > 0) {
    scoreColor = '#ff4444';
    confidenceText = '需要改進';
  }

  return {
    type: 'flex',
    altText: '📊 每週問卷調查',
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
            text: '📊 每週問卷調查',
            weight: 'bold',
            size: 'xl',
            color: '#1DB446'
          },
          {
            type: 'text',
            text: '上週的分析是否準確？',
            size: 'md',
            color: '#666666',
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'xl'
          },

          // 當前評分統計
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '📈 本週評分統計',
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
                    type: 'box',
                    layout: 'vertical',
                    flex: 1,
                    contents: [
                      {
                        type: 'text',
                        text: avgScore > 0 ? avgScore.toFixed(2) : '--',
                        size: 'xxl',
                        weight: 'bold',
                        color: scoreColor,
                        align: 'center'
                      },
                      {
                        type: 'text',
                        text: '平均分數',
                        size: 'xs',
                        color: '#999999',
                        align: 'center',
                        margin: 'sm'
                      }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    flex: 1,
                    contents: [
                      {
                        type: 'text',
                        text: totalVotes.toString(),
                        size: 'xxl',
                        weight: 'bold',
                        color: '#1DB446',
                        align: 'center'
                      },
                      {
                        type: 'text',
                        text: '投票人數',
                        size: 'xs',
                        color: '#999999',
                        align: 'center',
                        margin: 'sm'
                      }
                    ]
                  }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                backgroundColor: scoreColor,
                cornerRadius: '8px',
                paddingAll: '12px',
                contents: [
                  {
                    type: 'text',
                    text: `${confidenceText} (${confidenceIndex}%)`,
                    size: 'sm',
                    color: '#ffffff',
                    weight: 'bold',
                    align: 'center'
                  }
                ]
              }
            ]
          },

          // 分數分布
          ...(totalVotes > 0 ? [{
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '📊 分數分布',
                weight: 'bold',
                size: 'md',
                color: '#333333'
              },
              ...generateScoreDistribution(statistics)
            ]
          }] : []),

          {
            type: 'separator',
            margin: 'xl'
          },

          // 投票說明
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: hasVoted ? '✅ 您本週已投票' : '🗳️ 請為上週的分析評分',
                weight: 'bold',
                size: 'md',
                color: hasVoted ? '#00C851' : '#1DB446'
              },
              {
                type: 'text',
                text: hasVoted 
                  ? '感謝您的反饋！下週一可以再次投票'
                  : '請點擊下方按鈕進行評分（1-5 分）',
                size: 'xs',
                color: '#999999',
                margin: 'sm',
                wrap: true
              }
            ]
          }
        ]
      },
      footer: hasVoted ? undefined : {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            action: {
              type: 'message',
              label: '⭐⭐⭐⭐⭐ 非常準確 (5分)',
              text: '評分:5'
            },
            style: 'primary',
            color: '#00C851'
          },
          {
            type: 'button',
            action: {
              type: 'message',
              label: '⭐⭐⭐⭐ 準確 (4分)',
              text: '評分:4'
            },
            style: 'primary',
            color: '#4CAF50'
          },
          {
            type: 'button',
            action: {
              type: 'message',
              label: '⭐⭐⭐ 普通 (3分)',
              text: '評分:3'
            },
            style: 'primary',
            color: '#ffbb33'
          }
        ]
      }
    }
  };
}

/**
 * 生成分數分布圖
 */
function generateScoreDistribution(statistics) {
  if (!statistics || statistics.total_votes === 0) {
    return [];
  }

  const scores = [5, 4, 3, 2, 1];
  const result = [];

  scores.forEach(score => {
    const count = statistics[`score_${score}_count`] || 0;
    const percentage = Math.round((count / statistics.total_votes) * 100);

    result.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: `${score}⭐`,
          size: 'sm',
          color: '#666666',
          flex: 0
        },
        {
          type: 'box',
          layout: 'vertical',
          flex: 1,
          margin: 'md',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              backgroundColor: '#E0E0E0',
              cornerRadius: '4px',
              height: '8px',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  backgroundColor: score >= 4 ? '#00C851' : score >= 3 ? '#ffbb33' : '#ff4444',
                  cornerRadius: '4px',
                  width: `${percentage}%`,
                  contents: []
                }
              ]
            }
          ]
        },
        {
          type: 'text',
          text: `${count}`,
          size: 'sm',
          color: '#999999',
          flex: 0,
          align: 'end'
        }
      ]
    });
  });

  return result;
}

module.exports = {
  generateSurveyFlexMessage
};

