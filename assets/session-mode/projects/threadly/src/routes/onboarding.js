'use strict';

const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

/** 아직 배정 안 된 태스크가 있으면 채워줌 (더미데이터/신규 부서 대비) */
function ensureAssigned(userId, departmentId) {
  const tasks = db
    .prepare(
      `SELECT id FROM onboarding_tasks
        WHERE department_id IS NULL OR department_id = ?`
    )
    .all(departmentId);
  const insert = db.prepare(
    'INSERT OR IGNORE INTO onboarding_progress (user_id, task_id, done) VALUES (?, ?, 0)'
  );
  for (const t of tasks) insert.run(userId, t.id);
}

// 내 온보딩 체크리스트 + 진행률
router.get('/', (req, res) => {
  ensureAssigned(req.user.id, req.user.departmentId);
  const tasks = db
    .prepare(
      `SELECT t.id, t.title, t.description, t.category, t.sort_order,
              (t.department_id IS NULL) AS is_common,
              COALESCE(p.done, 0) AS done, p.done_at
         FROM onboarding_tasks t
         JOIN onboarding_progress p ON p.task_id = t.id AND p.user_id = ?
        WHERE t.department_id IS NULL OR t.department_id = ?
        ORDER BY t.sort_order, t.id`
    )
    .all(req.user.id, req.user.departmentId);

  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  // 카테고리별 그룹
  const groups = {};
  for (const t of tasks) {
    const key = t.category || '기타';
    (groups[key] = groups[key] || []).push(t);
  }

  res.json({ total, done, percent, groups, tasks });
});

// 태스크 완료/미완료 토글
router.post('/toggle', (req, res) => {
  const taskId = Number(req.body && req.body.taskId);
  if (!taskId) return res.status(400).json({ error: 'taskId가 필요합니다.' });

  const row = db
    .prepare('SELECT done FROM onboarding_progress WHERE user_id = ? AND task_id = ?')
    .get(req.user.id, taskId);
  if (!row) return res.status(404).json({ error: '해당 온보딩 항목이 없습니다.' });

  const next = row.done ? 0 : 1;
  db.prepare(
    `UPDATE onboarding_progress
        SET done = ?, done_at = ?
      WHERE user_id = ? AND task_id = ?`
  ).run(next, next ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null, req.user.id, taskId);

  res.json({ ok: true, done: !!next });
});

module.exports = router;
