/**
 * 本地測試腳本
 * 用於測試各個模組功能
 */

require('dotenv').config();

const { fetchStockPrice, fetchStockInfo } = require('./functions/finmind');
const { calculateKD, calculateMACD, calculateMA, analyzeKD, analyzeMACDSignal } = require('./functions/indicators');
const { generateIndicatorChart } = require('./functions/generate-chart');
const { analyzeWithDeepSeek } = require('./functions/deepseek');

async function testFinMind() {
  console.log('\n=== 測試 FinMind API ===');
  try {
    const stockId = '2330';
    console.log(`查詢股票：${stockId}`);
    
    const [stockData, stockInfo] = await Promise.all([
      fetchStockPrice(stockId),
      fetchStockInfo(stockId)
    ]);
    
    console.log(`✅ 股票名稱：${stockInfo.stock_name}`);
    console.log(`✅ 產業類別：${stockInfo.industry_category}`);
    console.log(`✅ 資料筆數：${stockData.length}`);
    console.log(`✅ 最新日期：${stockData[stockData.length - 1].date}`);
    console.log(`✅ 最新收盤：${stockData[stockData.length - 1].close}`);
    
    return { stockData, stockInfo };
  } catch (error) {
    console.error('❌ FinMind 測試失敗:', error.message);
    throw error;
  }
}

async function testIndicators(stockData) {
  console.log('\n=== 測試技術指標計算 ===');
  try {
    const recentData = stockData.slice(-60);
    const close = recentData.map(d => d.close);
    
    // KD
    const { K, D } = calculateKD(recentData);
    const kdAnalysis = analyzeKD(K, D);
    console.log(`✅ KD 指標：K=${kdAnalysis.K}, D=${kdAnalysis.D}`);
    console.log(`   狀態：${kdAnalysis.signal} - ${kdAnalysis.description}`);
    
    // MACD
    const { MACD, Signal, Histogram } = calculateMACD(recentData);
    const macdAnalysis = analyzeMACDSignal(MACD, Signal, Histogram);
    console.log(`✅ MACD 指標：MACD=${macdAnalysis.MACD}, Signal=${macdAnalysis.Signal}`);
    console.log(`   狀態：${macdAnalysis.signal} - ${macdAnalysis.description}`);
    
    // MA
    const ma5 = calculateMA(close, 5);
    const ma20 = calculateMA(close, 20);
    const ma60 = calculateMA(close, 60);
    console.log(`✅ 均線：MA5=${ma5[ma5.length-1]?.toFixed(2)}, MA20=${ma20[ma20.length-1]?.toFixed(2)}, MA60=${ma60[ma60.length-1]?.toFixed(2)}`);
    
    return { kdAnalysis, macdAnalysis };
  } catch (error) {
    console.error('❌ 技術指標測試失敗:', error.message);
    throw error;
  }
}

async function testChart(stockId, stockData, stockName) {
  console.log('\n=== 測試圖表生成 ===');
  try {
    console.log('⚠️  注意：圖表生成需要 Supabase Storage 設定');
    console.log('   如果失敗，請確認 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
    
    const chartInfo = await generateIndicatorChart(stockId, stockData, stockName);
    console.log(`✅ 圖表已生成：${chartInfo.url}`);
    console.log(`   路徑：${chartInfo.path}`);
    
    return chartInfo;
  } catch (error) {
    console.error('❌ 圖表生成測試失敗:', error.message);
    console.log('   這可能是因為 Supabase 未設定或 Storage Bucket 不存在');
    return null;
  }
}

async function testDeepSeek(stockId, stockData, stockName) {
  console.log('\n=== 測試 DeepSeek AI 分析 ===');
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      console.log('⚠️  跳過：DEEPSEEK_API_KEY 未設定');
      return null;
    }
    
    console.log('🤖 呼叫 DeepSeek API（可能需要 10-20 秒）...');
    const aiResult = await analyzeWithDeepSeek(stockId, stockData, stockName);
    
    if (aiResult) {
      console.log(`✅ AI 分析完成`);
      console.log(`   上漲機率：${aiResult.probability_up}%`);
      console.log(`   持平機率：${aiResult.probability_flat}%`);
      console.log(`   下跌機率：${aiResult.probability_down}%`);
      console.log(`   建議：${aiResult.recommendation}`);
      console.log(`   說明：${aiResult.explanation}`);
    } else {
      console.log('⚠️  AI 分析失敗或回傳 null');
    }
    
    return aiResult;
  } catch (error) {
    console.error('❌ DeepSeek 測試失敗:', error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 開始測試股市大亨 LINE Bot 各模組...\n');
  console.log('環境變數檢查：');
  console.log(`  LINE_CHANNEL_SECRET: ${process.env.LINE_CHANNEL_SECRET ? '✅' : '❌'}`);
  console.log(`  LINE_CHANNEL_ACCESS_TOKEN: ${process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✅' : '❌'}`);
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅' : '❌'}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌'}`);
  console.log(`  DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? '✅' : '❌'}`);
  
  try {
    // 1. 測試 FinMind
    const { stockData, stockInfo } = await testFinMind();
    
    // 2. 測試技術指標
    const { kdAnalysis, macdAnalysis } = await testIndicators(stockData);
    
    // 3. 測試圖表生成
    const chartInfo = await testChart('2330', stockData, stockInfo.stock_name);
    
    // 4. 測試 DeepSeek
    const aiResult = await testDeepSeek('2330', stockData, stockInfo.stock_name);
    
    console.log('\n=== 測試完成 ===');
    console.log('✅ 所有核心功能測試通過！');
    
    if (!chartInfo) {
      console.log('⚠️  圖表生成失敗，請檢查 Supabase 設定');
    }
    
    if (!aiResult) {
      console.log('⚠️  AI 分析失敗或未設定，但不影響主要功能');
    }
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error);
    process.exit(1);
  }
}

// 執行測試
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('測試執行錯誤:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };

