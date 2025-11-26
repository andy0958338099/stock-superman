/**
 * 熱門股票 Flex Message 模板
 * 展示過去24小時搜尋次數最多的前10名股票
 */

/**
 * 生成單一熱門股票項目
 */
function generateHotStockItem(stock, rank, extraInfo = {}) {
  const { stock_id, stock_name, search_count } = stock;
  const { latestPrice, change, changePercent } = extraInfo;

  // 排名顏色和圖示
  const getRankStyle = (r) => {
    if (r === 1) return { color: '#FFD700', emoji: '🥇', fire: '🔥🔥🔥' };
    if (r === 2) return { color: '#C0C0C0', emoji: '🥈', fire: '🔥🔥' };
    if (r === 3) return { color: '#CD7F32', emoji: '🥉', fire: '🔥' };
    return { color: '#888888', emoji: `${r}`, fire: '' };
  };

  const style = getRankStyle(rank);
  
  // 漲跌顏色
  const priceColor = changePercent >= 0 ? '#ff4757' : '#2ed573';
  const changeSign = changePercent >= 0 ? '+' : '';

  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'md',
    contents: [
      // 排名
      {
        type: 'text',
        text: rank <= 3 ? style.emoji : `${rank}.`,
        size: 'lg',
        weight: 'bold',
        color: style.color,
        flex: 1,
        gravity: 'center'
      },
      // 股票資訊
      {
        type: 'box',
        layout: 'vertical',
        flex: 5,
        contents: [
          {
            type: 'text',
            text: `${stock_name}（${stock_id}）`,
            weight: 'bold',
            size: 'md',
            color: '#ffffff'
          },
          {
            type: 'text',
            text: latestPrice 
              ? `$${latestPrice} ${changeSign}${changePercent?.toFixed(2) || 0}%`
              : `🔍 ${search_count} 次搜尋`,
            size: 'sm',
            color: latestPrice ? priceColor : '#aaaaaa'
          }
        ]
      },
      // 搜尋熱度
      {
        type: 'box',
        layout: 'vertical',
        flex: 2,
        contents: [
          {
            type: 'text',
            text: `${search_count}次`,
            size: 'sm',
            color: '#ffcc00',
            align: 'end'
          },
          {
            type: 'text',
            text: style.fire || '📊',
            size: 'sm',
            align: 'end'
          }
        ]
      }
    ],
    action: {
      type: 'message',
      text: stock_id
    },
    paddingAll: 'md',
    backgroundColor: rank <= 3 ? '#2a2a4a' : '#1a1a2e',
    cornerRadius: 'md',
    margin: 'sm'
  };
}

/**
 * 生成熱門股票 Flex Message
 * @param {Array} hotStocks - 熱門股票陣列
 * @param {Object} stockPrices - 股票價格資訊（可選）
 * @returns {Object} - LINE Flex Message
 */
function generateHotStocksFlexMessage(hotStocks, stockPrices = {}) {
  if (!hotStocks || hotStocks.length === 0) {
    return {
      type: 'text',
      text: '📊 目前還沒有熱門股票資料\n\n請先查詢一些股票，系統會自動統計！'
    };
  }

  const now = new Date();
  const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 生成股票列表項目
  const stockItems = hotStocks.map((stock, index) => {
    const extraInfo = stockPrices[stock.stock_id] || {};
    return generateHotStockItem(stock, index + 1, extraInfo);
  });

  // 分成兩個 bubble（前5名和後5名）
  const firstHalf = stockItems.slice(0, 5);
  const secondHalf = stockItems.slice(5, 10);

  const bubbles = [];

  // 第一個 bubble - 前5名
  bubbles.push({
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
              text: '🔥 熱門股票 TOP 10',
              weight: 'bold',
              size: 'xl',
              color: '#ffffff',
              flex: 4
            },
            {
              type: 'text',
              text: timeStr,
              size: 'xs',
              color: '#aaaaaa',
              align: 'end',
              flex: 2,
              gravity: 'center'
            }
          ]
        },
        {
          type: 'text',
          text: '過去 24 小時最多人關注',
          size: 'sm',
          color: '#ffcc00',
          margin: 'sm'
        }
      ],
      backgroundColor: '#1a1a2e',
      paddingAll: 'lg'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: firstHalf,
      backgroundColor: '#16213e',
      paddingAll: 'md'
    },
    footer: secondHalf.length > 0 ? {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '👉 滑動看更多',
          size: 'sm',
          color: '#aaaaaa',
          align: 'center'
        }
      ],
      backgroundColor: '#1a1a2e',
      paddingAll: 'sm'
    } : undefined
  });

  // 第二個 bubble - 後5名（如果有的話）
  if (secondHalf.length > 0) {
    bubbles.push({
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🔥 熱門股票 6-10 名',
            weight: 'bold',
            size: 'lg',
            color: '#ffffff'
          },
          {
            type: 'text',
            text: '持續關注，掌握市場脈動',
            size: 'sm',
            color: '#aaaaaa',
            margin: 'sm'
          }
        ],
        backgroundColor: '#1a1a2e',
        paddingAll: 'lg'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: secondHalf,
        backgroundColor: '#16213e',
        paddingAll: 'md'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '💡 點擊股票可查看詳細分析',
                size: 'xs',
                color: '#888888',
                align: 'center'
              }
            ]
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
            contents: [
              {
                type: 'button',
                style: 'secondary',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: '📤 分享',
                  uri: `https://line.me/R/share?text=${encodeURIComponent('🔥 來看看大家都在關注哪些股票！\n\n📈 股市大亨 AI 智能選股\n立即加入 👉 https://line.me/R/ti/p/@754zptsk')}`
                },
                color: '#333355'
              }
            ]
          }
        ],
        backgroundColor: '#1a1a2e',
        paddingAll: 'md'
      }
    });
  }

  return {
    type: 'flex',
    altText: '🔥 熱門股票 TOP 10',
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
}

module.exports = {
  generateHotStocksFlexMessage
};

