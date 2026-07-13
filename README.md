<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="node">
  <img src="https://img.shields.io/badge/typescript-strict-blue" alt="typescript">
  <img src="https://img.shields.io/badge/license-internal-red" alt="license">
</p>

<h1 align="center">

```
 ██████╗  ██████╗ █████╗ ██╗   ██╗███████╗   ██████╗ ██████╗ ██████╗ ███████╗
 ██╔══██╗██╔════╝██╔══██╗██║   ██║██╔════╝  ██╔════╝██╔═══██╗██╔══██╗██╔════╝
 ██████╔╝██║     ███████║██║   ██║█████╗    ██║     ██║   ██║██║  ██║█████╗
 ██╔══██╗██║     ██╔══██║╚██╗ ██╔╝██╔══╝    ██║     ██║   ██║██║  ██║██╔══╝
 ██████╔╝╚██████╗██║  ██║ ╚████╔╝ ███████╗  ╚██████╗╚██████╔╝██████╔╝███████╗
 ╚═════╝  ╚═════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝   ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
```

</h1>

<p align="center">
  <strong>AI 코딩 에이전트</strong><br>
  <sub>터미널에서 AI에게 지시하면 파일을 읽고, 쓰고, 명령을 실행합니다.</sub>
</p>

---

## Quick Start

```bash
# 설치 (원라인)
curl -s https://raw.githubusercontent.com/DEVZZAME/bcave-code/master/install.sh | bash

# 터미널 재시작 후 실행
bcave
```

> **API Key 문의: AX팀 강한솔 대리**

---

## Demo

```
──────────────────────────────────────────────────────────────
Safe mode ~/my-project > 이 프로젝트에 테스트를 추가해줘

  ⚡ read_file(path=src/index.ts)
  Allow? [Y/n] y

  const app = express();
  ...
  ─

  ⚡ write_file(path=tests/index.test.ts)
  Allow? [Y/n] y

  File written: tests/index.test.ts
  ─

  테스트 파일을 생성했습니다. `npm test`로 실행할 수 있습니다.

──────────────────────────────────────────────────────────────
Safe mode ~/my-project >
```

---

## Features

| 기능 | 설명 |
|---|---|
| **파일 읽기/쓰기** | 로컬 파일을 읽고, 생성하고, 수정 |
| **명령 실행** | `npm install`, `git commit` 등 쉘 명령 실행 |
| **파일 검색** | glob 패턴, 정규식 검색 |
| **권한 제어** | Safe / Auto / YOLO 3단계 모드 |
| **모델 선택** | 대화 중 `/model`로 모델 전환 |
| **한글 지원** | 한글 입력 완벽 지원 |

---

## Models

`/model` 명령어로 선택하거나 `--model` 플래그로 지정합니다.

| 모델 | 설명 |
|---|---|
| **gpt-5.5** _(기본)_ | Frontier model for complex coding, research, and real-world work |
| **gpt-5.4** | Strong model for everyday coding |
| **gpt-5.4-mini** | Small, fast, and cost-efficient model for simpler coding tasks |
| gpt-4o | Strong multimodal model for complex tasks |
| gpt-4o-mini | Fast and cost-efficient for simple tasks |
| gpt-4.1 | Coding-specialized model with precise code generation |
| gpt-4.1-mini | Lightweight coding-specialized model |
| gpt-4.1-nano | Ultra-fast lightweight model |
| o4-mini | Reasoning model for complex problem solving |

---

## Permission Modes

`Shift+Tab` 또는 `/mode`로 전환합니다.

| 모드 | 설명 | 플래그 |
|---|---|---|
| 🟢 **Safe** | 모든 작업 전 확인 _(기본)_ | — |
| 🟡 **Auto** | 카테고리별 한 번 승인 후 자동 | `--auto-approve` |
| 🔴 **YOLO** | 확인 없이 모두 실행 | `--dangerously-skip-permissions` |

---

## Commands

`/` 입력 시 명령어 선택 화면이 나타납니다.

```
  › /help          도움말 표시
    /api-key       API 키 변경
    /model         모델 선택
    /mode          모드 전환
    /reset         설정 초기화
```

| 단축키 | 동작 |
|---|---|
| `/` | 명령어 선택 |
| `Shift+Tab` | 모드 전환 |
| `Ctrl+C` | 종료 |

---

## CLI Options

```bash
bcave [prompt]                              # 대화형 또는 원샷 모드
bcave --model gpt-5.4 "코드 리뷰해줘"        # 모델 지정
bcave --auto-approve "테스트 추가해줘"        # Auto 모드
bcave --dangerously-skip-permissions         # YOLO 모드
bcave --set-api-key sk-xxxxx                 # API 키 설정
```

---

## Config

`~/.bcave/config.json`

```json
{
  "apiKey": "sk-xxxxx",
  "model": "gpt-5.5",
  "baseUrl": "https://api.openai.com/v1"
}
```

| 필드 | 설명 |
|---|---|
| `apiKey` | OpenAI API 키 |
| `model` | 기본 모델 |
| `baseUrl` | API 엔드포인트 (프록시 서버 사용 시 변경) |

---

<p align="center">
  <sub>UNLICENSED — 사내 전용</sub>
</p>
