---
inclusion: auto
---

# 編碼規範

## JavaScript
- 使用 `const` / `let`，禁止 `var`
- 字串使用單引號，模板字串使用反引號
- IIFE 封裝應用邏輯，避免污染全域
- 不使用任何前端框架或打包工具

## CSS
- 使用 CSS Custom Properties（變數）管理主題色彩
- 採用 BEM-like 命名：`.block__element`、`.block--modifier`
- Mobile-first 響應式設計
- 暗色主題為預設

## HTML
- 語言設定 `lang="zh-TW"`
- 語意化標籤（header、main、footer、section、article）
- 所有互動元素須有 aria-label 或明確文字

## 主題資料格式 (topics.js)
每個主題物件必須包含：
```javascript
{
  id: 'kebab-case-id',       // URL hash 用
  icon: '📦',                // 單一 emoji
  title: '中文標題',
  description: '一句話描述此主題',
  sections: [
    {
      title: '段落標題',
      content: `<p>HTML 內容</p>`  // 支援 HTML 標籤
    }
  ]
}
```

## 內容撰寫原則
- 繁體中文為主要語言
- 技術名詞保留英文原文（如 eBPF、Docker、Nginx）
- 程式碼範例使用 `<pre><code>` 包裹
- 由淺入深編排 sections 順序
