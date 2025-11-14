const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { DB_PATH } = require('../constants');

class DatabaseManager {
  constructor() {
    this.ensureDataDir();
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  ensureDataDir() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  initialize() {
    const schema = `
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        command TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        next_retry_at TEXT,
        worker_id TEXT,
        output TEXT,
        error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_state ON jobs(state);
      CREATE INDEX IF NOT EXISTS idx_next_retry ON jobs(next_retry_at);
      CREATE INDEX IF NOT EXISTS idx_worker ON jobs(worker_id);
    `;

    this.db.exec(schema);
  }

  close() {
    this.db.close();
  }
}

module.exports = DatabaseManager;