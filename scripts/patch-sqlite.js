const fs = require('fs');
const path = require('path');

// Fix 1: Replace jcenter() with mavenCentral() in build.gradle
const gradleFilePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-sqlite-storage',
  'platforms',
  'android',
  'build.gradle',
);

try {
  let content = fs.readFileSync(gradleFilePath, 'utf8');

  // Replace jcenter() with mavenCentral()
  content = content.replace(/jcenter\(\)/g, 'mavenCentral()');

  fs.writeFileSync(gradleFilePath, content, 'utf8');
  console.log('✅ Patched react-native-sqlite-storage build.gradle');
} catch (error) {
  console.error('⚠️ Could not patch build.gradle:', error.message);
}

// Fix 2: Fix invalid configuration in package.json
const packageJsonPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-sqlite-storage',
  'package.json',
);

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Remove invalid "dependency.platforms.ios.project" configuration
  if (
    packageJson['react-native'] &&
    packageJson['react-native'].dependency &&
    packageJson['react-native'].dependency.platforms &&
    packageJson['react-native'].dependency.platforms.ios
  ) {
    // Remove the invalid "project" field
    delete packageJson['react-native'].dependency.platforms.ios.project;

    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      'utf8',
    );
    console.log('✅ Patched react-native-sqlite-storage package.json');
  }
} catch (error) {
  console.error('⚠️ Could not patch package.json:', error.message);
}
