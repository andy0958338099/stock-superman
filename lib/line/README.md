# 📱 LINE Bot 模組

> 統一管理 LINE Bot 相關功能的模組化架構

## 📁 目錄結構

```
lib/line/
├── client.js              # LINE Bot Client 管理器
├── rich-menu.js           # Rich Menu 配置與操作
├── rich-menu-image.js     # Rich Menu 圖片生成器
└── README.md              # 本文件
```

---

## 📄 模組說明

### `client.js` - LINE Bot Client 管理器

統一管理 LINE Bot SDK Client 實例。

**功能：**
- 創建和管理 LINE Bot Client
- 驗證環境變數
- 提供統一的錯誤處理

**使用範例：**
```javascript
const { getClient } = require('./client');

const client = getClient();
await client.pushMessage(userId, message);
```

---

### `rich-menu.js` - Rich Menu 配置與操作

集中管理 Rich Menu 的配置和所有操作。

**功能：**
- Rich Menu 配置定義
- 創建 Rich Menu
- 上傳圖片
- 設定預設 Rich Menu
- 刪除 Rich Menu
- 列出所有 Rich Menu

**配置：**
```javascript
const STOCK_RICH_MENU = {
  size: { width: 2500, height: 843 },
  selected: true,
  name: '股市大亨主選單',
  chatBarText: '股市大亨',
  areas: [
    // 按鈕區域定義
  ],
};
```

**使用範例：**
```javascript
const {
  createRichMenu,
  uploadRichMenuImage,
  setDefaultRichMenu,
} = require('./rich-menu');

// 創建 Rich Menu
const richMenuId = await createRichMenu();

// 上傳圖片
await uploadRichMenuImage(richMenuId, imageBuffer);

// 設為預設
await setDefaultRichMenu(richMenuId);
```

---

### `rich-menu-image.js` - Rich Menu 圖片生成器

使用 SVG 生成 Rich Menu 圖片，然後轉換為 PNG。

**功能：**
- 生成 SVG 格式的 Rich Menu 圖片
- 轉換 SVG 為 PNG Buffer
- 支援靜態和動態模式

**使用範例：**
```javascript
const {
  generateStaticRichMenuImage,
  generateDynamicRichMenuImage,
} = require('./rich-menu-image');

// 生成靜態圖片（不顯示評分）
const staticImage = await generateStaticRichMenuImage();

// 生成動態圖片（顯示評分）
const dynamicImage = await generateDynamicRichMenuImage(4.5, 10);
```

---

## 🎨 自定義 Rich Menu

### 1. 修改按鈕配置

編輯 `rich-menu.js` 中的 `STOCK_RICH_MENU`：

```javascript
areas: [
  {
    bounds: { x: 0, y: 0, width: 833, height: 843 },
    action: {
      type: 'message',
      label: '你的按鈕文字',
      text: '用戶點擊後發送的訊息',
    },
  },
  // ... 更多按鈕
]
```

### 2. 修改圖片樣式

編輯 `rich-menu-image.js` 中的 `generateStockRichMenuSVG`：

```javascript
function generateStockRichMenuSVG(options = {}) {
  return `
<svg width="2500" height="843" xmlns="http://www.w3.org/2000/svg">
  <!-- 修改顏色 -->
  <rect x="0" y="0" width="833" height="843" fill="#你的顏色" opacity="0.1"/>
  
  <!-- 修改圖示 -->
  <text x="416" y="350" fill="#你的顏色">你的圖示</text>
  
  <!-- 修改文字 -->
  <text x="416" y="480" fill="#你的顏色">你的文字</text>
</svg>
  `;
}
```

---

## 🔧 環境變數

需要設置以下環境變數：

```bash
LINE_CHANNEL_ACCESS_TOKEN=你的_Channel_Access_Token
LINE_CHANNEL_SECRET=你的_Channel_Secret
```

---

## 📦 依賴套件

- `@line/bot-sdk` - LINE Bot SDK
- `sharp` - SVG 轉 PNG（圖片處理）

安裝：
```bash
npm install @line/bot-sdk sharp
```

---

## 🚀 快速開始

### 完整流程範例

```javascript
const { createRichMenu, uploadRichMenuImage, setDefaultRichMenu } = require('./rich-menu');
const { generateStaticRichMenuImage } = require('./rich-menu-image');

async function setupRichMenu() {
  try {
    // 1. 創建 Rich Menu
    const richMenuId = await createRichMenu();
    console.log('Rich Menu ID:', richMenuId);

    // 2. 生成圖片
    const imageBuffer = await generateStaticRichMenuImage();
    console.log('Image size:', imageBuffer.length);

    // 3. 上傳圖片
    await uploadRichMenuImage(richMenuId, imageBuffer);

    // 4. 設為預設
    await setDefaultRichMenu(richMenuId);

    console.log('✅ Rich Menu 設置完成！');
  } catch (error) {
    console.error('❌ 設置失敗:', error);
  }
}

setupRichMenu();
```

---

## 🎯 設計原則

1. **單一職責**：每個模組只負責一個功能
2. **易於測試**：函數獨立，易於單元測試
3. **配置分離**：配置與邏輯分離
4. **錯誤處理**：統一的錯誤處理機制
5. **可擴展性**：易於添加新功能

---

## 📚 相關文檔

- [Rich Menu 設置指南](../../docs/RICH_MENU_SETUP_NEW.md)
- [遷移指南](../../docs/RICH_MENU_MIGRATION.md)
- [LINE Messaging API 文檔](https://developers.line.biz/en/docs/messaging-api/)

---

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

