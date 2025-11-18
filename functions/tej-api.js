/**
 * 財經新聞 API 客戶端
 * 使用 Google Custom Search API 抓取台灣財經新聞（TEJ API 試用版不支援新聞查詢）
 */

const axios = require('axios');

// Google Custom Search API 設定
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const GOOGLE_SEARCH_API_URL = 'https://www.googleapis.com/customsearch/v1';

/**
 * 延遲函數
 * @param {number} ms - 延遲毫秒數
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry 機制
 * @param {Function} fn - 要執行的函數
 * @param {number} maxRetries - 最大重試次數
 * @param {string} operationName - 操作名稱
 */
async function retryWithBackoff(fn, maxRetries = 3, operationName = 'TEJ API request') {
  let lastError;
  const INITIAL_RETRY_DELAY = 1000; // 1 秒

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        console.error(`❌ ${operationName} 失敗（已重試 ${maxRetries} 次）:`, error.message);
        throw error;
      }

      const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
      const shouldRetry = 
        error.code === 'ECONNABORTED' || 
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNRESET' ||
        (error.response && error.response.status >= 500) ||
        (error.response && error.response.status === 429);

      if (!shouldRetry) {
        console.error(`❌ ${operationName} 失敗（不可重試的錯誤）:`, error.message);
        throw error;
      }

      console.warn(`⚠️ ${operationName} 失敗（第 ${attempt}/${maxRetries} 次），${delayMs}ms 後重試...`);
      await delay(delayMs);
    }
  }

  throw lastError;
}

/**
 * 抓取股票相關新聞
 * @param {string} stockId - 股票代號
 * @param {number} limit - 新聞數量（預設 6 則）
 * @returns {Promise<Array>} - 新聞陣列
 */
async function fetchStockNews(stockId, limit = 6) {
  // 如果沒有設定 Google API Key，使用模擬資料
  if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    console.warn('⚠️ GOOGLE_API_KEY 或 GOOGLE_SEARCH_ENGINE_ID 未設定，使用模擬新聞資料');
    return generateMockNews(stockId, limit);
  }

  return retryWithBackoff(async () => {
    console.log(`📰 使用 Google Custom Search API 抓取 ${stockId} 的新聞（${limit} 則）...`);

    // 取得股票名稱（簡化版，實際應該查詢資料庫）
    const stockNames = {
      '2330': '台積電',
      '2317': '鴻海',
      '2454': '聯發科',
      '2881': '富邦金',
      '2882': '國泰金',
      '2412': '中華電',
      '2308': '台達電',
      '2303': '聯電',
      '3008': '大立光',
      '2002': '中鋼',
      '3003': '健鼎'
    };
    const stockName = stockNames[stockId] || stockId;

    // 使用 Google Custom Search API 搜索台灣財經新聞
    const response = await axios.get(GOOGLE_SEARCH_API_URL, {
      params: {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_SEARCH_ENGINE_ID,
        q: `${stockName} ${stockId} 股票`,  // 搜索關鍵字
        num: limit,  // 結果數量
        dateRestrict: 'm1',  // 限制最近 1 個月
        lr: 'lang_zh-TW',  // 繁體中文
        sort: 'date'  // 按日期排序
      },
      timeout: 15000
    });

    if (!response.data || !response.data.items || response.data.items.length === 0) {
      console.warn(`⚠️ Google Search 查無 ${stockId} 的相關新聞，使用模擬資料`);
      return generateMockNews(stockId, limit);
    }

    const news = response.data.items.map(item => {
      // 從 snippet 或 pagemap 提取發布日期
      let publishedAt = new Date().toISOString();
      if (item.pagemap?.metatags?.[0]) {
        const meta = item.pagemap.metatags[0];
        publishedAt = meta['article:published_time'] ||
                      meta['og:updated_time'] ||
                      meta.pubdate ||
                      publishedAt;
      }

      // 從 URL 提取來源網站
      let source = '財經媒體';
      try {
        const hostname = new URL(item.link).hostname;
        if (hostname.includes('udn.com')) source = '聯合新聞網';
        else if (hostname.includes('chinatimes.com')) source = '中時新聞網';
        else if (hostname.includes('ctee.com.tw')) source = '工商時報';
        else if (hostname.includes('moneydj.com')) source = 'MoneyDJ';
        else if (hostname.includes('cnyes.com')) source = '鉅亨網';
        else if (hostname.includes('technews.tw')) source = '科技新報';
        else if (hostname.includes('wealth.com.tw')) source = '財訊';
      } catch (e) {
        // 忽略 URL 解析錯誤
      }

      return {
        title: item.title,
        content: item.snippet || '（無內容摘要）',
        source: source,
        published_at: publishedAt,
        url: item.link
      };
    });

    console.log(`✅ 成功抓取 ${news.length} 則新聞`);
    return news;

  }, 3, `抓取 ${stockId} 新聞`);
}

/**
 * 生成模擬新聞資料
 * @param {string} stockId - 股票代號
 * @param {number} limit - 新聞數量
 * @returns {Array} - 模擬新聞陣列
 */
function generateMockNews(stockId, limit = 6) {
  const now = new Date();
  const mockNews = [];

  const templates = [
    { title: `${stockId} 股價表現強勁，法人看好後市`, content: `${stockId} 近期股價表現亮眼，外資持續買超，法人普遍看好未來展望。` },
    { title: `${stockId} 公布最新財報，營收創新高`, content: `${stockId} 公布最新季度財報，營收較去年同期成長，獲利表現優於預期。` },
    { title: `分析師上調 ${stockId} 目標價`, content: `多家券商分析師上調 ${stockId} 目標價，認為基本面持續改善。` },
    { title: `${stockId} 宣布新產品計畫`, content: `${stockId} 宣布推出新產品線，預期將帶動未來營收成長。` },
    { title: `${stockId} 產業趨勢分析`, content: `產業分析師指出，${stockId} 所處產業前景看好，公司具競爭優勢。` },
    { title: `${stockId} 技術面分析`, content: `技術分析師認為 ${stockId} 股價突破關鍵壓力，短期走勢偏多。` }
  ];

  for (let i = 0; i < Math.min(limit, templates.length); i++) {
    const publishDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    mockNews.push({
      title: templates[i].title,
      content: templates[i].content,
      source: '財經媒體',
      published_at: publishDate.toISOString(),
      url: `https://example.com/news/${stockId}/${i + 1}`
    });
  }

  console.log(`✅ 生成 ${mockNews.length} 則模擬新聞`);
  return mockNews;
}

/**
 * 抓取產業相關新聞（目前未使用，保留供未來擴充）
 * @param {string} industry - 產業名稱
 * @param {number} limit - 新聞數量（預設 6 則）
 * @returns {Promise<Array>} - 新聞陣列
 */
async function fetchIndustryNews(industry, limit = 6) {
  // 如果沒有設定 Google API Key，使用模擬資料
  if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    console.warn('⚠️ GOOGLE_API_KEY 或 GOOGLE_SEARCH_ENGINE_ID 未設定，使用模擬產業新聞資料');
    return generateMockIndustryNews(industry, limit);
  }

  return retryWithBackoff(async () => {
    console.log(`📰 使用 Google Custom Search API 抓取 ${industry} 產業的新聞（${limit} 則）...`);

    const response = await axios.get(GOOGLE_SEARCH_API_URL, {
      params: {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_SEARCH_ENGINE_ID,
        q: `${industry} 產業`,
        num: limit,
        dateRestrict: 'm1',
        lr: 'lang_zh-TW',
        sort: 'date'
      },
      timeout: 15000
    });

    if (!response.data || !response.data.items || response.data.items.length === 0) {
      console.warn(`⚠️ Google Search 查無 ${industry} 產業的相關新聞，使用模擬資料`);
      return generateMockIndustryNews(industry, limit);
    }

    const news = response.data.items.map(item => {
      let publishedAt = new Date().toISOString();
      if (item.pagemap?.metatags?.[0]) {
        const meta = item.pagemap.metatags[0];
        publishedAt = meta['article:published_time'] ||
                      meta['og:updated_time'] ||
                      meta.pubdate ||
                      publishedAt;
      }

      let source = '產業媒體';
      try {
        const hostname = new URL(item.link).hostname;
        if (hostname.includes('udn.com')) source = '聯合新聞網';
        else if (hostname.includes('chinatimes.com')) source = '中時新聞網';
        else if (hostname.includes('ctee.com.tw')) source = '工商時報';
        else if (hostname.includes('moneydj.com')) source = 'MoneyDJ';
        else if (hostname.includes('cnyes.com')) source = '鉅亨網';
      } catch (e) {
        // 忽略 URL 解析錯誤
      }

      return {
        title: item.title,
        content: item.snippet || '（無內容摘要）',
        source: source,
        published_at: publishedAt,
        url: item.link
      };
    });

    console.log(`✅ 成功抓取 ${news.length} 則產業新聞`);
    return news;

  }, 3, `抓取 ${industry} 產業新聞`);
}

/**
 * 生成模擬產業新聞資料
 * @param {string} industry - 產業名稱
 * @param {number} limit - 新聞數量
 * @returns {Array} - 模擬新聞陣列
 */
function generateMockIndustryNews(industry, limit = 6) {
  const now = new Date();
  const mockNews = [];

  const templates = [
    { title: `${industry}產業展望看好`, content: `分析師指出${industry}產業前景樂觀，預期未來成長動能強勁。` },
    { title: `${industry}產業面臨挑戰`, content: `${industry}產業近期面臨供應鏈壓力，業者積極因應。` },
    { title: `${industry}產業創新趨勢`, content: `${industry}產業積極投入創新研發，搶攻未來商機。` },
    { title: `${industry}產業政策利多`, content: `政府推出${industry}產業扶植政策，業者受惠。` },
    { title: `${industry}產業國際競爭`, content: `${industry}產業面臨國際競爭，台廠展現競爭力。` },
    { title: `${industry}產業需求強勁`, content: `${industry}產業需求持續成長，訂單能見度佳。` }
  ];

  for (let i = 0; i < Math.min(limit, templates.length); i++) {
    const publishDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    mockNews.push({
      title: templates[i].title,
      content: templates[i].content,
      source: '產業媒體',
      published_at: publishDate.toISOString(),
      url: `https://example.com/industry/${industry}/${i + 1}`
    });
  }

  console.log(`✅ 生成 ${mockNews.length} 則模擬產業新聞`);
  return mockNews;
}

module.exports = {
  fetchStockNews,
  fetchIndustryNews
};

