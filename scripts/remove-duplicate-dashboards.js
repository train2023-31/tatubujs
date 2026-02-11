const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Dashboard', 'Dashboard.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find the start of duplicate components (// Admin Dashboard Component)
const startMarker = '\n// Admin Dashboard Component\n';
const startIndex = content.indexOf(startMarker);

// Find the export default Dashboard
const endMarker = '\nexport default Dashboard;\n';
const endIndex = content.lastIndexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find markers. startIndex:', startIndex, 'endIndex:', endIndex);
  process.exit(1);
}

// Remove the duplicate components (from startMarker to endMarker, keeping endMarker)
const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

content = before + after;
fs.writeFileSync(filePath, content, 'utf8');
console.log('Removed duplicate dashboard components from Dashboard.js');
