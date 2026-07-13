# BCave CODE

```
 ██████╗  ██████╗ █████╗ ██╗   ██╗███████╗   ██████╗ ██████╗ ██████╗ ███████╗
 ██╔══██╗██╔════╝██╔══██╗██║   ██║██╔════╝  ██╔════╝██╔═══██╗██╔══██╗██╔════╝
 ██████╔╝██║     ███████║██║   ██║█████╗    ██║     ██║   ██║██║  ██║█████╗
 ██╔══██╗██║     ██╔══██║╚██╗ ██╔╝██╔══╝    ██║     ██║   ██║██║  ██║██╔══╝
 ██████╔╝╚██████╗██║  ██║ ╚████╔╝ ███████╗  ╚██████╗╚██████╔╝██████╔╝███████╗
 ╚═════╝  ╚═════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝   ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
```

---

## 설치

### 요구사항

- **Node.js 18 이상** ([다운로드](https://nodejs.org))
- **Git** ([다운로드](https://git-scm.com))

### 원라인 설치

```bash
curl -s https://raw.githubusercontent.com/DEVZZAME/bcave-code/master/install.sh | bash
```

설치 완료 후 **터미널을 새로 열어주세요.**

### 업데이트

```bash
curl -s https://raw.githubusercontent.com/DEVZZAME/bcave-code/master/install.sh | bash
```

---

## 시작하기

### 1. 실행

```bash
bcave
```

### 2. API 키 입력

첫 실행 시 API 키 입력 화면이 나타납니다. 키를 입력하면 바로 사용할 수 있습니다.

> **API Key 문의: AX팀 강한솔 대리**

### 3. 사용

```
> 현재 디렉토리의 파일 구조를 보여줘
> src/index.ts에 에러 핸들링을 추가해줘
> 이 프로젝트에 Jest 테스트를 세팅해줘
```

---

## 사용법

### 대화형 모드

```bash
bcave
```

### 원샷 모드

```bash
bcave "README.md를 한국어로 번역해줘"
```

---

## 모델

기본 모델은 `gpt-5.5`이며, `/model` 명령어 또는 `--model` 플래그로 변경할 수 있습니다.

| 모델 | 설명 |
|---|---|
| **gpt-5.5** (기본) | Frontier model for complex coding, research, and real-world work. |
| gpt-5.4 | Strong model for everyday coding. |
| gpt-5.4-mini | Small, fast, and cost-efficient model for simpler coding tasks. |
| gpt-4o | Strong multimodal model for complex tasks. |
| gpt-4o-mini | Fast and cost-efficient for simple tasks. |
| gpt-4.1 | Coding-specialized model with precise code generation. |
| gpt-4.1-mini | Lightweight coding-specialized model. |
| gpt-4.1-nano | Ultra-fast lightweight model. |
| o4-mini | Reasoning model for complex problem solving. |

---

## 권한 모드

`Shift+Tab` 또는 `/mode`로 전환할 수 있습니다.

| 모드 | 플래그 | 동작 |
|---|---|---|
| **Safe** (기본) | 없음 | 모든 작업 전 확인 |
| **Auto** | `--auto-approve` | 카테고리별 한 번 승인 후 자동 |
| **YOLO** | `--dangerously-skip-permissions` | 확인 없이 모두 실행 |

---

## 명령어

`/` 입력 시 명령어 선택 화면이 나타납니다.

| 명령어 | 설명 |
|---|---|
| `/help` | 도움말 표시 |
| `/api-key` | API 키 변경 |
| `/model` | 모델 선택 |
| `/mode` | 모드 전환 |
| `/reset` | 설정 초기화 |
| `Shift+Tab` | 모드 전환 |
| `Ctrl+C` | 종료 |

---

## CLI 옵션

| 옵션 | 설명 |
|---|---|
| `--set-api-key <key>` | API 키 설정 |
| `--model <model>` | 모델 변경 |
| `--auto-approve` | Auto 모드로 실행 |
| `--dangerously-skip-permissions` | 모든 권한 확인 건너뛰기 |
| `--help` | 도움말 표시 |

---

## 설정 파일

`~/.bcave/config.json`

```json
{
  "apiKey": "sk-xxxxx",
  "model": "gpt-5.5",
  "baseUrl": "https://api.openai.com/v1"
}
```

---

## 라이선스

UNLICENSED — 사내 전용
