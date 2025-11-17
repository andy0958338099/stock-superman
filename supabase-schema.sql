-- ============================================
-- 股市大亨 LINE Bot - Supabase 資料表結構
-- ============================================

-- 1. LINE 事件去重表（防止 webhook 重複觸發）
CREATE TABLE IF NOT EXISTS line_events (
  id BIGSERIAL PRIMARY KEY,
  reply_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_line_events_reply_token ON line_events(reply_token);
CREATE INDEX IF NOT EXISTS idx_line_events_created_at ON line_events(created_at);

-- 自動清理 24 小時前的舊記錄（可選）
COMMENT ON TABLE line_events IS 'LINE webhook 去重表，記錄已使用的 reply token';


-- 2. 股票分析快取表（12 小時快取機制）
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

COMMENT ON TABLE stock_cache IS '股票分析結果快取表，12 小時內重複查詢直接使用快取';
COMMENT ON COLUMN stock_cache.stock_id IS '股票代號（主鍵）';
COMMENT ON COLUMN stock_cache.result_json IS '完整分析結果 JSON（包含技術指標、AI 分析等）';
COMMENT ON COLUMN stock_cache.image_url IS '圖表公開 URL';
COMMENT ON COLUMN stock_cache.image_path IS '圖表在 Storage 中的路徑';
COMMENT ON COLUMN stock_cache.result_summary IS '分析摘要文字';
COMMENT ON COLUMN stock_cache.updated_at IS '最後更新時間';


-- 3. 建立 Storage Bucket（用於存放圖表）
-- 注意：這個需要在 Supabase Dashboard 的 Storage 介面手動建立
-- Bucket 名稱：stock-charts
-- 設定為 Public（公開存取）

-- 如果要用 SQL 建立（需要有適當權限）：
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('stock-charts', 'stock-charts', true)
-- ON CONFLICT (id) DO NOTHING;


-- 4. 設定 RLS（Row Level Security）政策
-- 如果你的應用需要更嚴格的安全控制，可以啟用 RLS

-- 對於 line_events 表（僅允許插入和查詢）
ALTER TABLE line_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允許服務端插入" ON line_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "允許服務端查詢" ON line_events
  FOR SELECT
  USING (true);


-- 對於 stock_cache 表（允許完整操作）
ALTER TABLE stock_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允許服務端完整操作" ON stock_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- 5. 自動清理舊資料的函數（可選）
-- 每天自動清理 7 天前的 line_events 記錄

CREATE OR REPLACE FUNCTION cleanup_old_line_events()
RETURNS void AS $$
BEGIN
  DELETE FROM line_events
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 可以設定 pg_cron 定期執行（需要啟用 pg_cron 擴充功能）
-- SELECT cron.schedule('cleanup-line-events', '0 2 * * *', 'SELECT cleanup_old_line_events()');


-- 6. 查詢統計視圖（可選）
CREATE OR REPLACE VIEW stock_query_stats AS
SELECT 
  stock_id,
  COUNT(*) as query_count,
  MAX(updated_at) as last_query_time,
  MIN(updated_at) as first_query_time
FROM stock_cache
GROUP BY stock_id
ORDER BY query_count DESC;

COMMENT ON VIEW stock_query_stats IS '股票查詢統計視圖';


-- ============================================
-- 初始化完成
-- ============================================

-- 驗證表是否建立成功
SELECT 
  table_name, 
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('line_events', 'stock_cache')
ORDER BY table_name;

