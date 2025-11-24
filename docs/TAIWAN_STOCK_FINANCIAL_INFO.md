# 台股分析新增財務資訊功能

## 📋 功能說明

在台股個股分析中新增以下財務資訊顯示：
- 💰 **前一年度現金股利**
- 📈 **前一年度配股（股票股利）**
- 📊 **近3季 EPS**
- 💹 **本益比（P/E Ratio）**

## 🎯 設計目標

1. **不增加高度**：使用橫向排列，將財務資訊緊湊顯示在標題下方
2. **資訊完整**：提供投資人最關心的基本面數據
3. **自動計算**：本益比自動根據近3季 EPS 估算年度 EPS 計算

## 🔧 技術實現

### 1. 新增 FinMind API 函數

#### `fetchStockDividend(stockId)`
- **Dataset**: `TaiwanStockDividend`
- **返回資料**：
  ```javascript
  {
    year: 2023,              // 年度
    cash_dividend: 2.5,      // 現金股利
    stock_dividend: 0.0      // 股票股利
  }
  ```

#### `fetchStockFinancials(stockId)`
- **Dataset**: `TaiwanStockFinancialStatements`
- **返回資料**：
  ```javascript
  {
    recent_3q_eps: [         // 近3季 EPS 明細
      { date: '2024-09-30', eps: 1.2 },
      { date: '2024-06-30', eps: 1.5 },
      { date: '2024-03-31', eps: 1.3 }
    ],
    total_3q_eps: 4.0        // 近3季累計 EPS
  }
  ```

### 2. 本益比計算邏輯

```javascript
// 用近3季 EPS * 4/3 估算年度 EPS
const estimatedAnnualEPS = total_3q_eps * (4 / 3);

// 計算本益比
const peRatio = currentPrice / estimatedAnnualEPS;
```

### 3. Flex Message 顯示設計

```
┌─────────────────────────────────┐
│ 2330 台積電                      │
│ 收盤價：580 | 2024-11-24        │
├─────────────────────────────────┤
│ 💰 2023年      │ 📊 近3季        │
│ 現金 2.75      │ EPS 12.50       │
│ 配股 0.00      │ 本益比 15.52    │
├─────────────────────────────────┤
│ 📈 技術指標                      │
│ KD：黃金交叉 (K=75, D=68)       │
│ ...                             │
└─────────────────────────────────┘
```

**特點**：
- 使用 `horizontal` 佈局，左右並排
- 左側：股利資訊（💰 圖示）
- 右側：EPS 和本益比（📊 圖示）
- 字體大小：
  - 標題：`xxs`（灰色）
  - 數值：`xs`（粗體黑色）
- 不增加額外高度，緊湊排列

## 📊 資料來源

### FinMind API Datasets

1. **TaiwanStockDividend**
   - 欄位：`year`, `CashEarningsDistribution`, `StockEarningsDistribution`
   - 更新頻率：年度
   - 說明：包含現金股利和股票股利

2. **TaiwanStockFinancialStatements**
   - 欄位：`date`, `type`, `EPS`
   - 更新頻率：季度
   - 說明：`type='Q'` 為季報，包含每股盈餘

## 🚀 使用方式

### 查詢股票時自動顯示

```
用戶：2330
Bot：[顯示台積電分析，包含財務資訊]
```

### 快取機制

- 財務資料會與技術分析一起快取（6小時）
- 快取包含：
  - `dividend_data`: 股利資料
  - `financial_data`: 財務資料（EPS）
- 從快取讀取時也會顯示財務資訊

## 📝 代碼變更

### `functions/finmind.js`

**新增函數**：
- `fetchStockDividend(stockId)` - 抓取股利資料
- `fetchStockFinancials(stockId)` - 抓取財務報表（EPS）

**導出**：
```javascript
module.exports = {
  fetchStockPrice,
  fetchStockInfo,
  isValidStockId,
  fetchUSStockPrice,
  fetchExchangeRate,
  fetchVIX,
  fetchStockDividend,      // 新增
  fetchStockFinancials     // 新增
};
```

### `functions/line-webhook.js`

**修改 1：導入新函數**
```javascript
const { 
  fetchStockPrice, 
  fetchStockInfo, 
  isValidStockId, 
  fetchStockDividend,      // 新增
  fetchStockFinancials     // 新增
} = require('./finmind');
```

**修改 2：`createFlexMessage` 函數簽名**
```javascript
function createFlexMessage(
  stockId, 
  stockName, 
  latestData, 
  kdImageUrl, 
  macdImageUrl, 
  kdAnalysis, 
  macdAnalysis, 
  aiResult,
  dividendData,    // 新增
  financialData    // 新增
)
```

**修改 3：並行抓取資料**
```javascript
const [stockData, stockInfo, dividendData, financialData] = await Promise.all([
  fetchStockPrice(stockId),
  fetchStockInfo(stockId),
  fetchStockDividend(stockId),    // 新增
  fetchStockFinancials(stockId)   // 新增
]);
```

**修改 4：快取儲存**
```javascript
result_json: {
  stock_info: stockInfo,
  latest_data: latestData,
  kd_analysis: kdAnalysis,
  macd_analysis: macdAnalysis,
  ai_result: aiResult,
  dividend_data: dividendData,    // 新增
  financial_data: financialData,  // 新增
  // ...
}
```

## 🎨 顯示效果

### 完整資料範例（2330 台積電）

```
┌─────────────────────────────────┐
│ 2330 台積電                      │
│ 收盤價：580 | 2024-11-24        │
├─────────────────────────────────┤
│ 💰 2023年      │ 📊 近3季        │
│ 現金 2.75      │ EPS 12.50       │
│ 配股 0.00      │ 本益比 15.52    │
├─────────────────────────────────┤
│ 📈 技術指標                      │
│ ...                             │
└─────────────────────────────────┘
```

### 部分資料範例（只有股利）

```
┌─────────────────────────────────┐
│ 1234 測試股                      │
│ 收盤價：50 | 2024-11-24         │
├─────────────────────────────────┤
│ 💰 2023年                        │
│ 現金 1.50                        │
│ 配股 0.20                        │
├─────────────────────────────────┤
│ 📈 技術指標                      │
│ ...                             │
└─────────────────────────────────┘
```

### 無財務資料範例

如果 FinMind API 沒有返回股利或 EPS 資料，則不顯示財務資訊區塊，保持原有顯示。

## ⚠️ 注意事項

1. **資料可用性**：
   - 並非所有股票都有完整的股利和 EPS 資料
   - 新上市股票可能沒有歷史股利資料
   - 函數會優雅處理無資料情況（返回 null）

2. **本益比估算**：
   - 使用近3季 EPS * 4/3 估算年度 EPS
   - 這是簡化估算，實際年度 EPS 可能不同
   - 僅供參考，不構成投資建議

3. **效能影響**：
   - 使用 `Promise.all` 並行抓取，不影響查詢速度
   - 財務資料會與技術分析一起快取

## 🚀 部署狀態

- **Commit**: `67e6903` - "Feature: Add dividend, stock dividend, recent 3Q EPS and P/E ratio to Taiwan stock analysis"
- **推送時間**: 2024-11-24
- **Netlify**: 自動部署中（預計 2-3 分鐘）

## 🧪 測試建議

部署完成後，請測試：

1. **查詢大型股**（如 2330）：
   - 應該顯示完整的股利、EPS 和本益比

2. **查詢中小型股**：
   - 檢查是否正確處理部分資料缺失

3. **查詢新上市股**：
   - 檢查是否優雅處理無財務資料情況

4. **檢查快取**：
   - 第二次查詢應該從快取讀取，包含財務資訊

現在台股分析功能更加完整，提供投資人更全面的決策資訊！🎉

