# LinuxTech 學習平台 — 需求文件

## 專案目標
建立一個以 block 卡片呈現的 Linux 技術學習平台，讓使用者能選擇主題進入學習。

## 功能需求

### FR-1: 主題卡片展示
- 首頁以 grid 佈局顯示所有可用的學習主題
- 每張卡片顯示：emoji 圖示、主題名稱、簡短描述
- 卡片具有 hover 互動效果
- 響應式設計，手機端為單欄排列

### FR-2: 主題詳細內容頁
- 點擊卡片後進入該主題的學習內容
- 內容分為多個 section，由淺入深排列
- 支援 HTML 格式內容（段落、列表、程式碼區塊、表格、連結）
- 提供「回到主題列表」按鈕

### FR-3: Hash 路由
- 使用 URL hash（`#topic-id`）實作客戶端路由
- 支援瀏覽器前進/後退導航
- 直接存取 `http://host/#topic-id` 可直接進入該主題

### FR-4: 資料驅動架構
- 主題資料集中在 `topics.js` 管理
- 新增主題只需在 TOPICS 陣列追加物件，無需修改 HTML 或 JS 邏輯

### FR-5: 一鍵部署
- 提供 `deploy.sh` 腳本支援多種 Linux 發行版
- 自動安裝 Nginx、複製檔案、設定虛擬主機、啟動服務

## 非功能需求

### NFR-1: 效能
- 純靜態網站，無後端依賴
- 靜態資源設定 7 天瀏覽器快取
- 首次載入 < 500KB

### NFR-2: 無障礙
- 卡片具有 aria-label
- 鍵盤可操作（Tab 切換焦點，Enter 進入主題）
- 色彩對比符合 WCAG AA

### NFR-3: 安全
- Nginx 設定安全標頭（X-Frame-Options、X-Content-Type-Options、X-XSS-Protection）
- 禁止存取隱藏檔（`.git` 等）

### NFR-4: 相容性
- 支援現代瀏覽器（Chrome、Firefox、Safari、Edge 最新兩版）
- 不需要 polyfills 或 transpiling
