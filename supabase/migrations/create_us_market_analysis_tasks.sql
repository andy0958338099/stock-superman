-- 創建美股分析任務表
-- 用於異步處理美股分析，避免超時問題

CREATE TABLE IF NOT EXISTS us_market_analysis_tasks (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,  -- pending, processing, completed, failed
  result JSONB,                  -- 分析結果
  error_message TEXT,            -- 錯誤訊息
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_us_market_tasks_task_id ON us_market_analysis_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_us_market_tasks_user_id ON us_market_analysis_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_us_market_tasks_status ON us_market_analysis_tasks(status);
CREATE INDEX IF NOT EXISTS idx_us_market_tasks_created_at ON us_market_analysis_tasks(created_at);

-- 添加註釋
COMMENT ON TABLE us_market_analysis_tasks IS '美股分析異步任務表';
COMMENT ON COLUMN us_market_analysis_tasks.task_id IS '任務唯一識別碼';
COMMENT ON COLUMN us_market_analysis_tasks.user_id IS 'LINE 用戶 ID';
COMMENT ON COLUMN us_market_analysis_tasks.status IS '任務狀態：pending, processing, completed, failed';
COMMENT ON COLUMN us_market_analysis_tasks.result IS '分析結果 JSON';
COMMENT ON COLUMN us_market_analysis_tasks.error_message IS '錯誤訊息';
COMMENT ON COLUMN us_market_analysis_tasks.created_at IS '任務創建時間';
COMMENT ON COLUMN us_market_analysis_tasks.updated_at IS '任務更新時間';
COMMENT ON COLUMN us_market_analysis_tasks.completed_at IS '任務完成時間';

-- 創建自動更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION update_us_market_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_us_market_tasks_updated_at
BEFORE UPDATE ON us_market_analysis_tasks
FOR EACH ROW
EXECUTE FUNCTION update_us_market_tasks_updated_at();

-- 創建清理過期任務的函數（清理 24 小時前的任務）
CREATE OR REPLACE FUNCTION cleanup_old_us_market_tasks()
RETURNS void AS $$
BEGIN
  DELETE FROM us_market_analysis_tasks
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

