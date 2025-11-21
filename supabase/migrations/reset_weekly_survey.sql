-- 重置每週問卷調查表（清理並重新創建）
-- 如果遇到 "already exists" 錯誤，請執行此腳本

-- 1. 刪除觸發器
DROP TRIGGER IF EXISTS trigger_update_survey_statistics ON survey_votes;

-- 2. 刪除函數
DROP FUNCTION IF EXISTS update_survey_statistics();
DROP FUNCTION IF EXISTS initialize_current_week();
DROP FUNCTION IF EXISTS cleanup_old_survey_data();

-- 3. 刪除表（按照依賴順序）
DROP TABLE IF EXISTS survey_statistics CASCADE;
DROP TABLE IF EXISTS survey_votes CASCADE;
DROP TABLE IF EXISTS survey_weeks CASCADE;

-- 4. 重新創建表

-- 週別定義表
CREATE TABLE survey_weeks (
  id SERIAL PRIMARY KEY,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  week_of_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(year, week_of_year)
);

-- 用戶投票記錄表
CREATE TABLE survey_votes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  week_id INTEGER REFERENCES survey_weeks(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  voted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_id)
);

-- 週別統計表
CREATE TABLE survey_statistics (
  id SERIAL PRIMARY KEY,
  week_id INTEGER REFERENCES survey_weeks(id) ON DELETE CASCADE UNIQUE,
  total_votes INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  average_score DECIMAL(3,2) DEFAULT 0.00,
  score_1_count INTEGER DEFAULT 0,
  score_2_count INTEGER DEFAULT 0,
  score_3_count INTEGER DEFAULT 0,
  score_4_count INTEGER DEFAULT 0,
  score_5_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. 創建索引
CREATE INDEX idx_survey_votes_user_id ON survey_votes(user_id);
CREATE INDEX idx_survey_votes_week_id ON survey_votes(week_id);
CREATE INDEX idx_survey_weeks_active ON survey_weeks(is_active);
CREATE INDEX idx_survey_weeks_dates ON survey_weeks(start_date, end_date);

-- 6. 添加註釋
COMMENT ON TABLE survey_weeks IS '週別定義表';
COMMENT ON TABLE survey_votes IS '用戶投票記錄表';
COMMENT ON TABLE survey_statistics IS '週別統計表';

-- 7. 創建自動更新統計的觸發器函數
CREATE FUNCTION update_survey_statistics()
RETURNS TRIGGER AS $$
BEGIN
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

-- 8. 創建觸發器
CREATE TRIGGER trigger_update_survey_statistics
AFTER INSERT OR UPDATE ON survey_votes
FOR EACH ROW
EXECUTE FUNCTION update_survey_statistics();

-- 9. 創建初始化當前週的函數
CREATE FUNCTION initialize_current_week()
RETURNS void AS $$
DECLARE
  current_year INTEGER;
  current_week INTEGER;
  week_start DATE;
  week_end DATE;
  week_num INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  current_week := EXTRACT(WEEK FROM CURRENT_DATE);
  week_start := DATE_TRUNC('week', CURRENT_DATE);
  week_end := week_start + INTERVAL '6 days';
  week_num := current_year * 100 + current_week;
  
  UPDATE survey_weeks SET is_active = FALSE;
  
  INSERT INTO survey_weeks (week_number, year, week_of_year, start_date, end_date, is_active)
  VALUES (week_num, current_year, current_week, week_start, week_end, TRUE)
  ON CONFLICT (year, week_of_year) DO UPDATE SET
    is_active = TRUE,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date;
    
  RAISE NOTICE '✅ 當前週已初始化：% (% ~ %)', week_num, week_start, week_end;
END;
$$ LANGUAGE plpgsql;

-- 10. 創建清理舊資料的函數
CREATE FUNCTION cleanup_old_survey_data()
RETURNS void AS $$
BEGIN
  DELETE FROM survey_votes
  WHERE week_id IN (
    SELECT id FROM survey_weeks
    WHERE start_date < CURRENT_DATE - INTERVAL '12 weeks'
  );
  
  DELETE FROM survey_weeks
  WHERE start_date < CURRENT_DATE - INTERVAL '12 weeks';
  
  RAISE NOTICE '✅ 已清理 12 週前的舊資料';
END;
$$ LANGUAGE plpgsql;

-- 11. 執行初始化
SELECT initialize_current_week();

