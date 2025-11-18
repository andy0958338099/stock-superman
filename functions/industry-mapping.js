/**
 * 產業對應表
 * 台股代號 → 產業類別 → 美股對應 ETF/指數
 */

/**
 * 主要台股的產業對應
 */
const STOCK_INDUSTRY_MAP = {
  // 半導體
  '2330': { industry: '半導體', name: '台積電', usMarket: 'SOXX', sector: 'Semiconductor' },
  '2454': { industry: '半導體', name: '聯發科', usMarket: 'SOXX', sector: 'Semiconductor' },
  '2303': { industry: '半導體', name: '聯電', usMarket: 'SOXX', sector: 'Semiconductor' },
  '3034': { industry: '半導體', name: '聯詠', usMarket: 'SOXX', sector: 'Semiconductor' },
  '2379': { industry: '半導體', name: '瑞昱', usMarket: 'SOXX', sector: 'Semiconductor' },
  '3711': { industry: '半導體', name: '日月光投控', usMarket: 'SOXX', sector: 'Semiconductor' },
  
  // 電子
  '2317': { industry: '電子', name: '鴻海', usMarket: 'QQQ', sector: 'Technology' },
  '2382': { industry: '電子', name: '廣達', usMarket: 'QQQ', sector: 'Technology' },
  '2357': { industry: '電子', name: '華碩', usMarket: 'QQQ', sector: 'Technology' },
  '2353': { industry: '電子', name: '宏碁', usMarket: 'QQQ', sector: 'Technology' },
  
  // 金融
  '2881': { industry: '金融', name: '富邦金', usMarket: 'XLF', sector: 'Financial' },
  '2882': { industry: '金融', name: '國泰金', usMarket: 'XLF', sector: 'Financial' },
  '2883': { industry: '金融', name: '開發金', usMarket: 'XLF', sector: 'Financial' },
  '2884': { industry: '金融', name: '玉山金', usMarket: 'XLF', sector: 'Financial' },
  '2885': { industry: '金融', name: '元大金', usMarket: 'XLF', sector: 'Financial' },
  '2886': { industry: '金融', name: '兆豐金', usMarket: 'XLF', sector: 'Financial' },
  '2887': { industry: '金融', name: '台新金', usMarket: 'XLF', sector: 'Financial' },
  '2891': { industry: '金融', name: '中信金', usMarket: 'XLF', sector: 'Financial' },
  '2892': { industry: '金融', name: '第一金', usMarket: 'XLF', sector: 'Financial' },
  
  // 航運
  '2603': { industry: '航運', name: '長榮', usMarket: 'BDRY', sector: 'Shipping' },
  '2609': { industry: '航運', name: '陽明', usMarket: 'BDRY', sector: 'Shipping' },
  '2615': { industry: '航運', name: '萬海', usMarket: 'BDRY', sector: 'Shipping' },
  
  // 鋼鐵
  '2002': { industry: '鋼鐵', name: '中鋼', usMarket: 'XME', sector: 'Steel' },
  
  // 塑化
  '1301': { industry: '塑化', name: '台塑', usMarket: 'XLE', sector: 'Petrochemical' },
  '1303': { industry: '塑化', name: '南亞', usMarket: 'XLE', sector: 'Petrochemical' },
  '1326': { industry: '塑化', name: '台化', usMarket: 'XLE', sector: 'Petrochemical' },
  '6505': { industry: '塑化', name: '台塑化', usMarket: 'XLE', sector: 'Petrochemical' },
  
  // 生技
  '4743': { industry: '生技', name: '合一', usMarket: 'XBI', sector: 'Biotech' },
  '6547': { industry: '生技', name: '高端疫苗', usMarket: 'XBI', sector: 'Biotech' },
  
  // ETF
  '0050': { industry: 'ETF', name: '元大台灣50', usMarket: 'SPY', sector: 'Index' },
  '0056': { industry: 'ETF', name: '元大高股息', usMarket: 'VYM', sector: 'Dividend' },
  '00878': { industry: 'ETF', name: '國泰永續高股息', usMarket: 'VYM', sector: 'Dividend' },
  '00679B': { industry: 'ETF', name: '元大美債20年', usMarket: 'TLT', sector: 'Bond' }
};

/**
 * 美股 ETF/指數說明
 */
const US_MARKET_INFO = {
  'SOXX': { name: 'iShares Semiconductor ETF', description: '費城半導體指數 ETF' },
  'QQQ': { name: 'Invesco QQQ Trust', description: 'NASDAQ 100 指數 ETF' },
  'XLF': { name: 'Financial Select Sector SPDR', description: '金融類股 ETF' },
  'BDRY': { name: 'Breakwave Dry Bulk Shipping ETF', description: '乾散貨航運 ETF' },
  'XME': { name: 'SPDR S&P Metals & Mining ETF', description: '金屬礦業 ETF' },
  'XLE': { name: 'Energy Select Sector SPDR', description: '能源類股 ETF' },
  'XBI': { name: 'SPDR S&P Biotech ETF', description: '生技類股 ETF' },
  'SPY': { name: 'SPDR S&P 500 ETF', description: 'S&P 500 指數 ETF' },
  'VYM': { name: 'Vanguard High Dividend Yield ETF', description: '高股息 ETF' },
  'TLT': { name: 'iShares 20+ Year Treasury Bond ETF', description: '20年期美國公債 ETF' }
};

/**
 * 取得股票的產業資訊
 * @param {string} stockId - 股票代號
 * @returns {object|null} - 產業資訊
 */
function getStockIndustry(stockId) {
  return STOCK_INDUSTRY_MAP[stockId] || null;
}

/**
 * 取得美股市場資訊
 * @param {string} symbol - 美股代號
 * @returns {object|null} - 美股資訊
 */
function getUSMarketInfo(symbol) {
  return US_MARKET_INFO[symbol] || null;
}

/**
 * 根據產業類別推測（當資料庫中沒有時）
 * @param {string} stockName - 股票名稱
 * @returns {object} - 推測的產業資訊
 */
function guessIndustry(stockName) {
  // 關鍵字匹配
  const keywords = {
    '半導體': ['晶', '積電', '聯發', '聯電', '矽', '芯'],
    '電子': ['電子', '電腦', '通訊', '光電'],
    '金融': ['金', '銀行', '保險', '證券', '投信'],
    '航運': ['航運', '海運', '貨櫃', '船'],
    '鋼鐵': ['鋼', '鐵'],
    '塑化': ['塑', '化工', '石化'],
    '生技': ['生技', '醫', '藥', '疫苗'],
    '能源': ['電力', '能源', '油', '氣']
  };

  for (const [industry, words] of Object.entries(keywords)) {
    if (words.some(word => stockName.includes(word))) {
      const usMarketMap = {
        '半導體': 'SOXX',
        '電子': 'QQQ',
        '金融': 'XLF',
        '航運': 'BDRY',
        '鋼鐵': 'XME',
        '塑化': 'XLE',
        '生技': 'XBI',
        '能源': 'XLE'
      };

      return {
        industry: industry,
        name: stockName,
        usMarket: usMarketMap[industry] || 'SPY',
        sector: industry,
        guessed: true
      };
    }
  }

  // 預設為一般電子股
  return {
    industry: '電子',
    name: stockName,
    usMarket: 'QQQ',
    sector: 'Technology',
    guessed: true
  };
}

/**
 * 取得完整的產業資訊（含推測）
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @returns {object} - 產業資訊
 */
function getIndustryInfo(stockId, stockName) {
  const mapped = getStockIndustry(stockId);
  if (mapped) {
    return { ...mapped, guessed: false };
  }

  return guessIndustry(stockName);
}

module.exports = {
  getStockIndustry,
  getUSMarketInfo,
  guessIndustry,
  getIndustryInfo,
  STOCK_INDUSTRY_MAP,
  US_MARKET_INFO
};

