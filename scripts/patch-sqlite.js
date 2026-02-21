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

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace jcenter() with mavenCentral()
  content = content.replace(/jcenter\(\)/g, 'mavenCentral()');

  fs.writeFileSync(filePath, content, 'utf8');
} catch (error) {
  process.exit(1);
}
