/**
 * 直接建立資料表的腳本
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('🔧 開始建立資料表...\n');

  // 建立 line_events 表
  console.log('1️⃣ 建立 line_events 表...');
  try {
    // 先嘗試插入一筆測試資料來觸發表的建立
    const { error } = await supabase
      .from('line_events')
      .insert({ reply_token: 'test_token_' + Date.now() });

    if (error && error.message.includes('relation "line_events" does not exist')) {
      console.log('⚠️  表不存在，需要手動建立');
      console.log('\n請複製以下 SQL 到 Supabase Dashboard > SQL Editor 執行：\n');
      console.log('------- 開始複製 -------');
      console.log(`
-- 建立 line_events 表（去重表）
CREATE TABLE IF NOT EXISTS line_events (
  id BIGSERIAL PRIMARY KEY,
  reply_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_line_events_reply_token ON line_events(reply_token);
CREATE INDEX IF NOT EXISTS idx_line_events_created_at ON line_events(created_at);

-- 建立 stock_cache 表（快取表）
CREATE TABLE IF NOT EXISTS stock_cache (
  stock_id TEXT PRIMARY KEY,
  result_json JSONB,
  image_url TEXT,
  image_path TEXT,
  result_summary TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_stock_cache_updated_at ON stock_cache(updated_at);

-- 啟用 RLS（Row Level Security）
ALTER TABLE line_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_cache ENABLE ROW LEVEL SECURITY;

-- 建立政策（允許 service_role 完全存取）
CREATE POLICY IF NOT EXISTS "Enable all for service role" ON line_events
  FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Enable all for service role" ON stock_cache
  FOR ALL USING (true);
      `);
      console.log('------- 結束複製 -------\n');
    } else if (error) {
      console.log('⚠️  錯誤:', error.message);
    } else {
      console.log('✅ line_events 表已存在並可正常使用');
      
      // 刪除測試資料
      await supabase
        .from('line_events')
        .delete()
        .like('reply_token', 'test_token_%');
    }
  } catch (err) {
    console.error('❌ 錯誤:', err.message);
  }

  // 測試 stock_cache 表
  console.log('\n2️⃣ 測試 stock_cache 表...');
  try {
    const { error } = await supabase
      .from('stock_cache')
      .select('stock_id')
      .limit(1);

    if (error) {
      console.log('⚠️  錯誤:', error.message);
    } else {
      console.log('✅ stock_cache 表已存在並可正常使用');
    }
  } catch (err) {
    console.error('❌ 錯誤:', err.message);
  }

  console.log('\n✅ 檢查完成！');
}

createTables();

