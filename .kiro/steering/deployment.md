---
inclusion: fileMatch
fileMatchPattern: "deploy*"
---

# Deployment Guide

## Architecture
- Web Server: Nginx
- Deploy directory: `/var/www/linuxtech/`
- Default Port: 8080 (Apache occupies port 80 on host)
- Supported distros: Debian/Ubuntu, RHEL/CentOS/Fedora, Arch

## Deployment Method
```bash
sudo bash deploy.sh
```

## Nginx Config Locations
- Debian-based: `/etc/nginx/sites-available/linuxtech`
- RHEL/Arch-based: `/etc/nginx/conf.d/linuxtech.conf`

## Notes
- If port 80 is occupied by another web server, adjust the PORT variable in deploy.sh
- deploy.sh auto-detects rsync availability; falls back to cp if missing
- Config includes security headers (X-Frame-Options, X-Content-Type-Options)
- Static assets cached for 7 days

## Management Commands
```bash
sudo systemctl status nginx
sudo systemctl restart nginx
sudo journalctl -u nginx -f
```
