'use strict';

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'threadly.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * 스키마 초기화 (없을 때만 생성)
 */
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL UNIQUE,
      slug  TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      role          TEXT NOT NULL DEFAULT 'member',      -- member | admin
      job_title     TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      content       TEXT NOT NULL,
      summary       TEXT,
      category      TEXT,                                 -- 정책 / 가이드 / FAQ / 프로세스 등
      tags          TEXT,                                 -- comma separated
      department_id INTEGER REFERENCES departments(id),   -- NULL = 전사 공용
      author_id     INTEGER REFERENCES users(id),
      views         INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 온보딩 항목 템플릿 (부서별)
    CREATE TABLE IF NOT EXISTS onboarding_tasks (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER REFERENCES departments(id),   -- NULL = 전사 공통
      title         TEXT NOT NULL,
      description   TEXT,
      category      TEXT,                                 -- 계정/환경, 교육, 문화, 실무 등
      sort_order    INTEGER NOT NULL DEFAULT 0
    );

    -- 사용자별 온보딩 진행 상태
    CREATE TABLE IF NOT EXISTS onboarding_progress (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id     INTEGER NOT NULL REFERENCES onboarding_tasks(id) ON DELETE CASCADE,
      done        INTEGER NOT NULL DEFAULT 0,
      done_at     TEXT,
      UNIQUE(user_id, task_id)
    );

    -- 검색 로그 (분석/추천용)
    CREATE TABLE IF NOT EXISTS search_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      query      TEXT NOT NULL,
      hits       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_documents_dept ON documents(department_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);
}

initSchema();

module.exports = { db, DB_PATH, DATA_DIR };
