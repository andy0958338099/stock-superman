# 🔑 Google Search API 設定指南

## 📅 更新時間：2025-11-19

---

## ❌ 當前問題

**錯誤訊息**：
```
403 Forbidden
Requests from referer <empty> are blocked.
```

**原因**：
Google API Key 設定了 HTTP referrer 限制，但 Netlify Functions 是伺服器端執行，沒有 referrer。

---

## ✅ 解決方案

### **方案 1：移除 API Key 限制（推薦）**

這是最簡單且最適合伺服器端使用的方法。

#### 步驟：

1. **前往 Google Cloud Console**
   - 網址：https://console.cloud.google.com/

2. **選擇專案**
   - 點擊頂部的專案選擇器
   - 選擇您建立 Custom Search API 的專案

3. **前往 API 和服務 → 憑證**
   - 左側選單：「API 和服務」→「憑證」
   - 或直接前往：https://console.cloud.google.com/apis/credentials

4. **編輯 API 金鑰**
   - 找到您的 API 金鑰（名稱可能是「API 金鑰 1」或自訂名稱）
   - 點擊金鑰名稱進入編輯頁面

5. **修改應用程式限制**
   - 找到「應用程式限制」區塊
   - 選擇「**無**」（None）
   - 這樣可以從任何來源使用此金鑰

6. **設定 API 限制（重要！）**
   - 找到「API 限制」區塊
   - 選擇「**限制金鑰**」
   - 勾選「**Custom Search API**」
   - 這樣可以防止金鑰被濫用於其他 API

7. **儲存**
   - 點擊「儲存」按鈕
   - 等待幾秒鐘讓設定生效

---

### **方案 2：設定 HTTP referrer 白名單**

如果您想保留 referrer 限制，可以加入 Netlify 網域。

#### 步驟：

1. **前往 API 金鑰編輯頁面**（同上）

2. **選擇「HTTP referrer (網站)」**

3. **新增以下 referrer**：
   ```
   https://stock-superman.netlify.app/*
   https://*.netlify.app/*
   ```

4. **儲存**

**注意**：此方案可能仍然無法完全解決問題，因為 Netlify Functions 在伺服器端執行，referrer 可能仍然是空的。

---

### **方案 3：使用 IP 限制（不推薦）**

Netlify Functions 的 IP 是動態的，不適合使用 IP 限制。

---

## 🔧 設定 Netlify 環境變數

### 1. 取得 API Key

在 Google Cloud Console 的憑證頁面，複製您的 API 金鑰。

### 2. 取得 Search Engine ID

1. 前往 [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. 點擊您的搜尋引擎
3. 在「基本資訊」中找到「搜尋引擎 ID」
4. 複製此 ID

### 3. 設定 Netlify 環境變數

1. 前往 [Netlify Dashboard](https://app.netlify.com/)
2. 選擇 Stock-Superman 專案
3. 點擊「Site settings」
4. 點擊「Environment variables」
5. 點擊「Add a variable」

**新增以下兩個變數**：

```
變數名稱：GOOGLE_SEARCH_API_KEY
值：<您的 Google API Key>

變數名稱：GOOGLE_SEARCH_ENGINE_ID
值：<您的 Search Engine ID>
```

6. 點擊「Save」

### 4. 重新部署

設定環境變數後，需要重新部署：

**方法 1：觸發重新部署**
- 在 Netlify Dashboard 點擊「Deploys」
- 點擊「Trigger deploy」→「Clear cache and deploy site」

**方法 2：推送新的 commit**
```bash
git commit --allow-empty -m "chore: 觸發重新部署以套用環境變數"
git push origin main
```

---

## 🧪 測試 API 設定

### 測試指令（本地）

如果您想在本地測試 API 是否正常：

```bash
# 設定環境變數
export GOOGLE_SEARCH_API_KEY="your-api-key"
export GOOGLE_SEARCH_ENGINE_ID="your-engine-id"

# 測試 API
curl "https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=台積電+財經新聞"
```

**預期結果**：
- 應該返回 JSON 格式的搜尋結果
- 不應該出現 403 錯誤

---

## 📊 API 配額

### 免費配額
- **每天 100 次查詢**
- 超過需要付費

### 監控使用量
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇「API 和服務」→「資訊主頁」
3. 查看「Custom Search API」的使用量

### 優化建議
- 新聞分析：限用 1 次（已實作）
- 政治分析：限用 1 次（已實作）
- 每次搜尋 6 則新聞（已設定）

**預估使用量**：
- 假設每天 20 位用戶
- 每位用戶使用新聞 + 政治各 1 次
- 每天使用量：20 × 2 = 40 次
- 遠低於 100 次免費配額 ✅

---

## ⚠️ 安全建議

### 1. 限制 API 範圍
- ✅ 只允許「Custom Search API」
- ❌ 不要選擇「無限制」

### 2. 定期輪換金鑰
- 建議每 3-6 個月更換一次 API Key

### 3. 監控異常使用
- 定期檢查 API 使用量
- 如果發現異常，立即停用金鑰

---

## 🐛 常見問題

### Q1: 設定後仍然出現 403 錯誤？
**A**: 等待 5-10 分鐘讓設定生效，然後重新部署 Netlify。

### Q2: 出現 429 錯誤（Too Many Requests）？
**A**: 超過每日配額（100 次），等待隔天重置或升級為付費方案。

### Q3: 搜尋結果都是英文？
**A**: 檢查 Search Engine 設定，確認語言設定為「繁體中文」。

### Q4: 沒有搜尋結果？
**A**: 
- 檢查 Search Engine 設定，確認「搜尋整個網路」已啟用
- 嘗試更廣泛的搜尋關鍵字

---

## 📝 檢查清單

設定完成後，請確認：

- [ ] Google API Key 已建立
- [ ] API Key 限制設定為「無」或加入 Netlify referrer
- [ ] API 限制設定為「Custom Search API」
- [ ] Search Engine ID 已取得
- [ ] Netlify 環境變數已設定
- [ ] 已重新部署 Netlify
- [ ] 在 LINE 測試「新聞」功能
- [ ] 確認沒有 403 錯誤

---

**🎉 設定完成後，新聞和政治分析功能就可以正常使用了！**

