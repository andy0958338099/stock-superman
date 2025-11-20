# 📁 專案結構說明

## 目錄結構

```
Stock-Superman/
├── functions/                    # Netlify Functions（核心功能）
│   ├── handlers/                # 功能處理器
│   │   ├── discussion-handler.js      # 討論功能處理
│   │   ├── final-review-handler.js    # 總評功能處理
│   │   ├── news-handler.js            # 新聞功能處理
│   │   ├── politics-handler.js        # 政治功能處理
│   │   └── us-market-handler.js       # 美股功能處理
│   │
│   ├── line-webhook.js          # 主要 Webhook 處理器
│   ├── finmind.js               # FinMind API 客戶端
│   ├── deepseek.js              # DeepSeek AI 客戶端
│   ├── indicators.js            # 技術指標計算（KD、MACD、MA）
│   ├── generate-chart.js        # Canvas 圖表生成
│   ├── generate-chart-quickchart.js  # QuickChart 圖表生成
│   ├── generate-kd-macd-chart.js     # KD/MACD 圖表生成
│   ├── supabase-client.js       # Supabase 資料庫客戶端
│   ├── conversation-state.js    # 對話狀態管理
│   ├── final-review-db.js       # 總評資料庫操作
│   ├── google-search.js         # Google 搜尋 API
│   ├── quick-reply-builder.js   # 快速回覆建構器
│   ├── us-market-analysis.js    # 美股分析主邏輯
│   ├── us-market-analysis-worker.js  # 美股分析 Worker
│   ├── us-market-async.js       # 美股異步任務管理
│   └── us-market-flex-message.js     # 美股 Flex Message 生成
│
├── supabase/                    # Supabase 相關
│   └── migrations/              # 資料庫遷移
│       └── create_us_market_analysis_tasks.sql
│
├── public/                      # 靜態文件
│   ├── index.html              # 首頁
│   └── demo-screenshot.png     # 示範截圖
│
├── .gitignore                   # Git 忽略文件
├── netlify.toml                 # Netlify 配置
├── package.json                 # NPM 依賴配置
├── README.md                    # 專案說明文檔
├── supabase-schema.sql          # Supabase 表結構（基礎）
└── supabase_tables.sql          # Supabase 表結構（互動系統）
```

---

## 核心文件說明

### 🔧 配置文件

#### `netlify.toml`
Netlify 部署配置：
- Functions 目錄設定
- 超時時間配置（line-webhook: 10s, us-market-analysis-worker: 60s）
- esbuild 打包配置

#### `package.json`
NPM 依賴管理：
- 核心依賴：@line/bot-sdk, @supabase/supabase-js, axios, chart.js, moment
- 開發依賴：netlify-cli

---

### 📡 Functions（Netlify Serverless）

#### `line-webhook.js` ⭐ 主要入口
- 接收 LINE Webhook 事件
- 驗證 LINE Signature
- 去重檢查（防止重複觸發）
- 路由到不同功能處理器
- 支援的指令：
  - 股票代號（如 `2330`）
  - `美股`
  - `清除快取`
  - `新聞`、`政治`、`討論`、`總評`

#### `finmind.js` 📊 資料來源
- 台股股價查詢（`fetchStockPrice`）
- 台股基本資訊（`fetchStockInfo`）
- 美股指數查詢（`fetchUSStockPrice`）
- 匯率查詢（`fetchExchangeRate`）
- VIX 恐慌指數（`fetchVIX`）
- 內建 Retry 機制（最多 3 次重試）

#### `deepseek.js` 🤖 AI 分析
- 台股 AI 分析（`analyzeWithDeepSeek`）
- 美股跨市場分析（`analyzeUSMarketWithDeepSeek`）
- Fallback 機制（AI 失敗時使用技術指標生成分析）
- 內建 Retry 機制（最多 2 次重試）

#### `indicators.js` 📈 技術指標
- KD 指標計算（`calculateKD`）
- MACD 指標計算（`calculateMACD`）
- 移動平均線計算（`calculateMA`）
- 趨勢判斷邏輯

#### `generate-chart.js` 🎨 圖表生成
- 使用 Chart.js + Canvas 生成圖表
- 上傳到 Supabase Storage
- 返回公開 URL

#### `supabase-client.js` 💾 資料庫操作
- 快取管理（`getStockCache`, `saveStockCache`, `deleteStockCache`）
- 美股分析快取（`getUSMarketCache`, `saveUSMarketCache`）
- Reply Token 去重（`isReplyTokenUsed`, `saveReplyToken`）
- 對話狀態管理

---

### 🎯 美股分析系統

#### `us-market-analysis.js` 主邏輯
- 抓取美股數據（S&P 500, NASDAQ, TSM ADR, VIX）
- 抓取台股數據（加權指數, USD/TWD）
- 計算技術指標
- 調用 DeepSeek AI 分析
- 快取結果（6 小時有效）

#### `us-market-analysis-worker.js` Worker
- 獨立的 Netlify Function
- 執行耗時的美股分析任務
- 超時時間：60 秒

#### `us-market-async.js` 異步任務管理
- 創建分析任務（`createAnalysisTask`）
- 更新任務狀態（`updateTaskStatus`）
- 查詢任務狀態（`getTaskStatus`）
- 觸發 Worker（`triggerWorker`）

#### `us-market-flex-message.js` Flex Message
- 生成美股分析的 LINE Flex Message
- 支援中等版和緊湊版
- 包含完整的市場分析、預測、策略、風險提示

---

### 🗄️ 資料庫結構

#### `line_events` 表（去重）
- `reply_token`：LINE Reply Token（唯一）
- `created_at`：建立時間

#### `stock_cache` 表（快取）
- `stock_id`：股票代號或 'US_MARKET'（主鍵）
- `result_json`：完整分析結果（JSONB）
- `image_url`：圖表 URL
- `updated_at`：最後更新時間
- **快取有效期**：台股 12 小時，美股 6 小時

#### `us_market_analysis_tasks` 表（異步任務）
- `task_id`：任務 ID（主鍵）
- `user_id`：用戶 ID
- `status`：任務狀態（pending, processing, completed, failed）
- `result`：分析結果（JSONB）
- `created_at`：建立時間

---

## 🔄 工作流程

### 台股查詢流程
```
用戶輸入「2330」
  ↓
檢查快取（12 小時內？）
  ├─ 是 → 直接返回快取結果（秒回）
  └─ 否 → 執行完整分析
      ├─ 抓取 FinMind 資料
      ├─ 計算技術指標
      ├─ 生成圖表
      ├─ DeepSeek AI 分析
      ├─ 儲存快取
      └─ 返回結果
```

### 美股查詢流程
```
用戶輸入「美股」
  ↓
檢查快取（6 小時內？）
  ├─ 是 → 直接返回完整 Flex Message（秒回）
  └─ 否 → 創建異步任務
      ├─ 返回「開始分析」訊息
      ├─ 觸發 Worker Function
      ├─ Worker 執行分析（30-60 秒）
      ├─ 儲存快取
      └─ 用戶點擊「查看美股分析」查詢結果
```

---

## 📊 效能優化

1. **快取機制**：台股 12 小時、美股 6 小時
2. **異步處理**：美股分析使用 Worker，避免超時
3. **Retry 機制**：API 失敗自動重試（Exponential Backoff）
4. **去重機制**：防止 Webhook 重複觸發
5. **Fallback 機制**：AI 失敗時使用技術指標生成分析

---

## 🔒 安全機制

1. **LINE Signature 驗證**：確保請求來自 LINE 伺服器
2. **Reply Token 去重**：防止重複回覆
3. **環境變數保護**：敏感資訊存放在 Netlify 環境變數
4. **Supabase RLS**：資料庫行級安全策略

