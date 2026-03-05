# nas-gpt-chat Implementation Plan

## Phase 1 (Completed)
- Core Next.js app with username/password auth.
- Chat UI with SSE streaming and SQLite persistence.
- Conversations create/rename/delete and chat history.
- Docker + base Synology deployment workflow.

## Phase 2 (Completed)
- Authentication/bootstrap hardening, CSRF/session protections, and admin user controls.
- Abuse controls (rate limits, stream concurrency, context/message caps).
- Streaming stability/UX improvements, settings persistence, and base observability.

## Phase 3 (Completed)
- NAS deployment hardening and reverse proxy operational guidance.
- Lightweight UX parity improvements for ongoing chat usage.

## Phase 4 (Completed in this update)

### 1) Usage Tracking / Cost Estimation
- Added `usage_events` + `daily_usage_rollups` tables.
- `/api/chat` now records one usage event per request (tokens nullable when unavailable).
- Added server-side model price map and best-effort USD estimation.
- Added admin usage rollup endpoint with user/date filtering.

### 2) Admin Operations Dashboard
- Expanded `/admin` with operations data:
  - build version
  - DB health
  - in-memory metrics snapshot
  - usage rollups table
  - last 50 error system events
- Added `system_events` table and structured DB logging for startup/config/openai errors.

### 3) Export / Import
- Added conversation export endpoint (`GET /api/conversations/:id/export`) for owner/admin.
- Added import endpoint (`POST /api/conversations/import`) with ownership enforcement and payload sanitization.

### 4) Data Retention / Maintenance
- Added env-based retention controls:
  - `RETENTION_DAYS_MESSAGES` (default 0)
  - `RETENTION_DAYS_USAGE` (default 90)
- Added cleanup job logic + daily best-effort run + admin manual trigger endpoint:
  - `POST /api/admin/maintenance/cleanup`
- Cleanup runs are logged to `system_events` and reflected in metrics.

### 5) Monitoring Endpoints
- Added `GET /health` (version, uptime, db_ok).
- Added admin-only `GET /metrics` with minimal counters.

### 6) Backup / Restore Guidance
- Added operational guidance in README for backup/restore planning.
- Added helper scripts:
  - `scripts/backup.sh`
  - `scripts/restore.sh`

### 7) Quality Gates
- Added minimal tests for:
  - retention cutoff logic
  - export/import sanitization roundtrip behavior
  - usage cost estimation and usage-event payload behavior
