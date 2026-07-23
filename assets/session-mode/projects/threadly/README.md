# 👗 Threadly

패션회사를 위한 **사내 지식검색 AI + 온보딩** 서비스입니다.
흩어진 사내 문서를 자연어로 검색하고, 부서별 온보딩을 체계적으로 완주할 수 있습니다.

## 특징

- 🔍 **AI 지식검색** — 자연어 질문에 사내 문서를 근거로 답변 (오프라인 동작, `ANTHROPIC_API_KEY` 설정 시 Claude API 연동)
- 📚 **지식베이스** — 전사 공용 + 부서별(IT팀 / 디자인팀 / 마케팅팀) 문서 관리
- ✅ **온보딩** — 신규 입사자를 위한 부서 맞춤 체크리스트와 진행률 추적
- 🔐 **인증** — 회원가입 / 로그인 / 로그아웃 (세션 기반, 비밀번호 scrypt 해시)
- 🗃 **SQLite** — 로컬 파일 DB (`data/threadly.db`), Docker 불필요

## 기술 스택

- Node.js (내장 `node:sqlite`, `node:crypto` 사용 — 네이티브 빌드 불필요)
- Express (유일한 외부 의존성)
- 순수 HTML / CSS / JavaScript (빌드 스텝 없음)

## 실행 방법

```bash
cd threadly
npm install       # express 설치
npm start         # http://localhost:3000
```

최초 실행 시 더미데이터(부서·사용자·문서·온보딩)가 자동으로 주입됩니다.

### 데모 계정

| 이메일 | 비밀번호 | 부서 |
|---|---|---|
| minji.kim@threadly.co | threadly123 | IT팀 (admin) |
| seoyeon.park@threadly.co | threadly123 | 디자인팀 |
| haneul.jung@threadly.co | threadly123 | 마케팅팀 |

또는 `/signup.html` 에서 직접 회원가입할 수 있습니다.

## 스크립트

```bash
npm start          # 서버 실행
npm run dev        # 파일 변경 시 자동 재시작 (--watch)
npm run seed       # 더미데이터 주입 (비어있을 때만)
npm run reset      # 데이터 전체 초기화 후 재주입
```

## Claude API 연동 (선택)

환경변수를 설정하면 지식검색 답변이 Claude API 로 생성됩니다.
미설정 시 내장 오프라인 엔진으로 동작합니다.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export THREADLY_MODEL=claude-opus-4-8   # (선택) 기본값
npm start
```

## 디렉토리 구조

```
threadly/
├── server.js              # Express 서버 진입점
├── src/
│   ├── db.js              # SQLite 스키마 초기화
│   ├── auth.js            # 비밀번호 해시 / 세션 / 인증 미들웨어
│   ├── aiSearch.js        # 지식검색 엔진 (오프라인 + Claude)
│   ├── seed.js            # 더미데이터
│   └── routes/            # auth / knowledge / onboarding API
├── public/                # 프론트엔드 (login, signup, index, css, js)
└── data/                  # SQLite 파일 (자동 생성)
```
