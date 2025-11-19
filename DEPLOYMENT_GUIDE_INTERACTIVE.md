# 🚀 互動式股票分析系統 - 部署指南

## 📅 更新時間：2025-11-19

---

## ✅ 開發完成度：95%

### 已完成的功能：
- ✅ 系統架構設計
- ✅ Supabase 資料表設計
- ✅ Google Search API 整合
- ✅ 對話狀態管理
- ✅ DeepSeek 分析功能擴展（5 種角色）
- ✅ Quick Reply 按鈕生成器
- ✅ 5 個互動功能處理器
- ✅ LINE Webhook 整合
- ✅ 總評資料庫操作
- ✅ 用戶評價系統

---

## 🔧 部署前準備

### 1. 設定 Supabase 資料表

#### 步驟：
1. 登入 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇您的專案
3. 點擊左側選單的「SQL Editor」
4. 點擊「New query」
5. 複製 `supabase_tables.sql` 的內容
6. 貼上並執行

#### 驗證：
```sql
-- 檢查資料表是否建立成功
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_conversation_state', 'stock_final_reviews', 'user_review_votes');
```

應該看到 3 個資料表。

---

### 2. 設定 Google Search API

#### 取得 API Key：
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用「Custom Search API」
   - 在搜尋框輸入「Custom Search API」
   - 點擊「啟用」
4. 建立憑證
   - 點擊「建立憑證」→「API 金鑰」
   - 複製 API Key

#### 取得 Search Engine ID：
1. 前往 [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. 點擊「Add」建立新的搜尋引擎
3. 設定：
   - **搜尋範圍**：搜尋整個網路
   - **語言**：繁體中文
   - **名稱**：Stock Superman News Search
4. 建立後，複製「Search engine ID」

#### 設定 Netlify 環境變數：
1. 前往 [Netlify Dashboard](https://app.netlify.com/)
2. 選擇 Stock-Superman 專案
3. 點擊「Site settings」→「Environment variables」
4. 新增以下變數：

```
GOOGLE_SEARCH_API_KEY=<您的 Google Search API Key>
GOOGLE_SEARCH_ENGINE_ID=<您的 Search Engine ID>
```

---

### 3. 驗證現有環境變數

確認以下環境變數已設定：

```
✅ LINE_CHANNEL_ACCESS_TOKEN
✅ LINE_CHANNEL_SECRET
✅ SUPABASE_URL
✅ SUPABASE_KEY
✅ FINMIND_API_TOKEN
✅ DEEPSEEK_API_KEY
✅ DEEPSEEK_API_URL
🆕 GOOGLE_SEARCH_API_KEY
🆕 GOOGLE_SEARCH_ENGINE_ID
```

---

## 📦 部署步驟

### 1. 提交代碼

```bash
# 查看修改的文件
git status

# 添加所有文件
git add .

# 提交
git commit -m "feat: 實作互動式股票分析系統

- 新增 5 個 Quick Reply 功能（新聞/政治/美股/討論/總評）
- 整合 Google Search API 搜尋財經和政治新聞
- 實作對話狀態管理和討論功能（最多 5 次）
- 實作綜合總評和用戶評價系統
- 擴展 DeepSeek 分析功能（5 種角色）
- 建立 Supabase 資料表結構

新增文件：
- functions/google-search.js
- functions/conversation-state.js
- functions/quick-reply-builder.js
- functions/final-review-db.js
- functions/handlers/*.js (5 個處理器)
- supabase_tables.sql
- INTERACTIVE_ANALYSIS_DESIGN.md
- INTERACTIVE_ANALYSIS_PROGRESS.md

修改文件：
- functions/line-webhook.js (整合互動功能)
- functions/deepseek.js (新增 5 個分析函數)"

# 推送到 GitHub
git push origin main
```

### 2. 等待 Netlify 自動部署

- 預計時間：2-3 分鐘
- 前往 Netlify Dashboard 查看部署狀態
- 確認狀態顯示「Published」

---

## 🧪 測試清單

### 測試 1：基本股票查詢 + Quick Reply
```
在 LINE 輸入：2330
```
**預期結果**：
- ✅ 收到技術分析 Flex Message
- ✅ 收到提示訊息「想深入了解？點擊下方按鈕探索更多分析」
- ✅ 看到 5 個 Quick Reply 按鈕：
  - 📰 新聞
  - 🌍 政治
  - 🇺🇸 美股
  - 💬 討論 (0/5)
  - 📊 總評

### 測試 2：新聞分析
```
點擊：📰 新聞
```
**預期結果**：
- ✅ 搜尋 6 則財經新聞
- ✅ DeepSeek 財經專家分析
- ✅ 「新聞」按鈕消失（限用 1 次）
- ✅ 其他按鈕仍然顯示

### 測試 3：政治分析
```
點擊：🌍 政治
```
**預期結果**：
- ✅ 搜尋 6 則國際情勢新聞
- ✅ DeepSeek 政治評論員分析
- ✅ 「政治」按鈕消失（限用 1 次）

### 測試 4：美股關聯分析
```
點擊：🇺🇸 美股
```
**預期結果**：
- ✅ 取得美股市場數據
- ✅ DeepSeek 美股狂熱評論員分析
- ✅ 「美股」按鈕仍然顯示（無限制）

### 測試 5：討論功能（最多 5 次）
```
點擊：💬 討論 (0/5)
輸入：我認為這支股票會漲，因為技術面轉強
```
**預期結果**：
- ✅ 收到討論提示
- ✅ DeepSeek 分析師回應
- ✅ 按鈕顯示「💬 討論 (1/5)」
- ✅ 可以繼續討論最多 5 次
- ✅ 達到 5 次後按鈕消失

### 測試 6：綜合總評
```
點擊：📊 總評
```
**預期結果**：
- ✅ 綜合所有分析（技術/新聞/政治/美股/討論）
- ✅ 維基百科式結構化內容
- ✅ 明確的投資建議
- ✅ 評價按鈕：👍 好，肯定 / 👎 不好，我不相信

### 測試 7：用戶評價
```
點擊：👍 好，肯定
```
**預期結果**：
- ✅ 感謝訊息
- ✅ 評價記錄到資料庫
- ✅ 統計自動更新

---

## 📊 功能限制驗證

| 功能 | 限制 | 驗證方法 |
|------|------|----------|
| 新聞分析 | 1 次 | 點擊後按鈕消失 |
| 政治分析 | 1 次 | 點擊後按鈕消失 |
| 美股分析 | 無限制 | 按鈕永遠顯示 |
| 討論 | 5 次 | 按鈕顯示次數，達到 5 次後消失 |
| 總評 | 無限制 | 按鈕永遠顯示 |

---

## 🐛 常見問題排查

### 問題 1：Quick Reply 按鈕沒有顯示
**可能原因**：
- 對話狀態未初始化
- Supabase 連線失敗

**解決方法**：
```bash
# 檢查 Netlify Function Logs
# 查看是否有 Supabase 錯誤
```

### 問題 2：新聞搜尋失敗
**可能原因**：
- Google Search API Key 未設定
- API 配額用完

**解決方法**：
1. 檢查 Netlify 環境變數
2. 檢查 Google Cloud Console 配額

### 問題 3：討論功能無法連續對話
**可能原因**：
- 對話狀態未正確儲存
- ReplyToken 重複使用

**解決方法**：
- 檢查 Supabase 資料表
- 查看 Function Logs

---

## 📝 部署檢查清單

- [ ] Supabase 資料表已建立
- [ ] Google Search API 已設定
- [ ] 環境變數已設定
- [ ] 代碼已推送到 GitHub
- [ ] Netlify 部署成功
- [ ] 基本股票查詢測試通過
- [ ] Quick Reply 按鈕顯示正常
- [ ] 新聞分析測試通過
- [ ] 政治分析測試通過
- [ ] 美股分析測試通過
- [ ] 討論功能測試通過
- [ ] 總評功能測試通過
- [ ] 評價系統測試通過

---

**🎉 準備好部署了嗎？開始吧！**

