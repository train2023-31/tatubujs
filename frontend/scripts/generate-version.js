const fs = require('fs');
const path = require('path');

// Generate version info
const version = {
  buildTime: new Date().toISOString(),
  buildTimestamp: Date.now(),
  version: process.env.npm_package_version || '1.0.0',
  gitCommit: process.env.GIT_COMMIT || 'unknown',
  environment: process.env.NODE_ENV || 'production'
};

// Create version file
const versionPath = path.join(__dirname, '..', 'src', 'version.js');
const versionContent = `// Auto-generated version file
export const BUILD_INFO = ${JSON.stringify(version, null, 2)};

export const getBuildInfo = () => BUILD_INFO;

export const getVersion = () => BUILD_INFO.version;

export const getBuildTime = () => BUILD_INFO.buildTime;

export const getBuildTimestamp = () => BUILD_INFO.buildTimestamp;
`;

fs.writeFileSync(versionPath, versionContent);

// Also create a JSON version for server-side use
const jsonVersionPath = path.join(__dirname, '..', 'public', 'version.json');
fs.writeFileSync(jsonVersionPath, JSON.stringify(version, null, 2));

console.log('✅ Version file generated:', version);
console.log('📁 Version files created:');
console.log('   - src/version.js');
console.log('   - public/version.json');
