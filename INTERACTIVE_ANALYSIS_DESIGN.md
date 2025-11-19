# 🎯 互動式股票分析系統設計

## 📋 系統概述

在用戶查詢股票後，提供 5 個 Quick Reply 按鈕進行深度分析：
1. **新聞** - 財經新聞分析（限 1 次）
2. **政治** - 國際情勢分析（限 1 次）
3. **美股** - 美股關聯分析
4. **討論** - 用戶論點分析（最多 5 次）
5. **總評** - 綜合評估與建議

---

## 🏗️ 系統架構

### 1. 對話流程

```
用戶輸入股票代號（如：2330）
    ↓
顯示技術分析結果 + 5 個 Quick Reply 按鈕
    ↓
用戶點選按鈕或輸入新代號
    ↓
├─ 新聞 → Google Search → DeepSeek 分析 → 顯示結果 + Quick Reply
├─ 政治 → Google Search → DeepSeek 分析 → 顯示結果 + Quick Reply
├─ 美股 → 美股數據 → DeepSeek 分析 → 顯示結果 + Quick Reply
├─ 討論 → 用戶輸入 → DeepSeek 分析 → 顯示結果 + Quick Reply（最多 5 次）
└─ 總評 → 綜合所有資料 → DeepSeek 分析 → 顯示結果 + 評價按鈕
         ↓
    用戶評價：好/不好
         ↓
    儲存到 Supabase
```

### 2. Quick Reply 按鈕設計

```javascript
{
  "type": "text",
  "text": "分析結果...",
  "quickReply": {
    "items": [
      {
        "type": "action",
        "action": {
          "type": "message",
          "label": "📰 新聞",
          "text": "新聞:2330"
        }
      },
      {
        "type": "action",
        "action": {
          "type": "message",
          "label": "🌍 政治",
          "text": "政治:2330"
        }
      },
      {
        "type": "action",
        "action": {
          "type": "message",
          "label": "🇺🇸 美股",
          "text": "美股:2330"
        }
      },
      {
        "type": "action",
        "action": {
          "type": "message",
          "label": "💬 討論",
          "text": "討論:2330"
        }
      },
      {
        "type": "action",
        "action": {
          "type": "message",
          "label": "⭐ 總評",
          "text": "總評:2330"
        }
      }
    ]
  }
}
```

---

## 🗄️ Supabase 資料表設計

### 表 1: `user_conversation_state`（用戶對話狀態）

```sql
CREATE TABLE user_conversation_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  stock_id TEXT NOT NULL,
  current_stage TEXT NOT NULL, -- 'news', 'politics', 'us_market', 'discussion', 'final_review'
  news_used BOOLEAN DEFAULT FALSE,
  politics_used BOOLEAN DEFAULT FALSE,
  discussion_count INTEGER DEFAULT 0,
  discussion_history JSONB DEFAULT '[]',
  news_content TEXT,
  politics_content TEXT,
  us_market_content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, stock_id)
);
```

### 表 2: `stock_final_reviews`（股票總評）

```sql
CREATE TABLE stock_final_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  
  -- 維基百科式架構
  summary TEXT, -- 摘要
  technical_analysis TEXT, -- 技術分析
  news_analysis TEXT, -- 新聞分析
  political_analysis TEXT, -- 政治分析
  us_market_analysis TEXT, -- 美股分析
  discussion_insights TEXT, -- 討論洞察
  final_conclusion TEXT, -- 最終結論
  recommendation TEXT, -- 建議方向
  
  -- 評價統計
  positive_votes INTEGER DEFAULT 0,
  negative_votes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  confidence_score DECIMAL(3,2) DEFAULT 0.00,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stock_reviews ON stock_final_reviews(stock_id, version DESC);
```

### 表 3: `user_review_votes`（用戶評價）

```sql
CREATE TABLE user_review_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  review_id UUID REFERENCES stock_final_reviews(id),
  stock_id TEXT NOT NULL,
  vote TEXT NOT NULL, -- 'positive' or 'negative'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);
```

---

## 🔧 核心功能模組

### 1. Google Search Console API 參數

需要在 Netlify 環境變數設定：
- `GOOGLE_SEARCH_API_KEY` - Google Custom Search API Key
- `GOOGLE_SEARCH_ENGINE_ID` - Custom Search Engine ID

### 2. 新聞搜尋功能

```javascript
// functions/google-search.js
async function searchFinancialNews(stockId, stockName) {
  const query = `${stockName} ${stockId} 財經新聞 台股`;
  const results = await googleSearch(query, 6);
  return results;
}

async function searchPoliticalNews(stockId, industry) {
  const query = `${industry} 國際情勢 產業影響`;
  const results = await googleSearch(query, 6);
  return results;
}
```

### 3. DeepSeek 分析角色

#### 新聞分析（財經專家）
```javascript
const prompt = `你是一位資深財經專家，以下是關於 ${stockName}(${stockId}) 的 6 則最新新聞：

${newsContent}

請以財經專家的角度分析這些新聞，給予唯恐天下不亂但不違背事實的結論。
要求：
1. 分析新聞對股價的潛在影響
2. 指出關鍵風險和機會
3. 語氣要有衝擊力但基於事實
4. 結論要明確且有態度`;
```

#### 政治分析（政治評論員）
```javascript
const prompt = `你是一位犀利的政治評論員，以下是關於 ${industry} 產業的 6 則國際情勢新聞：

${politicalNews}

請以政治評論員的角度分析這些新聞對 ${stockName}(${stockId}) 的影響，給予語不驚人死不休但不違背事實的結論。
要求：
1. 分析國際政治對產業的影響
2. 指出地緣政治風險
3. 語氣要犀利但基於事實
4. 結論要有洞察力`;
```

#### 美股分析（美股狂熱評論員）
```javascript
const prompt = `你是一位美股狂熱評論員，以下是美股市場數據：

${usMarketData}

請分析美股市場與 ${stockName}(${stockId}) 的關聯性。
要求：
1. 分析美股走勢對台股的影響
2. 指出相關產業鏈的連動
3. 語氣要熱情但基於數據
4. 結論要有前瞻性`;
```

#### 討論分析（中性質疑者）
```javascript
const prompt = `你是一位理性的經濟分析師，用戶對 ${stockName}(${stockId}) 提出以下看法：

"${userOpinion}"

請分析用戶論點的合理性，並提出中性質疑及經濟學風險提醒。
要求：
1. 客觀評估論點的合理性
2. 指出可能的盲點
3. 提醒經濟學風險
4. 語氣中性但有建設性`;
```

#### 總評分析（綜合評估）
```javascript
const prompt = `你是一位資深投資顧問，請綜合以下所有資訊對 ${stockName}(${stockId}) 做出完整評估：

技術分析：${technicalAnalysis}
新聞分析：${newsAnalysis}
政治分析：${politicalAnalysis}
美股分析：${usMarketAnalysis}
討論洞察：${discussionInsights}
${previousReview ? `先前總評：${previousReview}` : ''}

請提出勇敢且有決心的投資方向建議。
要求：
1. 綜合所有面向的分析
2. 明確指出買入/持有/賣出建議
3. 說明理由和風險
4. 給予具體操作建議`;
```

---

## 🛡️ 防止 ReplyToken 錯誤機制

### 問題：
- ReplyToken 只能使用一次
- 討論功能需要多次互動
- 總評後需要用戶評價

### 解決方案：

#### 1. 使用 Push Message（需要 LINE Official Account）
```javascript
// 不使用 replyToken，改用 push message
await client.pushMessage(userId, messages);
```

#### 2. 使用對話狀態管理
```javascript
// 儲存對話狀態到 Supabase
await saveConversationState(userId, stockId, {
  stage: 'discussion',
  discussionCount: 3,
  waitingForInput: true
});

// 下次用戶輸入時，檢查狀態
const state = await getConversationState(userId, stockId);
if (state && state.waitingForInput) {
  // 繼續對話
}
```

#### 3. Quick Reply 攜帶狀態
```javascript
// 在 Quick Reply 的 text 中攜帶狀態
{
  "label": "💬 討論",
  "text": "討論:2330:1" // 格式：功能:股票代號:次數
}
```

---

## 📊 功能限制

| 功能 | 限制 | 檢查方式 |
|------|------|---------|
| 新聞 | 1 次 | `news_used = TRUE` |
| 政治 | 1 次 | `politics_used = TRUE` |
| 美股 | 無限制 | - |
| 討論 | 5 次 | `discussion_count <= 5` |
| 總評 | 無限制 | - |

---

## 🎯 實作優先順序

1. ✅ 建立 Supabase 資料表
2. ✅ 實作 Google Search API
3. ✅ 實作對話狀態管理
4. ✅ 實作 Quick Reply 按鈕
5. ✅ 實作新聞功能
6. ✅ 實作政治功能
7. ✅ 實作美股功能
8. ✅ 實作討論功能
9. ✅ 實作總評功能
10. ✅ 實作評價系統

---

**下一步：開始實作各個模組** 🚀

