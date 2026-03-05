# nas-gpt-chat Implementation Plan

## 1. Architecture
- **Framework:** Next.js App Router with TypeScript.
- **Rendering model:** Server-side auth gate for chat page, client-side interactive chat shell.
- **Backend API:** Next.js route handlers under `/api/*`.
- **Persistence:** SQLite accessed through Prisma ORM.
- **Session auth:** Username/password with bcrypt hashing and signed httpOnly cookie session IDs.
- **LLM integration:** OpenAI API called **only from `/api/chat` route**.
- **Streaming:** Server-Sent Events (SSE) from `/api/chat` to the browser.

## 2. Database Schema
- `users`: id, username, password_hash, created_at
- `sessions`: id, user_id, expires_at, created_at (for session-based auth)
- `conversations`: id, user_id, title, created_at, updated_at
- `messages`: id, conversation_id, role, content, created_at

## 3. API Design
- `POST /api/auth/register` - create user, hash password, create session
- `POST /api/auth/login` - verify credentials, create session
- `POST /api/auth/logout` - invalidate session + clear cookie
- `GET /api/conversations` - list conversations/messages for user
- `POST /api/conversations` - create conversation
- `PATCH /api/conversations/:id/rename` - rename conversation
- `DELETE /api/conversations/:id` - delete conversation
- `POST /api/chat` - validate user, enforce rate limit, save user message, stream assistant response, save assistant message

## 4. UI Structure
- `/login` and `/register` auth forms.
- `/chat` main application:
  - Left sidebar with conversation list
  - New Chat button
  - Rename/Delete actions
  - Main message history panel
  - Bottom composer with Enter send + Shift+Enter newline
  - Streaming token-by-token assistant output

## 5. Security Controls
- httpOnly signed session cookies
- bcrypt password hashing
- server-side auth checks for protected pages/routes
- per-user in-memory rate limit (30 requests/min)
- validated input payloads via Zod
- request body size constrained by Next.js + schema max lengths
- no OpenAI key exposure to frontend code

## 6. Deployment
- Dockerfile for production container
- docker-compose.yml exposing port 3000
- Synology deployment and reverse proxy instructions in README
