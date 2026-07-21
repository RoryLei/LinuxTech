---
inclusion: fileMatch
fileMatchPattern: "deploy*"
---

# 部署指引

## 部署架構
- Web Server：Nginx
- 部署目錄：`/var/www/linuxtech/`
- 預設 Port：8080（因主機 Apache 佔用 80）
- 支援發行版：Debian/Ubuntu、RHEL/CentOS/Fedora、Arch

## 部署方式
```bash
sudo bash deploy.sh
```

## Nginx 設定位置
- Debian 系：`/etc/nginx/sites-available/linuxtech`
- RHEL/Arch 系：`/etc/nginx/conf.d/linuxtech.conf`

## 注意事項
- 若主機已有其他 web server 佔用 port 80，腳本中 PORT 變數需調整
- deploy.sh 會自動偵測 rsync 是否可用，無則 fallback 到 cp
- 設定包含安全標頭（X-Frame-Options、X-Content-Type-Options）
- 靜態資源設定 7 天快取

## 常用管理指令
```bash
sudo systemctl status nginx
sudo systemctl restart nginx
sudo journalctl -u nginx -f
```
