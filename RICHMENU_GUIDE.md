# Rich Menu 設置指南

## 🎯 兩種 Rich Menu 方案

### 方案 A：固定 Rich Menu（推薦給生產環境）

**特點**：
- ✅ Rich Menu ID 永遠不變
- ✅ 不需要更新 Netlify 環境變數
- ✅ 設置一次就完成
- ❌ Rich Menu 上不顯示即時評分
- ✅ 用戶點擊「本週評分」按鈕會看到即時評分

**使用方式**：

```bash
# 創建固定 Rich Menu
npm run setup:richmenu:static
```

**設置步驟**：
1. 執行 `npm run setup:richmenu:static`
2. 複製輸出的 Rich Menu ID
3. 在 Netlify 添加環境變數：`RICH_MENU_ID=<複製的ID>`
4. 完成！以後不需要再更新

---

### 方案 B：動態 Rich Menu（顯示即時評分）

**特點**：
- ✅ Rich Menu 上顯示即時評分（例如：5.0/5 (1票)）
- ❌ 每次更新評分需要重新創建 Rich Menu
- ❌ Rich Menu ID 會改變
- ❌ 需要更新 Netlify 環境變數

**使用方式**：

```bash
# 創建/更新動態 Rich Menu
npm run setup:richmenu
```

**更新流程**：
1. 執行 `npm run setup:richmenu`
2. 複製輸出的新 Rich Menu ID
3. 在 Netlify 更新環境變數：`RICH_MENU_ID=<新ID>`
4. 觸發 Netlify 重新部署

---

## 📋 比較表

| 特性 | 固定 Rich Menu | 動態 Rich Menu |
|------|---------------|---------------|
| Rich Menu ID | 永遠不變 | 每次更新會改變 |
| 顯示即時評分 | ❌ | ✅ |
| 需要更新 Netlify | 只需一次 | 每次更新都需要 |
| 維護成本 | 低 | 高 |
| 用戶體驗 | 需點擊查看評分 | 直接看到評分 |

---

## 💡 建議

### 生產環境（Netlify）
**使用方案 A（固定 Rich Menu）**

原因：
- 不需要頻繁更新環境變數
- 維護成本低
- 用戶點擊按鈕一樣能看到即時評分

### 開發/測試環境
**使用方案 B（動態 Rich Menu）**

原因：
- 可以測試評分顯示效果
- 方便調試

---

## 🚀 快速開始

### 首次設置（生產環境）

```bash
# 1. 創建固定 Rich Menu
npm run setup:richmenu:static

# 2. 複製輸出的 Rich Menu ID
# 例如：richmenu-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 3. 在 Netlify 添加環境變數
# Key: RICH_MENU_ID
# Value: <複製的ID>

# 4. 完成！
```

### 測試動態評分（開發環境）

```bash
# 1. 創建動態 Rich Menu
npm run setup:richmenu

# 2. 在 LINE 中測試
# 應該會看到評分顯示（例如：5.0/5 (1票)）

# 3. 投票後重新創建
npm run setup:richmenu

# 4. 查看評分是否更新
```

---

## 🔧 環境變數

### 必需的環境變數

```env
# LINE Bot
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_access_token
RICH_MENU_ID=your_rich_menu_id

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# DeepSeek AI
DEEPSEEK_API_KEY=your_deepseek_api_key
```

---

## 📊 Rich Menu 資訊

### 布局
- **尺寸**：2500 x 843 px
- **布局**：1x3（一排三個按鈕）
- **chatBarText**：股市大亨

### 按鈕
1. **📊 台股分析** - 輸入股票代號
2. **🌎 美股分析** - S&P500 / NASDAQ
3. **⭐ 本週評分** - 查看/投票評分

---

## ❓ 常見問題

### Q1: 為什麼 Rich Menu ID 會改變？

**A**: LINE API 不允許替換已上傳的圖片。要更新圖片，必須刪除舊 Rich Menu 並創建新的，每次創建都會生成新的 ID。

### Q2: 如何讓 Rich Menu ID 永遠不變？

**A**: 使用固定 Rich Menu（`npm run setup:richmenu:static`），不在 Rich Menu 上顯示即時評分。

### Q3: 固定 Rich Menu 用戶能看到評分嗎？

**A**: 可以！用戶點擊「本週評分」按鈕後，會收到包含即時評分的訊息。

### Q4: 我應該選擇哪種方案？

**A**: 
- **生產環境**：固定 Rich Menu（維護成本低）
- **開發環境**：動態 Rich Menu（方便測試）

### Q5: 如何更新評分？

**A**:
- **固定 Rich Menu**：不需要更新，用戶點擊按鈕會看到即時評分
- **動態 Rich Menu**：執行 `npm run setup:richmenu` 並更新 Netlify 環境變數

---

## 🎯 總結

**推薦方案**：在生產環境使用**固定 Rich Menu**

```bash
npm run setup:richmenu:static
```

這樣：
- ✅ 設置一次就完成
- ✅ 不需要維護
- ✅ 用戶體驗良好
- ✅ Rich Menu ID 永遠不變

