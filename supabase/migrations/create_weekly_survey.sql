-- 創建每週問卷調查表
-- 用於收集用戶對 APP 分析準確度的評分

-- 1. 週別定義表（用於管理週別）
CREATE TABLE IF NOT EXISTS survey_weeks (
  id SERIAL PRIMARY KEY,
  week_number INTEGER NOT NULL,           -- 週別編號（例如：202401 表示 2024 年第 1 週）
  year INTEGER NOT NULL,                  -- 年份
  week_of_year INTEGER NOT NULL,          -- 該年的第幾週
  start_date DATE NOT NULL,               -- 週開始日期（週一）
  end_date DATE NOT NULL,                 -- 週結束日期（週日）
  is_active BOOLEAN DEFAULT TRUE,         -- 是否為當前週
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(year, week_of_year)
);

-- 2. 用戶投票記錄表
CREATE TABLE IF NOT EXISTS survey_votes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,          -- LINE 用戶 ID
  week_id INTEGER REFERENCES survey_weeks(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),  -- 評分 1-5 分
  voted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_id)                -- 每個用戶每週只能投票一次
);

-- 3. 週別統計表（用於快速查詢）
CREATE TABLE IF NOT EXISTS survey_statistics (
  id SERIAL PRIMARY KEY,
  week_id INTEGER REFERENCES survey_weeks(id) ON DELETE CASCADE UNIQUE,
  total_votes INTEGER DEFAULT 0,          -- 總投票數
  total_score INTEGER DEFAULT 0,          -- 總分數
  average_score DECIMAL(3,2) DEFAULT 0.00,-- 平均分數
  score_1_count INTEGER DEFAULT 0,        -- 1 分的數量
  score_2_count INTEGER DEFAULT 0,        -- 2 分的數量
  score_3_count INTEGER DEFAULT 0,        -- 3 分的數量
  score_4_count INTEGER DEFAULT 0,        -- 4 分的數量
  score_5_count INTEGER DEFAULT 0,        -- 5 分的數量
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_survey_votes_user_id ON survey_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_votes_week_id ON survey_votes(week_id);
CREATE INDEX IF NOT EXISTS idx_survey_weeks_active ON survey_weeks(is_active);
CREATE INDEX IF NOT EXISTS idx_survey_weeks_dates ON survey_weeks(start_date, end_date);

-- 添加註釋
COMMENT ON TABLE survey_weeks IS '週別定義表';
COMMENT ON TABLE survey_votes IS '用戶投票記錄表';
COMMENT ON TABLE survey_statistics IS '週別統計表';

-- 創建自動更新統計的觸發器
CREATE OR REPLACE FUNCTION update_survey_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新統計表
  INSERT INTO survey_statistics (week_id, total_votes, total_score, average_score, score_1_count, score_2_count, score_3_count, score_4_count, score_5_count)
  SELECT 
    NEW.week_id,
    COUNT(*) as total_votes,
    SUM(score) as total_score,
    ROUND(AVG(score)::numeric, 2) as average_score,
    COUNT(*) FILTER (WHERE score = 1) as score_1_count,
    COUNT(*) FILTER (WHERE score = 2) as score_2_count,
    COUNT(*) FILTER (WHERE score = 3) as score_3_count,
    COUNT(*) FILTER (WHERE score = 4) as score_4_count,
    COUNT(*) FILTER (WHERE score = 5) as score_5_count
  FROM survey_votes
  WHERE week_id = NEW.week_id
  ON CONFLICT (week_id) DO UPDATE SET
    total_votes = EXCLUDED.total_votes,
    total_score = EXCLUDED.total_score,
    average_score = EXCLUDED.average_score,
    score_1_count = EXCLUDED.score_1_count,
    score_2_count = EXCLUDED.score_2_count,
    score_3_count = EXCLUDED.score_3_count,
    score_4_count = EXCLUDED.score_4_count,
    score_5_count = EXCLUDED.score_5_count,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_survey_statistics
AFTER INSERT OR UPDATE ON survey_votes
FOR EACH ROW
EXECUTE FUNCTION update_survey_statistics();

-- 創建初始化當前週的函數
CREATE OR REPLACE FUNCTION initialize_current_week()
RETURNS void AS $$
DECLARE
  current_year INTEGER;
  current_week INTEGER;
  week_start DATE;
  week_end DATE;
  week_num INTEGER;
BEGIN
  -- 取得當前年份和週數
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  current_week := EXTRACT(WEEK FROM CURRENT_DATE);
  
  -- 計算週開始和結束日期（週一到週日）
  week_start := DATE_TRUNC('week', CURRENT_DATE);
  week_end := week_start + INTERVAL '6 days';
  
  -- 生成週別編號（例如：202401）
  week_num := current_year * 100 + current_week;
  
  -- 將所有週設為非活動
  UPDATE survey_weeks SET is_active = FALSE;
  
  -- 插入或更新當前週
  INSERT INTO survey_weeks (week_number, year, week_of_year, start_date, end_date, is_active)
  VALUES (week_num, current_year, current_week, week_start, week_end, TRUE)
  ON CONFLICT (year, week_of_year) DO UPDATE SET
    is_active = TRUE,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date;
    
  RAISE NOTICE '✅ 當前週已初始化：% (% ~ %)', week_num, week_start, week_end;
END;
$$ LANGUAGE plpgsql;

-- 執行初始化
SELECT initialize_current_week();

-- 創建清理舊投票記錄的函數（保留最近 12 週）
CREATE OR REPLACE FUNCTION cleanup_old_survey_data()
RETURNS void AS $$
BEGIN
  -- 刪除 12 週前的投票記錄
  DELETE FROM survey_votes
  WHERE week_id IN (
    SELECT id FROM survey_weeks
    WHERE start_date < CURRENT_DATE - INTERVAL '12 weeks'
  );
  
  -- 刪除 12 週前的週別記錄
  DELETE FROM survey_weeks
  WHERE start_date < CURRENT_DATE - INTERVAL '12 weeks';
  
  RAISE NOTICE '✅ 已清理 12 週前的舊資料';
END;
$$ LANGUAGE plpgsql;

