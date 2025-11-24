# 🚀 Rich Menu 快速開始指南（新版）

> ⚡ 5 分鐘內完成 Rich Menu 設置！

## 🎯 新版特色

✅ **網頁管理介面** - 不需要命令列，點擊即可設置  
✅ **模組化設計** - 易於維護和擴展  
✅ **SVG 生成** - 圖片更清晰美觀  
✅ **統一 API** - 所有操作通過一個端點  

---

## 📋 前置需求

1. **Node.js** >= 18.0.0
2. **npm** 套件管理器
3. **LINE Bot** Channel Access Token 和 Secret

---

## ⚡ 快速開始（3 步驟）

### 步驟 1：設置環境變數

在 `股市大亨完全版/.env` 文件中設置：

```bash
LINE_CHANNEL_ACCESS_TOKEN=你的_Channel_Access_Token
LINE_CHANNEL_SECRET=你的_Channel_Secret
```

### 步驟 2：啟動開發伺服器

```bash
cd 股市大亨完全版
npm run dev
```

### 步驟 3：打開管理介面

在瀏覽器中打開：
```
http://localhost:8888/admin/rich-menu.html
```

點擊「🎨 設置靜態 Rich Menu」按鈕，完成！

---

## 🎨 兩種模式選擇

### 模式 1：靜態 Rich Menu（推薦）

**特點：**
- ✅ 設置一次即可，無需更新
- ✅ Rich Menu ID 永遠不變
- ✅ 顯示「點擊查看」文字
- ✅ 適合生產環境

**使用場景：**
- 不需要在 Rich Menu 上顯示即時評分
- 用戶點擊按鈕後會看到最新評分

**設置方式：**
在管理介面點擊「🎨 設置靜態 Rich Menu」

---

### 模式 2：動態 Rich Menu

**特點：**
- ✅ Rich Menu 上顯示即時評分
- ❌ 評分改變時需要重新設置
- ❌ Rich Menu ID 會改變

**使用場景：**
- 需要在 Rich Menu 上直接顯示評分數字
- 願意定期更新 Rich Menu

**設置方式：**
在管理介面點擊「⭐ 設置動態 Rich Menu」

---

## 📱 Rich Menu 功能說明

新版 Rich Menu 包含 3 個按鈕：

| 按鈕 | 功能 | 觸發訊息 |
|------|------|----------|
| 📊 台股分析 | 查詢台灣股票 | `📊 台股分析` |
| 🇺🇸 美股分析 | 查詢美國股市 | `美股` |
| ⭐ 本週評分 | 查看評分 | `📊 查看評分` |

---

## 🔧 自定義設置

### 修改按鈕文字

編輯 `lib/line/rich-menu.js`：

```javascript
const STOCK_RICH_MENU = {
  areas: [
    {
      action: {
        label: '你的按鈕文字',      // 修改這裡
        text: '用戶點擊後的訊息',    // 修改這裡
      },
    },
  ],
};
```

### 修改圖片樣式

編輯 `lib/line/rich-menu-image.js`：

```javascript
function generateStockRichMenuSVG() {
  return `
<svg width="2500" height="843">
  <!-- 修改顏色 -->
  <rect fill="#你的顏色" />
  
  <!-- 修改圖示 -->
  <text>你的圖示</text>
</svg>
  `;
}
```

---

## 🌐 部署到 Netlify

### 1. 在 Netlify 設置環境變數

```
LINE_CHANNEL_ACCESS_TOKEN=你的_Token
LINE_CHANNEL_SECRET=你的_Secret
```

### 2. 部署代碼

```bash
git add .
git commit -m "Add new Rich Menu system"
git push
```

### 3. 使用線上管理介面

```
https://你的網站.netlify.app/admin/rich-menu.html
```

---

## 🐛 常見問題

### Q: 找不到 sharp 套件？

A: Sharp 已經包含在 netlify-cli 中，無需額外安裝。如果遇到問題，可以手動安裝：
```bash
npm install sharp
```

### Q: 401 認證錯誤？

A: 檢查環境變數是否正確設置：
```bash
echo $LINE_CHANNEL_ACCESS_TOKEN
```

### Q: 圖片上傳失敗？

A: 確認圖片尺寸為 2500x843 px，格式為 PNG。

### Q: Rich Menu 沒有顯示？

A: 
1. 檢查是否設為預設 Rich Menu
2. 在 LINE App 中重新開啟 Bot
3. 檢查 LINE Developers Console 設置

---

## 📚 進階功能

### 使用 API 端點

```bash
# 設置靜態 Rich Menu
curl -X POST http://localhost:8888/.netlify/functions/api/rich-menu-setup \
  -H "Content-Type: application/json" \
  -d '{"action":"setup","mode":"static"}'

# 列出所有 Rich Menu
curl -X POST http://localhost:8888/.netlify/functions/api/rich-menu-setup \
  -H "Content-Type: application/json" \
  -d '{"action":"list"}'

# 刪除 Rich Menu
curl -X POST http://localhost:8888/.netlify/functions/api/rich-menu-setup \
  -H "Content-Type: application/json" \
  -d '{"action":"delete","richMenuId":"richmenu-xxxxx"}'
```

---

## 📖 更多文檔

- [完整設置指南](docs/RICH_MENU_SETUP_NEW.md)
- [遷移指南](docs/RICH_MENU_MIGRATION.md)
- [模組說明](lib/line/README.md)

---

## ✅ 檢查清單

設置完成後，確認以下項目：

- [ ] 環境變數已設置
- [ ] 開發伺服器正常啟動
- [ ] 管理介面可以訪問
- [ ] Rich Menu 設置成功
- [ ] LINE App 中 Rich Menu 正常顯示
- [ ] 所有按鈕功能正常

---

## 🎉 完成！

恭喜！你已經成功設置了新版 Rich Menu 系統。

**下一步：**
- 自定義按鈕和圖片樣式
- 部署到 Netlify
- 查看進階文檔

**需要幫助？**
查看 [完整文檔](docs/RICH_MENU_SETUP_NEW.md) 或檢查 Netlify Function 日誌。

