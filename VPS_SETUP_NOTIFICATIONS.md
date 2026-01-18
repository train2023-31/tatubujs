# VPS Setup Guide for Background Push Notifications

This guide covers setting up background push notifications when your backend is deployed on a VPS server.

## Prerequisites

- Backend running on VPS (using Gunicorn/Nginx)
- HTTPS enabled (required for push notifications)
- SSH access to your VPS
- Python environment on VPS

## Step-by-Step Setup

### Step 1: Generate VAPID Keys

You can generate keys **locally** or **on the VPS**. Choose one:

#### Option A: Generate Locally (Recommended)

1. **On your local machine**, run:
   ```bash
   python generate_vapid_keys.py
   ```

2. **Copy the output** - you'll need:
   - `VAPID_PRIVATE_KEY` (PEM format)
   - `VAPID_PUBLIC_KEY` (base64url format)

#### Option B: Generate on VPS

1. **SSH into your VPS**:
   ```bash
   ssh user@your-vps-ip
   ```

2. **Navigate to your project**:
   ```bash
   cd /path/to/tatubujs
   ```

3. **Generate keys**:
   ```bash
   python generate_vapid_keys.py
   ```

4. **Copy the output** for the next steps

### Step 2: Install pywebpush on VPS

1. **SSH into your VPS**:
   ```bash
   ssh user@your-vps-ip
   ```

2. **Navigate to backend directory**:
   ```bash
   cd /path/to/tatubujs/back
   ```

3. **Activate your virtual environment** (if using one):
   ```bash
   source venv/bin/activate  # or your venv path
   ```

4. **Install pywebpush**:
   ```bash
   pip install pywebpush==1.14.0
   ```

5. **Update requirements.txt** (optional, for future deployments):
   ```bash
   pip freeze > requirements.txt
   ```

### Step 3: Set Environment Variables on VPS

You need to set environment variables where your Flask app runs. The method depends on how you're running the app:

#### Method 1: Using .env file (Recommended for Gunicorn)

1. **Create or edit `.env` file** in your backend directory:
   ```bash
   cd /path/to/tatubujs/back
   nano .env
   ```

2. **Add the VAPID keys**:
   ```bash
   VAPID_PUBLIC_KEY=your-public-key-here
   VAPID_PRIVATE_KEY=your-private-key-here
   VAPID_CLAIM_EMAIL=admin@tatubu.com
   ```

3. **Load .env in your app** (if not already):
   - Make sure `python-dotenv` is installed: `pip install python-dotenv`
   - In `run.py` or `app/__init__.py`, add:
     ```python
     from dotenv import load_dotenv
     load_dotenv()
     ```

#### Method 2: Systemd Service (If using systemd)

1. **Edit your systemd service file**:
   ```bash
   sudo nano /etc/systemd/system/tatubu.service
   ```

2. **Add environment variables** in the `[Service]` section:
   ```ini
   [Service]
   Environment="VAPID_PUBLIC_KEY=your-public-key-here"
   Environment="VAPID_PRIVATE_KEY=your-private-key-here"
   Environment="VAPID_CLAIM_EMAIL=admin@tatubu.com"
   ```

3. **Reload systemd**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart tatubu
   ```

#### Method 3: Gunicorn Command Line

If starting Gunicorn manually, add environment variables:

```bash
export VAPID_PUBLIC_KEY="your-public-key-here"
export VAPID_PRIVATE_KEY="your-private-key-here"
export VAPID_CLAIM_EMAIL="admin@tatubu.com"
gunicorn -w 4 -b 127.0.0.1:5000 run:app
```

#### Method 4: Supervisor (If using Supervisor)

1. **Edit supervisor config**:
   ```bash
   sudo nano /etc/supervisor/conf.d/tatubu.conf
   ```

2. **Add environment variables**:
   ```ini
   [program:tatubu]
   environment=VAPID_PUBLIC_KEY="your-public-key",VAPID_PRIVATE_KEY="your-private-key",VAPID_CLAIM_EMAIL="admin@tatubu.com"
   ```

3. **Reload supervisor**:
   ```bash
   sudo supervisorctl reread
   sudo supervisorctl update
   sudo supervisorctl restart tatubu
   ```

### Step 4: Set Frontend Environment Variable

You need to set `REACT_APP_VAPID_PUBLIC_KEY` in your frontend. The location depends on how you deploy:

#### Option A: Local Development (.env file)

1. **In your frontend directory**, create a `.env` file:
   ```bash
   cd frontend
   nano .env
   ```

2. **Add the VAPID public key**:
   ```bash
   REACT_APP_VAPID_PUBLIC_KEY=your-public-key-here
   ```

3. **Restart your development server**:
   ```bash
   npm start
   ```

#### Option B: Vercel Deployment (Recommended for Production)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project** (tatubujs or your project name)
3. **Go to Settings** → **Environment Variables**
4. **Add new variable**:
   - **Name**: `REACT_APP_VAPID_PUBLIC_KEY`
   - **Value**: `your-public-key-here` (must match backend `VAPID_PUBLIC_KEY`)
   - **Environment**: Select all (Production, Preview, Development)
5. **Save** and **Redeploy** your project

#### Option C: Netlify Deployment

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Select your site**
3. **Go to Site settings** → **Environment variables**
4. **Add variable**:
   - **Key**: `REACT_APP_VAPID_PUBLIC_KEY`
   - **Value**: `your-public-key-here`
5. **Save** and **Trigger a new deploy**

#### Option D: Other Hosting (Static Files)

If deploying static files manually:
1. **Create `.env.production` file** in `frontend/` directory
2. **Add**: `REACT_APP_VAPID_PUBLIC_KEY=your-public-key-here`
3. **Rebuild**: `npm run build`
4. **Deploy** the `build/` folder

**Important Notes**:
- The `REACT_APP_VAPID_PUBLIC_KEY` must **exactly match** the `VAPID_PUBLIC_KEY` from your backend
- After setting the variable, you **must rebuild/redeploy** for changes to take effect
- React environment variables must start with `REACT_APP_` to be accessible in the app

### Step 5: Restart Backend Service

Restart your backend to load the new environment variables:

#### If using systemd:
```bash
sudo systemctl restart tatubu
sudo systemctl status tatubu  # Check if running
```

#### If using Supervisor:
```bash
sudo supervisorctl restart tatubu
```

#### If using Gunicorn directly:
```bash
# Stop current process (Ctrl+C or kill process)
# Then restart with environment variables set
gunicorn -w 4 -b 127.0.0.1:5000 run:app
```

### Step 6: Verify Installation

1. **Check if pywebpush is installed**:
   ```bash
   python -c "import pywebpush; print('pywebpush installed successfully')"
   ```

2. **Check environment variables are loaded**:
   ```bash
   # SSH into VPS and run:
   python -c "import os; print('VAPID_PUBLIC_KEY:', os.environ.get('VAPID_PUBLIC_KEY', 'NOT SET')[:50])"
   ```

3. **Check backend logs** for any errors:
   ```bash
   # If using systemd:
   sudo journalctl -u tatubu -f
   
   # If using supervisor:
   sudo supervisorctl tail -f tatubu
   ```

### Step 7: Test Push Notifications

1. **Open your app** in a browser
2. **Grant notification permissions** when prompted
3. **Go to Notification Settings** and enable push notifications
4. **Create a test notification** (e.g., mark a student absent)
5. **Check if notification appears** (even when app is in background)

## Important VPS Considerations

### 1. HTTPS is Required

Push notifications **require HTTPS** (except localhost). Make sure:
- Your domain has valid SSL certificate
- Nginx is configured for HTTPS
- All API requests use HTTPS

### 2. Firewall Configuration

Ensure these ports are open:
- **443** (HTTPS) - for web traffic
- **80** (HTTP) - should redirect to 443

```bash
# Check firewall status
sudo ufw status

# If needed, allow ports
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
```

### 3. Nginx Configuration

Your Nginx config should proxy Web Push requests correctly. Verify in `/etc/nginx/sites-available/tatubu`:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Important for push notifications
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### 4. Security Best Practices

- **Never commit VAPID keys** to version control
- **Use strong private keys** (generated, not default)
- **Rotate keys periodically** if compromised
- **Monitor logs** for push notification errors

### 5. Monitoring and Debugging

**Check backend logs** for push notification errors:
```bash
# Real-time logs
sudo journalctl -u tatubu -f

# Search for push notification errors
sudo journalctl -u tatubu | grep -i "push\|vapid\|notification"
```

**Common errors to watch for**:
- `VAPID_PRIVATE_KEY not configured` - Environment variable not set
- `pywebpush not installed` - Missing dependency
- `Subscription expired` - Normal, handled automatically
- `WebPushException` - Check VAPID keys match

## Troubleshooting

### Push Notifications Not Sending

1. **Check VAPID keys are set**:
   ```bash
   python -c "from app.config import Config; print('Public:', Config.VAPID_PUBLIC_KEY[:50] if Config.VAPID_PUBLIC_KEY else 'NOT SET')"
   ```

2. **Check pywebpush is installed**:
   ```bash
   pip list | grep pywebpush
   ```

3. **Check backend logs** for errors:
   ```bash
   sudo journalctl -u tatubu -n 100
   ```

4. **Test push notification manually**:
   - Create a notification from backend
   - Check logs for "✅ Push notification sent" messages

### Environment Variables Not Loading

1. **Verify .env file exists and is readable**:
   ```bash
   ls -la /path/to/tatubujs/back/.env
   cat /path/to/tatubujs/back/.env
   ```

2. **Check if python-dotenv is installed**:
   ```bash
   pip list | grep python-dotenv
   ```

3. **Verify load_dotenv() is called** in your app initialization

### Service Won't Start

1. **Check service status**:
   ```bash
   sudo systemctl status tatubu
   ```

2. **Check service logs**:
   ```bash
   sudo journalctl -u tatubu -n 50
   ```

3. **Test app manually**:
   ```bash
   cd /path/to/tatubujs/back
   python run.py
   ```

## Quick Reference

### Environment Variables Needed

```bash
# Backend (VPS)
VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_CLAIM_EMAIL=admin@tatubu.com

# Frontend (Vercel/Netlify/etc)
REACT_APP_VAPID_PUBLIC_KEY=your-public-key-here  # Must match backend
```

### Commands to Remember

```bash
# Generate keys
python generate_vapid_keys.py

# Install pywebpush
pip install pywebpush==1.14.0

# Restart service
sudo systemctl restart tatubu

# Check logs
sudo journalctl -u tatubu -f

# Test import
python -c "import pywebpush; print('OK')"
```

## Next Steps

1. ✅ Generate VAPID keys
2. ✅ Install pywebpush on VPS
3. ✅ Set environment variables
4. ✅ Restart backend service
5. ✅ Set frontend environment variable
6. ✅ Test push notifications
7. ✅ Monitor logs for errors

## Support

If you encounter issues:
1. Check backend logs: `sudo journalctl -u tatubu -f`
2. Verify environment variables are set
3. Ensure HTTPS is working
4. Check browser console for errors
5. Verify service worker is registered
