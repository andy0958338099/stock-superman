# Rich Menu 故障排除指南

## 🔧 常見問題與解決方案

### 問題 1: 上傳圖片後出現 413 錯誤

**錯誤訊息**: `Request failed with status code 413`

**原因**: 合成後的圖片檔案太大，超過了 Netlify Functions 的 payload 限制（通常是 6MB）或 LINE API 的限制（1MB）。

**解決方案**:

1. **使用較小的原始圖片**
   - 建議每張圖片 < 500 KB
   - 解析度不要超過 1500x1500 px

2. **降低圖片品質**
   - 系統已自動將品質設為 0.8（JPEG）
   - 如果還是太大，可以進一步降低

3. **使用 JPG 格式而非 PNG**
   - JPG 檔案通常比 PNG 小 50-70%
   - 上傳前先轉換格式

4. **檢查圖片尺寸**
   - 在預覽區域會顯示圖片尺寸和大小
   - 確保三張圖片總大小 < 1.5 MB

### 問題 2: 圖片無法合併

**症狀**: 點擊「使用自訂圖片設置 Rich Menu」後沒有反應

**可能原因**:
1. 沒有上傳所有三張圖片
2. 圖片格式不支援
3. 瀏覽器 Canvas API 錯誤

**解決方案**:

1. **確認已上傳三張圖片**
   ```javascript
   // 系統會檢查
   if (!image1 || !image2 || !image3) {
     alert('請上傳所有三張圖片！');
   }
   ```

2. **使用支援的格式**
   - ✅ JPG / JPEG
   - ✅ PNG
   - ✅ WebP
   - ❌ GIF（不建議）
   - ❌ SVG（不支援）

3. **檢查瀏覽器控制台**
   - 按 F12 打開開發者工具
   - 查看 Console 標籤的錯誤訊息

### 問題 3: 圖片顯示模糊或變形

**原因**: 圖片縮放或壓縮過度

**解決方案**:

1. **使用高解析度原始圖片**
   - 建議尺寸：833x843 px 或更大
   - 最小尺寸：500x500 px

2. **確保圖片比例接近 1:1**
   - 系統會自動裁切以填滿區域
   - 太寬或太高的圖片會被裁切較多

3. **檢查圖片品質設定**
   ```javascript
   // 目前設定
   canvas.toDataURL('image/jpeg', 0.8)
   // 可以調整為 0.85 或 0.9 以提高品質
   ```

### 問題 4: 文字無法正確顯示中文

**症狀**: Rich Menu 上的中文標題顯示為方塊或亂碼

**解決方案**:

系統已使用支援中文的字體：
```javascript
ctx.font = 'bold 80px Arial, "Microsoft JhengHei", sans-serif';
```

如果還是有問題：
1. 確認瀏覽器支援 Canvas 文字渲染
2. 嘗試使用其他瀏覽器（Chrome、Firefox、Safari）

### 問題 5: 部署後功能無法使用

**症狀**: 本地測試正常，但部署到 Netlify 後無法使用

**檢查清單**:

1. **確認 Netlify 部署成功**
   - 前往 Netlify Dashboard
   - 查看最新部署狀態
   - 確認沒有建置錯誤

2. **檢查 Function 配置**
   ```toml
   # netlify.toml
   [functions."rich-menu-setup"]
     timeout = 30
   ```

3. **檢查環境變數**
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`

4. **查看 Function 日誌**
   - Netlify Dashboard → Functions → rich-menu-setup
   - 查看執行日誌和錯誤訊息

## 🐛 除錯技巧

### 1. 使用瀏覽器開發者工具

```javascript
// 在 Console 中查看圖片大小
console.log('圖片大小：', (base64.length * 0.75 / 1024).toFixed(2), 'KB');

// 查看合成後的圖片
const img = new Image();
img.src = 'data:image/jpeg;base64,' + base64;
document.body.appendChild(img);
```

### 2. 測試單張圖片

先測試單張圖片是否能正常處理：

```javascript
async function testSingleImage(file) {
  const opt = await optimizeImage(file);
  console.log('優化後尺寸：', opt.width, 'x', opt.height);
  
  const canvas = document.createElement('canvas');
  canvas.width = opt.width;
  canvas.height = opt.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(opt.canvas, 0, 0);
  
  const base64 = canvas.toDataURL('image/jpeg', 0.8);
  console.log('檔案大小：', (base64.length * 0.75 / 1024).toFixed(2), 'KB');
}
```

### 3. 檢查 API 回應

```javascript
// 查看完整的 API 回應
const response = await fetch(API_ENDPOINT, { ... });
console.log('Status:', response.status);
console.log('Headers:', response.headers);
const data = await response.json();
console.log('Data:', data);
```

## 📊 效能優化建議

### 圖片大小建議

| 項目 | 建議值 | 說明 |
|------|--------|------|
| 單張原始圖片 | < 500 KB | 上傳前壓縮 |
| 合成後圖片 | < 800 KB | 系統自動壓縮 |
| 最終上傳大小 | < 1 MB | LINE API 限制 |

### 最佳實踐

1. **使用圖片編輯工具預先處理**
   - Photoshop、GIMP、線上工具
   - 調整為 833x843 px
   - 儲存為 JPG，品質 80-90%

2. **批量處理**
   - 使用腳本批量優化圖片
   - 統一尺寸和格式

3. **測試不同壓縮率**
   - 品質 0.7：檔案最小，品質較低
   - 品質 0.8：平衡選擇（預設）
   - 品質 0.9：品質最高，檔案較大

## 🆘 仍然無法解決？

如果以上方法都無法解決問題，請：

1. **收集錯誤資訊**
   - 瀏覽器 Console 的錯誤訊息
   - Netlify Function 日誌
   - 圖片的尺寸和大小資訊

2. **嘗試使用預設圖片**
   - 點擊「使用預設靜態圖片」
   - 確認系統基本功能正常

3. **聯繫技術支援**
   - 提供完整的錯誤訊息
   - 說明操作步驟
   - 附上截圖

