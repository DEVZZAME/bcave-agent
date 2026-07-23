'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// 매장 목록
router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  let stores;
  if (q) {
    const like = `%${q}%`;
    stores = db
      .prepare(
        `SELECT s.*,
                (SELECT COUNT(*) FROM roundings r WHERE r.store_id = s.id) AS rounding_count,
                (SELECT MAX(visited_at) FROM roundings r WHERE r.store_id = s.id) AS last_visit
         FROM stores s
         WHERE s.name LIKE ? OR s.code LIKE ? OR s.region LIKE ? OR s.brand LIKE ?
         ORDER BY s.name`
      )
      .all(like, like, like, like);
  } else {
    stores = db
      .prepare(
        `SELECT s.*,
                (SELECT COUNT(*) FROM roundings r WHERE r.store_id = s.id) AS rounding_count,
                (SELECT MAX(visited_at) FROM roundings r WHERE r.store_id = s.id) AS last_visit
         FROM stores s
         ORDER BY s.name`
      )
      .all();
  }
  res.render('stores/list', { title: '매장 관리', stores, q });
});

// 매장 등록 폼
router.get('/new', (req, res) => {
  res.render('stores/form', { title: '매장 등록', store: {}, error: null, mode: 'create' });
});

// 매장 등록 처리
router.post('/', (req, res) => {
  const store = extractStore(req.body);
  const err = validateStore(store);
  if (err) return res.status(400).render('stores/form', { title: '매장 등록', store, error: err, mode: 'create' });

  const dup = db.prepare('SELECT id FROM stores WHERE code = ?').get(store.code);
  if (dup)
    return res
      .status(400)
      .render('stores/form', { title: '매장 등록', store, error: '이미 존재하는 매장 코드입니다.', mode: 'create' });

  db.prepare(
    `INSERT INTO stores (code, name, brand, region, channel, address, manager_name, phone)
     VALUES (@code, @name, @brand, @region, @channel, @address, @manager_name, @phone)`
  ).run(store);
  res.redirect('/stores');
});

// 매장 상세 (라운딩 이력 포함)
router.get('/:id', (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).render('404', { title: '없음' });

  const roundings = db
    .prepare(
      `SELECT r.*, u.name AS user_name
       FROM roundings r JOIN users u ON u.id = r.user_id
       WHERE r.store_id = ?
       ORDER BY r.visited_at DESC`
    )
    .all(store.id);
  res.render('stores/detail', { title: store.name, store, roundings });
});

// 매장 수정 폼
router.get('/:id/edit', (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).render('404', { title: '없음' });
  res.render('stores/form', { title: '매장 수정', store, error: null, mode: 'edit' });
});

// 매장 수정 처리
router.post('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).render('404', { title: '없음' });

  const store = extractStore(req.body);
  store.id = existing.id;
  const err = validateStore(store);
  if (err) return res.status(400).render('stores/form', { title: '매장 수정', store, error: err, mode: 'edit' });

  const dup = db.prepare('SELECT id FROM stores WHERE code = ? AND id != ?').get(store.code, store.id);
  if (dup)
    return res
      .status(400)
      .render('stores/form', { title: '매장 수정', store, error: '이미 존재하는 매장 코드입니다.', mode: 'edit' });

  db.prepare(
    `UPDATE stores SET code=@code, name=@name, brand=@brand, region=@region,
       channel=@channel, address=@address, manager_name=@manager_name, phone=@phone
     WHERE id=@id`
  ).run(store);
  res.redirect('/stores/' + store.id);
});

// 매장 삭제
router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM stores WHERE id = ?').run(req.params.id);
  res.redirect('/stores');
});

function extractStore(body) {
  return {
    code: (body.code || '').trim(),
    name: (body.name || '').trim(),
    brand: (body.brand || '').trim(),
    region: (body.region || '').trim(),
    channel: (body.channel || '').trim(),
    address: (body.address || '').trim(),
    manager_name: (body.manager_name || '').trim(),
    phone: (body.phone || '').trim(),
  };
}

function validateStore(s) {
  if (!s.code) return '매장 코드를 입력해 주세요.';
  if (!s.name) return '매장명을 입력해 주세요.';
  return null;
}

module.exports = router;
