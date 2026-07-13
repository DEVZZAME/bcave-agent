#!/bin/bash
set -e

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║        BCave CLI 설치 스크립트         ║"
echo "  ║   OpenAI GPT-4 기반 코딩 에이전트      ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Node.js 확인
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되어 있지 않습니다."
    echo "   https://nodejs.org 에서 Node.js 18 이상을 설치해주세요."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18 이상이 필요합니다. (현재: $(node -v))"
    exit 1
fi

echo "✅ Node.js $(node -v) 확인"

# 설치 경로
INSTALL_DIR="$HOME/.bcave-cli"

# 기존 설치 제거
if [ -d "$INSTALL_DIR" ]; then
    echo "🔄 기존 설치를 업데이트합니다..."
    cd "$INSTALL_DIR" && npm unlink 2>/dev/null || true
    rm -rf "$INSTALL_DIR"
fi

# 클론
echo "📦 BCave CLI를 다운로드합니다..."
git clone --depth 1 https://github.com/DEVZZAME/bcave-code.git "$INSTALL_DIR" 2>/dev/null

# 설치 + 빌드
cd "$INSTALL_DIR"
echo "📦 의존성을 설치합니다..."
npm install --silent 2>/dev/null
echo "🔨 빌드 중..."
npm run build --silent 2>/dev/null
npm link 2>/dev/null

echo ""
echo "✅ BCave CLI 설치 완료!"
echo ""
echo "  사용법:"
echo "    bcave --set-api-key sk-xxxxx    # API 키 설정 (최초 1회)"
echo "    bcave \"파일 정리해줘\"             # 사용 시작"
echo ""
