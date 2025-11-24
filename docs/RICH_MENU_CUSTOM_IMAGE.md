# Rich Menu 自訂圖片上傳功能

## 🎨 功能概述

股市大亨 LINE Bot 現在支援**自訂圖片上傳**功能，讓您可以上傳自己的圖片來創建個性化的 Rich Menu！

## ✨ 主要特點

### 1. 圖片上傳
- 📤 支援上傳 3 張自訂圖片（台股、美股、評分）
- 🖼️ 支援 JPG、PNG 等常見格式
- 👁️ 即時預覽上傳的圖片

### 2. 自動優化
- 🔧 自動調整圖片尺寸（2500x843 px）
- 📐 智能縮放和裁切，保持最佳顯示效果
- 🎭 自動添加半透明遮罩，提升文字可讀性
- ✍️ 自動添加標題和副標題文字

### 3. 一鍵合成
- 🚀 前端即時合成，無需等待伺服器處理
- 💾 自動壓縮，確保檔案大小符合 LINE API 限制（< 1MB）
- ⚡ 快速上傳到 LINE 平台

## 📱 使用方式

### 方式一：上傳自訂圖片（推薦）

1. **訪問管理頁面**
   ```
   https://[你的網站].netlify.app/admin/rich-menu.html
   ```

2. **上傳圖片**
   - 點擊「📈 台股分析」區域，上傳第一張圖片
   - 點擊「🇺🇸 美股分析」區域，上傳第二張圖片
   - 點擊「⭐ 本週評分」區域，上傳第三張圖片

3. **預覽確認**
   - 上傳後會立即顯示預覽
   - 確認圖片正確無誤

4. **一鍵設置**
   - 點擊「🎨 使用自訂圖片設置 Rich Menu」
   - 等待系統自動優化、合成、上傳
   - 完成！

### 方式二：使用預設圖片

如果不想上傳自訂圖片，可以使用系統預設的 SVG 圖片：

- **🎨 使用預設靜態圖片** - 顯示「點擊查看」文字
- **⭐ 使用預設動態圖片** - 顯示即時評分數字

## 🎯 圖片建議

### 尺寸要求
- **建議尺寸**：833 x 843 px（或更大）
- **最終尺寸**：系統會自動調整為 2500 x 843 px（三張拼接）

### 內容建議

#### 📈 台股分析圖片
- 股市看板、K線圖
- 綠色調為主
- 清晰的數字或圖表

#### 🇺🇸 美股分析圖片
- 美國地標、華爾街
- 藍色調為主
- 專業金融氛圍

#### ⭐ 本週評分圖片
- 星星、獎盃、數字
- 金色/橙色調為主
- 醒目吸引注意

### 品質要求
- ✅ 高清圖片（避免模糊）
- ✅ 色彩鮮明（提升視覺效果）
- ✅ 主體居中（避免被裁切）
- ✅ 避免過多文字（系統會自動添加）

## 🔧 技術細節

### 前端處理流程

1. **圖片讀取**
   ```javascript
   FileReader.readAsDataURL(file)
   ```

2. **Canvas 合成**
   - 創建 2500x843 px 畫布
   - 繪製三張圖片（每張 833px 寬）
   - 添加半透明遮罩（rgba(0,0,0,0.3)）
   - 添加文字標題

3. **Base64 轉換**
   ```javascript
   canvas.toDataURL('image/png', 0.9)
   ```

4. **API 上傳**
   ```javascript
   fetch('/.netlify/functions/rich-menu-setup', {
     method: 'POST',
     body: JSON.stringify({
       action: 'setup',
       mode: 'custom',
       imageBase64: base64Data
     })
   })
   ```

### 後端處理流程

1. **接收 Base64 數據**
   ```javascript
   const { imageBase64 } = body;
   const customImageBuffer = Buffer.from(imageBase64, 'base64');
   ```

2. **創建 Rich Menu**
   ```javascript
   const richMenuId = await createRichMenu(STOCK_RICH_MENU);
   ```

3. **上傳圖片**
   ```javascript
   await uploadRichMenuImage(richMenuId, customImageBuffer);
   ```

4. **設為預設**
   ```javascript
   await setDefaultRichMenu(richMenuId);
   ```

## 📊 檔案大小限制

LINE API 對 Rich Menu 圖片有以下限制：

- **最大檔案大小**：1 MB
- **建議大小**：< 500 KB（更快載入）
- **系統優化**：自動壓縮至 0.9 品質

如果上傳失敗，請嘗試：
1. 使用較小的原始圖片
2. 降低圖片解析度
3. 使用 JPG 格式（比 PNG 更小）

## 🎉 優勢對比

### 傳統方式（手動）
❌ 需要 Photoshop 等專業軟體
❌ 手動調整尺寸和拼接
❌ 需要上傳到伺服器
❌ 複雜的 API 操作

### 新方式（自動）
✅ 瀏覽器直接上傳
✅ 自動優化和合成
✅ 一鍵完成設置
✅ 即時預覽效果

## 🚀 未來改進

- [ ] 支援拖放上傳
- [ ] 支援圖片濾鏡和特效
- [ ] 支援自訂文字內容和樣式
- [ ] 支援圖片庫（預設模板）
- [ ] 支援批量管理多個 Rich Menu

## 📞 技術支援

如有問題，請查看：
- [Rich Menu 設置指南](./RICH_MENU_SETUP_NEW.md)
- [Rich Menu 遷移指南](./RICH_MENU_MIGRATION.md)
- [LINE Messaging API 文檔](https://developers.line.biz/en/docs/messaging-api/using-rich-menus/)

