# 🚀 股市大亨 LINE Bot

一個整合 **FinMind API**、**DeepSeek AI** 和 **LINE Messaging API** 的台股技術分析機器人。

## ✨ 功能特色

- 📊 **即時股價資料**：透過 FinMind API 抓取台股日線資料
- 📈 **技術指標分析**：自動計算 KD、MACD、MA5/20/60 等指標
- 🤖 **AI 走勢預測**：使用 DeepSeek AI 深度分析未來 10 天走勢
- 🎨 **視覺化圖表**：生成專業的技術分析圖表（價格、KD、MACD 三合一）
- ⚡ **智慧快取**：12 小時內重複查詢直接使用快取，節省資源
- 🔒 **安全機制**：Webhook 去重、Reply Token 驗證，防止重複觸發
- 🔄 **智能重試**：API 請求失敗自動重試（Exponential Backoff）
- 💬 **美觀介面**：使用 LINE Flex Message 呈現分析結果

## 🏗️ 技術架構

```
LINE User
    ↓ Webhook
Netlify Function (line-webhook.js)
    ↓
├─ Supabase (快取 & 去重)
├─ FinMind API (股價資料)
├─ Chart.js (圖表生成)
├─ DeepSeek AI (走勢預測)
└─ LINE Reply API (回覆訊息)
```

## 📦 技術棧

- **部署平台**：Netlify Serverless Functions
- **資料庫**：Supabase (PostgreSQL + Storage)
- **股價資料**：FinMind API (官方 HTTP 版，無需 token)
- **AI 分析**：DeepSeek API
- **圖表生成**：Chart.js + chartjs-node-canvas
- **訊息平台**：LINE Messaging API (僅使用 replyMessage)

## 🚀 快速開始

### 1. 前置需求

- Node.js 18+
- LINE Developer 帳號
- Supabase 帳號
- DeepSeek API Key
- GitHub 帳號
- Netlify 帳號

### 2. 建立 LINE Bot

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立 Provider 和 Messaging API Channel
3. 取得以下資訊：
   - Channel Secret
   - Channel Access Token
4. 設定 Webhook URL（稍後在 Netlify 部署後取得）

### 3. 建立 Supabase 專案

1. 前往 [Supabase](https://supabase.com/) 建立新專案
2. 在 SQL Editor 執行 `supabase-schema.sql` 建立資料表
3. 在 Storage 建立 bucket：
   - Bucket 名稱：`stock-charts`
   - 設定為 Public
4. 取得以下資訊：
   - Project URL
   - Service Role Key (或 Anon Key)

### 4. 取得 DeepSeek API Key

1. 前往 [DeepSeek](https://platform.deepseek.com/) 註冊
2. 建立 API Key
3. 記下 API Key 和 API URL

### 5. 本地開發

```bash
# 1. Clone 專案
git clone <your-repo-url>
cd Stock-Superman

# 2. 安裝依賴
npm install

# 3. 複製環境變數範本
cp .env.example .env

# 4. 編輯 .env 填入你的設定
# LINE_CHANNEL_SECRET=...
# LINE_CHANNEL_ACCESS_TOKEN=...
# SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
# DEEPSEEK_API_KEY=...

# 5. 啟動本地開發伺服器
npm run dev

# 6. 使用 ngrok 建立公開 URL（用於測試 LINE Webhook）
npx ngrok http 8888
```

### 6. 部署到 Netlify

#### 方法一：透過 GitHub 自動部署（推薦）

1. 將專案推送到 GitHub
2. 登入 [Netlify](https://www.netlify.com/)
3. 點選「Add new site」→「Import an existing project」
4. 選擇你的 GitHub repository
5. 設定環境變數（Settings → Environment variables）：
   ```
   LINE_CHANNEL_SECRET=your_secret
   LINE_CHANNEL_ACCESS_TOKEN=your_token
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_key
   SUPABASE_BUCKET=stock-charts
   DEEPSEEK_API_KEY=your_key
   DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
   NODE_ENV=production
   ```
6. 部署完成後，取得 Function URL：
   ```
   https://your-site.netlify.app/.netlify/functions/line-webhook
   ```

#### 方法二：使用 Netlify CLI

```bash
# 1. 安裝 Netlify CLI
npm install -g netlify-cli

# 2. 登入 Netlify
netlify login

# 3. 初始化專案
netlify init

# 4. 部署
netlify deploy --prod
```

### 7. 設定 LINE Webhook

1. 回到 LINE Developers Console
2. 在你的 Messaging API Channel 設定中：
   - Webhook URL：`https://your-site.netlify.app/.netlify/functions/line-webhook`
   - 啟用「Use webhook」
   - 關閉「Auto-reply messages」
3. 驗證 Webhook（應該會顯示成功）

### 8. 測試

1. 在 LINE 加入你的 Bot 為好友
2. 傳送股票代號，例如：`2330`
3. 等待 10-20 秒（首次查詢需要抓資料和分析）
4. 收到包含圖表和分析的 Flex Message

## 📖 使用說明

### 查詢股票

直接傳送股票代號即可：

```
2330
0050
2454
```

### 快取機制

- 12 小時內重複查詢同一股票，會直接使用快取結果
- 快取包含圖表和 AI 分析，回應速度極快
- 超過 12 小時會重新抓取資料並分析

### 回覆內容

Bot 會回覆包含以下資訊的 Flex Message：

1. **股票基本資訊**：代號、名稱、收盤價、日期
2. **技術指標分析**：
   - KD 指標狀態（金叉/死叉/超買/超賣）
   - MACD 指標狀態（多頭/空頭/動能）
3. **AI 走勢預測**：
   - 未來 10 天上漲/持平/下跌機率
   - 趨勢總結
4. **視覺化圖表**：
   - 收盤價 + MA5/20/60
   - KD 指標
   - MACD 指標

## 🔧 專案結構

```
Stock-Superman/
├── functions/              # Netlify Functions
│   ├── line-webhook.js    # LINE Webhook 主處理器
│   ├── supabase-client.js # Supabase 連線與操作
│   ├── finmind.js         # FinMind API 模組
│   ├── indicators.js      # 技術指標計算
│   ├── generate-chart.js  # 圖表生成
│   └── deepseek.js        # DeepSeek AI 分析
├── supabase-schema.sql    # Supabase 資料表結構
├── package.json           # 專案依賴
├── netlify.toml          # Netlify 設定
├── .env.example          # 環境變數範本
└── README.md             # 說明文件
```

## 🛡️ 安全機制

### 1. Webhook 去重

使用 Supabase `line_events` 表記錄已使用的 `replyToken`，防止：
- Webhook 重複觸發
- Reply Token 重複使用導致錯誤

### 2. Reply Token 單次使用

嚴格遵守 LINE API 規範：
- ✅ 僅使用 `replyMessage`（不使用 `pushMessage`）
- ✅ 每個 Reply Token 只使用一次
- ✅ 完整分析後一次性回覆（不先回「分析中」）

### 3. 錯誤處理

- API 呼叫失敗會回傳友善錯誤訊息
- DeepSeek 分析失敗不影響主流程
- 圖表生成失敗會記錄錯誤並通知使用者

## 📊 資料表結構

### line_events（去重表）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | BIGSERIAL | 主鍵 |
| reply_token | TEXT | LINE Reply Token（唯一） |
| created_at | TIMESTAMP | 建立時間 |

### stock_cache（快取表）

| 欄位 | 類型 | 說明 |
|------|------|------|
| stock_id | TEXT | 股票代號（主鍵） |
| result_json | JSONB | 完整分析結果 |
| image_url | TEXT | 圖表公開 URL |
| image_path | TEXT | 圖表 Storage 路徑 |
| result_summary | TEXT | 分析摘要 |
| updated_at | TIMESTAMP | 最後更新時間 |

## 🎯 效能優化

1. **快取策略**：12 小時內重複查詢直接使用快取
2. **圖表優化**：只顯示最近 60 天資料，避免圖表過於擁擠
3. **並行處理**：同時抓取股價和股票資訊
4. **錯誤容錯**：AI 分析失敗不影響技術指標顯示

## 🐛 常見問題

### Q: 為什麼回覆很慢？

A: 首次查詢需要：
- 抓取 FinMind 資料（3-5 秒）
- 生成圖表（5-8 秒）
- DeepSeek AI 分析（5-10 秒）

總計約 15-25 秒。但 12 小時內重複查詢會使用快取，秒回！

### Q: DeepSeek API 失敗怎麼辦？

A: 系統會自動降級，仍會回覆技術指標和圖表，只是沒有 AI 預測。

### Q: 可以查詢美股嗎？

A: 目前僅支援台股。如需支援美股，需修改 FinMind API 的 dataset 參數。

### Q: 如何清理舊快取？

A: 可以在 Supabase SQL Editor 執行：
```sql
DELETE FROM stock_cache WHERE updated_at < NOW() - INTERVAL '7 days';
```

## 📝 授權

MIT License

## 🙏 致謝

- [FinMind](https://finmindtrade.com/) - 提供免費台股資料 API
- [DeepSeek](https://www.deepseek.com/) - 提供 AI 分析能力
- [LINE](https://developers.line.biz/) - 提供 Messaging API
- [Supabase](https://supabase.com/) - 提供資料庫和儲存服務
- [Netlify](https://www.netlify.com/) - 提供 Serverless 部署平台

## 📧 聯絡

如有問題或建議，歡迎開 Issue 或 Pull Request！

---

**⚠️ 免責聲明**：本系統僅供技術學習和參考，不構成任何投資建議。投資有風險，請謹慎評估。

