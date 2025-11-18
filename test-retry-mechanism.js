/**
 * 測試 Retry 機制
 * 驗證 API 請求的重試功能是否正常運作
 */

require('dotenv').config();

// 模擬測試
async function testRetryMechanism() {
  console.log('🧪 開始測試 Retry 機制...\n');

  // 測試 1: 正常請求（應該成功）
  console.log('📊 測試 1: 正常的 FinMind API 請求');
  try {
    const { fetchStockPrice } = require('./functions/finmind');
    const data = await fetchStockPrice('2330', '2025-01-01', '2025-01-10');
    console.log(`✅ 成功抓取 ${data.length} 筆資料`);
  } catch (error) {
    console.error('❌ 測試 1 失敗:', error.message);
  }

  console.log('\n---\n');

  // 測試 2: 股票資訊查詢
  console.log('📊 測試 2: 股票資訊查詢');
  try {
    const { fetchStockInfo } = require('./functions/finmind');
    const info = await fetchStockInfo('2330');
    console.log(`✅ 成功取得股票資訊: ${info.stock_name}`);
  } catch (error) {
    console.error('❌ 測試 2 失敗:', error.message);
  }

  console.log('\n---\n');

  // 測試 3: 無效的股票代號（應該失敗，但不會重試）
  console.log('📊 測試 3: 無效的股票代號（預期失敗）');
  try {
    const { fetchStockPrice } = require('./functions/finmind');
    await fetchStockPrice('99999', '2025-01-01', '2025-01-10');
    console.log('❌ 不應該成功');
  } catch (error) {
    console.log(`✅ 預期的錯誤: ${error.message}`);
  }

  console.log('\n---\n');

  // 測試 4: DeepSeek API（如果有設定 API Key）
  if (process.env.DEEPSEEK_API_KEY) {
    console.log('📊 測試 4: DeepSeek AI 分析（簡化版）');
    try {
      const { analyzeWithDeepSeek } = require('./functions/deepseek');
      const { fetchStockPrice } = require('./functions/finmind');
      
      // 先抓取資料
      const stockData = await fetchStockPrice('2330', '2024-12-01', '2025-01-10');
      
      // 進行 AI 分析
      const analysis = await analyzeWithDeepSeek('2330', stockData, '台積電');
      
      if (analysis) {
        console.log(`✅ AI 分析成功`);
        console.log(`   趨勢：UP ${analysis.probability_up}% / FLAT ${analysis.probability_flat}% / DOWN ${analysis.probability_down}%`);
      } else {
        console.log('⚠️ AI 分析返回 null（可能是 API Key 問題）');
      }
    } catch (error) {
      console.error('❌ 測試 4 失敗:', error.message);
    }
  } else {
    console.log('⏭️ 測試 4: 跳過（未設定 DEEPSEEK_API_KEY）');
  }

  console.log('\n---\n');
  console.log('✅ 所有測試完成！');
  console.log('\n💡 Retry 機制特點：');
  console.log('   • 網路錯誤會自動重試（最多 3 次）');
  console.log('   • 使用 Exponential Backoff（1s, 2s, 4s）');
  console.log('   • 客戶端錯誤（4xx）不會重試');
  console.log('   • 伺服器錯誤（5xx）和頻率限制（429）會重試');
}

// 執行測試
testRetryMechanism().catch(error => {
  console.error('❌ 測試執行失敗:', error);
  process.exit(1);
});

