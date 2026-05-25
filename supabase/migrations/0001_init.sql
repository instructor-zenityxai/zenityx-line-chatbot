-- ============================================
-- ZenityX LINE Chatbot — Initial Schema
-- ============================================
-- รัน 1 ครั้งใน Supabase SQL Editor หลังสร้าง project

-- ============== Extensions =====================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- สำหรับ gen_random_uuid()

-- ============== Trigger: auto-update updated_at =====
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============== Table: line_users ==================
CREATE TABLE IF NOT EXISTS line_users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id      text UNIQUE NOT NULL,
  display_name      text,
  picture_url       text,
  language          text DEFAULT 'th',
  current_mode      text NOT NULL DEFAULT 'bot'
                    CHECK (current_mode IN ('bot', 'ai', 'human')),
  mode_changed_at   timestamptz DEFAULT now(),
  first_followed_at timestamptz DEFAULT now(),
  last_active_at    timestamptz DEFAULT now(),
  is_blocked        boolean DEFAULT false,
  metadata          jsonb DEFAULT '{}'::jsonb,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_users_mode ON line_users(current_mode);
CREATE INDEX IF NOT EXISTS idx_line_users_active ON line_users(last_active_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_line_users ON line_users;
CREATE TRIGGER set_updated_at_line_users
BEFORE UPDATE ON line_users
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============== Table: messages ====================
CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id    text NOT NULL REFERENCES line_users(line_user_id) ON DELETE CASCADE,
  direction       text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  source          text NOT NULL CHECK (source IN ('user', 'bot', 'ai', 'admin', 'system')),
  message_type    text NOT NULL CHECK (message_type IN ('text', 'flex', 'postback')),
  content         jsonb NOT NULL,
  line_message_id text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_user_time ON messages(line_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_ai_source ON messages(source) WHERE source = 'ai';

-- ============== Table: leads =======================
CREATE TABLE IF NOT EXISTS leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id  text REFERENCES line_users(line_user_id) ON DELETE SET NULL,
  name          text NOT NULL,
  phone         text NOT NULL,
  email         text,
  interest      text,
  source        text DEFAULT 'line_form',
  status        text DEFAULT 'new'
                CHECK (status IN ('new', 'contacted', 'qualified', 'closed_won', 'closed_lost')),
  notes         text,
  notified_at   timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_line_user ON leads(line_user_id);

DROP TRIGGER IF EXISTS set_updated_at_leads ON leads;
CREATE TRIGGER set_updated_at_leads
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============== Table: events_log ==================
CREATE TABLE IF NOT EXISTS events_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text NOT NULL,
  line_user_id  text,
  payload       jsonb NOT NULL,
  processed     boolean DEFAULT false,
  error         text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_unprocessed
  ON events_log(processed, created_at) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_events_user_time
  ON events_log(line_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events_log(event_type);

-- ============== RLS — DISABLED Phase 1 =============
-- Server access ผ่าน SUPABASE_SERVICE_ROLE_KEY เท่านั้น
-- Phase 2 (admin dashboard) ค่อยเปิด:
-- ALTER TABLE line_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE leads      ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE events_log ENABLE ROW LEVEL SECURITY;
