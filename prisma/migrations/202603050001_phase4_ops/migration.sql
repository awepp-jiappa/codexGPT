-- Phase 4 operational excellence tables
CREATE TABLE IF NOT EXISTS "usage_events" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER NOT NULL,
  "conversation_id" INTEGER,
  "model" TEXT NOT NULL,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "total_tokens" INTEGER,
  "estimated_cost_usd" REAL,
  "request_id" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "usage_events_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "usage_events_request_id_key" ON "usage_events"("request_id");
CREATE INDEX IF NOT EXISTS "usage_events_user_id_created_at_idx" ON "usage_events"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "usage_events_created_at_idx" ON "usage_events"("created_at");

CREATE TABLE IF NOT EXISTS "daily_usage_rollups" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER NOT NULL,
  "date" TEXT NOT NULL,
  "total_requests" INTEGER NOT NULL DEFAULT 0,
  "total_tokens" INTEGER NOT NULL DEFAULT 0,
  "estimated_cost_usd" REAL NOT NULL DEFAULT 0,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "daily_usage_rollups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_usage_rollups_user_id_date_key" ON "daily_usage_rollups"("user_id", "date");
CREATE INDEX IF NOT EXISTS "daily_usage_rollups_date_idx" ON "daily_usage_rollups"("date");

CREATE TABLE IF NOT EXISTS "system_events" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "level" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "meta_json" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "system_events_level_created_at_idx" ON "system_events"("level", "created_at");
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages"("created_at");
