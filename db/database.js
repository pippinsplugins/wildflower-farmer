const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'wildflower.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Migrations for existing databases
const varietyMigrationColumns = [
  'temperature_notes TEXT',
  'light_notes TEXT',
  'transplanting_notes TEXT',
  'soil_notes TEXT',
  'moisture_notes TEXT',
  'tray_type_notes TEXT'
];
for (const col of varietyMigrationColumns) {
  try {
    db.exec(`ALTER TABLE varieties ADD COLUMN ${col}`);
  } catch (e) {
    // Column already exists
  }
}

module.exports = db;
