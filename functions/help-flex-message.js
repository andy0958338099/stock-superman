/**
 * 功能說明 Flex Message 模板
 * 完整展示所有功能與使用方式
 */

/**
 * 生成功能說明 Flex Message（多頁輪播）
 * @returns {Object} - LINE Flex Message
 */
function generateHelpFlexMessage() {
  // 使用台北時間
  const now = new Date();
  const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const timeStr = `${taipeiTime.getMonth() + 1}/${taipeiTime.getDate()} ${taipeiTime.getHours()}:${String(taipeiTime.getMinutes()).padStart(2, '0')}`;

  // ===== 第一頁：AI 智慧選股策略 =====
  const page1 = {
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
              text: '📚 功能說明',
              weight: 'bold',
              size: 'xl',
              color: '#ffffff'
            },
            {
              type: 'text',
              text: '1/3',
              size: 'sm',
              color: '#aaaaaa',
              align: 'end',
              gravity: 'center'
            }
          ]
        },
        {
          type: 'text',
          text: '🤖 AI 智慧選股策略',
          size: 'md',
          color: '#ffcc00',
          margin: 'md'
        }
      ],
      backgroundColor: '#1a1a2e',
      paddingAll: 'lg'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'lg',
      contents: [
        // 今日推薦
        createFeatureBlock(
          '🎯 今天（穩健型）',
          '輸入：今天、今日推薦、推薦',
          [
            '• 篩選 TOP 3 高勝率股票',
            '• 技術面 + 基本面雙重分析',
            '• 適合：保守型投資者'
          ],
          '#4CAF50'
        ),
        { type: 'separator', color: '#333333' },
        // 高成長
        createFeatureBlock(
          '🚀 高成長（價值型）',
          '輸入：高成長、成長股',
          [
            '• 找出被低估的電子股',
            '• 本益比 + EPS 成長分析',
            '• 適合：中長期投資者'
          ],
          '#2196F3'
        ),
        { type: 'separator', color: '#333333' },
        // 瘋狂
        createFeatureBlock(
          '🔥 瘋狂（積極型）',
          '輸入：瘋狂、瘋狂股、飆股',
          [
            '• 高波動 + 強動能飆股',
            '• 量價齊揚 + 技術突破',
            '• 適合：短線交易者'
          ],
          '#FF5722'
        )
      ],
      backgroundColor: '#16213e',
      paddingAll: 'lg'
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '👉 滑動看更多功能',
          size: 'sm',
          color: '#aaaaaa',
          align: 'center'
        }
      ],
      backgroundColor: '#1a1a2e',
      paddingAll: 'md'
    }
  };

  // ===== 第二頁：市場分析 & 熱門 =====
  const page2 = {
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
              text: '📚 功能說明',
              weight: 'bold',
              size: 'xl',
              color: '#ffffff'
            },
            {
              type: 'text',
              text: '2/3',
              size: 'sm',
              color: '#aaaaaa',
              align: 'end',
              gravity: 'center'
            }
          ]
        },
        {
          type: 'text',
          text: '📊 市場分析 & 社群功能',
          size: 'md',
          color: '#ffcc00',
          margin: 'md'
        }
      ],
      backgroundColor: '#1a1a2e',
      paddingAll: 'lg'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'lg',
      contents: [
        // 熱門股票
        createFeatureBlock(
          '📊 熱門股票',
          '輸入：熱門、熱門股票、熱搜',
          [
            '• 24 小時內最多人查詢',
            '• TOP 10 熱門排行榜',
            '• 點擊即可查詢詳細分析'
          ],
          '#E91E63'
        ),
        { type: 'separator', color: '#333333' },
        // 美股分析
        createFeatureBlock(
          '🌎 美股分析',
          '輸入：美股、美股分析',
          [
            '• S&P 500 / NASDAQ 指數',
            '• 台積電 ADR 連動分析',
            '• VIX 恐慌指數 + 匯率'
          ],
          '#9C27B0'
        ),
        { type: 'separator', color: '#333333' },
        // 投票調查
        createFeatureBlock(
          '📋 每週投票',
          '輸入：投票、調查、民調',
          [
            '• 每週市場情緒調查',
            '• 看多/看空/觀望投票',
            '• 查看即時統計結果'
          ],
          '#00BCD4'
        )
      ],
      backgroundColor: '#16213e',
      paddingAll: 'lg'
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '👉 滑動看更多功能',
          size: 'sm',
          color: '#aaaaaa',
          align: 'center'
        }
      ],
      backgroundColor: '#1a1a2e',
      paddingAll: 'md'
    }
  };

  // ===== 第三頁：個股查詢 & 其他 =====
  const page3 = {
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
              text: '📚 功能說明',
              weight: 'bold',
              size: 'xl',
              color: '#ffffff'
            },
            {
              type: 'text',
              text: '3/3',
              size: 'sm',
              color: '#aaaaaa',
              align: 'end',
              gravity: 'center'
            }
          ]
        },
        {
          type: 'text',
          text: '🔍 個股查詢 & 進階功能',
          size: 'md',
          color: '#ffcc00',
          margin: 'md'
        }
      ],
      backgroundColor: '#1a1a2e',
      paddingAll: 'lg'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'lg',
      contents: [
        // 個股查詢
        createFeatureBlock(
          '🔍 個股分析',
          '輸入：股票代號（如 2330、0050）',
          [
            '• KD / MACD 技術指標圖',
            '• AI 漲跌機率預測',
            '• EPS、股利、本益比資訊'
          ],
          '#FF9800'
        ),
        { type: 'separator', color: '#333333' },
        // 新聞分析
        createFeatureBlock(
          '📰 新聞分析',
          '查詢個股後點擊「📰 新聞」',
          [
            '• 即時相關新聞搜尋',
            '• AI 分析新聞影響',
            '• 多空解讀與建議'
          ],
          '#795548'
        ),
        { type: 'separator', color: '#333333' },
        // 快取管理
        createFeatureBlock(
          '🔄 快取管理',
          '輸入：清除快取 + 股票代號',
          [
            '• 例如：清除快取 2330',
            '• 強制重新分析該股票',
            '• 取得最新市場資料'
          ],
          '#607D8B'
        )
      ],
      backgroundColor: '#16213e',
      paddingAll: 'lg'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: '💡 小提示：快取資料 4~6 小時更新一次',
          size: 'xs',
          color: '#888888',
          align: 'center'
        },
        {
          type: 'separator',
          margin: 'md',
          color: '#333333'
        },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          spacing: 'md',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'message',
                label: '🎯 今天',
                text: '今天'
              },
              color: '#4CAF50'
            },
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'message',
                label: '📊 熱門',
                text: '熱門'
              },
              color: '#E91E63'
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'uri',
                label: '📤 分享',
                uri: `https://line.me/R/share?text=${encodeURIComponent('🚀 推薦超好用的 AI 股票分析！\n\n📈 每日精選 TOP 3 高勝率股票\n🔥 高成長、瘋狂策略任你選\n\n立即加入 👉 https://line.me/R/ti/p/@754zptsk')}`
              },
              color: '#333355'
            }
          ]
        }
      ],
      backgroundColor: '#1a1a2e',
      paddingAll: 'md'
    }
  };

  return {
    type: 'flex',
    altText: '📚 功能說明 - 股市大亨完整指南',
    contents: {
      type: 'carousel',
      contents: [page1, page2, page3]
    },
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: '🎯 今天', text: '今天' } },
        { type: 'action', action: { type: 'message', label: '🚀 高成長', text: '高成長' } },
        { type: 'action', action: { type: 'message', label: '🔥 瘋狂', text: '瘋狂' } },
        { type: 'action', action: { type: 'message', label: '📊 熱門', text: '熱門' } },
        { type: 'action', action: { type: 'message', label: '🌎 美股', text: '美股' } }
      ]
    }
  };
}

function createFeatureBlock(title, trigger, descriptions, color) {
  return {
    type: 'box',
    layout: 'vertical',
    spacing: 'sm',
    contents: [
      { type: 'text', text: title, weight: 'bold', size: 'md', color: color },
      { type: 'text', text: trigger, size: 'xs', color: '#888888', margin: 'xs' },
      ...descriptions.map(d => ({ type: 'text', text: d, size: 'sm', color: '#cccccc', wrap: true }))
    ]
  };
}

module.exports = { generateHelpFlexMessage };

