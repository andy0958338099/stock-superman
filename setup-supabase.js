/**
 * Supabase 初始化腳本
 * 建立資料表和 Storage Bucket
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'stock-charts';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 請設定 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🔧 開始設定 Supabase...\n');

  // 1. 建立 line_events 表
  console.log('1️⃣ 建立 line_events 表...');
  const { error: lineEventsError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS line_events (
        id BIGSERIAL PRIMARY KEY,
        reply_token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_line_events_reply_token ON line_events(reply_token);
      CREATE INDEX IF NOT EXISTS idx_line_events_created_at ON line_events(created_at);
    `
  });

  if (lineEventsError) {
    console.log('⚠️  無法使用 RPC，請手動在 Supabase SQL Editor 執行 supabase-schema.sql');
  } else {
    console.log('✅ line_events 表建立成功');
  }

  // 2. 建立 stock_cache 表
  console.log('2️⃣ 建立 stock_cache 表...');
  const { error: stockCacheError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS stock_cache (
        stock_id TEXT PRIMARY KEY,
        result_json JSONB,
        image_url TEXT,
        image_path TEXT,
        result_summary TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_stock_cache_updated_at ON stock_cache(updated_at);
    `
  });

  if (stockCacheError) {
    console.log('⚠️  無法使用 RPC，請手動在 Supabase SQL Editor 執行 supabase-schema.sql');
  } else {
    console.log('✅ stock_cache 表建立成功');
  }

  // 3. 檢查 Storage Bucket
  console.log('3️⃣ 檢查 Storage Bucket...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ 無法列出 Buckets:', listError.message);
  } else {
    const bucketExists = buckets.some(b => b.name === bucketName);
    
    if (bucketExists) {
      console.log(`✅ Bucket "${bucketName}" 已存在`);
    } else {
      console.log(`⚠️  Bucket "${bucketName}" 不存在，嘗試建立...`);
      
      const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg']
      });

      if (createError) {
        console.error(`❌ 無法建立 Bucket: ${createError.message}`);
        console.log('   請手動在 Supabase Dashboard 建立 Bucket');
      } else {
        console.log(`✅ Bucket "${bucketName}" 建立成功`);
      }
    }
  }

  console.log('\n🎉 Supabase 設定完成！');
  console.log('\n📝 如果上面有錯誤，請手動執行以下步驟：');
  console.log('   1. 前往 Supabase Dashboard > SQL Editor');
  console.log('   2. 執行 supabase-schema.sql 檔案內容');
  console.log('   3. 前往 Storage，建立名為 "stock-charts" 的 Public Bucket');
}

async function testConnection() {
  console.log('\n🧪 測試 Supabase 連線...');
  
  // 測試資料庫連線
  const { data, error } = await supabase
    .from('line_events')
    .select('count')
    .limit(1);

  if (error) {
    console.log('⚠️  資料表可能尚未建立，請執行 supabase-schema.sql');
    console.log(`   錯誤：${error.message}`);
  } else {
    console.log('✅ 資料庫連線成功');
  }

  // 測試 Storage 連線
  const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
  
  if (storageError) {
    console.log('❌ Storage 連線失敗:', storageError.message);
  } else {
    console.log(`✅ Storage 連線成功，共有 ${buckets.length} 個 Buckets`);
    buckets.forEach(b => console.log(`   - ${b.name} (${b.public ? 'Public' : 'Private'})`));
  }
}

async function main() {
  try {
    await setupDatabase();
    await testConnection();
  } catch (error) {
    console.error('❌ 設定失敗:', error.message);
    process.exit(1);
  }
}

main();

