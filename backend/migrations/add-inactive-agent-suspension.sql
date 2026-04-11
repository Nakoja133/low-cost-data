-- ┃ SUSPEND INACTIVE AGENTS ┃ ─────────────────────────────────
-- Adds suspension metadata for agents who have been inactive.
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by_inactivity BOOLEAN DEFAULT FALSE;
