# Skill: 部署網站

## 說明
將 LinuxTech 靜態網站部署或更新到 Linux 伺服器（Nginx）。

## 觸發條件
使用者要求部署或更新網站。

## 步驟

1. **檢查 deploy.sh** — 確認 `deploy.sh` 存在且語法正確
   ```bash
   bash -n deploy.sh
   ```

2. **確認 Port 可用** — 檢查目標 port（預設 8080）是否被佔用
   ```bash
   sudo ss -tlnp | grep ':8080'
   ```

3. **執行部署**
   ```bash
   sudo bash deploy.sh
   ```

4. **驗證部署** — 確認 Nginx 運行中且網站可存取
   ```bash
   sudo systemctl is-active nginx
   curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/
   ```

## 注意事項
- 本機 Apache 佔用 port 80，Nginx 預設使用 8080
- 若需改 port，修改 deploy.sh 中的 `PORT` 變數，並更新 Nginx 設定
- 部署後可用 `http://<伺服器IP>:8080` 存取
- 部署路徑：`/var/www/linuxtech/`
