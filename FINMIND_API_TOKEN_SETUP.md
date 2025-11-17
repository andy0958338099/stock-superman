# FinMind API Token 設定說明

## 📋 為什麼需要 API Token？

### 免費版限制
- **每分鐘**：60 次請求
- **每日**：有限制（具體數量未公開）

### 使用 API Token 的好處
- ✅ **更高的請求限制**
- ✅ **更穩定的服務**
- ✅ **避免頻率限制錯誤**
- ✅ **支援更多資料集**

---

## 🔑 如何取得 API Token

### 步驟 1：註冊 FinMind 帳號
1. 前往 [FinMind 官網](https://finmindtrade.com/)
2. 點擊右上角「註冊」
3. 填寫資料並完成註冊

### 步驟 2：登入並取得 Token
1. 登入 FinMind 帳號
2. 前往 [API Token 頁面](https://finmindtrade.com/analysis/#/Account/Token)
3. 複製你的 API Token

**你的 Token**：
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNS0xMS0xNiAyMjoxMDo0MyIsInVzZXJfaWQiOiJqb2hueWFyY2hlcjIxMDAiLCJpcCI6IjEwNi4xMDcuMTgwLjIyNCJ9.H-xeRJg3f9h8TjTm63FwUQ7aOoPLI7MoiNCjjFMn16c
```

---

## ⚙️ 在 Netlify 設定 API Token

### 步驟 1：前往 Netlify Dashboard
1. 登入 [Netlify](https://app.netlify.com/)
2. 選擇你的專案（Stock-Superman）

### 步驟 2：設定環境變數
1. 點擊 **Site configuration**
2. 點擊左側選單的 **Environment variables**
3. 點擊 **Add a variable** → **Add a single variable**

### 步驟 3：新增 FINMIND_API_TOKEN
- **Key**：`FINMIND_API_TOKEN`
- **Value**：貼上你的 API Token
  ```
  eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNS0xMS0xNiAyMjoxMDo0MyIsInVzZXJfaWQiOiJqb2hueWFyY2hlcjIxMDAiLCJpcCI6IjEwNi4xMDcuMTgwLjIyNCJ9.H-xeRJg3f9h8TjTm63FwUQ7aOoPLI7MoiNCjjFMn16c
  ```
- **Scopes**：選擇 **All scopes**（或至少包含 Functions）

### 步驟 4：儲存並重新部署
1. 點擊 **Save**
2. 前往 **Deploys** 頁面
3. 點擊 **Trigger deploy** → **Deploy site**

---

## 🧪 驗證設定

### 方法 1：查看 Netlify 日誌
1. 前往 **Functions** → **line-webhook**
2. 查看最新日誌
3. 應該會看到：
   ```
   📊 抓取 FinMind 資料：2330 (2024-11-17 ~ 2025-11-17) [使用 API Token]
   ```

### 方法 2：在 LINE 中測試
1. 輸入任何股票代號（例如：`2330`）
2. 應該會正常回覆分析結果
3. 不會出現「API 配額用完」錯誤

### 方法 3：測試美股分析
1. 輸入 `美股`
2. 應該會成功抓取所有資料
3. 回覆完整的美股分析報告

---

## 📊 API Token 使用情況

### 程式碼自動判斷
```javascript
// 如果有設定 FINMIND_API_TOKEN，會自動加入請求參數
if (FINMIND_API_TOKEN) {
  params.token = FINMIND_API_TOKEN;
}
```

### 使用 Token 的 API 請求
- ✅ 台股股價查詢（`fetchStockPrice`）
- ✅ 美股指數查詢（`fetchUSStockPrice`）
- ✅ 匯率查詢（`fetchExchangeRate`）
- ✅ VIX 指數查詢（`fetchVIX`）

---

## 🎯 效能提升

### 設定前（無 Token）
- ⚠️ 每分鐘 60 次請求限制
- ⚠️ 容易觸發頻率限制
- ⚠️ 美股分析可能失敗（7 個並行請求）

### 設定後（有 Token）
- ✅ 更高的請求限制
- ✅ 更穩定的服務
- ✅ 美股分析成功率大幅提升
- ✅ 支援更多用戶同時使用

---

## 🔒 安全性

### Token 保護
- ✅ Token 儲存在 Netlify 環境變數中
- ✅ 不會出現在程式碼中
- ✅ 不會暴露給用戶
- ✅ 只有 Netlify Functions 可以存取

### 注意事項
- ⚠️ 不要將 Token 提交到 Git
- ⚠️ 不要在公開場合分享 Token
- ⚠️ 如果 Token 洩漏，請立即重新生成

---

## 📝 相關檔案

### 已修改的檔案
- `functions/finmind.js` - 加入 API Token 支援
- `.env.example` - 加入 `FINMIND_API_TOKEN` 說明

### 修改內容
```javascript
// 讀取環境變數
const FINMIND_API_TOKEN = process.env.FINMIND_API_TOKEN || '';

// 在每個 API 請求中加入 Token
if (FINMIND_API_TOKEN) {
  params.token = FINMIND_API_TOKEN;
}
```

---

## 🚀 完成！

設定完成後，你的 LINE Bot 將會：
- ✅ 使用 FinMind API Token
- ✅ 享有更高的請求限制
- ✅ 更穩定的服務品質
- ✅ 支援更多用戶同時使用

**現在去 Netlify 設定你的 API Token 吧！** 🎉

---

## 💡 常見問題

### Q1：設定後還是出現錯誤？
**A**：檢查以下項目：
1. Token 是否正確複製（沒有多餘空格）
2. 環境變數名稱是否正確（`FINMIND_API_TOKEN`）
3. 是否已重新部署
4. 查看 Netlify 日誌確認是否使用 Token

### Q2：如何確認 Token 是否有效？
**A**：查看 Netlify Functions 日誌，應該會看到：
```
📊 抓取 FinMind 資料：2330 [使用 API Token]
```

### Q3：Token 會過期嗎？
**A**：FinMind Token 通常不會過期，但如果帳號被停用或重新生成 Token，舊的 Token 會失效。

### Q4：沒有 Token 可以使用嗎？
**A**：可以！程式會自動判斷，沒有 Token 時使用免費版 API，但會有較嚴格的請求限制。

