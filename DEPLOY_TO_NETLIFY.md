# 🚀 部署到 Netlify 指南

## ✅ GitHub 推送完成

你的程式碼已成功推送到：
**https://github.com/andy0958338099/stock-superman**

---

## 📋 下一步：部署到 Netlify

### 步驟 1：登入 Netlify

前往：https://app.netlify.com/

使用 GitHub 帳號登入（推薦）

### 步驟 2：建立新網站

1. 點擊 **"Add new site"** 或 **"Import from Git"**
2. 選擇 **"Import from Git"**
3. 選擇 **"GitHub"**
4. 如果是第一次，需要授權 Netlify 訪問你的 GitHub

### 步驟 3：選擇 Repository

1. 在列表中找到 **`andy0958338099/stock-superman`**
2. 點擊選擇

### 步驟 4：設定部署選項

Netlify 應該會自動偵測到設定（因為我們有 `netlify.toml`）：

```
Build command: (留空)
Publish directory: public
Functions directory: functions (自動偵測)
```

**直接點擊 "Deploy site"**

### 步驟 5：設定環境變數

部署完成後，前往：

**Site settings** > **Environment variables** > **Add a variable**

新增以下 8 個環境變數：

```bash
LINE_CHANNEL_SECRET=4d52f432dd6158badbdb99aa40050b09

LINE_CHANNEL_ACCESS_TOKEN=dulk7PzNiLj6oR21eUdIaOAbu5oU/Vnij93zx7ATpY57lKhJKSCsn7JeMirH8k/k0UYIpRBjSGGbyPtWP0inUnulMXnrbq1YmLF2MR++6DOY0KKI5DfzpeKK6SYq56X+KGWVyvLNFkyjhAW/rAkNWgdB04t89/1O/w1cDnyilFU=

SUPABASE_URL=https://uxexjrzpsvjclbztesil.supabase.co

SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4ZXhqcnpwc3ZqY2xienRlc2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNDU0NzAsImV4cCI6MjA3ODcyMTQ3MH0.vhB6EYI3Dl_B_W1T25GdvtHpxAMBc9r2D2sEqUMM1sw

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4ZXhqcnpwc3ZqY2xienRlc2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzE0NTQ3MCwiZXhwIjoyMDc4NzIxNDcwfQ.S_08vuSTHeggBz6mtV0-kANmbnwCtqn_Fght3OX0oD0

SUPABASE_BUCKET=stock-charts

DEEPSEEK_API_KEY=sk-At8RrrpHycwsXNHCwnNGm0a20N6HbjWCsWTPCE1rhs1KWZ96

DEEPSEEK_API_URL=https://tbnx.plus7.plus/v1/chat/completions

NODE_ENV=production
```

**重要**：每個變數都要分別新增，不要一次貼上全部！

### 步驟 6：重新部署

設定完環境變數後：

1. 前往 **Deploys** 標籤
2. 點擊 **"Trigger deploy"** > **"Deploy site"**

### 步驟 7：取得 Webhook URL

部署完成後，你會得到一個 URL，例如：
```
https://your-site-name.netlify.app
```

你的 LINE Webhook URL 就是：
```
https://your-site-name.netlify.app/.netlify/functions/line-webhook
```

### 步驟 8：設定 LINE Webhook

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 Channel
3. 前往 **"Messaging API"** 標籤
4. 找到 **"Webhook settings"**
5. 設定 Webhook URL：
   ```
   https://your-site-name.netlify.app/.netlify/functions/line-webhook
   ```
6. 點擊 **"Verify"** 驗證
7. 啟用 **"Use webhook"**

### 步驟 9：測試

1. 在 LINE 中加入你的 Bot 好友
2. 傳送股票代號，例如：`2330`
3. 等待 15-25 秒（首次查詢）
4. 收到完整的技術分析報告！🎉

---

## 🔍 監控與除錯

### Netlify Function Logs

前往 Netlify Dashboard：
- **Functions** 標籤
- 選擇 **line-webhook**
- 查看 **Logs**

### 常見問題

**Q: Webhook 驗證失敗？**
```
檢查 LINE_CHANNEL_SECRET 是否正確
```

**Q: 圖表無法顯示？**
```
檢查 Supabase Storage Bucket 是否為 Public
```

**Q: AI 分析失敗？**
```
檢查 DEEPSEEK_API_URL 是否包含完整路徑
```

**Q: 回覆很慢？**
```
首次查詢需要 15-25 秒是正常的
12 小時內重複查詢會使用快取，只需 1-2 秒
```

---

## 🎉 完成！

恭喜！你的股市大亨 LINE Bot 已經成功部署並運作了！

### 📊 預期效能

- **首次查詢**：15-25 秒
- **快取查詢**：1-2 秒（12 小時內）
- **圖表生成**：5-8 秒
- **AI 分析**：5-10 秒

### 🔄 更新部署

當你修改程式碼後，只需：

```bash
git add .
git commit -m "Update: 你的修改說明"
git push
```

Netlify 會自動重新部署！

---

## 📚 相關文件

- **README.md** - 完整使用說明
- **DEPLOYMENT_CHECKLIST.md** - 部署檢查清單
- **ARCHITECTURE.md** - 系統架構文件
- **PROJECT_SUMMARY.md** - 專案總結
- **QUICK_START.md** - 快速開始指南

---

**祝你使用愉快！📈💰**

