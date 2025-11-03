const fs = require('fs');
const path = require('path');

// Remove source maps for production
const removeSourceMaps = (buildPath) => {
  const staticPath = path.join(buildPath, 'static');
  
  if (fs.existsSync(staticPath)) {
    // Remove .map files
    const removeMapFiles = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          removeMapFiles(filePath);
        } else if (file.endsWith('.map')) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Removed source map: ${filePath}`);
        }
      });
    };
    
    removeMapFiles(staticPath);
  }
};

// Add security headers to index.html
const addSecurityHeaders = (buildPath) => {
  const indexPath = path.join(buildPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Add security meta tags
    const securityMetaTags = `
    <meta http-equiv="X-Content-Type-Options" content="nosniff" />
    <meta http-equiv="X-Frame-Options" content="DENY" />
    <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
    <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.tatubu.com https://*.tatubu.com https://sultan00095.pythonanywhere.com https://*.pythonanywhere.com https://*.hostinger.com https://*.000webhostapp.com http://localhost:5000 http://localhost:3000" />
    <meta name="robots" content="noindex, nofollow" />`;
    
    // Insert after <head> tag
    content = content.replace('<head>', `<head>${securityMetaTags}`);
    
    fs.writeFileSync(indexPath, content);
    console.log('✅ Added security headers to index.html');
  }
};

// Obfuscate sensitive strings
const obfuscateStrings = (buildPath) => {
  const staticPath = path.join(buildPath, 'static', 'js');
  
  if (fs.existsSync(staticPath)) {
    const files = fs.readdirSync(staticPath);
    
    files.forEach(file => {
      if (file.endsWith('.js') && !file.endsWith('.map')) {
        const filePath = path.join(staticPath, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace common API patterns
        content = content.replace(/localhost:5000/g, 'api.example.com');
        content = content.replace(/http:\/\/localhost/g, 'https://api');
        
        fs.writeFileSync(filePath, content);
        console.log(`🔒 Obfuscated sensitive strings in: ${file}`);
      }
    });
  }
};

// Main function
const secureBuild = () => {
  const buildPath = path.join(__dirname, '..', 'build');
  
  if (!fs.existsSync(buildPath)) {
    console.error('❌ Build directory not found. Run npm run build first.');
    return;
  }
  
  console.log('🔒 Securing build for production...');
  
  removeSourceMaps(buildPath);
  addSecurityHeaders(buildPath);
  obfuscateStrings(buildPath);
  
  console.log('✅ Build secured successfully!');
  console.log('📋 Security measures applied:');
  console.log('   - Source maps removed');
  console.log('   - Security headers added');
  console.log('   - Sensitive strings obfuscated');
};

secureBuild();
