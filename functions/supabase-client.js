/**
 * Supabase Client Module
 * 提供 Supabase 連線與操作
 */

const { createClient } = require('@supabase/supabase-js');

// 驗證環境變數
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('❌ Supabase 環境變數未設定：需要 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
}

// 建立 Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * 檢查 reply token 是否已使用（去重機制）
 * @param {string} replyToken - LINE reply token
 * @returns {Promise<boolean>} - true 表示已使用過
 */
async function isReplyTokenUsed(replyToken) {
  try {
    const { data, error } = await supabase
      .from('line_events')
      .select('reply_token')
      .eq('reply_token', replyToken)
      .limit(1);
    
    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error('檢查 reply token 失敗:', error);
    return false; // 發生錯誤時保守處理，允許繼續
  }
}

/**
 * 記錄 reply token（防止重複使用）
 * @param {string} replyToken - LINE reply token
 * @returns {Promise<boolean>} - 成功回傳 true
 */
async function recordReplyToken(replyToken) {
  try {
    const { error } = await supabase
      .from('line_events')
      .insert([{ 
        reply_token: replyToken, 
        created_at: new Date().toISOString() 
      }]);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('記錄 reply token 失敗:', error);
    return false;
  }
}

/**
 * 取得股票快取資料
 * @param {string} stockId - 股票代號
 * @param {number} maxAgeHours - 最大快取時間（小時）
 * @returns {Promise<object|null>} - 快取資料或 null
 */
async function getStockCache(stockId, maxAgeHours = 12) {
  try {
    const { data, error } = await supabase
      .from('stock_cache')
      .select('*')
      .eq('stock_id', stockId)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    if (!data || data.length === 0) return null;
    
    const cache = data[0];
    const now = new Date();
    const cacheTime = new Date(cache.updated_at);
    const ageMs = now - cacheTime;
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    
    // 檢查是否過期
    if (ageMs > maxAgeMs) {
      console.log(`快取已過期：${stockId}，年齡 ${Math.round(ageMs / 1000 / 60)} 分鐘`);
      return null;
    }
    
    return cache;
  } catch (error) {
    console.error('取得快取失敗:', error);
    return null;
  }
}

/**
 * 儲存或更新股票快取
 * @param {object} cacheData - 快取資料
 * @returns {Promise<boolean>} - 成功回傳 true
 */
async function saveStockCache(cacheData) {
  try {
    const { error } = await supabase
      .from('stock_cache')
      .upsert([{
        stock_id: cacheData.stock_id,
        result_json: cacheData.result_json,
        image_url: cacheData.image_url,
        image_path: cacheData.image_path,
        result_summary: cacheData.result_summary,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'stock_id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('儲存快取失敗:', error);
    return false;
  }
}

/**
 * 刪除指定股票的快取
 * @param {string} stockId - 股票代號（可選，若為 null 則刪除所有快取，包括美股分析快取）
 * @returns {Promise<object>} - { success: boolean, count: number, message: string }
 */
async function deleteStockCache(stockId = null) {
  try {
    if (stockId) {
      // 刪除特定股票快取
      const { data, error } = await supabase
        .from('stock_cache')
        .delete()
        .eq('stock_id', stockId)
        .select();

      if (error) throw error;

      const deletedCount = data ? data.length : 0;
      console.log(`✅ 已刪除股票 ${stockId} 的快取（${deletedCount} 筆）`);

      return {
        success: true,
        count: deletedCount,
        message: `已刪除股票 ${stockId} 的快取（${deletedCount} 筆）`
      };
    } else {
      // 刪除所有快取：包括台股快取和美股分析快取

      // 1. 刪除台股快取
      const { data: allData, error: selectError } = await supabase
        .from('stock_cache')
        .select('stock_id');

      if (selectError) throw selectError;

      let stockCacheCount = 0;
      if (allData && allData.length > 0) {
        const { data, error } = await supabase
          .from('stock_cache')
          .delete()
          .neq('stock_id', '')  // 刪除所有 stock_id 不等於空字串的記錄（即所有記錄）
          .select();

        if (error) throw error;
        stockCacheCount = data ? data.length : 0;
        console.log(`✅ 已刪除台股快取（${stockCacheCount} 筆）`);
      }

      // 2. 刪除美股分析快取
      const { data: usMarketData, error: usMarketError } = await supabase
        .from('us_market_analysis_tasks')
        .delete()
        .neq('task_id', '')  // 刪除所有記錄
        .select();

      let usMarketCount = 0;
      if (!usMarketError && usMarketData) {
        usMarketCount = usMarketData.length;
        console.log(`✅ 已刪除美股分析快取（${usMarketCount} 筆）`);
      }

      const totalCount = stockCacheCount + usMarketCount;

      if (totalCount === 0) {
        console.log('⚠️ 沒有快取可以刪除');
        return {
          success: true,
          count: 0,
          message: '沒有快取可以刪除'
        };
      }

      return {
        success: true,
        count: totalCount,
        message: `已刪除所有快取（台股 ${stockCacheCount} 筆 + 美股 ${usMarketCount} 筆，共 ${totalCount} 筆）`
      };
    }
  } catch (error) {
    console.error('刪除快取失敗:', error);
    return {
      success: false,
      count: 0,
      message: `刪除失敗：${error.message}`
    };
  }
}

/**
 * 取得美股分析快取
 * @returns {Promise<object|null>} - 快取資料或 null
 */
async function getUSMarketCache() {
  try {
    console.log('🔍 查詢 stock_cache 表，stock_id = US_MARKET...');
    const { data, error } = await supabase
      .from('stock_cache')
      .select('*')
      .eq('stock_id', 'US_MARKET')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ 查詢快取時發生錯誤:', error);
      throw error;
    }

    console.log(`📊 查詢結果：找到 ${data?.length || 0} 筆記錄`);

    if (!data || data.length === 0) {
      console.log('⚠️ 沒有美股分析快取（stock_cache 表中無 US_MARKET 記錄）');
      return null;
    }

    const cache = data[0];
    console.log(`📅 快取更新時間：${cache.updated_at}`);

    const cacheTime = new Date(cache.updated_at);
    const now = new Date();
    const diffHours = (now - cacheTime) / (1000 * 60 * 60);

    // 快取 6 小時（統一快取時間）
    if (diffHours > 6) {
      console.log(`⚠️ 美股分析快取已過期（${diffHours.toFixed(1)} 小時前，超過 6 小時有效期）`);
      return null;
    }

    console.log(`✅ 快取有效！使用美股分析快取（${diffHours.toFixed(1)} 小時前，快取有效期 6 小時）`);
    console.log(`📊 快取數據結構：`, Object.keys(cache.result_json || {}));
    return cache.result_json;

  } catch (error) {
    console.error('❌ 取得美股分析快取失敗:', error);
    return null;
  }
}

/**
 * 儲存美股分析快取
 * @param {object} analysisResult - 分析結果
 * @returns {Promise<boolean>} - 成功回傳 true
 */
async function saveUSMarketCache(analysisResult) {
  try {
    console.log('💾 開始儲存美股分析快取到 stock_cache 表...');
    console.log('📊 分析結果結構:', Object.keys(analysisResult || {}));

    // 使用 upsert 來插入或更新快取
    console.log('💾 Upsert US_MARKET 快取...');
    const { error } = await supabase
      .from('stock_cache')
      .upsert({
        stock_id: 'US_MARKET',
        result_json: analysisResult,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'stock_id'
      });

    if (error) {
      console.error('❌ Upsert 快取時發生錯誤:', error);
      throw error;
    }

    console.log('✅ 美股分析快取已成功儲存到 stock_cache 表（stock_id = US_MARKET）');
    return true;

  } catch (error) {
    console.error('❌ 儲存美股分析快取失敗:', error);
    console.error('錯誤詳情:', JSON.stringify(error, null, 2));
    return false;
  }
}

/**
 * 記錄股票搜尋（用於熱門股票統計）
 * @param {string} stockId - 股票代號
 * @param {string} stockName - 股票名稱
 * @param {string} userId - 用戶 ID
 * @returns {Promise<boolean>} - 成功回傳 true
 */
async function recordStockSearch(stockId, stockName, userId) {
  try {
    const { error } = await supabase
      .from('stock_search_logs')
      .insert([{
        stock_id: stockId,
        stock_name: stockName || stockId,
        user_id: userId,
        searched_at: new Date().toISOString()
      }]);

    if (error) throw error;
    console.log(`📊 已記錄搜尋：${stockId} (${stockName})`);
    return true;
  } catch (error) {
    console.error('記錄搜尋失敗:', error);
    return false;
  }
}

/**
 * 取得熱門股票（過去24小時內搜尋次數最多的前10名）
 * @returns {Promise<Array>} - 熱門股票陣列
 */
async function getHotStocks() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 查詢過去24小時的搜尋記錄，按股票分組統計
    const { data, error } = await supabase
      .from('stock_search_logs')
      .select('stock_id, stock_name, searched_at')
      .gte('searched_at', twentyFourHoursAgo);

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('⚠️ 過去24小時沒有搜尋記錄');
      return [];
    }

    // 統計每個股票的搜尋次數和最新名稱
    const stockStats = {};
    const uniqueUsers = {}; // 統計不重複用戶數

    data.forEach(record => {
      const id = record.stock_id;
      if (!stockStats[id]) {
        stockStats[id] = {
          stock_id: id,
          stock_name: record.stock_name,
          search_count: 0,
          users: new Set()
        };
      }
      stockStats[id].search_count++;
      // 更新為最新的名稱
      if (record.stock_name) {
        stockStats[id].stock_name = record.stock_name;
      }
    });

    // 轉換成陣列並排序
    const hotStocks = Object.values(stockStats)
      .map(stock => ({
        stock_id: stock.stock_id,
        stock_name: stock.stock_name,
        search_count: stock.search_count
      }))
      .sort((a, b) => b.search_count - a.search_count)
      .slice(0, 10);

    console.log(`🔥 熱門股票統計完成，共 ${hotStocks.length} 檔`);
    return hotStocks;
  } catch (error) {
    console.error('取得熱門股票失敗:', error);
    return [];
  }
}

module.exports = {
  supabase,
  isReplyTokenUsed,
  recordReplyToken,
  getStockCache,
  saveStockCache,
  deleteStockCache,
  getUSMarketCache,
  saveUSMarketCache,
  recordStockSearch,
  getHotStocks
};

