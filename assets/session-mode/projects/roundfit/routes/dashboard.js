'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const stats = {
    storeCount: db.prepare('SELECT COUNT(*) c FROM stores').get().c,
    roundingCount: db.prepare('SELECT COUNT(*) c FROM roundings').get().c,
    thisMonth: db
      .prepare(
        `SELECT COUNT(*) c FROM roundings
         WHERE strftime('%Y-%m', visited_at) = strftime('%Y-%m','now','localtime')`
      )
      .get().c,
    avgScore:
      db.prepare(`SELECT ROUND(AVG(overall_score),1) a FROM roundings WHERE status='completed'`).get()
        .a || 0,
  };

  const recent = db
    .prepare(
      `SELECT r.*, s.name AS store_name, u.name AS user_name
       FROM roundings r
       JOIN stores s ON s.id = r.store_id
       JOIN users u ON u.id = r.user_id
       ORDER BY r.visited_at DESC, r.id DESC
       LIMIT 8`
    )
    .all();

  // 미방문(라운딩 이력 없는) 매장
  const neverVisited = db
    .prepare(
      `SELECT s.* FROM stores s
       WHERE NOT EXISTS (SELECT 1 FROM roundings r WHERE r.store_id = s.id)
       ORDER BY s.name LIMIT 6`
    )
    .all();

  // 카테고리별 평균 점수
  const byCategory = db
    .prepare(
      `SELECT category, ROUND(AVG(score),1) avg_score
       FROM rounding_items WHERE score > 0
       GROUP BY category ORDER BY avg_score DESC`
    )
    .all();

  res.render('dashboard', { title: '대시보드', stats, recent, neverVisited, byCategory });
});

module.exports = router;
