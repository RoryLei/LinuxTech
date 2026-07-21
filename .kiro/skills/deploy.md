# Skill: Deploy Website

## Description
Deploy or update the LinuxTech static website to the Linux server (Nginx).

## Trigger
User requests deploying or updating the website.

## Steps

1. **Check deploy.sh** — Confirm `deploy.sh` exists and has valid syntax
   ```bash
   bash -n deploy.sh
   ```

2. **Check port availability** — Verify target port (default 8080) is not occupied
   ```bash
   sudo ss -tlnp | grep ':8080'
   ```

3. **Run deployment**
   ```bash
   sudo bash deploy.sh
   ```

4. **Verify deployment** — Confirm Nginx is running and site is accessible
   ```bash
   sudo systemctl is-active nginx
   curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/
   ```

## Notes
- Apache occupies port 80 on this host; Nginx uses port 8080
- To change port, modify the `PORT` variable in deploy.sh and update Nginx config
- After deployment, access via `http://<server-ip>:8080`
- Deploy directory: `/var/www/linuxtech/`
