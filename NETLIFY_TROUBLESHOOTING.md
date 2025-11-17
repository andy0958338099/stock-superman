# 🔧 Netlify 部署故障排除指南

## 📋 已完成的修正

### 1. ✅ 移除 Next.js 誤判
**問題**：Netlify 誤以為這是 Next.js 專案  
**修正**：在 `netlify.toml` 中設定 `command = ""`（空字串）

### 2. ✅ 設定 Canvas 二進制鏡像
**問題**：`canvas` 模組是 native 模組，可能在 Netlify 上安裝失敗  
**修正**：新增 `.npmrc` 檔案指定 canvas 二進制鏡像

### 3. ✅ 確認專案結構
**確認**：
- ✅ `functions/` 目錄存在且包含 6 個 JS 檔案
- ✅ `package.json` 和 `package-lock.json` 都已提交
- ✅ `netlify.toml` 配置正確
- ✅ `.gitignore` 正確排除 `.env` 和 `node_modules`

---

## 🚀 當前配置

### netlify.toml
```toml
[build]
  command = ""
  functions = "functions"
  publish = "public"

[functions]
  node_bundler = "esbuild"
  external_node_modules = ["canvas", "sharp"]
```

### package.json (關鍵部分)
```json
{
  "scripts": {
    "build": "echo 'No build step required'"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 🔍 如果部署仍然失敗

### 步驟 1：查看完整的 Netlify 日誌

1. 前往 Netlify Dashboard
2. 點擊失敗的部署
3. 點擊 **"Show all logs"** 或展開完整日誌
4. 找到 **真正的錯誤訊息**（通常在 npm install 之後）

### 步驟 2：常見錯誤及解決方案

#### 錯誤 A：Canvas 安裝失敗
```
Error: node-pre-gyp install --fallback-to-build
```

**解決方案**：
1. 確認 `.npmrc` 檔案已提交
2. 或者，在 Netlify 環境變數中設定：
   ```
   NPM_FLAGS=--legacy-peer-deps
   ```

#### 錯誤 B：Node 版本不符
```
error Unsupported engine
```

**解決方案**：
在 Netlify 環境變數中設定：
```
NODE_VERSION=18
```

#### 錯誤 C：缺少環境變數
```
Error: Missing required environment variable
```

**解決方案**：
確認已在 Netlify 設定以下 8 個環境變數：
- LINE_CHANNEL_SECRET
- LINE_CHANNEL_ACCESS_TOKEN
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_BUCKET
- DEEPSEEK_API_KEY
- DEEPSEEK_API_URL
- NODE_ENV

#### 錯誤 D：Function 打包失敗
```
Error bundling function
```

**解決方案**：
檢查 `functions/` 目錄中的檔案是否有語法錯誤：
```bash
node -c functions/line-webhook.js
node -c functions/finmind.js
node -c functions/indicators.js
node -c functions/generate-chart.js
node -c functions/deepseek.js
node -c functions/supabase-client.js
```

### 步驟 3：本地測試部署

在本地模擬 Netlify 環境：

```bash
# 1. 清除 node_modules
rm -rf node_modules package-lock.json

# 2. 重新安裝（模擬 Netlify）
npm ci

# 3. 測試 Functions
npm test

# 4. 本地啟動 Netlify Dev
npm run dev
```

### 步驟 4：檢查 Netlify 設定

在 Netlify Dashboard 中確認：

1. **Site settings** > **Build & deploy** > **Build settings**
   - Build command: (應該是空的或 `echo 'No build step required'`)
   - Publish directory: `public`
   - Functions directory: `functions`

2. **Site settings** > **Environment variables**
   - 確認所有 8 個環境變數都已設定
   - 確認沒有多餘的空格或換行

3. **Site settings** > **Build & deploy** > **Deploy contexts**
   - Production branch: `main`

---

## 🆘 如果還是失敗

### 方案 A：使用 Netlify CLI 手動部署

```bash
# 1. 安裝 Netlify CLI（如果還沒安裝）
npm install -g netlify-cli

# 2. 登入
netlify login

# 3. 連結到你的網站
netlify link

# 4. 手動部署
netlify deploy --prod
```

### 方案 B：簡化配置

如果 canvas 一直安裝失敗，可以暫時移除圖表功能：

1. 在 `package.json` 中移除：
   ```json
   "canvas": "^2.11.2",
   "chartjs-node-canvas": "^4.1.6",
   ```

2. 在 `functions/line-webhook.js` 中註解掉圖表生成：
   ```javascript
   // const { generateIndicatorChart } = require('./generate-chart');
   // const chartResult = await generateIndicatorChart(...);
   ```

3. 先讓基本功能運作，之後再加回圖表

---

## 📊 預期的成功部署日誌

成功的部署應該看起來像這樣：

```
1. Installing dependencies
   npm ci
   ✓ Installed 50+ packages

2. Building Functions
   ✓ functions/line-webhook.js
   ✓ Bundled with esbuild

3. Deploying
   ✓ Functions deployed
   ✓ Site is live

Deploy time: 2-3 minutes
```

---

## 💡 其他提示

### 檢查 Netlify 狀態
https://www.netlifystatus.com/

### Netlify 文件
- Functions: https://docs.netlify.com/functions/overview/
- Build settings: https://docs.netlify.com/configure-builds/overview/
- Environment variables: https://docs.netlify.com/environment-variables/overview/

### 聯絡支援
如果以上都無法解決，可以：
1. 複製完整的部署日誌
2. 前往 Netlify Support: https://www.netlify.com/support/
3. 或在 Netlify Community 發問: https://answers.netlify.com/

---

**請將完整的 Netlify 部署日誌貼給我，我會幫你找出確切的問題！** 🔍

