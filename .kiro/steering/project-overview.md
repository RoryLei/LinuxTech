---
inclusion: auto
---

# LinuxTech 專案概覽

## 專案說明
LinuxTech 是一個純靜態網站學習平台，以 block 卡片方式呈現各種 Linux 技術主題，讓使用者選擇進入學習。

## 技術棧
- 純前端：HTML5 + CSS3 + Vanilla JavaScript（無框架）
- 部署：Nginx 靜態檔案伺服器
- 路由：Hash-based SPA 路由（`#topic-id`）

## 專案結構
```
LinuxTech/
├── index.html          # 主頁面（唯一 HTML 入口）
├── css/
│   └── style.css       # 全站樣式（暗色主題）
├── js/
│   ├── topics.js       # 主題資料（TOPICS 陣列）
│   └── app.js          # 路由與渲染邏輯
├── deploy.sh           # 一鍵部署腳本（Nginx）
└── .kiro/              # Kiro IDE 設定
```

## 架構模式
- `topics.js` 定義 `const TOPICS = [...]` 陣列，每個物件包含 `id`、`icon`、`title`、`description`、`sections`
- `app.js` 負責讀取 TOPICS 渲染卡片，並用 hash routing 切換到各主題的詳細內容頁
- 新增主題只需在 `topics.js` 的 TOPICS 陣列中加入新物件，不需修改其他檔案
