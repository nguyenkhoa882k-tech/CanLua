import { executeSql } from './database';

// Get settings from database
export async function getSettings() {
  try {
    const result = await executeSql(
      'SELECT value FROM app_settings WHERE key = ?',
      ['app_settings'],
    );
    if (result.rows.length > 0) {
      return JSON.parse(result.rows.item(0).value);
    }
    return {};
  } catch (error) {
    console.error('Error getting settings:', error);
    return {};
  }
}

// Save settings to database
export async function saveSettings(settings) {
  try {
    await executeSql(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      ['app_settings', JSON.stringify(settings)],
    );
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

// Update a specific setting
export async function updateSetting(key, value) {
  const settings = await getSettings();
  settings[key] = value;
  return await saveSettings(settings);
}

// Get a specific setting value
export async function getSetting(key, defaultValue = null) {
  const settings = await getSettings();
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

// Clear all settings
export async function clearSettings() {
  try {
    await executeSql('DELETE FROM app_settings WHERE key = ?', [
      'app_settings',
    ]);
    return true;
  } catch (error) {
    console.error('Error clearing settings:', error);
    return false;
  }
}

// Generic get/set for any key-value pair in app_settings table
export async function getSettingValue(key) {
  try {
    const result = await executeSql(
      'SELECT value FROM app_settings WHERE key = ?',
      [key],
    );
    if (result.rows.length > 0) {
      return JSON.parse(result.rows.item(0).value);
    }
    return null;
  } catch (error) {
    console.error('Error getting setting value:', error);
    return null;
  }
}

export async function setSettingValue(key, value) {
  try {
    await executeSql(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      [key, JSON.stringify(value)],
    );
    return true;
  } catch (error) {
    console.error('Error setting value:', error);
    return false;
  }
}
