# RoundFit 🛍️

패션 회사를 위한 **매장 라운딩(점검) 관리 서비스**.
현장 담당자가 매장을 방문(라운딩)하며 VMD·청결·재고·서비스 등을 점검하고, 점수와 코멘트를 기록·관리합니다.

- **로컬 실행 / Docker 불필요**
- **SQLite** 데이터베이스 (`better-sqlite3`)
- 세션 기반 **로그인 · 회원가입**
- Express + EJS 서버 렌더링

## 주요 기능

| 영역 | 기능 |
|------|------|
| 인증 | 회원가입, 로그인, 로그아웃, 세션 유지 (직무: staff/manager/admin) |
| 대시보드 | 매장 수·라운딩 수·이번 달·평균 점수, 최근 라운딩, 카테고리별 평균, 미방문 매장 |
| 매장 관리 | 매장 등록/수정/삭제, 검색(매장명·코드·지역·브랜드), 매장별 라운딩 이력 |
| 라운딩 | 점검표 작성(6개 카테고리 1~5점 + 코멘트), 자동 종합점수, 요약/조치사항, 이력 조회 |

## 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. (선택) 샘플 데이터 생성 — 데모 계정 & 매장/라운딩 포함
npm run seed

# 3. 서버 실행
npm start
```

브라우저에서 **http://localhost:3000** 접속.

### 데모 계정 (seed 실행 시)

| 이메일 | 비밀번호 | 직무 |
|--------|----------|------|
| admin@roundfit.com | test1234 | 관리자 |
| manager@roundfit.com | test1234 | 매니저 |

> 계정이 없다면 회원가입 화면에서 새로 만들면 됩니다.

## 기술 스택

- Node.js + Express 4
- better-sqlite3 (SQLite)
- express-session + connect-sqlite3 (세션 저장)
- bcryptjs (비밀번호 해시)
- EJS 템플릿

## 프로젝트 구조

```
roundfit/
├─ server.js            # 앱 진입점
├─ db.js                # SQLite 연결 & 스키마
├─ config.js            # 설정 / 점검 카테고리
├─ seed.js              # 샘플 데이터
├─ middleware/auth.js   # 인증 가드
├─ routes/              # auth, dashboard, stores, roundings
├─ views/               # EJS 템플릿
├─ public/css/          # 스타일
└─ data/                # SQLite 파일 (자동 생성)
```

데이터베이스 파일은 `data/roundfit.db` 에 자동 생성됩니다.
