'use strict';

const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const { answerQuery } = require('../aiSearch');

const router = express.Router();
router.use(requireAuth);

// AI 지식검색 (질의 → 답변 + 근거 문서)
router.post('/search', async (req, res) => {
  const query = (req.body && req.body.query ? String(req.body.query) : '').trim();
  if (!query) return res.status(400).json({ error: '검색어를 입력해 주세요.' });
  const result = await answerQuery(query, req.user);
  res.json(result);
});

// 문서 목록 (부서/카테고리/키워드 필터)
router.get('/documents', (req, res) => {
  const { department, category, q } = req.query;
  const where = [];
  const params = [];
  if (department) {
    where.push('(d.department_id = ? )');
    params.push(Number(department));
  }
  if (category) {
    where.push('d.category = ?');
    params.push(String(category));
  }
  if (q) {
    where.push('(d.title LIKE ? OR d.content LIKE ? OR d.tags LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  const sql = `
    SELECT d.id, d.title, d.summary, d.category, d.tags, d.views, d.updated_at,
           dep.name AS department_name, u.name AS author_name
      FROM documents d
      LEFT JOIN departments dep ON dep.id = d.department_id
      LEFT JOIN users u ON u.id = d.author_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY d.updated_at DESC`;
  const rows = db.prepare(sql).all(...params);
  res.json({ documents: rows });
});

// 문서 상세 (조회수 증가)
router.get('/documents/:id', (req, res) => {
  const id = Number(req.params.id);
  const doc = db
    .prepare(
      `SELECT d.*, dep.name AS department_name, u.name AS author_name
         FROM documents d
         LEFT JOIN departments dep ON dep.id = d.department_id
         LEFT JOIN users u ON u.id = d.author_id
        WHERE d.id = ?`
    )
    .get(id);
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  db.prepare('UPDATE documents SET views = views + 1 WHERE id = ?').run(id);
  doc.views += 1;
  res.json({ document: doc });
});

// 문서 등록
router.post('/documents', (req, res) => {
  const { title, content, summary, category, tags, departmentId } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용은 필수입니다.' });
  }
  const info = db
    .prepare(
      `INSERT INTO documents (title, content, summary, category, tags, department_id, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title,
      content,
      summary || content.slice(0, 120),
      category || '일반',
      tags || '',
      departmentId ? Number(departmentId) : req.user.departmentId,
      req.user.id
    );
  res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) });
});

// 인기/추천 문서 (대시보드용)
router.get('/popular', (req, res) => {
  const rows = db
    .prepare(
      `SELECT d.id, d.title, d.category, d.views, dep.name AS department_name
         FROM documents d
         LEFT JOIN departments dep ON dep.id = d.department_id
        ORDER BY d.views DESC, d.updated_at DESC
        LIMIT 6`
    )
    .all();
  res.json({ documents: rows });
});

// 부서/카테고리 통계 (대시보드)
router.get('/stats', (req, res) => {
  const docCount = db.prepare('SELECT COUNT(*) AS c FROM documents').get().c;
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const byDept = db
    .prepare(
      `SELECT dep.name AS department, COUNT(d.id) AS count
         FROM departments dep
         LEFT JOIN documents d ON d.department_id = dep.id
        GROUP BY dep.id ORDER BY dep.id`
    )
    .all();
  const recentSearches = db
    .prepare(
      `SELECT query, created_at FROM search_logs
        ORDER BY id DESC LIMIT 8`
    )
    .all();
  res.json({ docCount, userCount, byDept, recentSearches });
});

module.exports = router;
