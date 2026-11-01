-- Reels Maker Studio: Gate 1 Relational Schema
-- Enforces: Strict Verse Bounds, Reader References, Idempotency Cache, and Immutability Triggers
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS readers (
  identifier TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS surahs (
  id INTEGER PRIMARY KEY CHECK (id > 0),
  name_arabic TEXT NOT NULL,
  verses_count INTEGER NOT NULL CHECK (verses_count > 0)
);

CREATE TABLE IF NOT EXISTS render_jobs (
  id TEXT PRIMARY KEY,
  reader TEXT NOT NULL REFERENCES readers(identifier) ON DELETE RESTRICT,
  surah_id INTEGER NOT NULL REFERENCES surahs(id) ON DELETE RESTRICT,
  start_verse INTEGER NOT NULL CHECK (start_verse > 0),
  end_verse INTEGER NOT NULL CHECK (end_verse >= start_verse),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  output_file_name TEXT NOT NULL,
  output_full_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'RENDERING', 'COMPLETED', 'FAILED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  dispatched INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  signature_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- BEFORE DELETE Triggers Enforcing Immutability
CREATE TRIGGER IF NOT EXISTS prevent_render_job_delete
BEFORE DELETE ON render_jobs
BEGIN
  SELECT RAISE(ABORT, 'REEL_JOB_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS prevent_audit_delete
BEFORE DELETE ON audit_ledger
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_LEDGER_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS prevent_outbox_delete
BEFORE DELETE ON audit_outbox
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_OUTBOX_IMMUTABLE');
END;
