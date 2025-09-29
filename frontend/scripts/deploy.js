const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read current package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Bump version
const versionParts = packageJson.version.split('.');
const patch = parseInt(versionParts[2]) + 1;
const newVersion = `${versionParts[0]}.${versionParts[1]}.${patch}`;

console.log(`🚀 Deploying version ${newVersion}...`);

// Update package.json version
packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

console.log(`✅ Version bumped to ${newVersion}`);

// Generate version info
console.log('📝 Generating version info...');
execSync('npm run generate-version', { stdio: 'inherit' });

// Build the application
console.log('🔨 Building application...');
execSync('npm run build', { stdio: 'inherit' });

// Run post-build tasks
console.log('📦 Running post-build tasks...');
execSync('npm run post-build', { stdio: 'inherit' });

console.log('🎉 Deployment build completed successfully!');
console.log(`📦 New version: ${newVersion}`);
console.log('📁 Build files are ready in the build/ directory');
console.log('');
console.log('📋 Next steps:');
console.log('1. Upload build/ contents to your hosting');
console.log('2. Test the application');
console.log('3. Commit and push changes to git');
