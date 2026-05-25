import type { UserMode } from '../config/constants.js';

export interface LineUser {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  language: string;
  current_mode: UserMode;
  mode_changed_at: string;
  first_followed_at: string;
  last_active_at: string;
  is_blocked: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type MessageDirection = 'inbound' | 'outbound';
export type MessageSource = 'user' | 'bot' | 'ai' | 'admin' | 'system';
export type MessageType = 'text' | 'flex' | 'postback';

export interface Message {
  id: string;
  line_user_id: string;
  direction: MessageDirection;
  source: MessageSource;
  message_type: MessageType;
  content: Record<string, unknown>;
  line_message_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'closed_won'
  | 'closed_lost';

export interface Lead {
  id: string;
  line_user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  interest: string | null;
  source: string;
  status: LeadStatus;
  notes: string | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadDraft {
  step: 'name' | 'phone' | 'email' | 'interest' | 'confirm';
  name?: string;
  phone?: string;
  email?: string;
  interest?: string;
}

export interface Course {
  id: string;
  title: string;
  tagline: string;
  shortDescription: string;
  url: string;
  coverImage?: string;
  duration?: string;
  price?: string;
  format?: string;
  location?: string;
  targetAudience?: string[];
  curriculum?: Array<{
    session: string;
    topics: string[];
  }>;
  whatYouGet?: string[];
  prerequisite?: string;
  tags?: string[];
}

export interface CoursesData {
  $schema?: string;
  lastUpdated: string;
  courses: Course[];
  inHouseTraining: {
    title: string;
    tagline: string;
    description: string;
    contact: string;
  };
  company: {
    brand: string;
    tagline: string;
    website: string;
    phone: string;
    email: string;
    address: string;
    social: Record<string, string>;
    instructors: string[];
  };
}
