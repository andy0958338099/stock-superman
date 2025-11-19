-- ============================================
-- 互動式股票分析系統 - Supabase 資料表
-- ============================================

-- 1. 用戶對話狀態表
CREATE TABLE IF NOT EXISTS user_conversation_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  stock_id TEXT NOT NULL,
  current_stage TEXT NOT NULL, -- 'news', 'politics', 'us_market', 'discussion', 'final_review'
  
  -- 功能使用狀態
  news_used BOOLEAN DEFAULT FALSE,
  politics_used BOOLEAN DEFAULT FALSE,
  discussion_count INTEGER DEFAULT 0,
  
  -- 內容儲存
  discussion_history JSONB DEFAULT '[]',
  news_content TEXT,
  politics_content TEXT,
  us_market_content TEXT,
  technical_analysis TEXT,
  
  -- 時間戳記
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, stock_id)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_user_conversation ON user_conversation_state(user_id, stock_id);
CREATE INDEX IF NOT EXISTS idx_conversation_updated ON user_conversation_state(updated_at DESC);

-- ============================================

-- 2. 股票總評表（維基百科式架構）
CREATE TABLE IF NOT EXISTS stock_final_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id TEXT NOT NULL,
  stock_name TEXT,
  version INTEGER DEFAULT 1,
  
  -- 維基百科式內容架構
  summary TEXT, -- 摘要
  technical_analysis TEXT, -- 技術分析
  news_analysis TEXT, -- 新聞分析
  political_analysis TEXT, -- 政治分析
  us_market_analysis TEXT, -- 美股分析
  discussion_insights TEXT, -- 討論洞察
  final_conclusion TEXT, -- 最終結論
  recommendation TEXT, -- 建議方向（買入/持有/賣出）
  risk_level TEXT, -- 風險等級（高/中/低）
  
  -- 評價統計
  positive_votes INTEGER DEFAULT 0,
  negative_votes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  confidence_score DECIMAL(5,2) DEFAULT 0.00, -- 信心分數 0-100
  
  -- 元數據
  created_by TEXT, -- 創建者 user_id
  is_active BOOLEAN DEFAULT TRUE,
  
  -- 時間戳記
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_stock_reviews ON stock_final_reviews(stock_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_active ON stock_final_reviews(stock_id, is_active, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON stock_final_reviews(created_at DESC);

-- ============================================

-- 3. 用戶評價表
CREATE TABLE IF NOT EXISTS user_review_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  review_id UUID REFERENCES stock_final_reviews(id) ON DELETE CASCADE,
  stock_id TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('positive', 'negative')),
  comment TEXT, -- 可選的評論
  
  -- 時間戳記
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, review_id)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_user_votes ON user_review_votes(user_id, stock_id);
CREATE INDEX IF NOT EXISTS idx_review_votes ON user_review_votes(review_id);

-- ============================================

-- 4. 觸發器：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 應用到 user_conversation_state
DROP TRIGGER IF EXISTS update_user_conversation_state_updated_at ON user_conversation_state;
CREATE TRIGGER update_user_conversation_state_updated_at
  BEFORE UPDATE ON user_conversation_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 應用到 stock_final_reviews
DROP TRIGGER IF EXISTS update_stock_final_reviews_updated_at ON stock_final_reviews;
CREATE TRIGGER update_stock_final_reviews_updated_at
  BEFORE UPDATE ON stock_final_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================

-- 5. 觸發器：自動更新評價統計
CREATE OR REPLACE FUNCTION update_review_votes_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新總評的投票統計
  UPDATE stock_final_reviews
  SET 
    positive_votes = (
      SELECT COUNT(*) FROM user_review_votes 
      WHERE review_id = NEW.review_id AND vote = 'positive'
    ),
    negative_votes = (
      SELECT COUNT(*) FROM user_review_votes 
      WHERE review_id = NEW.review_id AND vote = 'negative'
    ),
    total_votes = (
      SELECT COUNT(*) FROM user_review_votes 
      WHERE review_id = NEW.review_id
    ),
    confidence_score = (
      SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE (COUNT(*) FILTER (WHERE vote = 'positive')::DECIMAL / COUNT(*)) * 100
        END
      FROM user_review_votes 
      WHERE review_id = NEW.review_id
    )
  WHERE id = NEW.review_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 應用觸發器
DROP TRIGGER IF EXISTS update_review_votes_stats_trigger ON user_review_votes;
CREATE TRIGGER update_review_votes_stats_trigger
  AFTER INSERT OR UPDATE ON user_review_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_votes_stats();

-- ============================================

-- 6. 清理舊對話狀態的函數（可選）
CREATE OR REPLACE FUNCTION cleanup_old_conversation_states()
RETURNS void AS $$
BEGIN
  -- 刪除 7 天前的對話狀態
  DELETE FROM user_conversation_state
  WHERE updated_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================

-- 完成！
-- 請在 Supabase Dashboard 的 SQL Editor 中執行此腳本

