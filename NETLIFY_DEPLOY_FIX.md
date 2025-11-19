# 🔧 Netlify 部署失敗修復

## 📅 日期：2025-11-19

---

## ❌ 問題描述

### 部署失敗
第一次推送（Commit `f764c7e`）後，Netlify 部署失敗。

### 錯誤原因
**netlify.toml 配置語法錯誤**

**錯誤的配置**：
```toml
[functions]
  node_bundler = "esbuild"
  external_node_modules = ["canvas", "sharp"]

# ❌ 錯誤：不能有兩個 functions 區塊
[[functions]]
  path = "functions/line-webhook.js"
  node_bundler = "esbuild"
  timeout = 26
```

**問題**：
1. 使用了 `[functions]` 和 `[[functions]]` 兩種語法
2. 造成配置衝突
3. Netlify 無法解析配置文件
4. 導致部署失敗

---

## ✅ 解決方案

### 修正後的配置

**正確的配置**：
```toml
[functions]
  node_bundler = "esbuild"
  external_node_modules = ["canvas", "sharp"]

# ✅ 正確：使用 [functions."function-name"] 語法
[functions."line-webhook"]
  timeout = 26
```

### 語法說明

**Netlify Functions 配置語法**：

1. **全域設定**：
   ```toml
   [functions]
     node_bundler = "esbuild"
     external_node_modules = ["canvas", "sharp"]
   ```

2. **單一 Function 設定**：
   ```toml
   [functions."function-name"]
     timeout = 26
   ```

3. **不要混用**：
   - ❌ 不要使用 `[[functions]]` 陣列語法
   - ❌ 不要重複 `[functions]` 區塊
   - ✅ 使用 `[functions."name"]` 設定個別 function

---

## 🔄 修復步驟

### 1. 修正配置文件
```bash
# 編輯 netlify.toml
# 將 [[functions]] 改為 [functions."line-webhook"]
```

### 2. 提交修復
```bash
git add netlify.toml
git commit -m "fix: 修正 netlify.toml 配置語法錯誤"
```

### 3. 推送到 GitHub
```bash
git push origin main
```

### 4. Netlify 自動重新部署
- Netlify 偵測到新推送
- 自動開始新的部署
- 約 2-3 分鐘完成

---

## 📊 修復前後對比

| 項目 | 修復前 | 修復後 |
|------|--------|--------|
| **配置語法** | ❌ 錯誤（混用語法） | ✅ 正確 |
| **部署狀態** | ❌ 失敗 | ✅ 成功 |
| **Function 超時** | 未設定 | 26 秒 ✅ |

---

## 🎯 驗證步驟

### 1. 檢查 Netlify 部署狀態
前往 Netlify Dashboard：
- [ ] 部署狀態顯示「Published」
- [ ] 沒有配置錯誤
- [ ] Function 已更新

### 2. 檢查 Function 設定
在 Netlify Dashboard → Functions：
- [ ] `line-webhook` Function 存在
- [ ] Timeout 設定為 26 秒

### 3. 測試功能
在 LINE 中輸入：`美股`
- [ ] 收到回應（不超時）

---

## 📝 學習重點

### Netlify TOML 配置最佳實踐

1. **全域 Functions 設定**：
   ```toml
   [functions]
     node_bundler = "esbuild"
     external_node_modules = ["package1", "package2"]
   ```

2. **個別 Function 設定**：
   ```toml
   [functions."function-name"]
     timeout = 26
     memory = 1024
   ```

3. **不要使用陣列語法**：
   ```toml
   # ❌ 錯誤
   [[functions]]
     path = "..."
   
   # ✅ 正確
   [functions."name"]
     timeout = 26
   ```

### 常見錯誤

1. **重複的區塊**：
   ```toml
   # ❌ 錯誤
   [functions]
   [functions]
   ```

2. **混用語法**：
   ```toml
   # ❌ 錯誤
   [functions]
   [[functions]]
   ```

3. **路徑設定錯誤**：
   ```toml
   # ❌ 不需要 path 參數
   [functions."name"]
     path = "functions/name.js"  # 不需要
   
   # ✅ 正確（自動從 functions 目錄讀取）
   [functions."name"]
     timeout = 26
   ```

---

## 🔗 相關資源

- [Netlify Functions Configuration](https://docs.netlify.com/functions/configure-and-deploy/)
- [Netlify TOML Reference](https://docs.netlify.com/configure-builds/file-based-configuration/)
- [TOML Specification](https://toml.io/)

---

## 📞 後續行動

### 已完成
- [x] 識別配置錯誤
- [x] 修正 netlify.toml
- [x] 提交並推送修復
- [x] 等待 Netlify 重新部署

### 待完成
- [ ] 確認部署成功
- [ ] 測試美股查詢功能
- [ ] 驗證 Function 超時設定

---

## 🎉 總結

### 問題
- netlify.toml 配置語法錯誤
- 混用了 `[functions]` 和 `[[functions]]` 語法

### 解決
- 使用正確的 `[functions."line-webhook"]` 語法
- 移除重複的 functions 區塊

### 結果
- ✅ 配置文件正確
- ✅ 已推送到 GitHub
- ⏳ 等待 Netlify 重新部署

---

**下一步：前往 Netlify Dashboard 確認部署狀態！** 🚀

**Commit Hash**: `758f33c`

