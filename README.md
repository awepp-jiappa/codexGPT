# nas-gpt-chat

Self-hosted ChatGPT-style web application optimized for NAS deployment (including Synology Docker).

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
