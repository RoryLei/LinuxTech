# Skill: 新增學習主題

## 說明
在 LinuxTech 平台新增一個 Linux 技術學習主題。

## 觸發條件
使用者要求新增一個學習主題到平台。

## 步驟

1. **研究資源** — 搜尋該技術的官方文件與教學資源，了解其核心概念與學習路徑
2. **規劃架構** — 由淺入深設計 5-7 個 sections（概念 → 原理 → 環境建置 → 基本使用 → 進階 → 實戰）
3. **編輯 topics.js** — 在 `js/topics.js` 的 `TOPICS` 陣列末尾加入新主題物件
4. **驗證語法** — 執行 `node --check js/topics.js` 確保無語法錯誤
5. **驗證載入** — 用 Node.js 確認新主題的 id 與 sections 數量正確
6. **部署更新** — 如已部署，執行 `sudo bash deploy.sh` 更新線上版本

## 主題物件模板
```javascript
{
  id: 'topic-id',           // 必須是 kebab-case
  icon: '🔬',              // 單一 emoji 代表此主題
  title: '中文主題名稱',
  description: '一句話描述學習內容',
  sections: [
    {
      title: '1. 段落標題',
      content: `
        <p>說明文字</p>
        <pre><code>範例程式碼</code></pre>
      `
    }
    // ... 更多 sections
  ]
}
```

## 內容規範
- 繁體中文撰寫，技術名詞保留英文
- Sections 由淺入深排列
- 包含可執行的程式碼範例
- 程式碼使用 `<pre><code>` 包裹
- 提供官方參考連結（使用 `<a href="..." target="_blank">`）
