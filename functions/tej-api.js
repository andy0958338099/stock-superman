/**
 * TEJ API 客戶端
 * 用於抓取台灣財經新聞
 */

const axios = require('axios');

const TEJ_API_BASE_URL = 'https://api.tej.com.tw';
const TEJ_API_KEY = process.env.TEJ_API_KEY;

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
  if (!TEJ_API_KEY) {
    throw new Error('TEJ_API_KEY 未設定，請在 Netlify 環境變數中設定');
  }

  return retryWithBackoff(async () => {
    console.log(`📰 抓取 ${stockId} 的新聞（${limit} 則）...`);

    // TEJ API 端點（請根據實際 API 文件調整）
    const url = `${TEJ_API_BASE_URL}/news`;
    
    const response = await axios.get(url, {
      params: {
        stock_id: stockId,
        limit: limit,
        sort: 'date_desc'  // 最新的新聞優先
      },
      headers: {
        'Authorization': `Bearer ${TEJ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    if (!response.data || !response.data.data || response.data.data.length === 0) {
      throw new Error(`查無 ${stockId} 的相關新聞`);
    }

    const news = response.data.data.map(item => ({
      title: item.title || item.headline,
      content: item.content || item.summary || item.description,
      source: item.source || 'TEJ',
      published_at: item.published_at || item.date || item.publish_date,
      url: item.url || item.link,
      sentiment: item.sentiment || null  // 如果 TEJ 提供情緒分析
    }));

    console.log(`✅ 成功抓取 ${news.length} 則新聞`);
    return news;

  }, 3, `抓取 ${stockId} 新聞`);
}

/**
 * 抓取產業相關新聞
 * @param {string} industry - 產業名稱
 * @param {number} limit - 新聞數量（預設 6 則）
 * @returns {Promise<Array>} - 新聞陣列
 */
async function fetchIndustryNews(industry, limit = 6) {
  if (!TEJ_API_KEY) {
    throw new Error('TEJ_API_KEY 未設定，請在 Netlify 環境變數中設定');
  }

  return retryWithBackoff(async () => {
    console.log(`📰 抓取 ${industry} 產業的新聞（${limit} 則）...`);

    const url = `${TEJ_API_BASE_URL}/news`;
    
    const response = await axios.get(url, {
      params: {
        industry: industry,
        limit: limit,
        sort: 'date_desc'
      },
      headers: {
        'Authorization': `Bearer ${TEJ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    if (!response.data || !response.data.data || response.data.data.length === 0) {
      throw new Error(`查無 ${industry} 產業的相關新聞`);
    }

    const news = response.data.data.map(item => ({
      title: item.title || item.headline,
      content: item.content || item.summary || item.description,
      source: item.source || 'TEJ',
      published_at: item.published_at || item.date || item.publish_date,
      url: item.url || item.link
    }));

    console.log(`✅ 成功抓取 ${news.length} 則產業新聞`);
    return news;

  }, 3, `抓取 ${industry} 產業新聞`);
}

module.exports = {
  fetchStockNews,
  fetchIndustryNews
};

