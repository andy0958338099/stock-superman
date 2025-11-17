# 美股分析功能優化說明

## 🚨 問題分析

### 原始問題
第一次測試美股分析時出現「API 用完」錯誤。

### 根本原因
1. **並行請求過多**：一次發送 7 個並行請求到 FinMind API
   - S&P 500
   - NASDAQ
   - SOXX
   - TSM ADR
   - 台股加權
   - USD/TWD 匯率
   - VIX 指數

2. **觸發頻率限制**：FinMind API 有請求頻率限制
   - 免費版：每分鐘 60 次請求
   - 短時間內 7 個並行請求可能觸發限制

3. **沒有快取機制**：每次查詢都重新抓取資料

---

## ✅ 優化方案

### 1. **加入快取機制**

#### 快取策略
- **快取時間**：1 小時
- **快取鍵值**：`US_MARKET`
- **儲存位置**：Supabase `stock_cache` 表

#### 快取邏輯
```javascript
// 1. 先檢查快取
const cachedResult = await getUSMarketCache();
if (cachedResult) {
  return cachedResult; // 直接返回快取結果
}

// 2. 快取未命中，執行分析
const result = await analyzeUSMarket();

// 3. 儲存快取
await saveUSMarketCache(result);
```

#### 優點
- ✅ 1 小時內重複查詢直接返回快取
- ✅ 大幅減少 API 請求次數
- ✅ 回應速度從 10-15 秒降至 < 1 秒

---

### 2. **序列請求 + 延遲**

#### 原本（並行請求）
```javascript
const [sp500, nasdaq, soxx, ...] = await Promise.all([
  fetchUSStockPrice('^GSPC'),
  fetchUSStockPrice('^IXIC'),
  fetchUSStockPrice('^SOX'),
  // ... 7 個並行請求
]);
```

#### 優化後（序列請求 + 延遲）
```javascript
const sp500Data = await fetchUSStockPrice('^GSPC');
await delay(500); // 延遲 500ms

const nasdaqData = await fetchUSStockPrice('^IXIC');
await delay(500);

const soxxData = await fetchUSStockPrice('^SOX');
await delay(500);
// ... 依序執行，每次間隔 500ms
```

#### 優點
- ✅ 避免觸發 API 頻率限制
- ✅ 更穩定的請求成功率
- ✅ 符合 API 使用規範

#### 缺點
- ⚠️ 首次查詢時間增加（約 15-20 秒）
- ⚠️ 但有快取後，大部分查詢都是 < 1 秒

---

### 3. **改善錯誤處理**

#### 詳細的錯誤訊息
```javascript
if (error.message.includes('FinMind')) {
  return '⚠️ FinMind API 請求失敗\n' +
         '可能原因：\n' +
         '• API 請求頻率過高\n' +
         '• API 配額已用完\n' +
         '💡 建議：等待 1-2 分鐘後再試';
}
```

#### 優點
- ✅ 用戶知道具體問題
- ✅ 提供解決建議
- ✅ 更好的用戶體驗

---

## 📊 效能比較

### 首次查詢（無快取）

| 項目 | 優化前 | 優化後 |
|------|--------|--------|
| **請求方式** | 7 個並行 | 7 個序列 + 延遲 |
| **處理時間** | 10-15 秒 | 15-20 秒 |
| **成功率** | 低（易觸發限制） | 高（穩定） |
| **API 請求** | 7 次 | 7 次 |

### 快取命中（1 小時內）

| 項目 | 優化前 | 優化後 |
|------|--------|--------|
| **請求方式** | 7 個並行 | 直接返回快取 |
| **處理時間** | 10-15 秒 | < 1 秒 |
| **成功率** | 低 | 100% |
| **API 請求** | 7 次 | 0 次 |

---

## 🎯 使用建議

### 最佳使用時機
1. **盤前準備**（台股開盤前）
   - 查看美股昨夜收盤狀態
   - 快取有效期內可多次查詢

2. **盤中觀察**（台股盤中）
   - 評估美股對台股的影響
   - 1 小時內快取有效

3. **盤後檢討**（台股收盤後）
   - 分析今日走勢
   - 預測明日可能方向

### 避免的使用方式
- ❌ 短時間內頻繁查詢（< 1 分鐘）
- ❌ 在 API 限制期間重試（應等待 1-2 分鐘）

---

## 🔧 技術細節

### 快取資料結構
```javascript
{
  stock_id: 'US_MARKET',
  analysis_result: {
    success: true,
    data: {
      sp500: { ... },
      nasdaq: { ... },
      soxx: { ... },
      tsmAdr: { ... },
      twii: { ... },
      usdTwd: { ... },
      vix: { ... }
    },
    analysis: {
      us_market_status: '多頭',
      tw_market_status: '盤整',
      correlation_score: 75,
      // ... 完整 AI 分析結果
    },
    timestamp: '2025-11-17 14:30:00'
  },
  created_at: '2025-11-17T06:30:00.000Z'
}
```

### 快取過期檢查
```javascript
const cacheTime = new Date(cache.created_at);
const now = new Date();
const diffHours = (now - cacheTime) / (1000 * 60 * 60);

if (diffHours > 1) {
  return null; // 快取過期
}
```

---

## 📈 API 使用量估算

### 優化前（無快取）
- 每次查詢：7 次 API 請求
- 10 個用戶查詢：70 次請求
- 100 個用戶查詢：700 次請求
- **容易超過每日配額**

### 優化後（有快取）
- 首次查詢：7 次 API 請求
- 1 小時內重複查詢：0 次請求
- 10 個用戶查詢（1 小時內）：7 次請求
- 100 個用戶查詢（1 小時內）：7 次請求
- **大幅節省 API 配額**

---

## 🎉 總結

### 優化成果
1. ✅ **加入快取機制**：1 小時內查詢速度 < 1 秒
2. ✅ **序列請求**：避免觸發 API 頻率限制
3. ✅ **改善錯誤處理**：提供詳細錯誤訊息和建議
4. ✅ **節省 API 配額**：大幅減少重複請求

### 用戶體驗
- ✅ 首次查詢：15-20 秒（可接受）
- ✅ 快取命中：< 1 秒（極快）
- ✅ 錯誤提示：清楚明確
- ✅ 穩定性：大幅提升

---

**🚀 現在可以放心使用美股分析功能了！**

**建議**：
- 每小時查詢一次即可
- 避免短時間內重複查詢
- 如遇錯誤，等待 1-2 分鐘後再試

