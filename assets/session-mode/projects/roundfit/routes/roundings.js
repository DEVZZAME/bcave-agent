'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { checklistCategories } = require('../config');

const router = express.Router();
router.use(requireAuth);

// 라운딩 목록
router.get('/', (req, res) => {
  const roundings = db
    .prepare(
      `SELECT r.*, s.name AS store_name, s.code AS store_code, u.name AS user_name
       FROM roundings r
       JOIN stores s ON s.id = r.store_id
       JOIN users u ON u.id = r.user_id
       ORDER BY r.visited_at DESC, r.id DESC`
    )
    .all();
  res.render('roundings/list', { title: '라운딩 이력', roundings });
});

// 신규 라운딩 폼
router.get('/new', (req, res) => {
  const stores = db.prepare('SELECT id, code, name FROM stores ORDER BY name').all();
  const today = new Date().toISOString().slice(0, 10);
  res.render('roundings/form', {
    title: '라운딩 작성',
    stores,
    categories: checklistCategories,
    selectedStore: req.query.store_id ? Number(req.query.store_id) : null,
    today,
    error: null,
  });
});

// 라운딩 저장
router.post('/', (req, res) => {
  const stores = db.prepare('SELECT id, code, name FROM stores ORDER BY name').all();
  const rerender = (error) =>
    res.status(400).render('roundings/form', {
      title: '라운딩 작성',
      stores,
      categories: checklistCategories,
      selectedStore: Number(req.body.store_id) || null,
      today: req.body.visited_at || new Date().toISOString().slice(0, 10),
      error,
    });

  const storeId = Number(req.body.store_id);
  const visitedAt = (req.body.visited_at || '').trim();
  if (!storeId) return rerender('매장을 선택해 주세요.');
  if (!visitedAt) return rerender('방문일자를 입력해 주세요.');

  const store = db.prepare('SELECT id FROM stores WHERE id = ?').get(storeId);
  if (!store) return rerender('존재하지 않는 매장입니다.');

  // 카테고리별 점수 수집
  const items = checklistCategories.map((cat, i) => {
    let score = parseInt(req.body[`score_${i}`], 10);
    if (isNaN(score) || score < 1 || score > 5) score = 0;
    return { category: cat, score, note: (req.body[`note_${i}`] || '').trim() };
  });

  const rated = items.filter((it) => it.score > 0);
  const overall = rated.length ? rated.reduce((a, b) => a + b.score, 0) / rated.length : 0;

  const status = req.body.status === 'draft' ? 'draft' : 'completed';

  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO roundings (store_id, user_id, visited_at, status, overall_score, summary, action_items)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        storeId,
        req.session.userId,
        visitedAt,
        status,
        Math.round(overall * 10) / 10,
        (req.body.summary || '').trim(),
        (req.body.action_items || '').trim()
      );
    const stmt = db.prepare(
      'INSERT INTO rounding_items (rounding_id, category, score, note) VALUES (?, ?, ?, ?)'
    );
    for (const it of items) stmt.run(info.lastInsertRowid, it.category, it.score, it.note);
    return info.lastInsertRowid;
  });

  const newId = tx();
  res.redirect('/roundings/' + newId);
});

// 라운딩 상세
router.get('/:id', (req, res) => {
  const rounding = db
    .prepare(
      `SELECT r.*, s.name AS store_name, s.code AS store_code, s.region, s.brand,
              u.name AS user_name
       FROM roundings r
       JOIN stores s ON s.id = r.store_id
       JOIN users u ON u.id = r.user_id
       WHERE r.id = ?`
    )
    .get(req.params.id);
  if (!rounding) return res.status(404).render('404', { title: '없음' });

  const items = db
    .prepare('SELECT * FROM rounding_items WHERE rounding_id = ? ORDER BY id')
    .all(rounding.id);
  res.render('roundings/detail', { title: '라운딩 상세', rounding, items });
});

// 라운딩 삭제
router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM roundings WHERE id = ?').run(req.params.id);
  res.redirect('/roundings');
});

module.exports = router;
