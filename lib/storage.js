const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MONTHLY_KM_FILE = path.join(DATA_DIR, 'monthly-km.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(MONTHLY_KM_FILE)) {
    fs.writeFileSync(MONTHLY_KM_FILE, '{}\n', 'utf8');
  }

  if (!fs.existsSync(TRANSACTIONS_FILE)) {
    fs.writeFileSync(TRANSACTIONS_FILE, '[]\n', 'utf8');
  }
}

function readJsonFile(filePath, fallbackValue) {
  ensureDataFiles();

  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) {
      return fallbackValue;
    }

    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallbackValue;
    }

    throw new Error(`Datei konnte nicht gelesen werden: ${path.basename(filePath)}`);
  }
}

function writeJsonFile(filePath, value) {
  ensureDataFiles();
  const serialized = JSON.stringify(value, null, 2);
  fs.writeFileSync(filePath, `${serialized}\n`, 'utf8');
}

function readMonthlyKilometers() {
  const value = readJsonFile(MONTHLY_KM_FILE, {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function writeMonthlyKilometers(value) {
  writeJsonFile(MONTHLY_KM_FILE, value);
}

function readTransactions() {
  const value = readJsonFile(TRANSACTIONS_FILE, []);
  return Array.isArray(value) ? value : [];
}

function writeTransactions(value) {
  writeJsonFile(TRANSACTIONS_FILE, value);
}

module.exports = {
  DATA_DIR,
  MONTHLY_KM_FILE,
  TRANSACTIONS_FILE,
  ensureDataFiles,
  readMonthlyKilometers,
  writeMonthlyKilometers,
  readTransactions,
  writeTransactions
};
