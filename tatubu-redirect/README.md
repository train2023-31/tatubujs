# tatubu.com redirect page

This folder contains a single index page shown for **tatubu.com** and **www.tatubu.com**.  
All paths (e.g. `/`, `/login`, `/dashboard`) serve this same page: a message and a button that goes to **https://www.tatabu.om**.

## Deployment

1. Copy this folder to your server (e.g. next to the main app: `tatubujs/tatubu-redirect/`).
2. In `nginx.conf`, the server block for `tatubu.com` uses:
   - `root /path/to/tatubujs/tatubu-redirect;` — set this to the real path on the server.
   - SSL cert paths for `tatubu.com` (e.g. Let's Encrypt: `certbot certonly --nginx -d tatubu.com -d www.tatubu.com`).
3. Run `sudo nginx -t` then `sudo systemctl reload nginx`.

After that, every request to `https://tatubu.com/anything` will show this index page.
