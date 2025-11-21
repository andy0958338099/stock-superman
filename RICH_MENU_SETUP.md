# Rich Menu 設置指南

## 📋 功能概述

本專案已整合 LINE Rich Menu（持久性選單）功能，包含：

### 🎯 Rich Menu 布局（3x2 網格）

| 台股分析 📊 | 美股分析 🌎 | 本週評分 ⭐ |
|------------|------------|------------|
| 新聞分析 📰 | 政治分析 🏛️ | 清除快取 🔧 |

### ✨ 特色功能

1. **台股分析**：輸入股票代號進行分析
2. **美股分析**：查看 S&P500、NASDAQ 等指數
3. **本週評分**：每週問卷調查，顯示用戶評分統計
4. **新聞分析**：最新市場動態分析
5. **政治分析**：政策影響評估
6. **清除快取**：重新分析股票

---

## 🚀 設置步驟

### 步驟 1：執行資料庫遷移

在 Supabase SQL Editor 中執行以下 SQL 腳本：

```bash
# 在 Supabase SQL Editor 中執行
supabase/migrations/create_weekly_survey.sql
```

這會創建以下表：
- `survey_weeks`：週別定義表
- `survey_votes`：用戶投票記錄表
- `survey_statistics`：週別統計表

### 步驟 2：生成並上傳 Rich Menu

```bash
# 安裝依賴（如果還沒安裝）
npm install

# 生成 Rich Menu 圖片並上傳到 LINE
node scripts/setup-rich-menu.js
```

執行成功後，您會看到：
```
✅ Rich Menu 創建完成：richmenu-xxxxxxxxxxxxx
✅ 圖片上傳完成
✅ 預設 Rich Menu 設定完成
```

### 步驟 3：保存 Rich Menu ID

將輸出的 Rich Menu ID 添加到 Netlify 環境變數：

```
RICH_MENU_ID=richmenu-xxxxxxxxxxxxx
```

### 步驟 4：部署到 Netlify

```bash
git add .
git commit -m "feat: 新增 Rich Menu 和每週問卷調查功能"
git push origin main
```

---

## 📊 每週問卷調查功能

### 功能說明

- **問題**：「上週的分析是否準確？」
- **評分**：1-5 星（1 星 = 不準確，5 星 = 非常準確）
- **限制**：每個用戶每週只能投票一次
- **統計**：自動計算平均分數、投票數、分數分布
- **顯示**：Rich Menu 右上角顯示「本週評分：X.X/5 (Y票)」

### 使用方式

1. **查看評分**：點擊 Rich Menu 的「本週評分」按鈕
2. **投票**：點擊評分按鈕（1-5 星）
3. **查看統計**：投票後自動顯示詳細統計

### 評分等級

| 平均分數 | 信心指數 | 顏色 |
|---------|---------|------|
| 4.0-5.0 | 高度可信 | 🟢 綠色 |
| 3.0-3.9 | 中等可信 | 🟡 黃色 |
| 1.0-2.9 | 需要改進 | 🔴 紅色 |

---

## 🔄 每週自動更新

### 方式 1：Netlify Scheduled Functions（推薦）

在 `netlify.toml` 中添加：

```toml
[functions."weekly-survey-update"]
  schedule = "0 0 * * 1"  # 每週一 00:00 執行
```

### 方式 2：手動觸發

訪問以下 URL 手動觸發更新：

```
https://your-site.netlify.app/.netlify/functions/weekly-survey-update
```

### 更新內容

1. 將上週設為非活動狀態
2. 創建新的一週記錄
3. 更新 Rich Menu 圖片（顯示上週評分）
4. 用戶可以開始新一週的投票

---

## 🎨 自訂 Rich Menu 圖片

### 修改佔位圖片

編輯 `scripts/generate-rich-menu-image.js`：

```javascript
const MENU_ITEMS = [
  { row: 0, col: 0, icon: '📊', title: '台股分析', subtitle: '輸入股票代號', color: '#1DB446' },
  // ... 修改圖標、標題、顏色等
];
```

### 使用自訂圖片

1. 準備 2500 x 1686 px 的 PNG 圖片
2. 將圖片放在 `public/rich-menu.png`
3. 執行 `node scripts/setup-rich-menu.js`

---

## 📈 未來增強功能

### 折線圖顯示（當評分數據足夠時）

當累積 10 週以上的評分數據後，可以：

1. 生成評分趨勢折線圖
2. 替換 Rich Menu 右上角的靜態評分顯示
3. 讓用戶直觀看到 APP 可信度的變化趨勢

實作方式：
- 使用 Chart.js 生成折線圖
- 將圖表嵌入 Rich Menu 圖片
- 每週自動更新

---

## 🔧 故障排除

### Rich Menu 沒有顯示

1. 檢查 LINE Channel Access Token 是否正確
2. 確認 Rich Menu 已設定為預設選單
3. 在 LINE Developers Console 檢查 Rich Menu 狀態

### 問卷調查無法投票

1. 檢查 Supabase 資料庫是否正確創建表
2. 確認 `survey_weeks` 表中有當前週的記錄
3. 執行 `SELECT initialize_current_week();` 初始化當前週

### Rich Menu 圖片無法上傳

1. 確認圖片尺寸為 2500 x 1686 px
2. 確認圖片格式為 PNG
3. 確認圖片大小不超過 1 MB

---

## 📝 相關文件

- `functions/rich-menu-manager.js`：Rich Menu 管理器
- `functions/survey-handler.js`：問卷調查處理器
- `functions/survey-flex-message.js`：問卷 Flex Message 生成器
- `scripts/generate-rich-menu-image.js`：Rich Menu 圖片生成器
- `scripts/setup-rich-menu.js`：Rich Menu 設置腳本
- `supabase/migrations/create_weekly_survey.sql`：資料庫遷移腳本

---

## 🎉 完成！

現在您的 LINE Bot 已經擁有完整的 Rich Menu 和每週問卷調查功能！

用戶可以：
- ✅ 透過 Rich Menu 快速訪問所有功能
- ✅ 每週為分析準確度評分
- ✅ 查看其他用戶的評分統計
- ✅ 透過評分了解 APP 的可信度

這將大幅提升用戶體驗和 APP 的黏著度！🚀

