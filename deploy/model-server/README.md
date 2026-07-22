# BCAVE 모델 서버 — Qwen3-Coder vLLM

사내 자체 호스팅 모델 서버. `Qwen/Qwen3-Coder-30B-A3B-Instruct` (MoE 30B/활성 3.3B)를
vLLM으로 OpenAI 호환 API로 서빙한다.

## 전제 조건

- NVIDIA GPU (VRAM 프로파일에 따라 24 GB / 48 GB / 80 GB)
- Docker + NVIDIA Container Toolkit 설치
- (선택) HuggingFace 계정 및 토큰

## GPU VRAM 프로파일

| 프로파일 | 모델 가중치 | max-model-len | 최소 VRAM | 비고 |
|---------|------------|--------------|----------|------|
| `48gb` (기본) | `Qwen3-Coder-30B-A3B-Instruct-FP8` | 131,072 토큰 | ~40 GB | 추천 |
| `24gb` | `Qwen3-Coder-30B-A3B-Instruct-AWQ` | 65,536 토큰 | ~22 GB | 소형 GPU |
| `80gb` | `Qwen3-Coder-30B-A3B-Instruct` (BF16) | 262,144 토큰 | ~65 GB | 풀 정밀도 |

## 시작하기

```bash
# 1. 환경변수 설정
cp .env.example .env
# MODEL_SERVER_KEY 를 반드시 변경할 것

# 2. 48 GB 프로파일로 서버 기동 (기본)
docker compose --env-file .env up -d

# 24 GB 프로파일로 기동
VRAM_PROFILE=24gb docker compose --env-file .env up -d

# 80 GB 프로파일로 기동
VRAM_PROFILE=80gb docker compose --env-file .env up -d

# 3. 헬스체크
curl http://localhost:8000/health          # → {"status":"ok"}
curl http://localhost:8000/v1/models \
  -H "Authorization: Bearer <MODEL_SERVER_KEY>"

# 4. 로그 확인
docker compose logs -f model-server
```

## 모델 가중치 다운로드 (선택 — 도커가 자동 처리)

docker compose 실행 시 vLLM이 HuggingFace Hub에서 자동 다운로드한다.
미리 받아두려면:

```bash
pip install huggingface_hub
# 48gb
huggingface-cli download Qwen/Qwen3-Coder-30B-A3B-Instruct-FP8
# 24gb
huggingface-cli download Qwen/Qwen3-Coder-30B-A3B-Instruct-AWQ
# 80gb
huggingface-cli download Qwen/Qwen3-Coder-30B-A3B-Instruct
```

## 게이트웨이 연동

서버 기동 후 `bcave-service-hub/.env` 에 추가:

```env
# 기존 OpenAI 업스트림은 유지하면서 vLLM 업스트림 추가
VLLM_UPSTREAM_URL=http://<모델서버IP>:8000/v1
VLLM_UPSTREAM_KEY=<MODEL_SERVER_KEY>
```

그다음 관리자 콘솔에서 `qwen3-coder` 모델을 등록하면 CLI에서 사용 가능.

## 주의사항

- 이 모델은 **non-thinking 전용**. `enable_thinking` 파라미터나 `<think>` 블록 처리 불필요.
- 툴 콜링 파싱: vLLM 서버단의 `--tool-call-parser qwen3_coder` 가 담당.
  CLI/게이트웨이는 OpenAI tools 형식 그대로 유지.
- 모델 가중치는 리포지토리에 포함하지 않는다.
