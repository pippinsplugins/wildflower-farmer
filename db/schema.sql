CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS varieties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT,
  color TEXT,
  days_to_germination INTEGER,
  days_to_transplant INTEGER,
  days_to_bloom INTEGER,
  spacing_inches INTEGER,
  light_requirement TEXT,
  pinch INTEGER DEFAULT 0,
  temperature_notes TEXT,
  light_notes TEXT,
  transplanting_notes TEXT,
  soil_notes TEXT,
  moisture_notes TEXT,
  tray_type_notes TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  zone TEXT,
  sun_exposure TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variety_id INTEGER NOT NULL,
  location_id INTEGER,
  batch_code TEXT UNIQUE NOT NULL,
  quantity INTEGER,
  seed_source TEXT,
  season TEXT,
  year INTEGER,
  status TEXT DEFAULT 'planned',
  planned_seed_date TEXT,
  actual_seed_date TEXT,
  germination_date TEXT,
  transplant_date TEXT,
  first_bud_date TEXT,
  first_bloom_date TEXT,
  harvest_start_date TEXT,
  harvest_end_date TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (variety_id) REFERENCES varieties(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS batch_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  note_date TEXT NOT NULL,
  note_text TEXT NOT NULL,
  category TEXT DEFAULT 'observation',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_batches_variety ON batches(variety_id);
CREATE INDEX IF NOT EXISTS idx_batches_location ON batches(location_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_season_year ON batches(season, year);
CREATE INDEX IF NOT EXISTS idx_batch_notes_batch ON batch_notes(batch_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
