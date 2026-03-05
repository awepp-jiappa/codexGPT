# nas-gpt-chat Implementation Plan

## Phase 1 (Completed)
- Core Next.js app with username/password auth.
- Chat UI with SSE streaming and SQLite persistence.
- Conversations create/rename/delete and chat history.
- Docker + base Synology deployment workflow.

## Phase 2 (Completed in this update)

### 1) Authentication & Bootstrap
- First-user bootstrap flow: first account is auto-admin.
- Public signup disabled by default (`ALLOW_PUBLIC_SIGNUP=false`).
- Admin-only user management UI/API:
  - list users
  - create user
  - disable/enable user
- Disabled users are blocked from login and existing sessions are revoked when disabled.

### 2) Session & Security Hardening
- Session cookies hardened (`httpOnly`, `sameSite=lax`, secure in production).
- CSRF protections for auth and sensitive mutation routes.
- Password policy for new accounts:
  - minimum 10 chars
  - weak-password denylist
- SQLite-backed login attempt tracking + lockout:
  - 10 failed attempts in 15 min
  - lockout for 15 min by username+IP.

### 3) Abuse Controls
- `/api/chat` limits:
  - 30 req/min per user
  - max 5 concurrent streaming requests per user
- Message limit 8,000 chars.
- Conversation context truncated to 40,000 chars (oldest dropped).
- OpenAI timeout 120s.

### 4) Streaming Reliability
- SSE proxy-safe headers.
- Standardized SSE protocol (`chunk`, `done`, `error`).
- 15s heartbeat events.
- Client AbortController support with “Stop generating”.
- Regenerate on latest user prompt.
- Partial aborted output stored with `(stopped)` marker.

### 5) UX Improvements
- Automatic conversation title heuristic (first words).
- Sidebar search (title + recent text).
- Basic safe markdown-style rendering for assistant messages.
- Code block copy button.
- Settings panel for model / temperature / system prompt.

### 6) Settings Persistence
- `user_settings` table persisted in SQLite.
- Per-user model, temperature, and system prompt.

### 7) Observability
- Structured JSON logs around chat requests.
- Request id per `/api/chat` call.
- Timing + response length logging.
- `/api/health` endpoint with status/version/db check.

### 8) Deployment Hardening (Synology)
- Docker Compose defaults to persistent `/data` volume for SQLite.
- `.env`-driven runtime configuration.
- Synology reverse proxy SSE timeout guidance documented.
- Optional reverse-proxy Basic Auth recommendation documented.

### 9) Quality Gates
- Added minimal tests for:
  - bootstrap signup logic
  - rate limiting threshold
  - context truncation behavior
- Required checks: lint, typecheck, build.
