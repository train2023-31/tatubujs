const fs = require('fs');
const path = require('path');

// Read version info
const versionPath = path.join(__dirname, '..', 'public', 'version.json');
const version = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

// Update index.html with version meta tags
const buildPath = path.join(__dirname, '..', 'build');
const indexPath = path.join(buildPath, 'index.html');

if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Add version meta tags
  const versionMetaTags = `
    <meta name="build-version" content="${version.version}" />
    <meta name="build-time" content="${version.buildTime}" />
    <meta name="build-timestamp" content="${version.buildTimestamp}" />
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />`;
  
  // Insert after <head> tag
  indexContent = indexContent.replace('<head>', `<head>${versionMetaTags}`);
  
  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ Updated index.html with version meta tags');
}

// Copy version.json to build directory
const buildVersionPath = path.join(buildPath, 'version.json');
fs.copyFileSync(versionPath, buildVersionPath);
console.log('✅ Copied version.json to build directory');

// Create a simple version endpoint file for API calls
const versionEndpoint = `{
  "version": "${version.version}",
  "buildTime": "${version.buildTime}",
  "buildTimestamp": ${version.buildTimestamp},
  "environment": "${version.environment}"
}`;

// Create api directory if it doesn't exist
const apiDir = path.join(buildPath, 'api');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

fs.writeFileSync(path.join(apiDir, 'version'), versionEndpoint);
console.log('✅ Created version API endpoint');

console.log('🎉 Post-build tasks completed successfully!');
console.log(`📦 Build version: ${version.version}`);
console.log(`⏰ Build time: ${version.buildTime}`);
