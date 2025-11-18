/**
 * NewsAPI 客戶端
 * 抓取國際新聞（用於政治分析）
 */

const axios = require('axios');

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const NEWSAPI_BASE_URL = 'https://newsapi.org/v2';

/**
 * Retry 機制（Exponential Backoff）
 */
async function retryWithBackoff(fn, maxRetries = 3, taskName = '請求') {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.log(`⚠️ ${taskName} 失敗，${delay}ms 後重試... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * 產業關鍵字對應表
 */
const INDUSTRY_KEYWORDS = {
  '半導體': ['semiconductor', 'chip', 'TSMC', 'Taiwan semiconductor', 'chip manufacturing'],
  '電子': ['electronics', 'technology', 'tech industry'],
  '金融': ['finance', 'banking', 'financial services'],
  '生技': ['biotech', 'pharmaceutical', 'healthcare'],
  '航運': ['shipping', 'maritime', 'logistics'],
  '鋼鐵': ['steel', 'metal', 'iron'],
  '塑化': ['petrochemical', 'chemical industry'],
  '汽車': ['automotive', 'electric vehicle', 'EV'],
  '能源': ['energy', 'renewable energy', 'oil', 'gas'],
  '通訊': ['telecommunications', '5G', 'telecom']
};

/**
 * 取得產業的英文關鍵字
 */
function getIndustryKeywords(industry) {
  // 精確匹配
  if (INDUSTRY_KEYWORDS[industry]) {
    return INDUSTRY_KEYWORDS[industry];
  }

  // 模糊匹配
  for (const [key, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (industry.includes(key) || key.includes(industry)) {
      return keywords;
    }
  }

  // 預設使用產業名稱
  return [industry];
}

/**
 * 抓取產業相關的國際新聞
 * @param {string} industry - 產業類別（中文）
 * @param {number} limit - 新聞數量（預設 6）
 * @returns {Promise<Array>} - 新聞陣列
 */
async function fetchIndustryNews(industry, limit = 6) {
  if (!NEWSAPI_KEY) {
    console.warn('⚠️ NEWSAPI_KEY 未設定，使用模擬資料');
    return generateMockNews(industry, limit);
  }

  return retryWithBackoff(async () => {
    const keywords = getIndustryKeywords(industry);
    const query = keywords.slice(0, 3).join(' OR '); // 使用前 3 個關鍵字

    console.log(`📰 抓取 ${industry} 產業新聞，關鍵字: ${query}`);

    const response = await axios.get(`${NEWSAPI_BASE_URL}/everything`, {
      params: {
        q: query,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: limit,
        apiKey: NEWSAPI_KEY
      },
      timeout: 15000
    });

    if (response.data.status !== 'ok') {
      throw new Error(`NewsAPI 錯誤: ${response.data.message || '未知錯誤'}`);
    }

    const articles = response.data.articles || [];
    
    if (articles.length === 0) {
      console.warn(`⚠️ 未找到 ${industry} 相關新聞，使用模擬資料`);
      return generateMockNews(industry, limit);
    }

    console.log(`✅ 成功抓取 ${articles.length} 則 ${industry} 產業新聞`);

    return articles.map(article => ({
      title: article.title,
      description: article.description || article.content,
      source: article.source.name,
      publishedAt: article.publishedAt,
      url: article.url,
      urlToImage: article.urlToImage
    }));

  }, 3, `抓取 ${industry} 產業新聞`);
}

/**
 * 生成模擬新聞（當 API 不可用時）
 */
function generateMockNews(industry, limit = 6) {
  console.log(`📰 生成 ${industry} 產業模擬新聞`);
  
  const mockNews = [];
  const today = new Date();

  for (let i = 0; i < limit; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    mockNews.push({
      title: `${industry} 產業國際動態 ${i + 1}`,
      description: `關於 ${industry} 產業的最新國際政治和經濟動態分析。本則新聞涵蓋了該產業面臨的主要挑戰和機遇。`,
      source: 'Mock News',
      publishedAt: date.toISOString(),
      url: 'https://example.com',
      urlToImage: null
    });
  }

  return mockNews;
}

module.exports = {
  fetchIndustryNews,
  getIndustryKeywords
};

