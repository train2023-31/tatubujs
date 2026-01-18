# Frontend Environment Variables Setup

This guide shows where to set environment variables for the frontend.

## Location: `frontend/.env` file

Create a `.env` file in the `frontend/` directory (same level as `package.json`).

## File Structure

```
tatubujs/
├── frontend/
│   ├── .env              ← Create this file here
│   ├── .env.local        ← Or this for local development
│   ├── package.json
│   ├── src/
│   └── ...
└── back/
```

## Steps to Set Environment Variable

### 1. Create `.env` file in frontend directory

**On Windows:**
```bash
cd frontend
notepad .env
```

**On Mac/Linux:**
```bash
cd frontend
nano .env
```

### 2. Add the VAPID public key

Add this line to the `.env` file:

```bash
REACT_APP_VAPID_PUBLIC_KEY=your-vapid-public-key-here
```

**Important**: Replace `your-vapid-public-key-here` with the actual public key from your backend `VAPID_PUBLIC_KEY`.

### 3. Example `.env` file

```bash
# API URL
REACT_APP_API_URL=https://api.tatubu.com

# VAPID Public Key for Web Push Notifications
# Must match the VAPID_PUBLIC_KEY in your backend
REACT_APP_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw

# App Version (optional)
REACT_APP_VERSION=2.0.1
```

### 4. Restart development server

After creating/updating `.env`:
```bash
# Stop the server (Ctrl+C)
# Then restart
npm start
```

## For Production Deployment

### Vercel

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - **Name**: `REACT_APP_VAPID_PUBLIC_KEY`
   - **Value**: Your VAPID public key
   - **Environment**: All (Production, Preview, Development)
5. **Redeploy** your project

### Netlify

1. Go to https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add:
   - **Key**: `REACT_APP_VAPID_PUBLIC_KEY`
   - **Value**: Your VAPID public key
5. **Trigger a new deploy**

### Other Hosting

If deploying static files:
1. Create `.env.production` in `frontend/` directory
2. Add: `REACT_APP_VAPID_PUBLIC_KEY=your-key-here`
3. Run: `npm run build`
4. Deploy the `build/` folder

## Important Notes

- ✅ `.env` file is already in `.gitignore` (won't be committed)
- ✅ React environment variables must start with `REACT_APP_`
- ✅ Must restart dev server after changing `.env`
- ✅ Must rebuild/redeploy for production changes
- ⚠️ `REACT_APP_VAPID_PUBLIC_KEY` must **exactly match** backend `VAPID_PUBLIC_KEY`

## Verify It's Working

1. Check if variable is loaded:
   ```javascript
   console.log(process.env.REACT_APP_VAPID_PUBLIC_KEY);
   ```

2. Test push notification subscription:
   - Go to Notification Settings
   - Enable push notifications
   - Check browser console for errors

## Troubleshooting

**Variable not loading?**
- Make sure file is named exactly `.env` (not `.env.txt`)
- Make sure variable starts with `REACT_APP_`
- Restart the development server
- Clear browser cache

**Push notifications not working?**
- Verify `REACT_APP_VAPID_PUBLIC_KEY` matches backend `VAPID_PUBLIC_KEY`
- Check browser console for errors
- Ensure HTTPS is enabled (required for push)
