const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-ble-manager',
  'android',
  'build.gradle',
);

console.log('🔧 Patching react-native-ble-manager build.gradle...');

try {
  if (!fs.existsSync(filePath)) {
    console.log('⚠️  File not found:', filePath);
    process.exit(0);
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace jcenter() with mavenCentral()
  if (content.includes('jcenter()')) {
    content = content.replace(/jcenter\(\)/g, 'mavenCentral()');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Successfully patched react-native-ble-manager!');
  } else {
    console.log('ℹ️  No jcenter() found, already patched or different version');
  }
} catch (error) {
  console.error('❌ Error patching file:', error.message);
  process.exit(1);
}
