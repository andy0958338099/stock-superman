-- 清除美股分析快取
-- 執行此腳本後，下次查詢美股分析時會重新生成（使用新的 AI prompt）

-- 方法 1：刪除所有美股分析快取（推薦）
DELETE FROM us_market_analysis_tasks;

-- 方法 2：只刪除特定用戶的快取
-- DELETE FROM us_market_analysis_tasks WHERE user_id = 'Uffbe49552ea3f529e4ba543d1a22a0fa';

-- 方法 3：只刪除超過 1 小時的快取
-- DELETE FROM us_market_analysis_tasks WHERE created_at < NOW() - INTERVAL '1 hour';

-- 查詢剩餘的快取記錄
SELECT 
  task_id,
  user_id,
  status,
  created_at,
  result->'analysis'->>'us_market_summary' as us_market_summary_preview
FROM us_market_analysis_tasks
ORDER BY created_at DESC;

