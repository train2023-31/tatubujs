const fs = require('fs');
const path = require('path');

module.exports = function override(config, env) {
  // Only apply HTTPS custom certificates in development
  if (env === 'development' && process.env.HTTPS === 'true') {
    const certPath = path.resolve(__dirname, 'localhost.crt');
    const keyPath = path.resolve(__dirname, 'localhost.key');

    // Check if custom certificates exist
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      console.log('🔒 Using custom SSL certificates');
      console.log(`   Certificate: ${certPath}`);
      console.log(`   Key: ${keyPath}`);

      // Configure webpack-dev-server to use custom certificates
      // For Create React App, devServer config might be initialized later
      // So we'll ensure it exists and configure it
      if (!config.devServer) {
        config.devServer = {};
      }
      
      config.devServer.https = {
        key: fs.readFileSync(keyPath, 'utf8'),
        cert: fs.readFileSync(certPath, 'utf8'),
      };
    } else {
      console.log('⚠️  Custom SSL certificates not found, using default HTTPS');
      console.log(`   Expected: ${certPath}`);
      console.log(`   Expected: ${keyPath}`);
      console.log('   Run: openssl genrsa -out localhost.key 2048');
      console.log('        openssl req -new -key localhost.key -out localhost.csr -subj "/CN=localhost"');
      console.log('        openssl x509 -req -days 365 -in localhost.csr -signkey localhost.key -out localhost.crt');
    }
  }

  return config;
};

