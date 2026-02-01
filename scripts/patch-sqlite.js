const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-sqlite-storage',
  'platforms',
  'android',
  'build.gradle',
);

console.log('🔧 Patching react-native-sqlite-storage build.gradle...');

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace jcenter() with mavenCentral()
  content = content.replace(/jcenter\(\)/g, 'mavenCentral()');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully patched react-native-sqlite-storage!');
} catch (error) {
  console.error('❌ Failed to patch:', error.message);
  process.exit(1);
}
