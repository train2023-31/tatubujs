const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const certPath = path.resolve(__dirname, '..', 'localhost.crt');
const keyPath = path.resolve(__dirname, '..', 'localhost.key');

console.log('🔐 Generating SSL certificates for localhost...\n');

// Try to use OpenSSL if available (Windows Git Bash, Linux, Mac)
try {
  console.log('Attempting to use OpenSSL...');
  
  // Generate private key
  execSync('openssl genrsa -out localhost.key 2048', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit'
  });
  
  // Generate certificate signing request
  execSync('openssl req -new -key localhost.key -out localhost.csr -subj "/CN=localhost"', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit'
  });
  
  // Generate self-signed certificate
  execSync('openssl x509 -req -days 365 -in localhost.csr -signkey localhost.key -out localhost.crt', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit'
  });
  
  // Clean up CSR file
  const csrPath = path.resolve(__dirname, '..', 'localhost.csr');
  if (fs.existsSync(csrPath)) {
    fs.unlinkSync(csrPath);
  }
  
  console.log('\n✅ SSL certificates generated successfully using OpenSSL!');
  console.log(`   Certificate: ${certPath}`);
  console.log(`   Key: ${keyPath}\n`);
  
} catch (error) {
  // OpenSSL not available, use Node.js method
  console.log('OpenSSL not found. Using Node.js to generate certificates...\n');
  
  try {
    // Check if selfsigned package is available
    const selfsigned = require('selfsigned');
    
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, {
      keySize: 2048,
      days: 365,
      algorithm: 'sha256',
      extensions: [
        {
          name: 'basicConstraints',
          cA: false,
        },
        {
          name: 'keyUsage',
          keyUsage: ['digitalSignature', 'keyEncipherment'],
        },
        {
          name: 'subjectAltName',
          altNames: [
            {
              type: 2, // DNS
              value: 'localhost',
            },
            {
              type: 2, // DNS
              value: '127.0.0.1',
            },
            {
              type: 7, // IP
              ip: '127.0.0.1',
            },
          ],
        },
      ],
    });
    
    // Write certificate and key files
    fs.writeFileSync(certPath, pems.cert);
    fs.writeFileSync(keyPath, pems.private);
    
    console.log('✅ SSL certificates generated successfully using Node.js!');
    console.log(`   Certificate: ${certPath}`);
    console.log(`   Key: ${keyPath}\n`);
    
  } catch (nodeError) {
    // If selfsigned is not installed, try PowerShell method (Windows only)
    if (process.platform === 'win32') {
      console.log('Attempting to use PowerShell New-SelfSignedCertificate...\n');
      
      try {
        // Generate certificate using PowerShell
        const psScript = `
$cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1" -CertStoreLocation "Cert:\\CurrentUser\\My" -KeyAlgorithm RSA -KeyLength 2048 -NotAfter (Get-Date).AddYears(1) -FriendlyName "Localhost Development Certificate"
$pwd = ConvertTo-SecureString -String "temp" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "${path.resolve(__dirname, '..', 'localhost.pfx').replace(/\\/g, '\\\\')}" -Password $pwd | Out-Null
$certPath = $cert.PSPath
Export-Certificate -Cert $certPath -FilePath "${certPath.replace(/\\/g, '\\\\')}" | Out-Null

# Extract private key from PFX (requires OpenSSL or certificate export)
# For now, we'll just have the cert file
Write-Host "Certificate created: ${certPath}"
Write-Host "Note: Private key export requires additional steps. Please install OpenSSL or use Git Bash."
        `;
        
        execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"')}"`, {
          cwd: path.resolve(__dirname, '..'),
          stdio: 'inherit'
        });
        
        console.log('\n⚠️  Certificate created, but private key export requires OpenSSL.');
        console.log('Please install OpenSSL for Windows or use Git Bash to generate full certificates.');
        console.log('Alternatively, install the selfsigned package: npm install --save-dev selfsigned\n');
        process.exit(1);
        
      } catch (psError) {
        console.error('❌ Failed to generate certificates using PowerShell.\n');
        console.error('Please use one of these methods:');
        console.error('1. Install OpenSSL for Windows: https://slproweb.com/products/Win32OpenSSL.html');
        console.error('2. Use Git Bash (includes OpenSSL)');
        console.error('3. Install selfsigned package: npm install --save-dev selfsigned');
        console.error('   Then run: node scripts/generate-ssl-cert.js\n');
        process.exit(1);
      }
    } else {
      console.error('❌ Failed to generate certificates.\n');
      console.error('Please install OpenSSL or the selfsigned package:');
      console.error('  npm install --save-dev selfsigned');
      console.error('  Then run: node scripts/generate-ssl-cert.js\n');
      process.exit(1);
    }
  }
}

