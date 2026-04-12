-- ┃ COMPLETE DATABASE SCHEMA ┃ ─────────────────────────────────────────
-- Full schema for low-cost-data project with all 14 tables
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ┃ USERS TABLE ┃ ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'agent',
  username VARCHAR(100),
  phone VARCHAR(50),
  whatsapp_number VARCHAR(50),
  whatsapp_group_link TEXT,
  store_slug VARCHAR(100) UNIQUE,
  store_name VARCHAR(150),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at TIMESTAMP WITH TIME ZONE,
  terms_notif_seen_at TIMESTAMP WITH TIME ZONE,
  withdrawal_notif_seen_at TIMESTAMP WITH TIME ZONE,
  package_notif_seen_at TIMESTAMP WITH TIME ZONE,
  link_notif_seen_at TIMESTAMP WITH TIME ZONE,
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspended_by_inactivity BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ┃ WALLETS TABLE ┃ ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ┃ TRANSACTIONS TABLE ┃ ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  balance_after NUMERIC(15,2) NOT NULL,
  description TEXT,
  reference VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ┃ DATA PACKAGES TABLE ┃ ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_packages (
  id SERIAL PRIMARY KEY,
  network VARCHAR(100) NOT NULL,
  description TEXT,
  base_cost NUMERIC(15,2) NOT NULL,
  base_price NUMERIC(15,2) NOT NULL,
  api_code VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ┃ AGENT PRICES TABLE ┃ ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_prices (
  id SERIAL PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id INTEGER NOT NULL REFERENCES data_packages(id) ON DELETE CASCADE,
  selling_price NUMERIC(15,2) NOT NULL,
  markup_percentage NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, package_id)
);

-- ┃ ORDERS TABLE ┃ ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  reference VARCHAR(255) NOT NULL UNIQUE,
  customer_phone VARCHAR(50),
  customer_name VARCHAR(150),
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  package_id INTEGER REFERENCES data_packages(id) ON DELETE SET NULL,
  amount_paid NUMERIC(15,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  xraygh_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ┃ WITHDRAWALS TABLE ┃ ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  net_amount NUMERIC(15,2),
  charge_amount NUMERIC(15,2),
  original_balance NUMERIC(15,2),
  withdrawal_type VARCHAR(50) NOT NULL DEFAULT 'manual',
  account_number VARCHAR(100),
  bank_name VARCHAR(100),
  account_name VARCHAR(150),
  reference VARCHAR(255) UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ┃ MANUAL WITHDRAWALS TABLE ┃ ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manual_withdrawals (
  id SERIAL PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_email VARCHAR(255),
  amount NUMERIC(15,2) NOT NULL,
  net_amount NUMERIC(15,2),
  charge_amount NUMERIC(15,2),
  account_name VARCHAR(150),
  momo_number VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  type VARCHAR(50) NOT NULL DEFAULT 'manual',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ┃ ADMIN SETTINGS TABLE ┃ ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ┃ ALERTS TABLE ┃ ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  type VARCHAR(100),
  message TEXT,
  severity VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ┃ EMAIL CHANGE REQUESTS TABLE ┃ ────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_change_requests (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_email VARCHAR(255) NOT NULL,
  verification_code VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ┃ PASSWORD RESETS TABLE ┃ ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reset_type VARCHAR(50) NOT NULL DEFAULT 'account',
  token VARCHAR(255) UNIQUE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ┃ LOCK ACTIVITIES TABLE ┃ ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lock_activities (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  lock_password_hash VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ┃ AUDIT LOGS TABLE ┃ ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255),
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  ip_address VARCHAR(45),
  status VARCHAR(50) NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ┃ INDEXES ┃ ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_store_slug ON users(store_slug);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_prices_agent_id ON agent_prices(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_prices_package_id ON agent_prices(package_id);
CREATE INDEX IF NOT EXISTS idx_orders_reference ON orders(reference);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_agent_id ON withdrawals(agent_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);
CREATE INDEX IF NOT EXISTS idx_manual_withdrawals_agent_id ON manual_withdrawals(agent_id);
CREATE INDEX IF NOT EXISTS idx_manual_withdrawals_status ON manual_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_lock_activities_user_id ON lock_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ┃ ADMIN USER INSERTION ┃ ──────────────────────────────────────────────
INSERT INTO users (
  id,
  email,
  username,
  password_hash,
  phone,
  whatsapp_number,
  role,
  is_active,
  terms_accepted,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'nak@gmail.com',
  'Nakoja',
  '$2a$12$SARJ6lyKiTSxC7V7rQAX0eupdn/lGFjaaPWsiLCBTbNR.6NGBqdaa',
  '0549722133',
  '233549722133',
  'admin',
  TRUE,
  FALSE,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- ┃ ADMIN USER WALLET INSERTION ┃ ────────────────────────────────────────
INSERT INTO wallets (user_id)
SELECT '00000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = '00000000-0000-0000-0000-000000000001');