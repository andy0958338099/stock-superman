/**
 * FinMind API Module
 * 抓取台股資料（使用官方 HTTP API，無需 token）
 */

const axios = require('axios');
const moment = require('moment');

const FINMIND_BASE_URL = process.env.FINMIND_BASE_URL || 'https://api.finmindtrade.com/api/v4';

/**
 * 抓取台股日線資料
 * @param {string} stockId - 股票代號（例如：2330）
 * @param {string} startDate - 開始日期 YYYY-MM-DD（預設為一年前）
 * @param {string} endDate - 結束日期 YYYY-MM-DD（預設為今天）
 * @returns {Promise<Array>} - 股價資料陣列（由舊到新排序）
 */
async function fetchStockPrice(stockId, startDate = null, endDate = null) {
  try {
    // 預設抓取一年資料
    if (!startDate) {
      startDate = moment().subtract(1, 'year').format('YYYY-MM-DD');
    }
    if (!endDate) {
      endDate = moment().format('YYYY-MM-DD');
    }

    const url = `${FINMIND_BASE_URL}/data`;
    const params = {
      dataset: 'TaiwanStockPrice',
      data_id: stockId,
      start_date: startDate,
      end_date: endDate
    };

    console.log(`📊 抓取 FinMind 資料：${stockId} (${startDate} ~ ${endDate})`);

    const response = await axios.get(url, { 
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'Stock-Superman-LineBot/1.0'
      }
    });

    if (!response.data || !response.data.data || response.data.data.length === 0) {
      throw new Error(`查無股票代號 ${stockId} 的資料，請確認代號是否正確`);
    }

    // 標準化資料格式（FinMind 欄位可能是 max/min 或 high/low）
    const data = response.data.data.map(item => ({
      date: item.date,
      open: parseFloat(item.open) || 0,
      high: parseFloat(item.max || item.high) || 0,
      low: parseFloat(item.min || item.low) || 0,
      close: parseFloat(item.close) || 0,
      volume: parseFloat(item.Trading_Volume || item.volume || 0),
      stock_id: item.stock_id
    }));

    // 由舊到新排序
    data.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log(`✅ 成功抓取 ${data.length} 筆資料`);
    return data;

  } catch (error) {
    if (error.response) {
      console.error('FinMind API 錯誤:', error.response.status, error.response.data);
      throw new Error(`FinMind API 回應錯誤：${error.response.status}`);
    } else if (error.request) {
      console.error('FinMind API 無回應:', error.message);
      throw new Error('無法連線到 FinMind API，請稍後再試');
    } else {
      console.error('FinMind 錯誤:', error.message);
      throw error;
    }
  }
}

/**
 * 抓取台股基本資訊
 * @param {string} stockId - 股票代號
 * @returns {Promise<object>} - 股票基本資訊
 */
async function fetchStockInfo(stockId) {
  try {
    const url = `${FINMIND_BASE_URL}/data`;
    const params = {
      dataset: 'TaiwanStockInfo',
      data_id: stockId
    };

    const response = await axios.get(url, { 
      params,
      timeout: 10000 
    });

    if (!response.data || !response.data.data || response.data.data.length === 0) {
      return {
        stock_id: stockId,
        stock_name: stockId, // 找不到就用代號
        industry_category: '未知',
        market: '未知'
      };
    }

    const info = response.data.data[0];
    return {
      stock_id: info.stock_id,
      stock_name: info.stock_name || stockId,
      industry_category: info.industry_category || '未知',
      market: info.type || '未知'
    };

  } catch (error) {
    console.error('抓取股票資訊失敗:', error.message);
    // 失敗時回傳基本資訊
    return {
      stock_id: stockId,
      stock_name: stockId,
      industry_category: '未知',
      market: '未知'
    };
  }
}

/**
 * 驗證股票代號格式
 * @param {string} stockId - 股票代號
 * @returns {boolean} - 是否為有效格式
 */
function isValidStockId(stockId) {
  // 台股代號通常是 4 位數字，部分是 3 位或 5 位
  return /^\d{3,5}$/.test(stockId);
}

module.exports = {
  fetchStockPrice,
  fetchStockInfo,
  isValidStockId
};

