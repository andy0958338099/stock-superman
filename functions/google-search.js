/**
 * Google Custom Search API 整合
 * 用於搜尋財經新聞和政治新聞
 */

const axios = require('axios');

// Google Custom Search API 設定
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const GOOGLE_SEARCH_API_URL = 'https://www.googleapis.com/customsearch/v1';

/**
 * 執行 Google 搜尋
 * @param {string} query - 搜尋關鍵字
 * @param {number} numResults - 結果數量（最多 10）
 * @returns {Promise<Array>} - 搜尋結果陣列
 */
async function googleSearch(query, numResults = 6) {
  try {
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
      throw new Error('Google Search API 未設定環境變數');
    }

    console.log(`🔍 Google 搜尋：${query}`);

    const response = await axios.get(GOOGLE_SEARCH_API_URL, {
      params: {
        key: GOOGLE_SEARCH_API_KEY,
        cx: GOOGLE_SEARCH_ENGINE_ID,
        q: query,
        num: Math.min(numResults, 10), // Google API 最多一次 10 筆
        lr: 'lang_zh-TW', // 繁體中文
        dateRestrict: 'm1' // 最近一個月
      },
      headers: {
        'Referer': 'https://stock-superman.netlify.app',
        'User-Agent': 'Stock-Superman-Bot/1.0'
      },
      timeout: 10000
    });

    if (!response.data.items || response.data.items.length === 0) {
      console.log('⚠️ 沒有搜尋結果');
      return [];
    }

    const results = response.data.items.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink
    }));

    console.log(`✅ 找到 ${results.length} 筆結果`);
    return results;

  } catch (error) {
    console.error('❌ Google 搜尋失敗:', error.message);
    
    if (error.response) {
      console.error('API 錯誤:', error.response.data);
    }
    
    throw new Error(`Google 搜尋失敗: ${error.message}`);
  }
}

/**
 * 搜尋財經新聞
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @returns {Promise<Array>} - 新聞結果
 */
async function searchFinancialNews(stockId, stockName) {
  try {
    const query = `${stockName} ${stockId} 財經新聞 台股`;
    const results = await googleSearch(query, 6);
    
    return results;
  } catch (error) {
    console.error('❌ 財經新聞搜尋失敗:', error);
    throw error;
  }
}

/**
 * 搜尋政治/國際情勢新聞
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {string} industry - 產業類別
 * @returns {Promise<Array>} - 新聞結果
 */
async function searchPoliticalNews(stockId, stockName, industry) {
  try {
    // 根據產業調整搜尋關鍵字
    const industryKeywords = {
      '半導體': '半導體 晶片 國際情勢 地緣政治',
      '電子': '科技 電子 國際貿易',
      '金融': '金融 經濟政策 央行',
      '傳產': '製造業 供應鏈 國際貿易'
    };

    const keyword = industryKeywords[industry] || `${industry} 國際情勢`;
    const query = `${keyword} ${stockName} 產業影響`;
    
    const results = await googleSearch(query, 6);
    
    return results;
  } catch (error) {
    console.error('❌ 政治新聞搜尋失敗:', error);
    throw error;
  }
}

/**
 * 格式化搜尋結果為文字
 * @param {Array} results - 搜尋結果
 * @returns {string} - 格式化的文字
 */
function formatSearchResults(results) {
  if (!results || results.length === 0) {
    return '沒有找到相關新聞';
  }

  return results.map((item, index) => {
    return `【新聞 ${index + 1}】\n` +
           `標題：${item.title}\n` +
           `來源：${item.displayLink}\n` +
           `摘要：${item.snippet}\n` +
           `連結：${item.link}`;
  }).join('\n\n---\n\n');
}

/**
 * 取得產業類別（簡化版）
 * @param {string} stockId - 股票代號
 * @returns {string} - 產業類別
 */
function getIndustryCategory(stockId) {
  // 簡化的產業分類（實際應該從資料庫或 API 取得）
  const semiconductorStocks = ['2330', '2303', '2454', '3711', '2379'];
  const financialStocks = ['2882', '2881', '2886', '2891', '2892'];
  const electronicStocks = ['2317', '2382', '2357', '3008'];
  
  if (semiconductorStocks.includes(stockId)) return '半導體';
  if (financialStocks.includes(stockId)) return '金融';
  if (electronicStocks.includes(stockId)) return '電子';
  
  return '一般產業';
}

module.exports = {
  googleSearch,
  searchFinancialNews,
  searchPoliticalNews,
  formatSearchResults,
  getIndustryCategory
};

