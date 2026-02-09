import { settingsQueries } from './db.js';

export async function findAllSettings() {
  return settingsQueries.findAll.all();
}

export async function findSettingsByCategory(category) {
  return settingsQueries.findByCategory.all(category);
}

export async function findActiveSettingsByCategory(category) {
  return settingsQueries.findActiveByCategory.all(category);
}

export async function findSettingById(id) {
  return settingsQueries.findById.get(id);
}

export async function findSettingByValue(value) {
  return settingsQueries.findByValue.get(value);
}
