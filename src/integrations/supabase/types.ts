// Hand-rolled types ที่ตรงกับ supabase/migrations/0001_init.sql
// ถ้าอยาก auto-gen ใช้: npx supabase gen types typescript --linked > types.ts

export type UserModeValue = 'bot' | 'ai' | 'human';
export type LeadStatusValue =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'closed_won'
  | 'closed_lost';

interface LineUsersRow {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  language: string;
  current_mode: UserModeValue;
  mode_changed_at: string;
  first_followed_at: string;
  last_active_at: string;
  is_blocked: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface LineUsersInsert {
  line_user_id: string;
  display_name?: string | null;
  picture_url?: string | null;
  language?: string;
  current_mode?: UserModeValue;
  metadata?: Record<string, unknown>;
}

interface LineUsersUpdate {
  display_name?: string | null;
  picture_url?: string | null;
  language?: string;
  current_mode?: UserModeValue;
  mode_changed_at?: string;
  last_active_at?: string;
  is_blocked?: boolean;
  metadata?: Record<string, unknown>;
}

interface MessagesRow {
  id: string;
  line_user_id: string;
  direction: 'inbound' | 'outbound';
  source: 'user' | 'bot' | 'ai' | 'admin' | 'system';
  message_type: 'text' | 'flex' | 'postback';
  content: Record<string, unknown>;
  line_message_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface MessagesInsert {
  line_user_id: string;
  direction: 'inbound' | 'outbound';
  source: 'user' | 'bot' | 'ai' | 'admin' | 'system';
  message_type: 'text' | 'flex' | 'postback';
  content: Record<string, unknown>;
  line_message_id?: string | null;
  metadata?: Record<string, unknown>;
}

interface LeadsRow {
  id: string;
  line_user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  interest: string | null;
  source: string;
  status: LeadStatusValue;
  notes: string | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadsInsert {
  line_user_id?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  interest?: string | null;
  source?: string;
  status?: LeadStatusValue;
  notes?: string | null;
}

interface LeadsUpdate {
  name?: string;
  phone?: string;
  email?: string | null;
  interest?: string | null;
  source?: string;
  status?: LeadStatusValue;
  notes?: string | null;
  notified_at?: string | null;
}

interface EventsLogRow {
  id: string;
  event_type: string;
  line_user_id: string | null;
  payload: Record<string, unknown>;
  processed: boolean;
  error: string | null;
  created_at: string;
}

interface EventsLogInsert {
  event_type: string;
  line_user_id?: string | null;
  payload: Record<string, unknown>;
  processed?: boolean;
  error?: string | null;
}

export interface Database {
  public: {
    Tables: {
      line_users: {
        Row: LineUsersRow;
        Insert: LineUsersInsert;
        Update: LineUsersUpdate;
        Relationships: [];
      };
      messages: {
        Row: MessagesRow;
        Insert: MessagesInsert;
        Update: Partial<MessagesInsert>;
        Relationships: [];
      };
      leads: {
        Row: LeadsRow;
        Insert: LeadsInsert;
        Update: LeadsUpdate;
        Relationships: [];
      };
      events_log: {
        Row: EventsLogRow;
        Insert: EventsLogInsert;
        Update: Partial<EventsLogInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
