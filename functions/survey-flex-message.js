/**
 * 問卷調查 Flex Message 生成器
 * 生成評分問卷和統計結果的 Flex Message
 */

/**
 * 生成評分問卷 Flex Message（改進版：顯示上週結果和本週投票）
 * @param {object} currentWeek - 本週資訊
 * @param {object} currentStatistics - 本週統計
 * @param {object} lastWeek - 上週資訊
 * @param {object} lastStatistics - 上週統計
 * @param {boolean} hasVoted - 用戶是否已投票
 * @returns {object} - LINE Flex Message
 */
function generateSurveyFlexMessage(currentWeek, currentStatistics, lastWeek, lastStatistics, hasVoted = false) {
  // 上週評分
  const lastAvgScore = lastStatistics?.average_score || 0;
  const lastTotalVotes = lastStatistics?.total_votes || 0;

  // 本週評分
  const currentAvgScore = currentStatistics?.average_score || 0;
  const currentTotalVotes = currentStatistics?.total_votes || 0;

  // 計算上週信心指數
  const lastConfidenceIndex = lastAvgScore > 0 ? Math.round((lastAvgScore / 5) * 100) : 0;

  // 決定上週評分顏色
  let lastScoreColor = '#999999';
  let lastConfidenceText = '尚無評分';
  if (lastAvgScore >= 4) {
    lastScoreColor = '#00C851';
    lastConfidenceText = '高度可信';
  } else if (lastAvgScore >= 3) {
    lastScoreColor = '#ffbb33';
    lastConfidenceText = '中等可信';
  } else if (lastAvgScore > 0) {
    lastScoreColor = '#ff4444';
    lastConfidenceText = '需要改進';
  }

  // 格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 決定顯示順序：未投票時，上週結果放在最上面
  const showLastWeekFirst = !hasVoted && lastWeek && lastTotalVotes > 0;

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
          // 如果未投票且有上週結果，先顯示上週結果
          ...(showLastWeekFirst ? [
            // 上週結果標題
            {
              type: 'text',
              text: '📋 上週結果公佈',
              weight: 'bold',
              size: 'xl',
              color: '#1DB446'
            },
            {
              type: 'text',
              text: lastWeek ? `${formatDate(lastWeek.start_date)} ~ ${formatDate(lastWeek.end_date)}` : '',
              size: 'sm',
              color: '#999999',
              margin: 'md'
            },
            {
              type: 'separator',
              margin: 'xl'
            },
            // 上週結果內容
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'sm',
              contents: [
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
                          text: lastAvgScore > 0 ? lastAvgScore.toFixed(2) : '--',
                          size: 'xxl',
                          weight: 'bold',
                          color: lastScoreColor,
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
                          text: lastTotalVotes.toString(),
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
                  backgroundColor: lastScoreColor,
                  cornerRadius: '8px',
                  paddingAll: '12px',
                  contents: [
                    {
                      type: 'text',
                      text: `${lastConfidenceText} (${lastConfidenceIndex}%)`,
                      size: 'sm',
                      color: '#ffffff',
                      weight: 'bold',
                      align: 'center'
                    }
                  ]
                },
                // 上週分數分布
                ...generateScoreDistribution(lastStatistics)
              ]
            },
            {
              type: 'separator',
              margin: 'xl'
            },
            // 本週問卷調查標題
            {
              type: 'text',
              text: '📊 每週問卷調查',
              weight: 'bold',
              size: 'xl',
              color: '#1DB446',
              margin: 'xl'
            },
            {
              type: 'text',
              text: currentWeek ? `本週：${formatDate(currentWeek.start_date)} ~ ${formatDate(currentWeek.end_date)}` : '本週問卷',
              size: 'sm',
              color: '#999999',
              margin: 'md'
            }
          ] : [
            // 如果已投票或沒有上週結果，顯示標準標題
            {
              type: 'text',
              text: '📊 每週問卷調查',
              weight: 'bold',
              size: 'xl',
              color: '#1DB446'
            },
            {
              type: 'text',
              text: currentWeek ? `本週：${formatDate(currentWeek.start_date)} ~ ${formatDate(currentWeek.end_date)}` : '本週問卷',
              size: 'sm',
              color: '#999999',
              margin: 'md'
            },
            {
              type: 'separator',
              margin: 'xl'
            },
            // 上週結果（如果有，但已投票的情況）
            ...(lastWeek && lastTotalVotes > 0 ? [{
              type: 'box',
              layout: 'vertical',
              margin: 'xl',
              spacing: 'sm',
              backgroundColor: '#F5F5F5',
              cornerRadius: '8px',
              paddingAll: '15px',
              contents: [
                {
                  type: 'text',
                  text: '📋 上週結果公佈',
                  weight: 'bold',
                  size: 'md',
                  color: '#333333'
                },
                {
                  type: 'text',
                  text: `${formatDate(lastWeek.start_date)} ~ ${formatDate(lastWeek.end_date)}`,
                  size: 'xs',
                  color: '#999999',
                  margin: 'xs'
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
                          text: lastAvgScore > 0 ? lastAvgScore.toFixed(2) : '--',
                          size: 'xxl',
                          weight: 'bold',
                          color: lastScoreColor,
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
                          text: lastTotalVotes.toString(),
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
                  backgroundColor: lastScoreColor,
                  cornerRadius: '8px',
                  paddingAll: '12px',
                  contents: [
                    {
                      type: 'text',
                      text: `${lastConfidenceText} (${lastConfidenceIndex}%)`,
                      size: 'sm',
                      color: '#ffffff',
                      weight: 'bold',
                      align: 'center'
                    }
                  ]
                },
                // 上週分數分布
                ...generateScoreDistribution(lastStatistics)
              ]
            }] : [])
          ]),

          {
            type: 'separator',
            margin: 'xl'
          },

          // 本週投票狀態
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
                  ? `感謝您的反饋！下週一可以再次投票\n本週已有 ${currentTotalVotes} 人投票`
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

