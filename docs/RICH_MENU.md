# 🎨 Rich Menu 設定指南

## 📋 目錄
- [快速開始](#快速開始)
- [功能說明](#功能說明)
- [設定步驟](#設定步驟)
- [自訂圖片](#自訂圖片)
- [故障排除](#故障排除)

---

## 🚀 快速開始

### 方法一：使用預設圖片（最簡單）

```bash
# 1. 設定環境變數
export LINE_CHANNEL_ACCESS_TOKEN="your_token"

# 2. 執行設定腳本
npm run setup:richmenu:static
```

### 方法二：動態生成圖片

```bash
# 1. 生成 Rich Menu 圖片
npm run generate:richmenu

# 2. 設定 Rich Menu
npm run setup:richmenu
```

---

## 🎯 功能說明

### Rich Menu 按鈕配置

```
┌─────────────┬─────────────┬─────────────┐
│   台股分析   │   美股分析   │   市場情緒   │
│   (2330)    │   (美股)    │  (本週調查)  │
├─────────────┼─────────────┼─────────────┤
│   熱門股票   │   清除快取   │   使用說明   │
│   (0050)    │             │             │
└─────────────┴─────────────┴─────────────┘
```

### 按鈕功能

1. **台股分析**：輸入 `2330` 查詢台積電
2. **美股分析**：輸入 `美股` 查看美股市場分析
3. **市場情緒**：參與本週市場情緒調查
4. **熱門股票**：輸入 `0050` 查詢元大台灣50
5. **清除快取**：清除所有快取資料
6. **使用說明**：顯示 Bot 使用說明

---

## 📝 設定步驟

### 1. 準備環境變數

在 `.env` 或 Netlify 環境變數中設定：

```env
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
```

### 2. 選擇設定方式

#### 使用靜態圖片（推薦）

```bash
npm run setup:richmenu:static
```

優點：
- ✅ 快速簡單
- ✅ 不需要額外依賴
- ✅ 使用預設的專業設計

#### 使用動態生成

```bash
# 生成圖片
npm run generate:richmenu

# 上傳並設定
npm run setup:richmenu
```

優點：
- ✅ 可自訂文字和顏色
- ✅ 可動態更新內容
- ✅ 支援市場情緒分數顯示

### 3. 驗證設定

在 LINE Bot 中檢查：
1. 開啟與 Bot 的對話
2. 查看底部是否出現 Rich Menu
3. 點擊按鈕測試功能

---

## 🎨 自訂圖片

### 圖片規格

- **尺寸**：2500 x 1686 px 或 2500 x 843 px
- **格式**：PNG 或 JPEG
- **大小**：< 1 MB
- **色彩模式**：RGB

### 使用自訂圖片

1. 準備圖片（符合上述規格）
2. 放置在 `public/rich-menu-custom.png`
3. 執行設定腳本：

```bash
npm run setup:richmenu
```

### 設計建議

- 使用清晰的圖示和文字
- 保持按鈕區域明確
- 使用品牌色彩
- 確保文字可讀性

---

## 🔧 進階設定

### 動態更新 Rich Menu

```bash
# 更新市場情緒分數
npm run update:richmenu:current

# 完整更新（重新生成圖片）
npm run update:richmenu
```

### 管理介面

```bash
# 啟動 Rich Menu 管理介面
npm run richmenu:admin
```

然後在瀏覽器開啟：`http://localhost:8888/admin/rich-menu.html`

功能：
- 查看當前 Rich Menu
- 上傳新圖片
- 更新按鈕配置
- 刪除 Rich Menu

---

## 🐛 故障排除

### 問題 1：Rich Menu 沒有顯示

**可能原因**：
- LINE Channel Access Token 錯誤
- Rich Menu 未設為預設

**解決方法**：
```bash
# 重新設定
npm run setup:richmenu:static
```

### 問題 2：按鈕點擊沒反應

**可能原因**：
- 按鈕區域配置錯誤
- Webhook 未正確設定

**解決方法**：
1. 檢查 `scripts/setup-rich-menu.js` 中的 `areas` 配置
2. 確認 LINE Webhook 已啟用

### 問題 3：圖片上傳失敗

**可能原因**：
- 圖片尺寸不符
- 圖片大小超過 1 MB

**解決方法**：
```bash
# 使用 Sharp 壓縮圖片
npm run optimize:richmenu:images
```

### 問題 4：無法生成動態圖片

**可能原因**：
- 缺少 Canvas 或 Sharp 依賴

**解決方法**：
```bash
# 重新安裝依賴
npm install canvas sharp
```

---

## 📚 相關文件

- [LINE Rich Menu API 文檔](https://developers.line.biz/en/docs/messaging-api/using-rich-menus/)
- [專案 README](../README.md)
- [API 文檔](./API.md)

---

## 💡 最佳實踐

1. **定期更新**：每週更新市場情緒分數
2. **A/B 測試**：測試不同的按鈕配置
3. **用戶反饋**：根據用戶使用習慣調整
4. **保持簡潔**：不要放太多按鈕
5. **視覺一致**：與 Bot 整體風格保持一致

