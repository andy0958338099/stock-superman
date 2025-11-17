# 🚀 快速開始指南

## ✅ 本地測試已完成

所有模組測試通過：
- ✅ FinMind API：成功抓取台積電（2330）資料
- ✅ 技術指標計算：KD、MACD、MA 計算正確
- ✅ 圖表生成：成功生成並上傳至 Supabase Storage
- ✅ DeepSeek AI：成功分析並預測走勢
- ✅ Supabase：資料庫和 Storage 連線正常

## 📋 下一步：部署到 Netlify

### 1. 初始化 Git Repository（如果還沒有）

```bash
git init
git add .
git commit -m "Initial commit: Stock Superman LINE Bot"
```

### 2. 推送到 GitHub

```bash
# 建立 GitHub Repository（在 GitHub 網站上建立）
# 然後執行：
git remote add origin https://github.com/你的帳號/Stock-Superman.git
git branch -M main
git push -u origin main
```

### 3. 連接 Netlify

1. 前往 [Netlify](https://app.netlify.com/)
2. 點擊 "Add new site" > "Import an existing project"
3. 選擇 "GitHub"
4. 選擇你的 `Stock-Superman` repository
5. 設定：
   - **Build command**: 留空
   - **Publish directory**: `public`
   - **Functions directory**: `functions`（應該自動偵測）

### 4. 設定環境變數

在 Netlify Dashboard > Site settings > Environment variables，新增以下變數：

```
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

### 5. 部署

Netlify 會自動部署。等待部署完成後，你會得到一個 URL，例如：
```
https://your-site-name.netlify.app
```

### 6. 設定 LINE Webhook

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 Channel
3. 前往 "Messaging API" 標籤
4. 設定 Webhook URL：
   ```
   https://your-site-name.netlify.app/.netlify/functions/line-webhook
   ```
5. 點擊 "Verify" 驗證
6. 啟用 "Use webhook"

### 7. 測試

1. 在 LINE 中加入你的 Bot 好友
2. 傳送股票代號，例如：`2330`
3. 等待 15-25 秒（首次查詢）
4. 收到完整的技術分析報告！

## 🎯 測試結果範例

根據剛才的測試，系統會回覆：

```
📊 2330 台積電
收盤價：1445 | 2025-11-17

📈 技術指標
KD：空頭 (K=19.59, D=23.23)
K 線在 D 線下方

MACD：空頭
MACD 在 Signal 下方，動能減弱

📊 AI 預測（10日）
↗️ 上漲 25% | ➡️ 持平 30% | ↘️ 下跌 45%
💡 建議：觀望（avoid）
技術指標全面偏空，KD與MACD均顯示下跌動能，建議觀望等待止跌訊號
```

## 📊 效能表現

- **首次查詢**：15-25 秒（完整分析）
- **快取查詢**：1-2 秒（12 小時內）
- **圖表生成**：5-8 秒
- **AI 分析**：5-10 秒

## 🔍 監控與除錯

### Netlify Function Logs

前往 Netlify Dashboard > Functions > line-webhook > Logs

查看每次請求的詳細日誌。

### Supabase Logs

前往 Supabase Dashboard > Logs

查看資料庫操作記錄。

### 常見問題

**Q: LINE Webhook 驗證失敗？**
A: 檢查環境變數 `LINE_CHANNEL_SECRET` 是否正確設定

**Q: 圖表無法顯示？**
A: 檢查 Supabase Storage Bucket 是否為 Public

**Q: AI 分析失敗？**
A: 檢查 `DEEPSEEK_API_URL` 是否正確（需包含完整路徑）

**Q: 回覆很慢？**
A: 首次查詢需要 15-25 秒，這是正常的。12 小時內重複查詢會使用快取，只需 1-2 秒。

## 🎉 完成！

恭喜！你的股市大亨 LINE Bot 已經成功部署並運作了！

## 📚 更多資訊

- 完整文件：`README.md`
- 部署檢查清單：`DEPLOYMENT_CHECKLIST.md`
- 系統架構：`ARCHITECTURE.md`
- 專案總結：`PROJECT_SUMMARY.md`

## 🔄 更新部署

當你修改程式碼後，只需：

```bash
git add .
git commit -m "Update: 你的修改說明"
git push
```

Netlify 會自動重新部署！

---

**祝你使用愉快！📈💰**

