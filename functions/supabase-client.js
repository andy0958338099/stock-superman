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
 * @param {string} stockId - 股票代號（可選，若為 null 則刪除所有快取）
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
      // 刪除所有快取：先查詢所有記錄，再刪除
      const { data: allData, error: selectError } = await supabase
        .from('stock_cache')
        .select('stock_id');

      if (selectError) throw selectError;

      if (!allData || allData.length === 0) {
        console.log('⚠️ 沒有快取可以刪除');
        return {
          success: true,
          count: 0,
          message: '沒有快取可以刪除'
        };
      }

      // 刪除所有記錄（使用 neq 搭配一個不可能的值來刪除所有）
      const { data, error } = await supabase
        .from('stock_cache')
        .delete()
        .neq('stock_id', '')  // 刪除所有 stock_id 不等於空字串的記錄（即所有記錄）
        .select();

      if (error) throw error;

      const deletedCount = data ? data.length : 0;
      console.log(`✅ 已刪除所有快取（${deletedCount} 筆）`);

      return {
        success: true,
        count: deletedCount,
        message: `已刪除所有快取（${deletedCount} 筆）`
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
    const { data, error } = await supabase
      .from('stock_cache')
      .select('*')
      .eq('stock_id', 'US_MARKET')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('⚠️ 沒有美股分析快取');
      return null;
    }

    const cache = data[0];
    const cacheTime = new Date(cache.created_at);
    const now = new Date();
    const diffHours = (now - cacheTime) / (1000 * 60 * 60);

    // 快取 4 小時（美股資料更新頻率較低）
    if (diffHours > 4) {
      console.log(`⚠️ 美股分析快取已過期（${diffHours.toFixed(1)} 小時前）`);
      return null;
    }

    console.log(`✅ 使用美股分析快取（${diffHours.toFixed(1)} 小時前，快取有效期 4 小時）`);
    return cache.analysis_result;

  } catch (error) {
    console.error('取得美股分析快取失敗:', error);
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
    // 先刪除舊的快取
    await supabase
      .from('stock_cache')
      .delete()
      .eq('stock_id', 'US_MARKET');

    // 儲存新的快取
    const { error } = await supabase
      .from('stock_cache')
      .insert({
        stock_id: 'US_MARKET',
        analysis_result: analysisResult,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    console.log('✅ 美股分析快取已儲存');
    return true;

  } catch (error) {
    console.error('儲存美股分析快取失敗:', error);
    return false;
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
  saveUSMarketCache
};

