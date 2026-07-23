'use strict';

const session = require('express-session');
const db = require('./db');

/**
 * node:sqlite 기반의 간단한 express-session Store.
 * 별도 네이티브 의존성 없이 세션을 sessions 테이블에 저장한다.
 */
class SqliteStore extends session.Store {
  constructor() {
    super();
    this._get = db.prepare('SELECT data, expires FROM sessions WHERE sid = ?');
    this._set = db.prepare(
      'INSERT INTO sessions (sid, expires, data) VALUES (?, ?, ?) ' +
        'ON CONFLICT(sid) DO UPDATE SET expires = excluded.expires, data = excluded.data'
    );
    this._del = db.prepare('DELETE FROM sessions WHERE sid = ?');
    this._clearExpired = db.prepare('DELETE FROM sessions WHERE expires < ?');
  }

  _now() {
    return Date.now();
  }

  _expiry(sess) {
    if (sess && sess.cookie && sess.cookie.expires) {
      return new Date(sess.cookie.expires).getTime();
    }
    return this._now() + 1000 * 60 * 60 * 24; // 기본 1일
  }

  get(sid, cb) {
    try {
      const row = this._get.get(sid);
      if (!row) return cb(null, null);
      if (row.expires < this._now()) {
        this._del.run(sid);
        return cb(null, null);
      }
      return cb(null, JSON.parse(row.data));
    } catch (err) {
      return cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      this._set.run(sid, this._expiry(sess), JSON.stringify(sess));
      return cb && cb(null);
    } catch (err) {
      return cb && cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      this._del.run(sid);
      return cb && cb(null);
    } catch (err) {
      return cb && cb(err);
    }
  }

  touch(sid, sess, cb) {
    try {
      this._set.run(sid, this._expiry(sess), JSON.stringify(sess));
      return cb && cb(null);
    } catch (err) {
      return cb && cb(err);
    }
  }
}

module.exports = SqliteStore;
