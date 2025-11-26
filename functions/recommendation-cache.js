/**
 * 推薦功能快取模組
 * 使用 Supabase stock_cache 表儲存「今天」「高成長」「瘋狂」推薦結果
 * 快取有效期：4 小時（避免浪費 API Token）
 */

const { supabase } = require('./supabase-client');

// 快取 Key 定義
const CACHE_KEYS = {
  TODAY_RECOMMENDATION: 'TODAY_RECOMMENDATION',
  GROWTH_RECOMMENDATION: 'GROWTH_RECOMMENDATION',
  CRAZY_RECOMMENDATION: 'CRAZY_RECOMMENDATION'
};

// 快取有效期（毫秒）
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 小時

/**
 * 取得推薦快取
 * @param {string} cacheKey - 快取 Key（TODAY_RECOMMENDATION 或 GROWTH_RECOMMENDATION）
 * @returns {Promise<object|null>} - 快取資料或 null
 */
async function getRecommendationCache(cacheKey) {
  try {
    console.log(`🔍 查詢推薦快取：${cacheKey}`);
    
    const { data, error } = await supabase
      .from('stock_cache')
      .select('result_json, updated_at')
      .eq('stock_id', cacheKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`⚠️ 快取不存在：${cacheKey}`);
        return null;
      }
      throw error;
    }

    if (!data || !data.result_json) {
      console.log(`⚠️ 快取資料為空：${cacheKey}`);
      return null;
    }

    // 檢查快取是否過期
    const updatedAt = new Date(data.updated_at).getTime();
    const now = Date.now();
    const age = now - updatedAt;

    if (age > CACHE_TTL) {
      console.log(`⚠️ 快取已過期：${cacheKey}（已存在 ${Math.round(age / 60000)} 分鐘）`);
      return null;
    }

    const remainingMinutes = Math.round((CACHE_TTL - age) / 60000);
    console.log(`✅ 快取有效：${cacheKey}（剩餘 ${remainingMinutes} 分鐘）`);
    
    return {
      ...data.result_json,
      fromCache: true,
      cacheAge: Math.round(age / 60000), // 快取已存在幾分鐘
      cacheRemaining: remainingMinutes   // 剩餘有效時間（分鐘）
    };
  } catch (error) {
    console.error(`❌ 取得推薦快取失敗：${cacheKey}`, error.message);
    return null;
  }
}

/**
 * 儲存推薦快取
 * @param {string} cacheKey - 快取 Key
 * @param {object} result - 推薦結果
 * @returns {Promise<boolean>} - 成功回傳 true
 */
async function saveRecommendationCache(cacheKey, result) {
  try {
    console.log(`💾 儲存推薦快取：${cacheKey}`);

    const { error } = await supabase
      .from('stock_cache')
      .upsert({
        stock_id: cacheKey,
        result_json: result,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'stock_id'
      });

    if (error) throw error;

    console.log(`✅ 推薦快取已儲存：${cacheKey}`);
    return true;
  } catch (error) {
    console.error(`❌ 儲存推薦快取失敗：${cacheKey}`, error.message);
    return false;
  }
}

/**
 * 清除推薦快取
 * @param {string} cacheKey - 快取 Key（可選，不傳則清除所有推薦快取）
 * @returns {Promise<boolean>} - 成功回傳 true
 */
async function clearRecommendationCache(cacheKey = null) {
  try {
    if (cacheKey) {
      console.log(`🗑️ 清除推薦快取：${cacheKey}`);
      const { error } = await supabase
        .from('stock_cache')
        .delete()
        .eq('stock_id', cacheKey);
      if (error) throw error;
    } else {
      console.log('🗑️ 清除所有推薦快取');
      const { error } = await supabase
        .from('stock_cache')
        .delete()
        .in('stock_id', [CACHE_KEYS.TODAY_RECOMMENDATION, CACHE_KEYS.GROWTH_RECOMMENDATION]);
      if (error) throw error;
    }

    console.log('✅ 推薦快取已清除');
    return true;
  } catch (error) {
    console.error('❌ 清除推薦快取失敗:', error.message);
    return false;
  }
}

module.exports = {
  CACHE_KEYS,
  CACHE_TTL,
  getRecommendationCache,
  saveRecommendationCache,
  clearRecommendationCache
};

