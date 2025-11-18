-- ============================================
-- 互動式股票分析系統 - 資料庫結構
-- ============================================

-- 1. 對話會話表
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  stock_id TEXT NOT NULL,
  stock_name TEXT,
  
  -- 會話狀態
  status TEXT DEFAULT 'active',  -- active, in_discussion, completed, expired
  session_start_at TIMESTAMP DEFAULT NOW(),
  session_end_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- 初步分析結果
  initial_analysis JSONB,
  
  -- 各階段分析結果（限 1 次）
  news_analysis JSONB,
  news_analyzed_at TIMESTAMP,
  
  politics_analysis JSONB,
  politics_analyzed_at TIMESTAMP,
  
  us_market_analysis JSONB,
  us_market_analyzed_at TIMESTAMP,
  
  -- 討論記錄（最多 5 次）
  discussion_count INT DEFAULT 0,
  discussion_history JSONB[] DEFAULT ARRAY[]::JSONB[],
  
  -- 總評
  final_evaluation JSONB,
  final_evaluation_at TIMESTAMP,
  
  -- 用戶反饋
  user_feedback TEXT,  -- positive, negative
  user_feedback_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_conversation_user_stock ON conversation_sessions(user_id, stock_id, status);
CREATE INDEX IF NOT EXISTS idx_conversation_status ON conversation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_conversation_expires ON conversation_sessions(expires_at);

-- 2. 股票總評知識庫（維基百科式）
CREATE TABLE IF NOT EXISTS stock_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id TEXT NOT NULL UNIQUE,
  stock_name TEXT,
  
  -- 維基百科式結構化內容
  summary TEXT,  -- 摘要
  
  technical_analysis JSONB,  -- 技術面分析彙整
  fundamental_analysis JSONB,  -- 基本面分析彙整
  news_sentiment JSONB,  -- 新聞情緒分析彙整
  political_impact JSONB,  -- 政治影響分析彙整
  us_market_correlation JSONB,  -- 美股關聯分析彙整
  
  -- 評價統計
  positive_feedback_count INT DEFAULT 0,
  negative_feedback_count INT DEFAULT 0,
  total_evaluations INT DEFAULT 0,
  confidence_score DECIMAL(3,2),  -- 信心分數 0.00-1.00
  
  -- 版本控制
  version INT DEFAULT 1,
  last_updated_by TEXT,
  last_evaluation_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_evaluations_stock_id ON stock_evaluations(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_evaluations_confidence ON stock_evaluations(confidence_score DESC);

-- 3. 用戶互動記錄
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  stock_id TEXT NOT NULL,
  
  interaction_type TEXT NOT NULL,  -- news, politics, us_market, discussion, final_eval, feedback
  user_input TEXT,
  ai_response JSONB,
  
  processing_time_ms INT,  -- 處理時間（毫秒）
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_session ON user_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);

-- 4. 自動清理過期會話的函數
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE conversation_sessions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. 更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_sessions_updated_at
  BEFORE UPDATE ON conversation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_evaluations_updated_at
  BEFORE UPDATE ON stock_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. 註解
COMMENT ON TABLE conversation_sessions IS '對話會話管理表，追蹤每個用戶的分析進度';
COMMENT ON TABLE stock_evaluations IS '股票總評知識庫，維基百科式結構化儲存';
COMMENT ON TABLE user_interactions IS '用戶互動記錄，用於分析和改進';

COMMENT ON COLUMN conversation_sessions.status IS 'active: 進行中, in_discussion: 討論模式, completed: 已完成, expired: 已過期';
COMMENT ON COLUMN conversation_sessions.discussion_count IS '討論次數，最多 5 次';
COMMENT ON COLUMN stock_evaluations.confidence_score IS '信心分數，根據正負反饋比例計算';

