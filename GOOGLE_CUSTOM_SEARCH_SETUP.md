# 🔍 Google Custom Search API 設定指南

本專案使用 **Google Custom Search API** 來抓取台灣財經新聞。

---

## 📋 設定步驟

### 1️⃣ 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 **Custom Search API**：
   - 前往 [API Library](https://console.cloud.google.com/apis/library)
   - 搜索 "Custom Search API"
   - 點擊「啟用」

### 2️⃣ 取得 API Key

1. 前往 [Credentials](https://console.cloud.google.com/apis/credentials)
2. 點擊「建立憑證」→「API 金鑰」
3. 複製 API Key（例如：`AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`）
4. （建議）限制 API Key 只能使用 Custom Search API

### 3️⃣ 建立 Custom Search Engine

1. 前往 [Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/all)
2. 點擊「新增」建立新的搜尋引擎
3. 設定搜尋範圍：
   - **搜尋的網站**：選擇「搜尋整個網路」
   - 或指定台灣財經網站：
     - `*.udn.com/*`（聯合新聞網）
     - `*.chinatimes.com/*`（中時新聞網）
     - `*.ctee.com.tw/*`（工商時報）
     - `*.moneydj.com/*`（MoneyDJ）
     - `*.cnyes.com/*`（鉅亨網）
     - `*.technews.tw/*`（科技新報）
     - `*.wealth.com.tw/*`（財訊）
4. 點擊「建立」
5. 複製 **Search Engine ID**（例如：`a1b2c3d4e5f6g7h8i`）

### 4️⃣ 設定 Netlify 環境變數

1. 前往 Netlify 專案設定
2. 進入 **Site settings** → **Environment variables**
3. 新增以下環境變數：

```
GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GOOGLE_SEARCH_ENGINE_ID=a1b2c3d4e5f6g7h8i
```

4. 儲存並重新部署

---

## 💰 費用說明

### 免費額度
- **每天 100 次查詢**（免費）
- 超過後每 1000 次查詢 **$5 USD**

### 預估使用量
- 每次新聞分析：1 次查詢
- 每天 50 位用戶使用：50 次查詢
- **完全在免費額度內** ✅

---

## 🧪 測試 API

使用以下指令測試 API 是否正常：

```bash
curl "https://www.googleapis.com/customsearch/v1?key=YOUR_API_KEY&cx=YOUR_SEARCH_ENGINE_ID&q=台積電+2330+股票&num=3"
```

預期回應：
```json
{
  "items": [
    {
      "title": "台積電股價...",
      "link": "https://...",
      "snippet": "..."
    }
  ]
}
```

---

## 🔧 程式碼說明

### 使用的 API 參數

```javascript
{
  key: GOOGLE_API_KEY,           // API 金鑰
  cx: GOOGLE_SEARCH_ENGINE_ID,   // 搜尋引擎 ID
  q: '台積電 2330 股票',          // 搜尋關鍵字
  num: 6,                         // 結果數量（1-10）
  dateRestrict: 'm1',             // 限制最近 1 個月
  lr: 'lang_zh-TW',               // 繁體中文
  sort: 'date'                    // 按日期排序
}
```

### Fallback 機制

如果 API Key 未設定或查詢失敗，系統會自動使用**模擬新聞資料**，確保功能正常運作。

---

## 📚 參考資料

- [Custom Search JSON API 文件](https://developers.google.com/custom-search/v1/overview)
- [Programmable Search Engine 說明](https://developers.google.com/custom-search/docs/tutorial/introduction)
- [API 定價](https://developers.google.com/custom-search/v1/overview#pricing)

---

## ✅ 完成檢查清單

- [ ] 建立 Google Cloud 專案
- [ ] 啟用 Custom Search API
- [ ] 取得 API Key
- [ ] 建立 Custom Search Engine
- [ ] 取得 Search Engine ID
- [ ] 在 Netlify 設定環境變數
- [ ] 測試 API 是否正常
- [ ] 重新部署 Netlify

🎉 設定完成後，新聞分析功能就能正常運作了！

