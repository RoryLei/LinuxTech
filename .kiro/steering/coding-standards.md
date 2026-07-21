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

## 無障礙與弱視配色規範
使用者有弱視需求，所有顏色配置須符合以下原則：
- **對比度**：文字與背景的對比度必須符合 WCAG 2.1 AA 標準（一般文字 ≥ 4.5:1，大型文字 ≥ 3:1）
- **不僅靠顏色傳達資訊**：所有狀態、錯誤、互動提示需搭配圖示、底線或文字，不可僅用色差區分
- **重點色彩需高飽和度且明亮**：accent color 需與暗色背景有足夠對比（建議 ≥ 7:1）
- **字體大小**：基礎字體不低於 16px，重要標題和按鈕文字建議 ≥ 18px
- **互動元素**：hover/focus 狀態除顏色變化外，須搭配邊框加粗、底線或 scale 等視覺輔助
- **連結**：連結文字需加底線或明確視覺區別，不可僅依靠顏色
- **程式碼區塊**：code 文字與背景對比 ≥ 4.5:1，避免低對比度的淺灰色
- **高對比模式**：CSS 變數設計需考慮未來可擴充高對比模式切換

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
