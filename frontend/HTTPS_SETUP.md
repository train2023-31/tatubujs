# HTTPS Development Server Setup

This project supports HTTPS for local development with custom SSL certificates, similar to Next.js.

## Quick Start

1. **Generate SSL certificates** (if not already generated):
   ```bash
   # Easiest method - uses Node.js (works on Windows, Linux, Mac)
   npm run generate-ssl
   ```
   
   Or manually using OpenSSL (if installed):
   ```bash
   # Using OpenSSL (Windows Git Bash, Linux, Mac)
   openssl genrsa -out localhost.key 2048
   openssl req -new -key localhost.key -out localhost.csr -subj "/CN=localhost"
   openssl x509 -req -days 365 -in localhost.csr -signkey localhost.key -out localhost.crt
   ```
   
   Or use the provided Bash script (if Git Bash is available):
   ```bash
   bash scripts/generate-ssl-cert.sh
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Start the HTTPS development server**:
   ```bash
   npm run dev
   # or
   npm run start:https
   ```

4. **Access your app**:
   - Open `https://localhost:3000` in your browser
   - You may need to accept the self-signed certificate warning

## How It Works

- Uses `react-app-rewired` to customize webpack configuration without ejecting
- The `config-overrides.js` file configures webpack-dev-server to use custom SSL certificates
- Certificate files (`localhost.crt` and `localhost.key`) are placed in the `frontend` directory
- The `dev-server-https.js` script checks for certificates and starts the server with HTTPS enabled

## Trusting the Certificate (Optional)

To avoid browser warnings about self-signed certificates:

### Windows
1. Double-click `localhost.crt`
2. Click "Install Certificate"
3. Select "Local Machine" → "Place all certificates in the following store" → Browse → "Trusted Root Certification Authorities"
4. Click Next → Finish → Yes

### macOS
1. Double-click `localhost.crt`
2. Open Keychain Access
3. Find the certificate and open it
4. Expand "Trust" and set "When using this certificate" to "Always Trust"

### Linux (Chrome/Chromium)
1. Install the certificate:
   ```bash
   sudo cp localhost.crt /usr/local/share/ca-certificates/localhost.crt
   sudo update-ca-certificates
   ```

## Scripts

- `npm run dev` or `npm run start:https` - Start HTTPS dev server with custom certificates
- `npm run start` - Start regular HTTP dev server (now uses react-app-rewired)
- `npm run build` - Build for production (uses react-app-rewired)

## Troubleshooting

### "SSL certificate files not found"
- Make sure `localhost.crt` and `localhost.key` exist in the `frontend` directory
- Generate them using the commands above

### "react-app-rewired not found"
- Run `npm install` to install dependencies
- Make sure `react-app-rewired` is in `devDependencies`

### Browser shows "Not Secure" warning
- This is normal for self-signed certificates
- Click "Advanced" → "Proceed to localhost" (or trust the certificate as shown above)

### Port already in use
- Change the port by setting `PORT` environment variable:
  ```bash
  PORT=3001 npm run dev
  ```

