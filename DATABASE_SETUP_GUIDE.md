# 📊 資料庫設置指南

## 🎯 目標

在 Supabase 中建立互動式分析系統所需的 3 張資料表。

---

## 📋 步驟

### 1. 登入 Supabase Dashboard

1. 前往 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇您的專案（Stock-Superman）
3. 點擊左側選單的 **SQL Editor**

### 2. 執行 SQL Schema

1. 在 SQL Editor 中，點擊 **New Query**
2. 複製 `database/schema.sql` 的完整內容
3. 貼上到 SQL Editor
4. 點擊 **Run** 執行

### 3. 驗證表格建立成功

執行以下 SQL 查詢來驗證：

```sql
-- 檢查表格是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversation_sessions', 'stock_evaluations', 'user_interactions');

-- 檢查 conversation_sessions 結構
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversation_sessions';

-- 檢查索引
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('conversation_sessions', 'stock_evaluations', 'user_interactions');
```

應該看到：
- ✅ 3 張表格：`conversation_sessions`, `stock_evaluations`, `user_interactions`
- ✅ 多個索引（用於優化查詢）
- ✅ 觸發器（自動更新 `updated_at`）

### 4. 測試資料庫連線

在專案中執行測試腳本（可選）：

```bash
# 建立測試腳本
cat > test-db-connection.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  try {
    // 測試查詢
    const { data, error } = await supabase
      .from('conversation_sessions')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ 資料庫連線成功！');
    console.log('✅ conversation_sessions 表格可用');
  } catch (error) {
    console.error('❌ 資料庫連線失敗:', error.message);
  }
}

testConnection();
EOF

# 執行測試
node test-db-connection.js
```

---

## 📊 資料表說明

### 1. `conversation_sessions` - 對話會話管理

**用途**：追蹤每個用戶的分析進度

**主要欄位**：
- `id` - 會話 ID（UUID）
- `user_id` - LINE 用戶 ID
- `stock_id` - 股票代號
- `stock_name` - 股票名稱
- `status` - 會話狀態（active, in_discussion, completed, expired）
- `initial_analysis` - 初步技術分析結果（JSONB）
- `news_analysis` - 新聞分析結果（JSONB）
- `politics_analysis` - 政治分析結果（JSONB）
- `us_market_analysis` - 美股分析結果（JSONB）
- `discussion_count` - 討論次數（最多 5 次）
- `discussion_history` - 討論歷史（JSONB 陣列）
- `final_evaluation` - 最終總評（JSONB）
- `user_feedback` - 用戶反饋（positive, negative）
- `expires_at` - 過期時間（24 小時後）

**索引**：
- `user_id` + `stock_id` + `status`（快速查詢用戶的活躍會話）
- `expires_at`（清理過期會話）

### 2. `stock_evaluations` - 股票知識庫

**用途**：維基百科式的股票綜合評價

**主要欄位**：
- `id` - 評價 ID（UUID）
- `stock_id` - 股票代號
- `stock_name` - 股票名稱
- `evaluation_data` - 評價內容（JSONB，結構化儲存）
- `positive_feedback_count` - 正面反饋數
- `negative_feedback_count` - 負面反饋數
- `confidence_score` - 信心分數（0-100）
- `version` - 版本號（每次更新 +1）

**索引**：
- `stock_id`（快速查詢特定股票）

### 3. `user_interactions` - 互動記錄

**用途**：完整的對話歷史，用於分析和改進

**主要欄位**：
- `id` - 記錄 ID（UUID）
- `user_id` - LINE 用戶 ID
- `session_id` - 會話 ID
- `stock_id` - 股票代號
- `interaction_type` - 互動類型（stock_query, news_analysis, discussion, etc.）
- `user_input` - 用戶輸入
- `bot_response` - Bot 回應（JSONB）
- `processing_time_ms` - 處理時間（毫秒）

**索引**：
- `user_id` + `created_at`（查詢用戶歷史）
- `session_id`（查詢會話記錄）
- `stock_id`（查詢股票相關記錄）

---

## 🔧 自動化功能

### 1. 自動清理過期會話

系統會自動清理 24 小時前過期的會話：

```sql
-- 手動執行清理（測試用）
SELECT cleanup_expired_sessions();
```

### 2. 自動更新時間戳記

每次更新記錄時，`updated_at` 會自動更新為當前時間。

---

## ⚠️ 注意事項

1. **權限設置**
   - 確保 Supabase Service Role Key 有完整的讀寫權限
   - 不要在前端使用 Service Role Key（僅限後端）

2. **資料保留**
   - 會話資料保留 24 小時
   - 互動記錄永久保留（可定期清理舊資料）
   - 股票評價永久保留

3. **效能優化**
   - 已建立必要的索引
   - 使用 JSONB 儲存結構化資料（支援查詢）
   - 定期執行 `VACUUM ANALYZE` 優化效能

---

## 🎉 完成！

資料庫設置完成後，互動式分析系統就可以開始運作了！

**下一步**：
1. ✅ 設定 TEJ_API_KEY 環境變數
2. ✅ 部署到 Netlify
3. ✅ 在 LINE 中測試「新聞:2330」指令

