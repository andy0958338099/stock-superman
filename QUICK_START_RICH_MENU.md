# 🚀 Rich Menu 快速開始指南

## 📋 前置準備

確保您已經：
- ✅ 完成 Netlify 部署
- ✅ 設定好 Supabase 資料庫
- ✅ LINE Bot 正常運作

---

## 🎯 3 步驟完成設置

### 步驟 1：執行資料庫遷移（2 分鐘）

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 點擊左側選單的「SQL Editor」
4. 點擊「New query」
5. 複製 `supabase/migrations/create_weekly_survey.sql` 的內容
6. 貼上並點擊「Run」

**驗證**：執行以下 SQL 確認表已創建
```sql
SELECT * FROM survey_weeks;
SELECT * FROM survey_votes;
SELECT * FROM survey_statistics;
```

---

### 步驟 2：生成並上傳 Rich Menu（3 分鐘）

在本地執行：

```bash
# 確保已安裝依賴
npm install

# 生成並上傳 Rich Menu
npm run setup:richmenu
```

**預期輸出**：
```
🎨 開始生成 Rich Menu 圖片...
✅ Rich Menu 圖片已生成：/path/to/public/rich-menu.png
📏 尺寸：2500 x 1686 px
📦 檔案大小：XXX KB

🎨 開始創建 Rich Menu...
✅ Rich Menu 創建成功：richmenu-xxxxxxxxxxxxx

🖼️ 上傳 Rich Menu 圖片：richmenu-xxxxxxxxxxxxx
✅ Rich Menu 圖片上傳成功

🎯 設定預設 Rich Menu：richmenu-xxxxxxxxxxxxx
✅ 預設 Rich Menu 設定成功

🎉 Rich Menu 設置完成！

📊 Rich Menu ID: richmenu-xxxxxxxxxxxxx
```

**重要**：複製輸出的 `Rich Menu ID`（richmenu-xxxxxxxxxxxxx）

---

### 步驟 3：設定環境變數（1 分鐘）

1. 登入 [Netlify Dashboard](https://app.netlify.com/)
2. 選擇您的專案
3. 點擊「Site settings」→「Environment variables」
4. 點擊「Add a variable」
5. 添加以下變數：

```
Key: RICH_MENU_ID
Value: richmenu-xxxxxxxxxxxxx  (步驟 2 複製的 ID)
```

6. 點擊「Save」

---

## ✅ 驗證設置

### 1. 檢查 Rich Menu 是否顯示

1. 在 LINE 中打開您的 Bot
2. 應該會看到底部出現功能選單
3. 選單應該顯示 6 個按鈕：
   - 📊 台股分析
   - 🌎 美股分析
   - ⭐ 本週評分
   - 📰 新聞分析
   - 🏛️ 政治分析
   - 🔧 清除快取

### 2. 測試問卷調查功能

1. 點擊「本週評分」按鈕
2. 應該會看到問卷調查 Flex Message
3. 顯示：
   - 平均分數（初始為 --）
   - 投票人數（初始為 0）
   - 評分按鈕（1-5 星）

### 3. 測試投票功能

1. 點擊任一評分按鈕（例如：⭐⭐⭐⭐⭐ 非常準確 (5分)）
2. 應該會收到確認訊息：「✅ 投票成功！感謝您的反饋」
3. 再次點擊「本週評分」
4. 應該會看到：
   - 平均分數已更新
   - 投票人數已增加
   - 顯示「✅ 您本週已投票」
   - 評分按鈕消失

---

## 🎨 自訂 Rich Menu 圖片（選用）

### 方式 1：修改佔位圖片

編輯 `scripts/generate-rich-menu-image.js`：

```javascript
const MENU_ITEMS = [
  { 
    row: 0, col: 0, 
    icon: '📊',           // 修改圖標
    title: '台股分析',     // 修改標題
    subtitle: '輸入股票代號', // 修改副標題
    color: '#1DB446'      // 修改顏色
  },
  // ... 其他項目
];
```

重新生成圖片：
```bash
npm run generate:richmenu
```

### 方式 2：使用自訂圖片

1. 準備 2500 x 1686 px 的 PNG 圖片
2. 將圖片命名為 `rich-menu.png`
3. 放在 `public/` 目錄
4. 執行 `npm run setup:richmenu`

---

## 🔄 設定每週自動更新（選用）

### 方式 1：Netlify Scheduled Functions

在 `netlify.toml` 中添加：

```toml
[functions."weekly-survey-update"]
  schedule = "0 0 * * 1"  # 每週一 00:00 (UTC) 執行
```

### 方式 2：手動觸發

訪問以下 URL：
```
https://your-site.netlify.app/.netlify/functions/weekly-survey-update
```

---

## 🐛 常見問題

### Q1: Rich Menu 沒有顯示？

**解決方案**：
1. 確認 LINE Channel Access Token 是否正確
2. 在 LINE Developers Console 檢查 Rich Menu 狀態
3. 嘗試重新加入 Bot（封鎖後再解除封鎖）

### Q2: 問卷調查顯示「無法取得問卷資訊」？

**解決方案**：
1. 確認資料庫遷移是否成功執行
2. 在 Supabase SQL Editor 執行：
   ```sql
   SELECT initialize_current_week();
   ```
3. 確認 `survey_weeks` 表中有當前週的記錄

### Q3: 投票後顯示「您本週已投票過了」？

**說明**：這是正常行為，每個用戶每週只能投票一次。

**如需重置**（僅供測試）：
```sql
DELETE FROM survey_votes WHERE user_id = 'YOUR_LINE_USER_ID';
```

### Q4: Rich Menu 圖片無法上傳？

**解決方案**：
1. 確認圖片尺寸為 2500 x 1686 px
2. 確認圖片格式為 PNG
3. 確認圖片大小不超過 1 MB
4. 檢查 LINE Channel Access Token 權限

---

## 📊 查看統計數據

在 Supabase SQL Editor 中執行：

```sql
-- 查看當前週的統計
SELECT 
  w.week_number,
  w.start_date,
  w.end_date,
  s.total_votes,
  s.average_score,
  s.score_5_count,
  s.score_4_count,
  s.score_3_count,
  s.score_2_count,
  s.score_1_count
FROM survey_weeks w
LEFT JOIN survey_statistics s ON w.id = s.week_id
WHERE w.is_active = true;

-- 查看所有週的統計（趨勢分析）
SELECT 
  w.week_number,
  w.start_date,
  s.total_votes,
  s.average_score
FROM survey_weeks w
LEFT JOIN survey_statistics s ON w.id = s.week_id
ORDER BY w.start_date DESC
LIMIT 10;
```

---

## 🎉 完成！

現在您的 LINE Bot 已經擁有：

✅ **Rich Menu**：用戶可以快速訪問所有功能
✅ **每週問卷**：收集用戶對分析準確度的反饋
✅ **評分統計**：展示 APP 的可信度
✅ **自動更新**：每週自動初始化新的投票週期

這將大幅提升：
- 📈 用戶體驗
- 💪 用戶黏著度
- 🌟 APP 可信度
- 📣 分享率和口碑

---

## 📚 相關文檔

- [RICH_MENU_SETUP.md](./RICH_MENU_SETUP.md)：完整設置指南
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)：專案結構說明
- [README.md](./README.md)：專案主要文檔

---

**需要幫助？** 請查看 [RICH_MENU_SETUP.md](./RICH_MENU_SETUP.md) 獲取更詳細的說明。

