# 🔧 修正 Next.js Plugin 錯誤

## ❌ 錯誤原因

Netlify 自動偵測並啟用了 `@netlify/plugin-nextjs`，但這個專案**不是 Next.js 專案**，而是一個 **純 Netlify Functions 專案**。

錯誤訊息：
```
Error: Your publish directory does not contain expected Next.js build output.
```

---

## ✅ 解決方案（兩個步驟）

### 步驟 1：在 Netlify Dashboard 中移除 Next.js Plugin

**這是最重要的步驟！**

1. **前往 Netlify Dashboard**：https://app.netlify.com/

2. **選擇你的網站**（stock-superman）

3. **前往 Site settings**（左側選單）

4. **點擊 "Build & deploy"**

5. **點擊 "Build plugins"**

6. **找到 "@netlify/plugin-nextjs"**

7. **點擊 "Remove" 或 "Disable"**

8. **確認移除**

### 步驟 2：清除 Build Cache 並重新部署

1. **前往 "Deploys" 標籤**

2. **點擊 "Trigger deploy"**

3. **選擇 "Clear cache and deploy site"**

4. **等待部署完成**

---

## 🎯 或者：完全重新建立網站（推薦）

如果上面的方法不行，最簡單的方式是重新建立網站：

### 1. 刪除舊網站

1. 前往 Netlify Dashboard
2. 選擇你的網站
3. Site settings → General → Danger zone
4. 點擊 "Delete this site"
5. 輸入網站名稱確認刪除

### 2. 重新建立網站

1. **點擊 "Add new site" > "Import an existing project"**

2. **選擇 GitHub**，選擇 `stock-superman` repository

3. **重要：在 "Build settings" 中設定**：
   ```
   Build command: (留空)
   Publish directory: public
   Functions directory: functions
   ```

4. **不要勾選任何 plugins！**

5. **點擊 "Deploy site"**

6. **部署完成後，設定環境變數**（8 個變數）

---

## 📋 正確的 Netlify 設定

### Build settings
```
Build command: (empty)
Publish directory: public
Functions directory: functions
```

### Build plugins
```
(none) - 不要有任何 plugins！
```

### Environment variables
```
LINE_CHANNEL_SECRET=4d52f432dd6158badbdb99aa40050b09
LINE_CHANNEL_ACCESS_TOKEN=dulk7PzNiLj6oR21eUdIaOAbu5oU/Vnij93zx7ATpY57lKhJKSCsn7JeMirH8k/k0UYIpRBjSGGbyPtWP0inUnulMXnrbq1YmLF2MR++6DOY0KKI5DfzpeKK6SYq56X+KGWVyvLNFkyjhAW/rAkNWgdB04t89/1O/w1cDnyilFU=
SUPABASE_URL=https://uxexjrzpsvjclbztesil.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4ZXhqcnpwc3ZqY2xienRlc2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNDU0NzAsImV4cCI6MjA3ODcyMTQ3MH0.vhB6EYI3Dl_B_W1T25GdvtHpxAMBc9r2D2sEqUMM1sw
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4ZXhqcnpwc3ZqY2xienRlc2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzE0NTQ3MCwiZXhwIjoyMDc4NzIxNDcwfQ.S_08vuSTHeggBz6mtV0-kANmbnwCtqn_Fght3OX0oD0
SUPABASE_BUCKET=stock-charts
DEEPSEEK_API_KEY=sk-At8RrrpHycwsXNHCwnNGm0a20N6HbjWCsWTPCE1rhs1KWZ96
DEEPSEEK_API_URL=https://tbnx.plus7.plus/v1/chat/completions
NODE_ENV=production
```

---

## 🔍 驗證部署成功

成功的部署日誌應該看起來像這樣：

```
✓ Installing dependencies
✓ Building Functions
  - functions/line-webhook.js
✓ Deploying
✓ Site is live
```

**不應該有任何關於 Next.js 的訊息！**

---

## 💡 為什麼會這樣？

Netlify 的自動偵測機制看到：
- `package.json` 中有某些 dependencies
- 或者專案結構類似 Next.js

就自動啟用了 Next.js plugin。但我們的專案是：
- ✅ 純後端 API（Netlify Functions）
- ✅ 沒有前端 build
- ✅ 不需要任何 plugins

---

## 🚀 快速解決步驟總結

**最快的方法**：

1. 刪除舊網站
2. 重新 Import from GitHub
3. **Build command 留空**
4. **不要勾選任何 plugins**
5. 設定環境變數
6. 部署！

**預計時間**：5 分鐘

---

**完成後請告訴我部署狀態！** 🎉

