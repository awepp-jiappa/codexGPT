# nas-gpt-chat (Synology NAS-focused)

Production-friendly self-hosted ChatGPT-style app for NAS environments.

## Highlights (Phase 2)
- First-user bootstrap creates initial admin automatically.
- Public signup disabled by default (`ALLOW_PUBLIC_SIGNUP=false`).
- Admin user management (`/admin`): list/create/disable users.
- Login lockout (10 failures/15 min => 15 min lockout by username+IP).
- Hardened auth cookies + CSRF protection.
- SSE reliability for reverse proxies (heartbeat + proxy-safe headers).
- Chat limits: 30 req/min + max 5 concurrent streams per user.
- Message/context caps (8,000 per message, 40,000 context chars).
- User settings persisted (model, temperature, system prompt).
- `/api/health` endpoint for uptime checks.

---

## 1) First-time setup and bootstrap
1. Start app with empty DB.
2. Visit `/register`.
3. Create first account -> automatically becomes admin.
4. After first user exists, registration is blocked unless `ALLOW_PUBLIC_SIGNUP=true`.

Admin can then create/disable users at `/admin`.

## 2) Environment variables
Copy and edit:

```bash
cp .env.example .env
```

```env
OPENAI_API_KEY=...
APP_URL=https://chat.example.com
AUTH_SECRET=change-me-long-random-secret
ALLOW_PUBLIC_SIGNUP=false
BUILD_VERSION=1.0.0
DATABASE_URL=file:/data/nas-gpt-chat.db
```

## 3) Synology NAS deployment (step-by-step)

### A. Prepare folders on NAS
Create project folder, for example:
- `/volume1/docker/nas-gpt-chat/app`
- `/volume1/docker/nas-gpt-chat/data`

Place repository files in `app` and keep `data` for SQLite persistence.

### B. Deploy with Container Manager (Compose)
Use this repo `docker-compose.yml`.
Key points:
- app runs on port `3000`
- `.env` is loaded automatically
- `./data:/data` volume persists SQLite DB

Run:
```bash
docker compose up -d --build
```

### C. Confirm persistence
Check DB file exists after first run:
- `data/nas-gpt-chat.db`

If container is recreated, chat/auth data should remain.

## 4) Synology reverse proxy configuration (SSE-safe)
DSM -> Control Panel -> Login Portal -> Advanced -> Reverse Proxy:
- Source: `https://chat.yourdomain.com`
- Destination: `http://<NAS-IP>:3000`

Important SSE notes:
- WebSockets are **not required**.
- Increase proxy read timeout to **300s or more**.
- Keep buffering/transformation disabled where possible.

## 5) Security notes (public exposure)
- Keep `OPENAI_API_KEY` server-side only (never in browser code).
- Keep `ALLOW_PUBLIC_SIGNUP=false` for internet-exposed deployments.
- Use long random `AUTH_SECRET`.
- Consider adding reverse-proxy **Basic Auth** as an extra protective layer.
- Prefer HTTPS termination at Synology reverse proxy.

## 6) Admin user management
At `/admin` (admin-only):
- List users
- Create user (username/password)
- Disable/enable non-admin users

Disabled users cannot login; sessions are revoked when disabled.

## 7) Local development
```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

## 8) Quality checks
```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 9) Troubleshooting
- **Cannot register:** likely expected when bootstrap is done and `ALLOW_PUBLIC_SIGNUP=false`.
- **SSE stream stops early behind proxy:** increase reverse proxy read timeout (>=300s).
- **Login blocked:** account lockout may be active after repeated failed attempts.
- **Database resets after restart:** verify `./data:/data` mapping and `DATABASE_URL=file:/data/nas-gpt-chat.db`.
- **401 on API calls from UI:** ensure cookies are preserved and app is accessed via same origin.
