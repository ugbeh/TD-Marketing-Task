-- server/db/add_comments.sql
-- Run this in pgAdmin (Query Tool) to add task comments and activity log tables.
-- Safe to run more than once — uses IF NOT EXISTS.

-- ── Task comments ────────────────────────────────────────────
-- Stores team member comments on individual tasks.
CREATE TABLE IF NOT EXISTS task_comments (
  id         SERIAL PRIMARY KEY,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Task activity log ─────────────────────────────────────────
-- Automatically records who moved or edited a task and when.
-- action examples: 'moved', 'created', 'edited', 'assigned'
CREATE TABLE IF NOT EXISTS task_activity (
  id         SERIAL PRIMARY KEY,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(50) NOT NULL,   -- e.g. 'moved', 'created', 'edited'
  detail     TEXT,                   -- e.g. 'Backlog → In Progress'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookup by task
CREATE INDEX IF NOT EXISTS idx_task_comments_task  ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task  ON task_activity(task_id);
