# nas-gpt-chat

Self-hosted ChatGPT-style web application optimized for NAS deployment (including Synology Docker).

## Quickstart
- 로컬 실행: [Local development](#local-development)
- Docker 실행: [Docker](#docker)
- NAS 배포: [Synology Docker deployment](#synology-docker-deployment)

## 구현 단계 (로드맵)

🔹 **1단계 — Core MVP (필수 구현 단계)**

- 설명: 실제로 동작하는 최소 ChatGPT 클론 수준입니다. 개인 NAS에서 바로 사용할 수 있습니다.
- 핵심 기능:
  - 아이디/비밀번호 로그인
  - ChatGPT 스타일 UI (사이드바 + 채팅)
  - SQLite 기반 대화 저장
  - 서버에서만 OpenAI 호출
  - SSE 스트리밍 응답
  - Docker 실행 가능
- NAS 운영 관점: 회사에서도 바로 사용 가능하며 대부분 사용자에게 충분합니다.

🔹 **2단계 — Production 안정화 (필수에 가까움)**

- 설명: 외부 노출 환경에서도 안전하게 운영 가능한 수준입니다.
- 핵심 기능:
  - 최초 관리자 계정 bootstrap
  - 기본 회원가입 차단 (`ALLOW_PUBLIC_SIGNUP`)
  - 관리자 계정 관리 기능
  - rate limit 및 요청 제한
  - SSE reverse proxy 안정화
  - 세션 보안 강화
  - health 체크 엔드포인트
- NAS 운영 관점: 외부 접속 허용 시 반드시 권장됩니다.

🔹 **3단계 — UX 완성 단계 (강력 추천)**

- 설명: 실제 ChatGPT와 거의 유사한 사용자 경험을 제공합니다.
- 핵심 기능:
  - regenerate 버튼
  - stop generating 기능
  - 자동 대화 제목 생성
  - 사이드바 검색
  - Markdown 렌더링
  - 코드 복사 기능
  - 설정 패널 (모델/온도 등)
- NAS 운영 관점: 일상적으로 가장 편한 사용 환경입니다.

🔹 **4단계 — 운영 고도화 (선택)**

- 설명: 운영 편의성과 관측성을 높이는 단계입니다.
- 핵심 기능:
  - 토큰 사용량 기록
  - 비용 추정
  - 백업/복원 가이드
  - DB 유지보수
  - 로그 확장
- NAS 운영 관점: 여러 사용자 운영 시 유용합니다.

🔹 **5단계 — 고급 확장 (선택)**

- 설명: 서비스 수준 확장 기능입니다.
- 핵심 기능:
  - 팀 계정 및 권한관리
  - 대화 공유
  - PWA 지원
  - 다중 모델 지원 (Claude/Ollama 등)
- NAS 운영 관점: 개인 NAS에서는 선택사항입니다.

### 권장 진행 순서

대부분 Synology NAS 사용자에게는 다음 순서를 권장합니다:

1단계 → 2단계 → 3단계

4~5단계는 필요할 때만 구현하면 충분합니다.

## Features
- ChatGPT-style interface with sidebar conversations, new chat, rename, delete.
- Username/password auth (register, login, logout).
- bcrypt password hashing + session-based auth with secure httpOnly cookies.
- SQLite + Prisma persistence for users, conversations, messages.
- Streaming chat responses over SSE (`POST /api/chat`).
- OpenAI API called **server-side only**.
- Rate limit: 30 chat requests/minute/user.

## Tech stack
- Next.js 14 (App Router)
- TypeScript
- Prisma + SQLite
- Tailwind CSS

## Environment variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set values:

```env
OPENAI_API_KEY=
APP_URL=http://localhost:3000
AUTH_SECRET=
DATABASE_URL=file:./prisma/dev.db
```

## Local development
```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

Open http://localhost:3000

## Quality checks
```bash
npm run lint
npm run typecheck
npm run build
```

## Docker
Build and run:

```bash
docker build -t nas-gpt-chat .
docker run --name nas-gpt-chat -p 3000:3000 --env-file .env nas-gpt-chat
```

Or docker-compose:

```bash
docker compose up -d --build
```

## Synology Docker deployment
1. Copy project to NAS (or pull from Git).
2. In Synology Container Manager, create project from `docker-compose.yml`.
3. Configure `.env` values in project environment.
4. Expose container port `3000`.
5. Mount a volume for SQLite persistence (already in compose as `./data:/app/prisma`).

## Synology Reverse Proxy example
DSM > Control Panel > Login Portal > Advanced > Reverse Proxy:
- Source protocol: HTTPS
- Source hostname: `chat.yourdomain.com`
- Source port: `443`
- Destination protocol: HTTP
- Destination hostname: NAS local IP (or localhost)
- Destination port: `3000`

## Verify browser never calls api.openai.com
1. Open app in browser.
2. Open Developer Tools > Network.
3. Send a prompt.
4. Confirm requests are only to your NAS host (e.g. `/api/chat`) and **not** to `api.openai.com`.

Server logs + code confirm OpenAI is called exclusively in backend route `app/api/chat/route.ts`.
