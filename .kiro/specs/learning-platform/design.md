# LinuxTech 學習平台 — 設計文件

## 系統架構

```
┌─────────────────────────────────────────────┐
│                  瀏覽器                       │
│                                             │
│  index.html ──▶ style.css                   │
│      │                                      │
│      ├──▶ topics.js  (資料層: TOPICS[])     │
│      │                                      │
│      └──▶ app.js     (邏輯層: 路由+渲染)    │
│                                             │
│  URL Hash (#id) ◀──▶ Router ──▶ Renderer    │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Nginx (port 8080)  │
│  /var/www/linuxtech/ │
└─────────────────────┘
```

## 元件設計

### 資料層 — topics.js
- 匯出全域 `const TOPICS` 陣列
- 每個 Topic 物件結構：
  ```typescript
  interface Topic {
    id: string;          // kebab-case, 作為 URL hash
    icon: string;        // emoji
    title: string;       // 中文標題
    description: string; // 簡述
    sections: Section[];
  }
  
  interface Section {
    title: string;       // section 標題
    content: string;     // HTML 字串
  }
  ```

### 邏輯層 — app.js
- **IIFE 封裝**，避免全域污染
- **router()** — 監聽 `hashchange`，解析 hash 決定顯示首頁或主題頁
- **renderTopicGrid()** — 將 TOPICS 渲染為卡片 grid
- **renderTopicPage(topic)** — 將單一 Topic 渲染為詳細學習頁

### 樣式層 — style.css
- CSS Custom Properties 管理色彩主題
- Grid 佈局 + 自適應欄數
- 暗色主題為預設配色

## 路由機制

| URL | 行為 |
|-----|------|
| `/#` 或 `/` | 顯示主題卡片 grid |
| `/#filesystem` | 顯示檔案系統主題內容 |
| `/#ebpf` | 顯示 eBPF 主題內容 |
| `/#invalid-id` | Fallback 到首頁 grid |

## 部署架構

- **deploy.sh** 偵測發行版 → 安裝 Nginx → 複製檔案 → 寫入 vhost → 啟動服務
- 支援 Debian/Ubuntu (apt)、RHEL/Fedora (dnf/yum)、Arch (pacman)
- Port 80 衝突時使用 port 8080

## 新增主題流程

1. 在 `topics.js` 的 TOPICS 陣列末尾加入新物件
2. 無需修改 `index.html` 或 `app.js`
3. 重新部署 (`sudo bash deploy.sh`) 即可上線
