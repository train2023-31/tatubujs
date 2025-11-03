const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const certPath = path.resolve(__dirname, '..', 'localhost.crt');
const keyPath = path.resolve(__dirname, '..', 'localhost.key');

// Check if certificate files exist
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('❌ SSL certificate files not found!');
  console.error(`Expected files:`);
  console.error(`  - ${certPath}`);
  console.error(`  - ${keyPath}`);
  console.error('');
  console.error('Please generate the certificates first:');
  console.error('');
  console.error('Using OpenSSL (Windows Git Bash, Linux, Mac):');
  console.error('  openssl genrsa -out localhost.key 2048');
  console.error('  openssl req -new -key localhost.key -out localhost.csr -subj "/CN=localhost"');
  console.error('  openssl x509 -req -days 365 -in localhost.csr -signkey localhost.key -out localhost.crt');
  console.error('');
  console.error('Or run the generation script:');
  console.error('  bash scripts/generate-ssl-cert.sh');
  process.exit(1);
}

console.log('✅ SSL certificates found');
console.log(`   Certificate: ${certPath}`);
console.log(`   Key: ${keyPath}`);
console.log('');
console.log('🚀 Starting HTTPS development server with custom certificates...');
console.log('');

// Set environment variables for HTTPS
process.env.HTTPS = 'true';

// Use react-app-rewired to customize webpack config with custom certificates
// The config-overrides.js file will handle the certificate configuration
const startCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const reactScriptsStart = spawn(startCommand, ['run', 'start'], {
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    HTTPS: 'true',
  },
  cwd: path.resolve(__dirname, '..'),
});

reactScriptsStart.on('error', (error) => {
  console.error('❌ Error starting development server:', error);
  console.error('');
  console.error('Make sure react-app-rewired is installed:');
  console.error('  npm install --save-dev react-app-rewired');
  process.exit(1);
});

reactScriptsStart.on('close', (code) => {
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  reactScriptsStart.kill('SIGINT');
});
process.on('SIGTERM', () => {
  reactScriptsStart.kill('SIGTERM');
});
