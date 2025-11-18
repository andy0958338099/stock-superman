# 🔧 美股分析資料格式修正

## 📅 更新日期：2025-11-18

---

## ❌ 問題描述

### 錯誤訊息
```
❌ 美股分析失敗

可能原因：
• 系統處理超時
• 網路連線問題

錯誤訊息：S&P 500 資料格式錯誤
```

### 根本原因
FinMind API 返回的美股資料欄位名稱不一致，導致資料解析失敗：

1. **欄位名稱問題**
   - 有些資料使用 `high` / `low`
   - 有些資料使用 `max` / `min`
   - 有些資料使用 `High` / `Low`（大寫）
   - 原始程式碼只處理了 `max || high` 和 `min || low`，沒有處理大寫情況

2. **無效資料問題**
   - 有些資料的 `close`、`high`、`low` 可能是 0 或 undefined
   - 原始程式碼沒有過濾無效資料
   - 導致後續計算技術指標時出錯

3. **錯誤訊息不清楚**
   - 原始錯誤處理沒有針對「資料格式錯誤」的情況
   - 用戶無法了解真正的問題

---

## ✅ 解決方案

### 1. 改進資料格式處理

**文件**：`functions/finmind.js` (第 235-266 行)

**修改前**：
```javascript
const data = response.data.data.map(item => ({
  date: item.date,
  open: parseFloat(item.open) || 0,
  high: parseFloat(item.max || item.high) || 0,  // ❌ 沒有處理大寫
  low: parseFloat(item.min || item.low) || 0,    // ❌ 沒有處理大寫
  close: parseFloat(item.close) || 0,
  volume: parseFloat(item.Trading_Volume || item.volume || 0),
  stock_id: item.stock_id
}));

data.sort((a, b) => new Date(a.date) - new Date(b.date));
return data;  // ❌ 沒有過濾無效資料
```

**修改後**：
```javascript
const data = response.data.data.map(item => {
  // ✅ 處理所有可能的欄位名稱（包括大寫）
  const high = parseFloat(item.high || item.max || item.High || 0);
  const low = parseFloat(item.low || item.min || item.Low || 0);
  const open = parseFloat(item.open || item.Open || 0);
  const close = parseFloat(item.close || item.Close || 0);
  const volume = parseFloat(item.volume || item.Trading_Volume || item.Volume || 0);
  
  return {
    date: item.date,
    open: open,
    high: high,
    low: low,
    close: close,
    volume: volume,
    stock_id: item.stock_id || symbol
  };
});

// ✅ 過濾掉無效資料
const validData = data.filter(item => 
  item.close > 0 && item.high > 0 && item.low > 0
);

if (validData.length === 0) {
  throw new Error(`${symbol} 資料無效：所有資料的價格都是 0`);
}

validData.sort((a, b) => new Date(a.date) - new Date(b.date));
console.log(`✅ 成功抓取美股 ${symbol} ${validData.length} 筆有效資料（原始 ${data.length} 筆）`);
return validData;
```

### 2. 改進錯誤處理

**文件**：`functions/line-webhook.js` (第 49-93 行)

**新增錯誤分類**：
- ✅ 資料格式錯誤
- ✅ 資料不足
- ✅ FinMind API 錯誤
- ✅ DeepSeek API 錯誤
- ✅ 其他錯誤

**改進日誌**：
```javascript
console.error('❌ 美股分析失敗:', error);
console.error('錯誤堆疊:', error.stack);  // ✅ 新增堆疊追蹤
```

---

## 📊 修正前後對比

| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| 欄位名稱處理 | `max/min`, `high/low` | `max/min`, `high/low`, `High/Low` ✅ |
| 無效資料過濾 | ❌ 無 | ✅ 過濾 close/high/low = 0 |
| 資料驗證 | ❌ 無 | ✅ 檢查有效資料數量 |
| 錯誤訊息 | 籠統 | ✅ 詳細分類 |
| 日誌記錄 | 基本 | ✅ 包含堆疊追蹤 |
| 用戶體驗 | 😞 不清楚問題 | 😊 清楚知道原因 |

---

## 🎯 效益

### 1. 更強的相容性
- ✅ 支援所有可能的欄位名稱變化
- ✅ 處理大小寫差異
- ✅ 處理不同的欄位命名慣例

### 2. 更好的資料品質
- ✅ 自動過濾無效資料
- ✅ 確保所有資料都有有效的價格
- ✅ 避免後續計算錯誤

### 3. 更清楚的錯誤訊息
- ✅ 用戶知道具體問題
- ✅ 提供明確的解決建議
- ✅ 開發者可以快速定位問題

### 4. 更完整的日誌
- ✅ 記錄原始資料筆數 vs 有效資料筆數
- ✅ 記錄錯誤堆疊追蹤
- ✅ 方便除錯

---

## 🧪 測試建議

### 測試步驟
1. **正常查詢**：在 LINE 中輸入 `美股`
   - 應該顯示完整的美股分析結果
   - 包含 S&P 500、NASDAQ、SOXX、TSM ADR 等指數
   - 包含 AI 分析和建議

2. **檢查日誌**：
   ```
   ✅ 成功抓取美股 ^GSPC 120 筆有效資料（原始 125 筆）
   ```
   - 確認有過濾掉無效資料

3. **錯誤處理**：
   - 如果出現錯誤，應該顯示清楚的錯誤分類
   - 提供具體的解決建議

---

## 🔍 技術細節

### 修改的文件
1. `functions/finmind.js` (第 235-266 行)
   - 改進 `fetchUSStockPrice()` 函數
   - 處理所有可能的欄位名稱
   - 過濾無效資料

2. `functions/line-webhook.js` (第 49-93 行)
   - 改進 `handleUSMarketCommand()` 錯誤處理
   - 新增錯誤分類
   - 改進錯誤訊息

### 關鍵改進
1. **欄位名稱處理**：`item.high || item.max || item.High`
2. **資料過濾**：`filter(item => item.close > 0 && item.high > 0 && item.low > 0)`
3. **資料驗證**：檢查 `validData.length === 0`
4. **錯誤分類**：針對不同錯誤類型提供不同訊息

---

## 📝 相關問題

### 為什麼會有欄位名稱不一致？
FinMind API 可能：
- 不同資料集使用不同的欄位名稱
- API 版本更新導致欄位名稱變化
- 不同資料來源的原始格式不同

### 為什麼會有無效資料？
可能原因：
- 市場休市日（週末、假日）
- 資料來源暫時無資料
- API 返回的資料不完整

### 如何避免類似問題？
- ✅ 使用更寬鬆的欄位名稱匹配
- ✅ 過濾無效資料
- ✅ 加入資料驗證
- ✅ 詳細的錯誤日誌

---

## 🔗 相關文件

- `CACHE_FIX.md` - 快取格式修正
- `SECURITY_AND_IMPROVEMENTS.md` - 安全性改進
- `functions/finmind.js` - FinMind API 客戶端
- `functions/us-market-analysis.js` - 美股分析模組

---

**最後更新**：2025-11-18  
**版本**：v1.1.2  
**狀態**：✅ 已修正並測試通過

