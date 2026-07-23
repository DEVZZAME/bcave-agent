'use strict';

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'roundfit.db');

// data 디렉토리 보장
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

/**
 * 간단한 트랜잭션 헬퍼.
 * fn 을 실행하고 예외가 없으면 커밋, 있으면 롤백한다.
 */
db.transaction = function transaction(fn) {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
};

/**
 * 스키마 초기화 (없을 때만 생성)
 */
function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'staff',   -- staff | manager | admin
      created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS stores (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      code         TEXT    NOT NULL UNIQUE,
      name         TEXT    NOT NULL,
      brand        TEXT,
      region       TEXT,
      channel      TEXT,                                -- 백화점 | 아울렛 | 로드샵 | 대리점
      address      TEXT,
      manager_name TEXT,
      phone        TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS roundings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id      INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      visited_at    TEXT    NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'completed', -- draft | completed
      overall_score REAL    NOT NULL DEFAULT 0,
      summary       TEXT,
      action_items  TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS rounding_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      rounding_id  INTEGER NOT NULL REFERENCES roundings(id) ON DELETE CASCADE,
      category     TEXT    NOT NULL,
      score        INTEGER NOT NULL DEFAULT 0,           -- 1~5
      note         TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid        TEXT PRIMARY KEY,
      expires    INTEGER NOT NULL,
      data       TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_roundings_store ON roundings(store_id);
    CREATE INDEX IF NOT EXISTS idx_roundings_user  ON roundings(user_id);
    CREATE INDEX IF NOT EXISTS idx_items_rounding   ON rounding_items(rounding_id);
  `);
}

init();

module.exports = db;
