# LinuxTech 學習平台 — 任務清單

## 已完成任務

- [x] 建立基礎 HTML 結構 (index.html)
- [x] 設計暗色主題 CSS (style.css)
- [x] 實作 hash-based 路由 (app.js)
- [x] 建立主題資料結構 (topics.js)
- [x] 新增 8 個基礎 Linux 主題
- [x] 新增 eBPF 進階主題（由淺入深 7 個 sections）
- [x] 建立一鍵部署腳本 (deploy.sh)
- [x] 部署到 Nginx (port 8080)

## 待辦任務

### 內容擴充
- [ ] 新增更多進階主題（Kubernetes、Ansible、SELinux、LVM 等）
- [ ] 為現有主題補充更多實戰範例
- [ ] 加入互動式測驗或練習題

### 功能增強
- [ ] 搜尋功能 — 在首頁加入搜尋列過濾主題
- [ ] 深色/淺色主題切換
- [ ] 進度追蹤 — 使用 localStorage 記錄已閱讀的 sections
- [ ] 目錄導航 — 主題頁側邊欄顯示 sections 列表
- [ ] 程式碼複製按鈕 — 每個 `<pre>` 區塊加入一鍵複製

### 基礎設施
- [ ] 加入 HTTPS（Let's Encrypt + Certbot）
- [ ] 設定自訂域名
- [ ] 加入 favicon 與 Open Graph meta tags
- [ ] 考慮 CI/CD 自動部署（Git push → 自動更新）
