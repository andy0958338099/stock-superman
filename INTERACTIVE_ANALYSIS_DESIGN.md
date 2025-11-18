# 🎯 互動式股票分析系統設計文件

## 📋 系統概述

建立一個多輪對話的股票分析系統，讓用戶在初步分析後，可以透過 Quick Reply 按鍵深入探討：
1. 新聞分析（TEJ API）
2. 政治評論（國際新聞）
3. 美股對應產業
4. 互動討論（最多 5 輪）
5. 綜合總評（維基百科式架構）

---

## 🗄️ 資料庫結構設計

### 1. `conversation_sessions` 表（對話會話）
```sql
CREATE TABLE conversation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,              -- LINE User ID
  stock_id TEXT NOT NULL,             -- 股票代號
  session_start_at TIMESTAMP DEFAULT NOW(),
  session_end_at TIMESTAMP,
  status TEXT DEFAULT 'active',       -- active, completed, expired
  
  -- 初步分析結果
  initial_analysis JSONB,             -- 第一次的技術分析結果
  
  -- 各階段分析結果
  news_analysis JSONB,                -- 新聞分析（限 1 次）
  politics_analysis JSONB,            -- 政治分析（限 1 次）
  us_market_analysis JSONB,           -- 美股分析（限 1 次）
  
  -- 討論記錄
  discussion_count INT DEFAULT 0,     -- 討論次數（最多 5 次）
  discussion_history JSONB[],         -- 討論歷史記錄
  
  -- 總評
  final_evaluation JSONB,             -- 綜合總評
  user_feedback TEXT,                 -- 用戶反饋（好/不好）
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversation_user_stock ON conversation_sessions(user_id, stock_id);
CREATE INDEX idx_conversation_status ON conversation_sessions(status);
```

### 2. `stock_evaluations` 表（股票總評知識庫）
```sql
CREATE TABLE stock_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id TEXT NOT NULL UNIQUE,
  stock_name TEXT,
  
  -- 維基百科式結構化內容
  summary TEXT,                       -- 摘要
  technical_analysis JSONB,           -- 技術面分析
  fundamental_analysis JSONB,         -- 基本面分析
  news_sentiment JSONB,               -- 新聞情緒分析
  political_impact JSONB,             -- 政治影響分析
  us_market_correlation JSONB,        -- 美股關聯分析
  
  -- 評價統計
  positive_feedback_count INT DEFAULT 0,
  negative_feedback_count INT DEFAULT 0,
  total_evaluations INT DEFAULT 0,
  
  -- 版本控制
  version INT DEFAULT 1,
  last_updated_by TEXT,               -- User ID
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stock_evaluations_stock_id ON stock_evaluations(stock_id);
```

### 3. `user_interactions` 表（用戶互動記錄）
```sql
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES conversation_sessions(id),
  user_id TEXT NOT NULL,
  stock_id TEXT NOT NULL,
  
  interaction_type TEXT NOT NULL,     -- news, politics, us_market, discussion, final_eval
  user_input TEXT,                    -- 用戶輸入內容
  ai_response JSONB,                  -- AI 回應內容
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_interactions_session ON user_interactions(session_id);
```

---

## 🔄 對話流程設計

### 階段 1：初步分析 + Quick Reply
```
用戶輸入：2330
↓
系統回應：
  - 技術分析（KD、MACD、圖表）
  - Quick Reply 按鍵：
    [📰 新聞] [🏛️ 政治] [🇺🇸 美股] [💬 討論] [📊 總評]
↓
建立 conversation_session
```

### 階段 2：深入分析
```
用戶點擊 [📰 新聞]
↓
1. 檢查 session.news_analysis 是否已存在
2. 如果沒有：
   - 呼叫 TEJ API 取得 6 則新聞
   - DeepSeek 以「財經專家」角色分析
   - 儲存到 session.news_analysis
3. 回應分析結果 + Quick Reply（移除已使用的按鍵）
```

### 階段 3：互動討論（最多 5 輪）
```
用戶點擊 [💬 討論]
↓
1. 檢查 discussion_count < 5
2. 進入討論模式：
   - 用戶輸入看法
   - DeepSeek 分析論點合理性
   - discussion_count++
3. 每次回應都帶 Quick Reply：
   [繼續討論] [📊 總評] [結束]
```

### 階段 4：綜合總評
```
用戶點擊 [📊 總評]
↓
1. 整合所有已完成的分析：
   - initial_analysis
   - news_analysis（如果有）
   - politics_analysis（如果有）
   - us_market_analysis（如果有）
   - discussion_history（如果有）
2. DeepSeek 以「資深分析師」角色給出決策建議
3. 回應總評 + Quick Reply：
   [👍 好，肯定] [👎 不好，我不相信]
```

### 階段 5：用戶反饋
```
用戶點擊 [👍 好，肯定] 或 [👎 不好，我不相信]
↓
1. 更新 session.user_feedback
2. 更新 stock_evaluations：
   - 如果「好」：positive_feedback_count++
   - 如果「不好」：negative_feedback_count++
3. 結束會話：session.status = 'completed'
```

---

## 🛡️ 防止 Webhook 超時策略

### 問題：LINE Webhook 必須在 30 秒內回應

### 解決方案：異步處理 + 主動推送

**方案 A：Reply Token + 快速回應**
```javascript
// 1. 立即回應「處理中」訊息
await client.replyMessage(replyToken, {
  type: 'text',
  text: '🔍 正在分析中，請稍候...'
});

// 2. 異步處理（超過 30 秒的任務）
// ❌ 問題：Reply Token 只能用一次，無法再次推送結果
```

**方案 B：Push Message（需要 Messaging API Plan）**
```javascript
// 1. 立即回應「處理中」
await client.replyMessage(replyToken, {
  type: 'text',
  text: '🔍 正在分析新聞，預計需要 1-2 分鐘...'
});

// 2. 異步處理完成後，主動推送結果
setTimeout(async () => {
  const result = await analyzeNews();
  await client.pushMessage(userId, result);
}, 0);

// ❌ 問題：Push Message 需要付費方案
```

**✅ 方案 C：分段回應（推薦）**
```javascript
// 1. 快速回應初步結果
await client.replyMessage(replyToken, {
  type: 'text',
  text: '✅ 已取得 6 則新聞，正在分析...\n\n' +
        '新聞標題：\n1. ...\n2. ...'
});

// 2. 用戶再次點擊「查看分析」按鍵
// 3. 此時分析已完成，直接返回結果
```

---

## 📊 Quick Reply 按鍵設計

### 初步分析後的按鍵
```javascript
{
  type: 'text',
  text: '✅ 技術分析完成！\n\n您可以選擇：',
  quickReply: {
    items: [
      {
        type: 'action',
        action: {
          type: 'message',
          label: '📰 新聞',
          text: `新聞:${stockId}`
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '🏛️ 政治',
          text: `政治:${stockId}`
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '🇺🇸 美股',
          text: `美股:${stockId}`
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '💬 討論',
          text: `討論:${stockId}`
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '📊 總評',
          text: `總評:${stockId}`
        }
      }
    ]
  }
}
```

---

## 🎯 下一步實作計畫

### Phase 1：基礎架構（1-2 天）
- [ ] 建立資料庫表格
- [ ] 實作 conversation session 管理
- [ ] 實作 Quick Reply 按鍵系統

### Phase 2：新聞分析（2-3 天）
- [ ] 整合 TEJ API（需要 API Key）
- [ ] 實作新聞抓取和匯整
- [ ] DeepSeek 財經專家角色分析

### Phase 3：政治 & 美股分析（2-3 天）
- [ ] 整合國際新聞 API
- [ ] 實作美股產業對應分析
- [ ] DeepSeek 多角色分析

### Phase 4：互動討論（2-3 天）
- [ ] 實作多輪對話管理
- [ ] 防止狀態混亂機制
- [ ] 討論次數限制

### Phase 5：總評系統（3-4 天）
- [ ] 維基百科式結構設計
- [ ] 綜合分析整合
- [ ] 用戶反饋機制

---

## 💰 成本估算

### API 成本
- **TEJ API**：需要詢價（通常月費制）
- **NewsAPI**：免費版 100 requests/day，付費版 $449/month
- **DeepSeek API**：約 $0.14 / 1M tokens（便宜）

### 預估每次完整分析成本
- 初步分析：$0.01
- 新聞分析：$0.02
- 政治分析：$0.02
- 美股分析：$0.02
- 討論（5 輪）：$0.05
- 總評：$0.03
- **總計**：約 $0.15 / 次

---

## ❓ 需要確認的問題

1. **TEJ API**：您有 TEJ API 的帳號和 Key 嗎？
2. **Push Message**：您的 LINE Bot 是否有付費方案（可使用 Push Message）？
3. **預算**：每月預期多少用戶使用？成本預算多少？
4. **優先級**：5 個功能中，哪些是最優先需要的？

---

**這個系統完全可以實現！但需要分階段開發。您想從哪個部分開始？** 🚀

