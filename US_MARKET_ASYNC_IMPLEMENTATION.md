# 美股分析異步處理實現方案

## 🎯 **目標**

解決美股分析超時問題，提供更好的用戶體驗：
- ✅ 避免 Lambda 超時（40 秒限制）
- ✅ 用戶可以先看到部分資料
- ✅ 通過輪詢機制等待完整分析
- ✅ 保留詳細分析的完整性

---

## 📊 **方案架構**

### **流程圖**

```
用戶輸入「美股」
    ↓
立即返回「分析中」訊息 + Quick Reply「查看美股分析」
    ↓
後台開始分析（15-25秒）
    ↓
用戶點擊「查看美股分析」（15秒後）
    ↓
檢查分析狀態：
  ├─ 已完成 → 返回完整分析 Flex Message
  ├─ 進行中 → 返回部分資料 + Quick Reply「查看美股分析」
  └─ 失敗 → 返回 Fallback 分析
```

---

## 🗄️ **資料庫設計**

### **新增資料表：`us_market_analysis_tasks`**

```sql
CREATE TABLE us_market_analysis_tasks (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,  -- pending, processing, completed, failed
  result JSONB,                  -- 分析結果
  error_message TEXT,            -- 錯誤訊息
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP
);

-- 索引
CREATE INDEX idx_task_id ON us_market_analysis_tasks(task_id);
CREATE INDEX idx_user_id ON us_market_analysis_tasks(user_id);
CREATE INDEX idx_status ON us_market_analysis_tasks(status);
CREATE INDEX idx_created_at ON us_market_analysis_tasks(created_at);
```

---

## 🚀 **實現步驟**

### **步驟 1：創建異步處理模組**

已創建 `functions/us-market-async.js`，包含：
- ✅ `createUSMarketAnalysisTask()` - 創建分析任務
- ✅ `updateTaskStatus()` - 更新任務狀態
- ✅ `getTaskStatus()` - 取得任務狀態
- ✅ `getUserLatestTask()` - 取得用戶最新任務
- ✅ `executeUSMarketAnalysis()` - 執行分析（異步）

---

### **步驟 2：修改 `handleUSMarketCommand()`**

**修改前（同步）：**
```javascript
async function handleUSMarketCommand() {
  const analysisResult = await analyzeUSMarket();  // 等待 15-25 秒
  const flexMessage = generateUSMarketFlexMessage(analysisResult);
  return flexMessage;
}
```

**修改後（異步）：**
```javascript
async function handleUSMarketCommand(userId) {
  // 1. 檢查是否有進行中的任務
  const existingTask = await getUserLatestTask(userId);
  
  if (existingTask && existingTask.status === AnalysisStatus.PROCESSING) {
    // 任務進行中，返回等待訊息
    return {
      type: 'text',
      text: '⏳ 美股分析進行中...\n\n' +
            '📊 正在抓取資料並進行 AI 分析\n' +
            '⏱️ 預計需要 15-25 秒\n\n' +
            '💡 請點擊下方按鈕查看分析結果',
      quickReply: buildUSMarketPollingQuickReply(existingTask.task_id).quickReply
    };
  }

  // 2. 創建新任務
  const taskId = await createUSMarketAnalysisTask(userId);

  // 3. 異步執行分析（不等待）
  executeUSMarketAnalysis(taskId).catch(err => {
    console.error('❌ 異步分析失敗:', err);
  });

  // 4. 立即返回「分析中」訊息
  return {
    type: 'text',
    text: '🚀 開始美股分析\n\n' +
          '📊 正在抓取以下資料：\n' +
          '• S&P 500 指數\n' +
          '• NASDAQ 指數\n' +
          '• TSM ADR\n' +
          '• 台股加權指數\n' +
          '• USD/TWD 匯率\n' +
          '• VIX 恐慌指數\n\n' +
          '⏱️ 預計需要 15-25 秒\n\n' +
          '💡 請在 15 秒後點擊下方按鈕查看分析結果',
    quickReply: buildUSMarketPollingQuickReply(taskId).quickReply
  };
}
```

---

### **步驟 3：新增輪詢處理函數**

```javascript
async function handleUSMarketPolling(userId, taskId = null) {
  try {
    // 1. 取得任務
    const task = taskId 
      ? await getTaskStatus(taskId)
      : await getUserLatestTask(userId);

    if (!task) {
      return {
        type: 'text',
        text: '⚠️ 找不到分析任務\n\n請重新輸入「美股」開始分析'
      };
    }

    // 2. 檢查任務狀態
    switch (task.status) {
      case AnalysisStatus.COMPLETED:
        // 分析完成，返回完整 Flex Message
        return generateUSMarketFlexMessage(task.result);

      case AnalysisStatus.PROCESSING:
        // 仍在處理中，返回部分資料
        const elapsedTime = Math.floor((Date.now() - new Date(task.created_at)) / 1000);
        return {
          type: 'text',
          text: `⏳ 美股分析進行中...\n\n` +
                `📊 已進行 ${elapsedTime} 秒\n` +
                `⏱️ 預計還需要 ${Math.max(0, 25 - elapsedTime)} 秒\n\n` +
                `💡 請稍後再點擊下方按鈕查看結果`,
          quickReply: buildUSMarketPollingQuickReply(task.task_id).quickReply
        };

      case AnalysisStatus.FAILED:
        // 分析失敗，返回 Fallback
        return {
          type: 'text',
          text: `❌ 美股分析失敗\n\n` +
                `錯誤訊息：${task.error_message}\n\n` +
                `💡 請稍後再試或輸入「美股」重新分析`
        };

      case AnalysisStatus.PENDING:
      default:
        // 等待中
        return {
          type: 'text',
          text: `⏳ 美股分析等待中...\n\n` +
                `💡 請稍後再點擊下方按鈕查看結果`,
          quickReply: buildUSMarketPollingQuickReply(task.task_id).quickReply
        };
    }

  } catch (error) {
    console.error('❌ 處理輪詢請求失敗:', error);
    return {
      type: 'text',
      text: '❌ 系統錯誤\n\n請稍後再試'
    };
  }
}
```

---

### **步驟 4：修改 Webhook 處理邏輯**

在 `functions/line-webhook.js` 中添加：

```javascript
// 檢查美股分析指令
if (text === '美股' || text === '美股分析' || text === 'US' || text === 'us market') {
  console.log('🌎 收到美股分析請求');
  const usMarketMessage = await handleUSMarketCommand(userId);  // 傳入 userId
  await client.replyMessage(replyToken, usMarketMessage);
  await recordReplyToken(replyToken);
  console.log('✅ 美股分析任務已創建');
  continue;
}

// 檢查美股分析輪詢指令
if (text.startsWith('查看美股分析')) {
  console.log('🔍 收到美股分析輪詢請求');
  const taskId = text.includes(':') ? text.split(':')[1] : null;
  const pollingMessage = await handleUSMarketPolling(userId, taskId);
  await client.replyMessage(replyToken, pollingMessage);
  await recordReplyToken(replyToken);
  console.log('✅ 美股分析輪詢完成');
  continue;
}
```

---

## ⚠️ **注意事項**

### **1. 資料庫表需要手動創建**

需要在 Supabase 中執行 SQL 創建 `us_market_analysis_tasks` 表。

### **2. 任務清理機制**

建議添加定期清理過期任務的機制：

```javascript
// 清理 24 小時前的任務
async function cleanupOldTasks() {
  const { error } = await supabase
    .from('us_market_analysis_tasks')
    .delete()
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  
  if (error) console.error('清理任務失敗:', error);
}
```

### **3. 並發控制**

防止用戶重複創建任務：
- 檢查是否有進行中的任務
- 如果有，返回等待訊息而不創建新任務

### **4. 超時處理**

如果任務超過 60 秒仍未完成，自動標記為失敗。

---

## 🎉 **優點**

1. ✅ **避免超時**：不會因為 AI 分析時間過長而導致 Lambda 超時
2. ✅ **更好的用戶體驗**：用戶可以先看到「分析中」訊息，不用乾等
3. ✅ **靈活性高**：用戶可以選擇何時查看結果
4. ✅ **降低失敗率**：即使 AI 超時，用戶仍能通過輪詢獲取結果
5. ✅ **保留詳細分析**：不需要簡化 prompt，可以保持分析的完整性

---

## 📝 **後續優化**

1. **WebSocket 推送**：當分析完成時主動推送給用戶（需要 LINE Messaging API Push）
2. **進度條**：顯示分析進度（例如：抓取資料 50%、AI 分析 80%）
3. **快取優化**：如果快取命中，直接返回結果而不創建任務
4. **錯誤重試**：分析失敗時自動重試 1-2 次

---

## 🚀 **部署步驟**

1. ✅ 創建 `functions/us-market-async.js`
2. ✅ 修改 `functions/quick-reply-builder.js`
3. ⏳ 在 Supabase 創建 `us_market_analysis_tasks` 表
4. ⏳ 修改 `functions/line-webhook.js` 添加輪詢處理
5. ⏳ 測試異步流程
6. ⏳ 部署到 Netlify

---

## 🧪 **測試場景**

1. **正常流程**：輸入「美股」→ 15 秒後點擊「查看美股分析」→ 看到完整分析
2. **快速輪詢**：輸入「美股」→ 5 秒後點擊「查看美股分析」→ 看到「進行中」訊息
3. **重複請求**：輸入「美股」→ 再次輸入「美股」→ 看到「分析進行中」訊息
4. **分析失敗**：AI 超時 → 點擊「查看美股分析」→ 看到失敗訊息

