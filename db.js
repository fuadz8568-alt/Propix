const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const PROPERTIES_FILE = path.join(DATA_DIR, 'properties.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  agencyName: 'Propix',
  brokerName: 'Emlakçı',
  brokerPhone: '+994 50 123 45 67',
  brokerWhatsapp: '+994 50 123 45 67',
  brokerEmail: '',
  description: 'Daşınmaz əmlak alqı-satqısı və kirayəsi üzrə peşəkar xidmət'
};

// Ensure data folder and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initFile(filePath, defaultData) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

initFile(PROPERTIES_FILE, []);
initFile(NOTIFICATIONS_FILE, []);
initFile(SETTINGS_FILE, DEFAULT_SETTINGS);

function readJson(file) {
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return [];
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
  }
}

// Properties CRUD
function getProperties() {
  return readJson(PROPERTIES_FILE);
}

function getPropertyById(id) {
  const list = getProperties();
  return list.find(p => p.id === id);
}

function saveProperty(property) {
  const list = getProperties();
  const index = list.findIndex(p => p.id === property.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...property, updatedAt: new Date().toISOString() };
  } else {
    list.unshift({
      ...property,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  writeJson(PROPERTIES_FILE, list);
  return property;
}

function deleteProperty(id) {
  let list = getProperties();
  list = list.filter(p => p.id !== id);
  writeJson(PROPERTIES_FILE, list);
  return true;
}

// Notifications
function getNotifications() {
  return readJson(NOTIFICATIONS_FILE);
}

function addNotification(notification) {
  const list = getNotifications();
  const newNotif = {
    id: 'n_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toISOString(),
    read: false,
    ...notification
  };
  list.unshift(newNotif);
  // Keep max 100 notifications
  if (list.length > 100) list.length = 100;
  writeJson(NOTIFICATIONS_FILE, list);
  return newNotif;
}

function markNotificationsRead() {
  const list = getNotifications();
  list.forEach(n => n.read = true);
  writeJson(NOTIFICATIONS_FILE, list);
  return list;
}

function clearNotifications() {
  writeJson(NOTIFICATIONS_FILE, []);
  return [];
}

// Settings
function getSettings() {
  const data = readJson(SETTINGS_FILE);
  if (!data || Array.isArray(data) || typeof data !== 'object') {
    return DEFAULT_SETTINGS;
  }
  return { ...DEFAULT_SETTINGS, ...data };
}

function saveSettings(newSettings) {
  const current = getSettings();
  const updated = { ...current, ...newSettings };
  writeJson(SETTINGS_FILE, updated);
  return updated;
}

module.exports = {
  getProperties,
  getPropertyById,
  saveProperty,
  deleteProperty,
  getNotifications,
  addNotification,
  markNotificationsRead,
  clearNotifications,
  getSettings,
  saveSettings
};

