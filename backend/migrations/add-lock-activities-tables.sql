-- ┃ LOCK ACTIVITIES TABLE ┃ ──────────────────────────────────────
-- Stores lock activities settings for each user (admin/agent)
CREATE TABLE IF NOT EXISTS lock_activities (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT FALSE,
  lock_password_hash VARCHAR(255), -- hashed lock activities password
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ┃ PASSWORD RESETS TABLE ┃ ─────────────────────────────────────
-- Tracks password reset tokens with expiration
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reset_type VARCHAR(50) NOT NULL DEFAULT 'account', -- 'account' or 'lock_activities'
  token VARCHAR(255) UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ┃ INDEXES ┃ ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lock_activities_user_id ON lock_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);

-- ┃ ADD 'auto_withdrawal_status' COLUMN TO WITHDRAWALS TABLE ┃ ──
-- Track whether a withdrawal was automatic or manual
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS withdrawal_type VARCHAR(50) DEFAULT 'manual'; -- 'manual' or 'auto'

-- ┃ ADD COLUMNS TO WITHDRAWALS FOR CHARGE TRACKING ┃ ──────────
-- Track original balance before withdrawal attempt
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS original_balance DECIMAL(15,2);
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS charge_amount DECIMAL(15,2);
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS net_amount DECIMAL(15,2);
