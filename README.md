# BCave CLI

OpenAI GPT-4 기반 로컬 코딩 에이전트. 터미널에서 AI와 대화하며 파일을 읽고, 쓰고, 명령을 실행할 수 있습니다.

## 설치

```bash
npm install -g @bcave/cli
```

## 설정

```bash
bcave --set-api-key sk-your-openai-api-key
```

## 사용법

```bash
# 기본 사용 (Safe 모드 — 모든 작업 승인 필요)
bcave "README.md를 한국어로 번역해줘"

# 대화형 모드
bcave

# Auto-approve 모드 (카테고리별 한 번 승인 후 자동)
bcave --auto-approve "src 폴더의 모든 js를 ts로 변환해줘"

# YOLO 모드 (모든 권한 스킵)
bcave --dangerously-skip-permissions "프로젝트 초기 세팅해줘"

# 모델 변경
bcave --model gpt-4o-mini "간단한 질문"
```

## 권한 모드

| 모드 | 플래그 | 동작 |
|---|---|---|
| Safe (기본) | 없음 | 모든 작업 전 확인 |
| Auto-approve | `--auto-approve` | 카테고리별 한 번 승인 후 자동 |
| YOLO | `--dangerously-skip-permissions` | 확인 없이 모두 실행 |

## 설정 파일

`~/.bcave/config.json`에 저장됩니다:

```json
{
  "apiKey": "sk-xxxxx",
  "model": "gpt-4o",
  "baseUrl": "https://api.openai.com/v1"
}
```
