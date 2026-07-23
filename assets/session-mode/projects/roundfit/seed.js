'use strict';

// 샘플 데이터 생성 스크립트:  npm run seed
const bcrypt = require('bcryptjs');
const db = require('./db');
const { checklistCategories } = require('./config');

console.log('샘플 데이터를 생성합니다...');

const tx = db.transaction(() => {
  // 기존 데이터 정리
  db.exec('DELETE FROM rounding_items; DELETE FROM roundings; DELETE FROM stores; DELETE FROM users;');

  // 사용자
  const insUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  const pw = bcrypt.hashSync('test1234', 10);
  const adminId = insUser.run('관리자', 'admin@roundfit.com', pw, 'admin').lastInsertRowid;
  const mgrId = insUser.run('김매니저', 'manager@roundfit.com', pw, 'manager').lastInsertRowid;

  // 매장
  const insStore = db.prepare(
    `INSERT INTO stores (code, name, brand, region, channel, address, manager_name, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const stores = [
    ['ST-001', '강남점', 'RoundFit Women', '서울', '백화점', '서울시 강남구 테헤란로 1', '박점장', '02-111-1111'],
    ['ST-002', '홍대점', 'RoundFit Casual', '서울', '로드샵', '서울시 마포구 양화로 20', '이점장', '02-222-2222'],
    ['ST-003', '판교점', 'RoundFit Women', '경기', '백화점', '경기도 성남시 분당구 판교역로 5', '최점장', '031-333-3333'],
    ['ST-004', '부산센텀점', 'RoundFit Men', '부산', '백화점', '부산시 해운대구 센텀로 10', '정점장', '051-444-4444'],
    ['ST-005', '대구동성로점', 'RoundFit Casual', '대구', '로드샵', '대구시 중구 동성로 30', '한점장', '053-555-5555'],
    ['ST-006', '여주아울렛점', 'RoundFit Outlet', '경기', '아울렛', '경기도 여주시 명품로 200', '오점장', '031-666-6666'],
  ];
  const storeIds = stores.map((s) => insStore.run(...s).lastInsertRowid);

  // 라운딩 (일부 매장)
  const insRound = db.prepare(
    `INSERT INTO roundings (store_id, user_id, visited_at, status, overall_score, summary, action_items)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insItem = db.prepare(
    'INSERT INTO rounding_items (rounding_id, category, score, note) VALUES (?, ?, ?, ?)'
  );

  const samples = [
    { store: 0, user: mgrId, date: '2026-07-10', scores: [5, 4, 4, 5, 3, 4], summary: 'VMD 상태 우수, 신상 진열 잘 되어 있음.', action: 'POP 최신 프로모션으로 교체 필요.' },
    { store: 0, user: adminId, date: '2026-07-20', scores: [4, 5, 4, 4, 4, 5], summary: '전반적으로 안정적인 운영.', action: '피팅룸 조명 점검 요청.' },
    { store: 1, user: mgrId, date: '2026-07-15', scores: [3, 3, 2, 4, 3, 3], summary: '재고 정리 미흡, 창고 혼잡.', action: '재고 실사 및 물류 재배치 필요.' },
    { store: 2, user: mgrId, date: '2026-07-18', scores: [5, 5, 5, 5, 4, 5], summary: '모범 매장. 청결 및 응대 우수.', action: '특이사항 없음.' },
    { store: 3, user: adminId, date: '2026-07-05', scores: [4, 4, 3, 3, 4, 4], summary: '주말 혼잡 대비 인력 보강 권장.', action: '피크타임 응대 매뉴얼 교육.' },
  ];

  for (const s of samples) {
    const avg = Math.round((s.scores.reduce((a, b) => a + b, 0) / s.scores.length) * 10) / 10;
    const rid = insRound.run(storeIds[s.store], s.user, s.date, 'completed', avg, s.summary, s.action).lastInsertRowid;
    checklistCategories.forEach((cat, i) => insItem.run(rid, cat, s.scores[i], ''));
  }
});

tx();

console.log('\n완료! 로그인 계정:');
console.log('  admin@roundfit.com   / test1234  (관리자)');
console.log('  manager@roundfit.com / test1234  (매니저)\n');
