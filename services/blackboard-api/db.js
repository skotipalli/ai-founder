const Database = require('better-sqlite3');

const DB_PATH = process.env.BLACKBOARD_DB || 'blackboard.db';

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// SQLite port of ../../blackboard/schema.sql (dev's Postgres proposal) --
// same shape (agents / wm_log / read_cursors / claims), adapted for a
// single-file DB so devops doesn't need to stand up a separate Postgres
// server on the VM. Created on startup, same pattern as
// services/waitlist/server.py's init_db(). Uses better-sqlite3 (not the
// built-in node:sqlite) so this runs on the VM's Node 20 -- node:sqlite
// needs Node 22.5+.
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
      name          TEXT PRIMARY KEY,
      role          TEXT NOT NULL,
      cwd           TEXT,
      status        TEXT NOT NULL DEFAULT 'active',
      registered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS wm_log (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      agent        TEXT NOT NULL REFERENCES agents(name),
      kind         TEXT NOT NULL CHECK (kind IN ('obs','claim','done','ask','reply','warn')),
      body         TEXT NOT NULL,
      addressed_to TEXT REFERENCES agents(name),
      reply_to     INTEGER REFERENCES wm_log(id),
      claim_key    TEXT,
      created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS wm_log_agent_idx ON wm_log (agent, id);
  CREATE INDEX IF NOT EXISTS wm_log_addressed_idx ON wm_log (addressed_to, id) WHERE addressed_to IS NOT NULL;

  CREATE TABLE IF NOT EXISTS read_cursors (
      reader       TEXT PRIMARY KEY REFERENCES agents(name),
      last_seen_id INTEGER NOT NULL DEFAULT 0,
      updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS claims (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_key   TEXT NOT NULL,
      agent       TEXT NOT NULL REFERENCES agents(name),
      wm_log_id   INTEGER NOT NULL REFERENCES wm_log(id),
      claimed_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      released_at TEXT
  );

  -- Same race-free claim semantics as the Postgres version: only one active
  -- (released_at IS NULL) row per claim_key can exist.
  CREATE UNIQUE INDEX IF NOT EXISTS one_active_claim_per_key
      ON claims (claim_key) WHERE released_at IS NULL;
`);

module.exports = { db };
