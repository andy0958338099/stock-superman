# 📋 部署檢查清單

完整的部署步驟檢查清單，確保所有設定都正確無誤。

## ✅ 階段一：準備工作

### 1. LINE Bot 設定

- [ ] 已在 [LINE Developers Console](https://developers.line.biz/) 建立 Provider
- [ ] 已建立 Messaging API Channel
- [ ] 已取得 **Channel Secret**
- [ ] 已取得 **Channel Access Token**
- [ ] 已關閉「Auto-reply messages」
- [ ] 已關閉「Greeting messages」

### 2. Supabase 設定

- [ ] 已建立 Supabase 專案
- [ ] 已執行 `supabase-schema.sql` 建立資料表
  - [ ] `line_events` 表已建立
  - [ ] `stock_cache` 表已建立
- [ ] 已建立 Storage Bucket：`stock-charts`
- [ ] Bucket 已設定為 **Public**
- [ ] 已取得 **Project URL**
- [ ] 已取得 **Service Role Key**

### 3. DeepSeek API 設定

- [ ] 已在 [DeepSeek Platform](https://platform.deepseek.com/) 註冊
- [ ] 已建立 API Key
- [ ] 已確認 API URL：`https://api.deepseek.com/v1/chat/completions`
- [ ] 已測試 API Key 可用

### 4. GitHub 設定

- [ ] 已建立 GitHub Repository
- [ ] 已將專案推送到 GitHub
- [ ] Repository 設定為 Public 或 Private（Netlify 都支援）

---

## ✅ 階段二：Netlify 部署

### 1. 連接 GitHub

- [ ] 已登入 [Netlify](https://www.netlify.com/)
- [ ] 已點選「Add new site」→「Import an existing project」
- [ ] 已選擇 GitHub 並授權
- [ ] 已選擇正確的 Repository

### 2. 設定建置選項

- [ ] Build command：`npm run build`（或留空）
- [ ] Publish directory：`public`（或留空）
- [ ] Functions directory：`functions`（應自動偵測）

### 3. 設定環境變數

前往 **Site settings** → **Environment variables**，新增以下變數：

- [ ] `LINE_CHANNEL_SECRET` = `你的 LINE Channel Secret`
- [ ] `LINE_CHANNEL_ACCESS_TOKEN` = `你的 LINE Channel Access Token`
- [ ] `SUPABASE_URL` = `https://xxx.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = `你的 Supabase Service Role Key`
- [ ] `SUPABASE_BUCKET` = `stock-charts`
- [ ] `DEEPSEEK_API_KEY` = `你的 DeepSeek API Key`
- [ ] `DEEPSEEK_API_URL` = `https://api.deepseek.com/v1/chat/completions`
- [ ] `NODE_ENV` = `production`

### 4. 部署

- [ ] 已點選「Deploy site」
- [ ] 部署成功（綠色勾勾）
- [ ] 已取得 Site URL：`https://your-site.netlify.app`
- [ ] 已確認 Function URL：`https://your-site.netlify.app/.netlify/functions/line-webhook`

---

## ✅ 階段三：LINE Webhook 設定

### 1. 設定 Webhook URL

- [ ] 回到 LINE Developers Console
- [ ] 進入你的 Messaging API Channel
- [ ] 在「Messaging API」頁籤找到「Webhook settings」
- [ ] 設定 Webhook URL：`https://your-site.netlify.app/.netlify/functions/line-webhook`
- [ ] 啟用「Use webhook」
- [ ] 點選「Verify」驗證 Webhook（應顯示 Success）

### 2. 關閉自動回覆

- [ ] 在「Messaging API」頁籤找到「LINE Official Account features」
- [ ] 點選「Edit」進入 LINE Official Account Manager
- [ ] 關閉「Auto-reply messages」
- [ ] 關閉「Greeting messages」

### 3. 取得 QR Code

- [ ] 在「Messaging API」頁籤找到「Bot basic ID」
- [ ] 點選「QR code」取得加入好友的 QR Code
- [ ] 或直接搜尋 Bot ID 加入好友

---

## ✅ 階段四：測試

### 1. 基本測試

- [ ] 已用 LINE 掃描 QR Code 加入 Bot 好友
- [ ] 傳送任意文字，收到歡迎訊息
- [ ] 傳送 `2330`，等待 15-25 秒
- [ ] 收到包含圖表的 Flex Message
- [ ] 圖表正常顯示（價格、KD、MACD）
- [ ] 技術指標分析正確顯示
- [ ] AI 預測結果正確顯示

### 2. 快取測試

- [ ] 再次傳送 `2330`
- [ ] 應在 1-2 秒內收到回覆（使用快取）
- [ ] 訊息標註「快取」字樣
- [ ] 快取時間正確顯示

### 3. 錯誤處理測試

- [ ] 傳送不存在的股票代號（例如 `9999`）
- [ ] 收到友善的錯誤訊息
- [ ] 傳送非數字文字（例如 `hello`）
- [ ] 收到使用說明

### 4. 多股票測試

- [ ] 測試不同股票代號：`0050`、`2454`、`2317`
- [ ] 每個都能正常回覆
- [ ] 快取機制正常運作

---

## ✅ 階段五：監控與維護

### 1. Netlify 監控

- [ ] 在 Netlify Dashboard 查看 Functions 執行狀況
- [ ] 檢查是否有錯誤 log
- [ ] 確認執行時間在合理範圍（< 10 秒）

### 2. Supabase 監控

- [ ] 在 Supabase Dashboard 查看資料表
- [ ] 確認 `line_events` 有新記錄
- [ ] 確認 `stock_cache` 有快取資料
- [ ] 檢查 Storage 中的圖表檔案

### 3. LINE 監控

- [ ] 在 LINE Developers Console 查看 Webhook 統計
- [ ] 確認成功率 > 95%
- [ ] 檢查是否有錯誤訊息

---

## 🐛 常見問題排查

### 問題：Webhook 驗證失敗

**可能原因：**
- Netlify Function 尚未部署完成
- 環境變數設定錯誤
- Function URL 錯誤

**解決方法：**
1. 確認 Netlify 部署成功
2. 檢查 Function Logs
3. 確認 URL 正確：`/.netlify/functions/line-webhook`

### 問題：Bot 沒有回應

**可能原因：**
- Webhook 未啟用
- 自動回覆未關閉
- Reply Token 重複使用

**解決方法：**
1. 確認 Webhook 已啟用
2. 關閉所有自動回覆功能
3. 檢查 Netlify Function Logs

### 問題：圖表無法顯示

**可能原因：**
- Supabase Storage Bucket 未設定為 Public
- 圖表上傳失敗
- URL 錯誤

**解決方法：**
1. 確認 Bucket 為 Public
2. 檢查 Supabase Storage 中是否有檔案
3. 測試圖表 URL 是否可直接存取

### 問題：AI 分析失敗

**可能原因：**
- DeepSeek API Key 錯誤
- API 配額用完
- 網路問題

**解決方法：**
1. 確認 API Key 正確
2. 檢查 DeepSeek 帳戶餘額
3. 查看 Function Logs 錯誤訊息
4. 注意：AI 失敗不影響技術指標顯示

---

## 📊 效能基準

正常情況下的效能指標：

- **首次查詢**：15-25 秒
  - FinMind API：3-5 秒
  - 圖表生成：5-8 秒
  - DeepSeek AI：5-10 秒
  - 其他處理：2-3 秒

- **快取查詢**：1-2 秒
  - 資料庫查詢：< 0.5 秒
  - Flex Message 組裝：< 0.5 秒
  - LINE API 回覆：< 1 秒

- **Netlify Function**：
  - 冷啟動：2-3 秒
  - 熱啟動：< 1 秒
  - Timeout：10 秒（預設）

---

## ✅ 完成！

恭喜！如果所有項目都打勾了，你的股市大亨 LINE Bot 已經成功部署並運作中！

🎉 現在可以開始使用了！

---

## 📝 後續優化建議

- [ ] 設定 Netlify 自訂網域
- [ ] 啟用 HTTPS（Netlify 預設已啟用）
- [ ] 設定 Supabase 定期清理舊資料
- [ ] 新增更多技術指標（RSI、布林通道等）
- [ ] 支援多日期區間查詢
- [ ] 新增使用者偏好設定
- [ ] 建立管理後台
- [ ] 新增使用統計分析

