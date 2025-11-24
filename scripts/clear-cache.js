/**
 * 清除指定股票的快取
 * 使用方式：node scripts/clear-cache.js 2002
 */

const { deleteStockCache } = require('../functions/supabase-client');

async function main() {
  const stockId = process.argv[2];
  
  if (!stockId) {
    console.log('❌ 請提供股票代號');
    console.log('使用方式：node scripts/clear-cache.js 2002');
    process.exit(1);
  }
  
  console.log(`🗑️  清除股票 ${stockId} 的快取...`);
  
  try {
    const result = await deleteStockCache(stockId);
    console.log('✅ 清除成功！');
    console.log(`   刪除了 ${result.count} 筆快取資料`);
    console.log('\n現在可以重新查詢該股票，系統會抓取最新資料（包含財務資訊）');
  } catch (error) {
    console.error('❌ 清除失敗：', error.message);
    process.exit(1);
  }
}

main();

