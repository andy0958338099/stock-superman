/**
 * FinMind API Module
 * 抓取台股資料（使用官方 HTTP API，無需 token）
 */

const axios = require('axios');
const moment = require('moment');

const FINMIND_BASE_URL = process.env.FINMIND_BASE_URL || 'https://api.finmindtrade.com/api/v4';
const FINMIND_API_TOKEN = process.env.FINMIND_API_TOKEN || '';

// Retry 設定
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 秒

/**
 * 延遲函數
 * @param {number} ms - 延遲毫秒數
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 帶有 exponential backoff 的 retry 機制
 * @param {Function} fn - 要執行的異步函數
 * @param {number} maxRetries - 最大重試次數
 * @param {string} operationName - 操作名稱（用於日誌）
 * @returns {Promise<any>} - 函數執行結果
 */
async function retryWithBackoff(fn, maxRetries = MAX_RETRIES, operationName = 'API request') {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 如果是最後一次嘗試，直接拋出錯誤
      if (attempt === maxRetries) {
        console.error(`❌ ${operationName} 失敗（已重試 ${maxRetries} 次）:`, error.message);
        throw error;
      }

      // 計算延遲時間（exponential backoff）
      const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);

      // 判斷是否應該重試
      const shouldRetry =
        error.code === 'ECONNABORTED' || // 超時
        error.code === 'ENOTFOUND' ||    // DNS 錯誤
        error.code === 'ECONNRESET' ||   // 連線重置
        (error.response && error.response.status >= 500) || // 伺服器錯誤
        (error.response && error.response.status === 429);   // 頻率限制

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
 * 抓取台股日線資料
 * @param {string} stockId - 股票代號（例如：2330）
 * @param {string} startDate - 開始日期 YYYY-MM-DD（預設為一年前）
 * @param {string} endDate - 結束日期 YYYY-MM-DD（預設為今天）
 * @returns {Promise<Array>} - 股價資料陣列（由舊到新排序）
 */
async function fetchStockPrice(stockId, startDate = null, endDate = null) {
  // 預設抓取一年資料
  if (!startDate) {
    startDate = moment().subtract(1, 'year').format('YYYY-MM-DD');
  }
  if (!endDate) {
    endDate = moment().format('YYYY-MM-DD');
  }

  return retryWithBackoff(async () => {
    const url = `${FINMIND_BASE_URL}/data`;
    const params = {
      dataset: 'TaiwanStockPrice',
      data_id: stockId,
      start_date: startDate,
      end_date: endDate
    };

    // 如果有 API Token，加入參數
    if (FINMIND_API_TOKEN) {
      params.token = FINMIND_API_TOKEN;
    }

    console.log(`📊 抓取 FinMind 資料：${stockId} (${startDate} ~ ${endDate})${FINMIND_API_TOKEN ? ' [使用 API Token]' : ''}`);

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
  }, MAX_RETRIES, `抓取股票資料 ${stockId}`);
}

/**
 * 抓取台股基本資訊
 * @param {string} stockId - 股票代號
 * @returns {Promise<object>} - 股票基本資訊
 */
async function fetchStockInfo(stockId) {
  try {
    return await retryWithBackoff(async () => {
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
    }, MAX_RETRIES, `抓取股票資訊 ${stockId}`);
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

/**
 * 抓取美股指數資料
 * @param {string} symbol - 指數代號（例如：^GSPC, ^IXIC, ^SOX）
 * @param {string} startDate - 開始日期 YYYY-MM-DD
 * @param {string} endDate - 結束日期 YYYY-MM-DD
 * @returns {Promise<Array>} - 指數資料陣列
 */
async function fetchUSStockPrice(symbol, startDate = null, endDate = null) {
  // 預設抓取一年資料
  if (!startDate) {
    startDate = moment().subtract(1, 'year').format('YYYY-MM-DD');
  }
  if (!endDate) {
    endDate = moment().format('YYYY-MM-DD');
  }

  return retryWithBackoff(async () => {
    const url = `${FINMIND_BASE_URL}/data`;
    const params = {
      dataset: 'USStockPrice',
      data_id: symbol,
      start_date: startDate,
      end_date: endDate
    };

    // 如果有 API Token，加入參數
    if (FINMIND_API_TOKEN) {
      params.token = FINMIND_API_TOKEN;
    }

    console.log(`📊 抓取美股資料：${symbol} (${startDate} ~ ${endDate})${FINMIND_API_TOKEN ? ' [使用 API Token]' : ''}`);

    const response = await axios.get(url, {
      params,
      timeout: 20000, // 增加到 20 秒，避免超時
      headers: {
        'User-Agent': 'Stock-Superman-LineBot/1.0'
      }
    });

    if (!response.data || !response.data.data || response.data.data.length === 0) {
      throw new Error(`查無美股代號 ${symbol} 的資料`);
    }

    // 標準化資料格式
    const data = response.data.data.map(item => {
      // 處理不同的欄位名稱（FinMind API 可能使用不同的欄位名）
      const high = parseFloat(item.high || item.max || item.High || 0);
      const low = parseFloat(item.low || item.min || item.Low || 0);
      const open = parseFloat(item.open || item.Open || 0);
      const close = parseFloat(item.close || item.Close || 0);
      const volume = parseFloat(item.volume || item.Trading_Volume || item.Volume || 0);

      return {
        date: item.date,
        open: open,
        high: high,
        low: low,
        close: close,
        volume: volume,
        stock_id: item.stock_id || symbol
      };
    });

    // 過濾掉無效資料（close 為 0 或 undefined）
    const validData = data.filter(item => item.close > 0 && item.high > 0 && item.low > 0);

    if (validData.length === 0) {
      throw new Error(`${symbol} 資料無效：所有資料的價格都是 0`);
    }

    // 由舊到新排序
    validData.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log(`✅ 成功抓取美股 ${symbol} ${validData.length} 筆有效資料（原始 ${data.length} 筆）`);
    return validData;
  }, MAX_RETRIES, `抓取美股資料 ${symbol}`);
}

/**
 * 抓取匯率資料 (USD/TWD)
 * @param {string} startDate - 開始日期
 * @param {string} endDate - 結束日期
 * @returns {Promise<Array>} - 匯率資料陣列
 */
async function fetchExchangeRate(startDate = null, endDate = null) {
  if (!startDate) {
    startDate = moment().subtract(6, 'months').format('YYYY-MM-DD');
  }
  if (!endDate) {
    endDate = moment().format('YYYY-MM-DD');
  }

  return retryWithBackoff(async () => {
    const url = `${FINMIND_BASE_URL}/data`;
    const params = {
      dataset: 'TaiwanExchangeRate',
      data_id: 'USD',
      start_date: startDate,
      end_date: endDate
    };

    // 如果有 API Token，加入參數
    if (FINMIND_API_TOKEN) {
      params.token = FINMIND_API_TOKEN;
    }

    console.log(`📊 抓取匯率資料 USD/TWD${FINMIND_API_TOKEN ? ' [使用 API Token]' : ''}`);
    console.log(`   參數: dataset=${params.dataset}, data_id=${params.data_id}, start_date=${params.start_date}, end_date=${params.end_date}`);

    const response = await axios.get(url, {
      params,
      timeout: 15000
    });

    console.log(`   回應狀態: ${response.status}`);
    console.log(`   回應資料筆數: ${response.data?.data?.length || 0}`);

    if (!response.data || !response.data.data || response.data.data.length === 0) {
      console.warn('⚠️ 查無匯率資料，返回空陣列');
      return [];
    }

    const data = response.data.data.map(item => ({
      date: item.date,
      rate: parseFloat(item.close) || 0
    }));

    data.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log(`✅ 成功抓取匯率 ${data.length} 筆資料，最新: ${JSON.stringify(data[data.length - 1])}`);
    return data;
  }, MAX_RETRIES, '抓取匯率資料');
}

/**
 * 抓取 VIX 恐慌指數
 * @param {string} startDate - 開始日期
 * @param {string} endDate - 結束日期
 * @returns {Promise<Array>} - VIX 資料陣列
 */
async function fetchVIX(startDate = null, endDate = null) {
  if (!startDate) {
    startDate = moment().subtract(6, 'months').format('YYYY-MM-DD');
  }
  if (!endDate) {
    endDate = moment().format('YYYY-MM-DD');
  }

  return retryWithBackoff(async () => {
    const url = `${FINMIND_BASE_URL}/data`;
    const params = {
      dataset: 'USStockPrice',
      data_id: '^VIX',
      start_date: startDate,
      end_date: endDate
    };

    // 如果有 API Token，加入參數
    if (FINMIND_API_TOKEN) {
      params.token = FINMIND_API_TOKEN;
    }

    console.log(`📊 抓取 VIX 指數${FINMIND_API_TOKEN ? ' [使用 API Token]' : ''}`);
    console.log(`   參數: dataset=${params.dataset}, data_id=${params.data_id}, start_date=${params.start_date}, end_date=${params.end_date}`);

    const response = await axios.get(url, {
      params,
      timeout: 15000
    });

    console.log(`   回應狀態: ${response.status}`);
    console.log(`   回應資料筆數: ${response.data?.data?.length || 0}`);

    if (!response.data || !response.data.data || response.data.data.length === 0) {
      console.warn('⚠️ 查無 VIX 資料，返回空陣列');
      return [];
    }

    const data = response.data.data.map(item => ({
      date: item.date,
      close: parseFloat(item.close) || 0
    }));

    data.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log(`✅ 成功抓取 VIX ${data.length} 筆資料，最新: ${JSON.stringify(data[data.length - 1])}`);
    return data;
  }, MAX_RETRIES, '抓取 VIX 指數');
}

module.exports = {
  fetchStockPrice,
  fetchStockInfo,
  isValidStockId,
  fetchUSStockPrice,
  fetchExchangeRate,
  fetchVIX
};

