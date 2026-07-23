'use strict';

const { db } = require('./db');
const { hashPassword } = require('./auth');

const RESET = process.argv.includes('--reset');

function reset() {
  db.exec(`
    DELETE FROM onboarding_progress;
    DELETE FROM onboarding_tasks;
    DELETE FROM search_logs;
    DELETE FROM documents;
    DELETE FROM sessions;
    DELETE FROM users;
    DELETE FROM departments;
    DELETE FROM sqlite_sequence;
  `);
}

const DEPARTMENTS = [
  { name: 'IT팀', slug: 'it', description: '사내 시스템, 인프라, 정보보안, 개발 지원을 담당합니다.' },
  { name: '디자인팀', slug: 'design', description: '시즌 컬렉션 디자인, 브랜드 비주얼, 룩북 제작을 담당합니다.' },
  { name: '마케팅팀', slug: 'marketing', description: '브랜드 캠페인, 콘텐츠, SNS, 퍼포먼스 마케팅을 담당합니다.' },
];

// 부서 slug → 사용자
function buildUsers(deptId) {
  return [
    { name: '김민지', email: 'minji.kim@threadly.co', pw: 'threadly123', dept: 'it', role: 'admin', job: '플랫폼 엔지니어' },
    { name: '이준호', email: 'junho.lee@threadly.co', pw: 'threadly123', dept: 'it', role: 'member', job: '정보보안 담당' },
    { name: '박서연', email: 'seoyeon.park@threadly.co', pw: 'threadly123', dept: 'design', role: 'member', job: '시니어 디자이너' },
    { name: '최지우', email: 'jiwoo.choi@threadly.co', pw: 'threadly123', dept: 'design', role: 'member', job: '그래픽 디자이너' },
    { name: '정하늘', email: 'haneul.jung@threadly.co', pw: 'threadly123', dept: 'marketing', role: 'member', job: '퍼포먼스 마케터' },
    { name: '한소희', email: 'sohee.han@threadly.co', pw: 'threadly123', dept: 'marketing', role: 'member', job: '콘텐츠 마케터' },
  ].map((u) => ({ ...u, department_id: deptId[u.dept] }));
}

// 지식베이스 문서. department: slug 또는 null(전사 공용)
const DOCUMENTS = [
  // ── 전사 공용 ──────────────────────────────
  {
    title: '신규 입사자 온보딩 가이드 (전사 공통)',
    department: null,
    category: '온보딩',
    tags: '입사,온보딩,계정,근태,복지',
    summary: '입사 첫 주에 반드시 확인해야 할 계정, 근태, 복지 안내입니다.',
    content:
      '환영합니다! Threadly 에 합류하신 것을 진심으로 축하드립니다. 입사 첫날에는 사내 계정(이메일, 메신저, 그룹웨어)을 발급받고 2단계 인증을 설정해야 합니다. ' +
      '근태는 그룹웨어에서 관리하며 출근은 오전 10시, 유연근무제로 오전 8~11시 사이 자율 출근이 가능합니다. 점심시간은 1시간입니다. ' +
      '복지로는 시즌별 자사 의류 구매 지원(직원 할인 40%), 도서구입비 월 5만원, 심리상담 지원이 제공됩니다. 연차는 입사 첫해 15일이 부여됩니다. ' +
      '궁금한 점은 각 팀 온보딩 버디 또는 피플팀에 문의하세요.',
  },
  {
    title: '휴가 및 근태 정책',
    department: null,
    category: '정책',
    tags: '휴가,연차,근태,유연근무,재택',
    summary: '연차, 반차, 재택근무, 유연근무 신청 방법과 규정을 안내합니다.',
    content:
      '연차 휴가는 그룹웨어 > 근태 > 휴가신청 메뉴에서 최소 1일 전에 신청합니다. 반차(오전/오후)와 반반차(2시간) 사용이 가능합니다. ' +
      '재택근무는 주 2회까지 자유롭게 사용할 수 있으며 팀 리더에게 사전 공유만 하면 됩니다. 유연근무제로 코어타임(오전 11시~오후 4시)만 준수하면 됩니다. ' +
      '병가는 3일 이상일 경우 진단서가 필요합니다. 경조사 휴가와 경조금은 취업규칙에 따라 별도 지급됩니다.',
  },
  {
    title: '경비 처리 및 법인카드 사용 가이드',
    department: null,
    category: '프로세스',
    tags: '경비,법인카드,정산,영수증,비용',
    summary: '법인카드 사용 규정과 경비 정산 절차입니다.',
    content:
      '법인카드는 업무 목적에 한해 사용하며 사용 후 3일 이내에 그룹웨어 경비관리에서 영수증을 첨부해 정산합니다. ' +
      '식대는 1인 2만원, 팀 회식은 1인 5만원까지 지원됩니다. 택시비는 야근(오후 10시 이후) 또는 출장 시 인정됩니다. ' +
      '10만원 이상 지출은 팀장 사전 승인이 필요하며, 소프트웨어 구독 결제는 IT팀 승인 후 진행합니다. 개인카드 사용분은 매월 25일 급여와 함께 환급됩니다.',
  },
  {
    title: '사내 메신저 & 그룹웨어 사용법',
    department: null,
    category: '가이드',
    tags: '메신저,그룹웨어,협업,계정',
    summary: '슬랙형 사내 메신저와 그룹웨어 기본 사용법입니다.',
    content:
      '사내 메신저 채널은 #공지, #랜덤, 각 팀 채널(#it, #design, #marketing)로 구성됩니다. 멘션은 꼭 필요할 때만 사용하고, 근무시간 외 멘션은 지양합니다. ' +
      '그룹웨어에서 결재, 근태, 경비, 문서보관을 처리합니다. 회의실 예약은 그룹웨어 > 자원예약에서 가능합니다. ' +
      '중요 문서는 사내 위키에 정리하고, 지식검색(Threadly)에서 언제든 찾을 수 있도록 태그를 달아주세요.',
  },
  {
    title: '정보보안 기본 수칙',
    department: null,
    category: '정책',
    tags: '보안,비밀번호,2FA,피싱,정보보호',
    summary: '전 직원이 지켜야 할 정보보안 기본 수칙입니다.',
    content:
      '모든 계정에 2단계 인증(2FA)을 필수로 설정합니다. 비밀번호는 12자 이상, 3개월마다 변경하며 재사용을 금지합니다. ' +
      '외부 이메일 첨부파일과 링크는 피싱 여부를 확인 후 클릭합니다. 고객/디자인 원본 등 기밀자료는 개인 클라우드에 저장하지 않습니다. ' +
      '노트북은 자리를 비울 때 화면을 잠그고, 분실 시 즉시 IT팀에 신고합니다. 보안 사고 의심 시 #it-security 채널로 즉시 제보하세요.',
  },
  // ── IT팀 ──────────────────────────────
  {
    title: 'IT팀 개발 환경 세팅 가이드',
    department: 'it',
    category: '가이드',
    tags: 'git,개발환경,ci,배포,onboarding',
    summary: 'IT팀 신규 입사자를 위한 개발 환경 및 저장소 접근 가이드입니다.',
    content:
      'IT팀 신규 입사자는 첫날 GitHub 조직 초대를 수락하고 SSH 키를 등록합니다. 사내 표준 스택은 Node.js LTS, PostgreSQL, Redis 이며 로컬은 asdf 로 버전을 관리합니다. ' +
      '코드 저장소는 mono-repo 구조이며 main 브랜치는 보호되어 있어 PR 리뷰 2인 승인 후 머지합니다. CI 는 GitHub Actions, 배포는 스테이징 자동/프로덕션 수동 승인입니다. ' +
      'VPN 접속 후에만 내부 대시보드와 DB 에 접근할 수 있습니다. 장애 대응은 온콜 로테이션으로 운영되며 #it-oncall 에서 확인합니다.',
  },
  {
    title: 'IT팀 서버 장애 대응 프로세스',
    department: 'it',
    category: '프로세스',
    tags: '장애,인시던트,온콜,모니터링,대응',
    summary: '서비스 장애 발생 시 인시던트 대응 절차입니다.',
    content:
      '장애 감지 시 온콜 담당자는 5분 내 #it-oncall 에 인지 알림을 남기고 심각도(P1~P4)를 판단합니다. P1/P2 는 즉시 워룸 채널을 개설하고 인시던트 커맨더를 지정합니다. ' +
      '롤백이 가능한 경우 최우선으로 서비스를 복구하고, 근본 원인 분석은 복구 후 진행합니다. 모니터링은 Grafana/Prometheus, 로그는 사내 ELK 를 사용합니다. ' +
      '장애 종료 후 48시간 내 포스트모템을 작성하여 재발 방지 액션 아이템을 등록합니다.',
  },
  {
    title: 'IT팀 계정/권한 신청 프로세스',
    department: 'it',
    category: '프로세스',
    tags: '권한,계정,접근,IAM,요청',
    summary: '시스템 접근 권한 신청 및 승인 절차입니다.',
    content:
      '시스템 접근 권한은 최소권한 원칙에 따라 부여합니다. 신청자는 그룹웨어 IT서비스데스크에서 필요한 시스템과 사유를 기재해 요청하고 팀장 승인 후 IT팀이 부여합니다. ' +
      '프로덕션 DB 접근은 별도 승인과 감사 로깅이 적용됩니다. 퇴사/부서이동 시 권한은 즉시 회수됩니다. 분기마다 권한 재검토(access review)를 수행합니다.',
  },
  // ── 디자인팀 ──────────────────────────────
  {
    title: '디자인팀 브랜드 가이드라인',
    department: 'design',
    category: '가이드',
    tags: '브랜드,로고,컬러,타이포그래피,비주얼',
    summary: 'Threadly 브랜드 로고, 컬러, 타이포그래피 사용 규칙입니다.',
    content:
      'Threadly 의 메인 컬러는 Ink Black(#141414)과 Signature Coral(#FF6B5D)입니다. 로고는 최소 여백을 확보하고 임의 변형, 회전, 그림자 적용을 금지합니다. ' +
      '기본 서체는 국문 Pretendard, 영문 Inter 를 사용합니다. 시즌 캠페인 비주얼은 브랜드 톤앤매너(미니멀·감각적)를 유지하되 시즌 컬러를 포인트로 활용합니다. ' +
      '모든 브랜드 에셋은 디자인 드라이브의 Brand Kit 폴더에서 최신 버전을 받아 사용하세요.',
  },
  {
    title: '디자인팀 시즌 컬렉션 작업 프로세스',
    department: 'design',
    category: '프로세스',
    tags: '컬렉션,시즌,디자인,샘플,생산,일정',
    summary: 'S/S, F/W 시즌 컬렉션 기획부터 생산까지의 워크플로우입니다.',
    content:
      '시즌 컬렉션은 트렌드 리서치 → 컨셉/무드보드 → 스케치 → 원단·부자재 소싱 → 1차 샘플 → 핏 리뷰 → 수정 → 최종 샘플 → 생산 발주 순으로 진행됩니다. ' +
      'S/S 컬렉션은 전년도 6월, F/W 컬렉션은 전년도 12월에 킥오프합니다. 각 단계 산출물은 디자인 드라이브 시즌 폴더에 버전 관리하며 MD·생산팀과 주간 싱크를 진행합니다. ' +
      '핏 리뷰는 실물 착장 후 코멘트를 정리해 패턴사에게 전달합니다.',
  },
  {
    title: '디자인 파일 네이밍 & 에셋 관리 규칙',
    department: 'design',
    category: '가이드',
    tags: '파일,네이밍,에셋,버전관리,드라이브',
    summary: '디자인 파일 네이밍 규칙과 에셋 아카이빙 방법입니다.',
    content:
      '파일명은 [시즌]_[카테고리]_[아이템]_[버전] 형식을 사용합니다. 예: 25FW_OUTER_트렌치_v03. 작업 중 파일은 _WIP, 최종본은 _FINAL 접미사를 붙입니다. ' +
      '원본(ai, psd)은 디자인 드라이브에만 저장하고 개인 PC 보관을 금지합니다. 납품용 서식은 별도 Export 폴더에 PDF/PNG 로 정리합니다. ' +
      '룩북 촬영 원본은 촬영일자 폴더에 RAW/보정본을 분리 보관합니다.',
  },
  // ── 마케팅팀 ──────────────────────────────
  {
    title: '마케팅팀 SNS 콘텐츠 운영 가이드',
    department: 'marketing',
    category: '가이드',
    tags: 'sns,인스타그램,콘텐츠,캘린더,톤앤매너',
    summary: '인스타그램/틱톡 등 SNS 콘텐츠 기획과 발행 규칙입니다.',
    content:
      '공식 채널은 인스타그램, 틱톡, 유튜브 입니다. 콘텐츠 캘린더는 매월 마지막 주에 다음 달 계획을 확정합니다. 브랜드 톤은 감각적이되 친근하게 유지합니다. ' +
      '발행 전 카피와 비주얼은 팀 리뷰를 거치며, 디자인팀 에셋은 Brand Kit 최신본을 사용합니다. 해시태그는 브랜드 필수 태그 3개 + 캠페인 태그로 구성합니다. ' +
      '댓글/DM 응대는 영업일 기준 24시간 내, 부정 이슈는 즉시 팀장에게 에스컬레이션합니다.',
  },
  {
    title: '마케팅팀 캠페인 기획 & 성과 측정 프로세스',
    department: 'marketing',
    category: '프로세스',
    tags: '캠페인,kpi,성과,예산,퍼포먼스,리포트',
    summary: '캠페인 기획서 작성부터 성과 리포트까지의 절차입니다.',
    content:
      '캠페인은 목표(인지/전환) 설정 → 타깃·메시지 정의 → 채널믹스·예산 배분 → 크리에이티브 제작 → 집행 → 성과 분석 순으로 진행합니다. ' +
      '주요 KPI 는 도달, CTR, ROAS, 전환수이며 GA4 와 광고 매체 리포트를 통합해 주간 대시보드로 관리합니다. 캠페인 종료 후 5일 내 결과 리포트와 러닝을 공유합니다. ' +
      '예산 집행은 캠페인 기획서 승인 후 진행하며 매체별 성과에 따라 주 단위로 예산을 재배분합니다.',
  },
  {
    title: '마케팅팀 협업/인플루언서 진행 가이드',
    department: 'marketing',
    category: '가이드',
    tags: '인플루언서,협업,시딩,계약,콘텐츠',
    summary: '인플루언서 시딩·협찬 및 브랜드 협업 진행 방법입니다.',
    content:
      '인플루언서는 브랜드 적합도(팔로워 성향, 참여율)를 기준으로 선정합니다. 시딩은 제품 협찬, 유료 협업은 계약서와 가이드라인(필수 메시지·해시태그·게시 기간)을 명확히 합니다. ' +
      '콘텐츠는 게시 전 검수하되 크리에이터의 톤을 존중합니다. 협업 성과(도달·저장·전환)를 트래킹해 재협업 여부를 판단합니다. ' +
      '결제와 계약은 법무·재무 검토 후 진행하며 모든 협업 이력은 협업 트래커에 기록합니다.',
  },
];

// 온보딩 태스크. department: slug 또는 null(전사 공통)
const ONBOARDING = [
  // 전사 공통
  { department: null, category: '계정/환경', title: '사내 이메일·메신저 계정 발급 및 2FA 설정', description: 'IT팀에서 계정을 발급받고 2단계 인증을 설정하세요.', order: 1 },
  { department: null, category: '계정/환경', title: '그룹웨어 로그인 및 근태 등록', description: '그룹웨어에 로그인하고 근무시간/유연근무를 확인하세요.', order: 2 },
  { department: null, category: '문화', title: '온보딩 버디 & 팀 소개 미팅', description: '온보딩 버디와 1:1, 팀원 소개 미팅을 진행하세요.', order: 3 },
  { department: null, category: '교육', title: '정보보안 기본 교육 이수', description: '정보보안 기본 수칙 문서를 읽고 보안 교육을 이수하세요.', order: 4 },
  { department: null, category: '복지', title: '복지제도 & 직원 할인 확인', description: '자사 의류 직원 할인, 도서구입비 등 복지제도를 확인하세요.', order: 5 },
  { department: null, category: '문화', title: '회사 비전 & 조직도 파악', description: '회사 소개 자료와 조직도를 확인하세요.', order: 6 },
  // IT팀
  { department: 'it', category: '실무', title: 'GitHub 조직 초대 수락 및 SSH 키 등록', description: '개발 저장소 접근을 위한 계정 세팅을 완료하세요.', order: 10 },
  { department: 'it', category: '실무', title: '로컬 개발 환경 세팅 (Node/DB/Redis)', description: '개발 환경 세팅 가이드에 따라 로컬 환경을 구성하세요.', order: 11 },
  { department: 'it', category: '실무', title: 'VPN 접속 및 내부 대시보드 확인', description: 'VPN 접속 후 모니터링/내부 대시보드 접근을 확인하세요.', order: 12 },
  { department: 'it', category: '교육', title: '온콜/장애 대응 프로세스 숙지', description: '서버 장애 대응 프로세스와 온콜 로테이션을 확인하세요.', order: 13 },
  // 디자인팀
  { department: 'design', category: '실무', title: '디자인 드라이브 & Brand Kit 접근', description: '디자인 드라이브와 브랜드 에셋 폴더 접근 권한을 받으세요.', order: 20 },
  { department: 'design', category: '교육', title: '브랜드 가이드라인 숙지', description: '로고/컬러/타이포그래피 규칙을 확인하세요.', order: 21 },
  { department: 'design', category: '실무', title: '디자인 툴 라이선스 발급 (Adobe/Figma)', description: 'IT팀에 디자인 툴 라이선스를 신청하세요.', order: 22 },
  { department: 'design', category: '실무', title: '시즌 컬렉션 프로세스 & 파일 네이밍 규칙 학습', description: '시즌 워크플로우와 파일/에셋 관리 규칙을 익히세요.', order: 23 },
  // 마케팅팀
  { department: 'marketing', category: '실무', title: 'SNS 채널 관리 도구 접근 권한', description: 'SNS 예약발행/분석 도구 접근 권한을 받으세요.', order: 30 },
  { department: 'marketing', category: '교육', title: 'SNS 콘텐츠 운영 가이드 숙지', description: '채널별 톤앤매너와 발행 규칙을 확인하세요.', order: 31 },
  { department: 'marketing', category: '실무', title: 'GA4 & 광고 매체 계정 접근', description: '성과 측정을 위한 분석/광고 계정 접근을 설정하세요.', order: 32 },
  { department: 'marketing', category: '실무', title: '캠페인 기획 템플릿 & 협업 트래커 확인', description: '캠페인 기획서 양식과 협업 이력 트래커를 확인하세요.', order: 33 },
];

function seed() {
  if (RESET) {
    console.log('🧹 기존 데이터 삭제(reset)...');
    reset();
  }

  const existing = db.prepare('SELECT COUNT(*) AS c FROM departments').get().c;
  if (existing > 0 && !RESET) {
    console.log('ℹ️  이미 데이터가 존재합니다. 다시 넣으려면: npm run reset');
    return;
  }

  // 부서
  const deptId = {};
  const insertDept = db.prepare(
    'INSERT INTO departments (name, slug, description) VALUES (?, ?, ?)'
  );
  for (const d of DEPARTMENTS) {
    const info = insertDept.run(d.name, d.slug, d.description);
    deptId[d.slug] = Number(info.lastInsertRowid);
  }

  // 사용자
  const insertUser = db.prepare(
    `INSERT INTO users (name, email, password_hash, department_id, role, job_title)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const userIds = [];
  for (const u of buildUsers(deptId)) {
    const info = insertUser.run(
      u.name,
      u.email,
      hashPassword(u.pw),
      u.department_id,
      u.role,
      u.job
    );
    userIds.push({ id: Number(info.lastInsertRowid), department_id: u.department_id });
  }
  const firstAuthor = userIds[0].id;

  // 온보딩 태스크
  const insertTask = db.prepare(
    `INSERT INTO onboarding_tasks (department_id, title, description, category, sort_order)
     VALUES (?, ?, ?, ?, ?)`
  );
  for (const t of ONBOARDING) {
    insertTask.run(t.department ? deptId[t.department] : null, t.title, t.description, t.category, t.order);
  }

  // 문서
  const insertDoc = db.prepare(
    `INSERT INTO documents (title, content, summary, category, tags, department_id, author_id, views)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  DOCUMENTS.forEach((d, i) => {
    insertDoc.run(
      d.title,
      d.content,
      d.summary,
      d.category,
      d.tags,
      d.department ? deptId[d.department] : null,
      firstAuthor,
      Math.floor(20 + (Math.abs(Math.sin(i + 1)) * 180)) // 결정적 더미 조회수
    );
  });

  // 각 사용자에게 온보딩 진행 배정 (일부는 진행된 상태로)
  const allTasks = db.prepare('SELECT id, department_id FROM onboarding_tasks').all();
  const insertProg = db.prepare(
    'INSERT OR IGNORE INTO onboarding_progress (user_id, task_id, done, done_at) VALUES (?, ?, ?, ?)'
  );
  for (const u of userIds) {
    const tasks = allTasks.filter((t) => t.department_id === null || t.department_id === u.department_id);
    tasks.forEach((t, idx) => {
      // 데모용: 앞쪽 절반 정도는 완료 처리
      const done = idx < Math.floor(tasks.length / 3) ? 1 : 0;
      insertProg.run(u.id, t.id, done, done ? "2026-07-20 10:00:00" : null);
    });
  }

  // 검색 로그 더미
  const insertLog = db.prepare('INSERT INTO search_logs (user_id, query, hits) VALUES (?, ?, ?)');
  ['연차 어떻게 쓰나요', '법인카드 정산', '브랜드 컬러', '장애 대응 프로세스', 'SNS 발행 규칙', '개발 환경 세팅'].forEach(
    (q, i) => insertLog.run(userIds[i % userIds.length].id, q, 1)
  );

  console.log('✅ 더미데이터 주입 완료');
  console.log(`   부서 ${DEPARTMENTS.length}개, 사용자 ${userIds.length}명, 문서 ${DOCUMENTS.length}개, 온보딩 태스크 ${ONBOARDING.length}개`);
  console.log('   데모 로그인: minji.kim@threadly.co / threadly123');
}

/**
 * 데모(테스트) 계정 보장.
 * - 서버 시작 시 호출. 각 데모 계정이 없으면 생성하고, 있으면 그대로 둠.
 * - 부서가 아직 없으면(빈 DB) 전체 seed() 로 부트스트랩.
 */
function ensureDemoAccounts() {
  const deptCount = db.prepare('SELECT COUNT(*) AS c FROM departments').get().c;
  if (deptCount === 0) {
    // 빈 DB → 부서/문서/온보딩까지 전체 시드하면서 데모 계정도 함께 생성됨
    seed();
    return;
  }

  // slug → department_id
  const deptId = {};
  for (const d of db.prepare('SELECT id, slug FROM departments').all()) {
    deptId[d.slug] = d.id;
  }

  const insertUser = db.prepare(
    `INSERT INTO users (name, email, password_hash, department_id, role, job_title)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertProg = db.prepare(
    'INSERT OR IGNORE INTO onboarding_progress (user_id, task_id, done) VALUES (?, ?, 0)'
  );

  let created = 0;
  for (const u of buildUsers(deptId)) {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
    if (exists) continue; // 이미 있으면 무시

    const info = insertUser.run(
      u.name,
      u.email,
      hashPassword(u.pw),
      u.department_id,
      u.role,
      u.job
    );
    const newId = Number(info.lastInsertRowid);

    // 부서 맞춤 온보딩 배정
    const tasks = db
      .prepare(
        'SELECT id FROM onboarding_tasks WHERE department_id IS NULL OR department_id = ?'
      )
      .all(u.department_id);
    for (const t of tasks) insertProg.run(newId, t.id);
    created++;
  }

  if (created > 0) {
    console.log(`👤 데모 계정 ${created}개를 생성했습니다.`);
  } else {
    console.log('👤 데모 계정이 이미 존재합니다. (생성 생략)');
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed, ensureDemoAccounts };
