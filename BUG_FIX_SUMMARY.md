# 🐛 Bug 修復總結

## 修復日期
2025-11-25

## 問題診斷

### 1. ❌ VIX 恐慌指數顯示為 0
**問題原因**：
- FinMind API 返回的欄位名稱是 `Close`（大寫 C），而不是 `close`（小寫 c）
- 代碼使用 `item.close` 導致取不到值，預設為 0

**修復方式**：
```javascript
// 修改前
const data = response.data.data.map(item => ({
  date: item.date,
  close: parseFloat(item.close) || 0
}));

// 修改後
const data = response.data.data.map(item => ({
  date: item.date,
  close: parseFloat(item.Close || item.close || item.Adj_Close || 0)
}));
```

**測試結果**：
- ✅ VIX 最新值：20.52（2025-11-24）
- ✅ 資料正常顯示

---

### 2. ❌ USD/TWD 匯率顯示為 0
**問題原因**：
- FinMind API 的 `TaiwanExchangeRate` dataset **沒有 `close` 欄位**
- 實際欄位：`cash_buy`, `cash_sell`, `spot_buy`, `spot_sell`
- 應該使用 `spot_sell`（即期賣出匯率）作為參考匯率

**修復方式**：
```javascript
// 修改前
const data = response.data.data.map(item => ({
  date: item.date,
  rate: parseFloat(item.close) || 0
}));

// 修改後
const data = response.data.data.map(item => ({
  date: item.date,
  rate: parseFloat(item.spot_sell || item.spot_buy || item.cash_sell || 0)
}));
```

**測試結果**：
- ✅ USD/TWD 最新值：31.49（2025-11-25）
- ✅ 資料正常顯示

---

### 3. ❌ 台股本益比/EPS 未顯示
**問題原因**：
1. **API Token 問題**：
   - `TaiwanStockDividend` 和 `TaiwanStockFinancialStatements` 需要 API Token
   - 原本使用 query parameter 傳遞 token，應該使用 Bearer Token

2. **資料結構錯誤**：
   - `TaiwanStockFinancialStatements` 的格式是：
     ```
     { date, stock_id, type, value, origin_name }
     ```
   - 需要篩選 `type === 'EPS'` 的資料
   - `value` 欄位才是 EPS 值

**修復方式**：

#### 3.1 修改 API Token 傳遞方式
```javascript
// 修改前
if (FINMIND_API_TOKEN) {
  params.token = FINMIND_API_TOKEN;
}

// 修改後
const requestOptions = {
  params,
  timeout: 10000
};

if (FINMIND_API_TOKEN) {
  requestOptions.headers = {
    'Authorization': `Bearer ${FINMIND_API_TOKEN}`
  };
}
```

#### 3.2 修改 EPS 資料解析
```javascript
// 修改前
const financialData = response.data.data
  .filter(item => item.type === 'Q') // 錯誤：type 不是 'Q'
  .map(item => ({
    eps: parseFloat(item.EPS || 0) // 錯誤：沒有 EPS 欄位
  }));

// 修改後
const epsRecords = response.data.data
  .filter(item => item.type === 'EPS') // 正確：篩選 type === 'EPS'
  .map(item => ({
    date: item.date,
    eps: parseFloat(item.value || 0) // 正確：使用 value 欄位
  }));
```

#### 3.3 更新本益比計算
```javascript
// 修改前
const estimatedAnnualEPS = financialData.total_3q_eps * (4 / 3);
peRatio = (latestData.close / estimatedAnnualEPS).toFixed(2);

// 修改後
peRatio = (latestData.close / financialData.total_eps).toFixed(2);
```

**測試結果**：
- ⚠️ 本地測試：無 API Token，返回 null（預期行為）
- ✅ Netlify 部署：有 API Token，應該可以正常顯示

---

## 修改的檔案

### 1. `functions/finmind.js`
- ✅ 修復 VIX 欄位名稱（line 371-375）
- ✅ 修復 USD/TWD 欄位名稱（line 314-318）
- ✅ 修改股利資料 API Token 傳遞方式（line 389-413）
- ✅ 修改財務報表 API Token 傳遞方式（line 443-467）
- ✅ 修改 EPS 資料解析邏輯（line 469-499）

### 2. `functions/line-webhook.js`
- ✅ 更新本益比計算邏輯（line 334-339）
- ✅ 更新 Flex Message 顯示文字（line 425-437）
- ✅ 更新日誌輸出（line 637-643）

---

## 部署建議

### 1. 確認 Netlify 環境變數
確保 Netlify 已設定：
```
FINMIND_API_TOKEN=your_token_here
```

### 2. 清除快取
部署後，在 LINE Bot 輸入：
```
清除快取
```

### 3. 測試項目
- [ ] 測試美股分析：輸入「美股」
  - 檢查 VIX 是否顯示正確數值（不是 0）
  - 檢查 USD/TWD 是否顯示正確數值（不是 0）
  
- [ ] 測試台股分析：輸入「2330」
  - 檢查是否顯示 EPS 資料
  - 檢查是否顯示本益比
  - 檢查是否顯示股利資料

---

## 預期結果

### 美股分析
```
VIX 恐慌指數: 20.52
USD/TWD 匯率: 31.49
✅ 市場情緒穩定
```

### 台股分析（2330 為例）
```
💰 2024年
現金 2.50
配股 0.00

📊 近4季
EPS 35.00
本益比 40.43
```

---

## 注意事項

1. **FinMind API Token 必須設定**
   - 股利和財務資料需要 API Token
   - 沒有 Token 會返回 400 錯誤
   - 這些資料會顯示為 null，不影響其他功能

2. **資料更新頻率**
   - 股利資料：每年更新
   - 財務報表：每季更新
   - VIX/匯率：每日更新

3. **快取機制**
   - 台股：12 小時
   - 美股：6 小時
   - 修改後需清除快取才能看到新資料

