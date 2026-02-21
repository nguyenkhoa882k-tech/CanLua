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

try {
  if (!fs.existsSync(filePath)) {
    process.exit(0);
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace jcenter() with mavenCentral()
  if (content.includes('jcenter()')) {
    content = content.replace(/jcenter\(\)/g, 'mavenCentral()');
    fs.writeFileSync(filePath, content, 'utf8');
  } else {
  }
} catch (error) {
  process.exit(1);
}
