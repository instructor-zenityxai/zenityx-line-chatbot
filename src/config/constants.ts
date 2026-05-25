export const MODES = {
  BOT: 'bot',
  AI: 'ai',
  HUMAN: 'human',
} as const;

export type UserMode = (typeof MODES)[keyof typeof MODES];

export const POSTBACK_ACTIONS = {
  MODE_BOT: 'mode=bot',
  MODE_AI: 'mode=ai',
  MODE_HUMAN: 'mode=human',
  COURSE_LIST: 'course=list',
  COURSE_DETAIL_PREFIX: 'course=',
  LEAD_FORM_START: 'lead=start',
  LEAD_FORM_SUBMIT: 'lead=submit',
  LEAD_CANCEL: 'lead=cancel',
  LEAD_INTEREST_PREFIX: 'lead_interest=',
} as const;

export const RESET_KEYWORDS = [
  'เมนู',
  'menu',
  '/menu',
  '/start',
  'กลับ',
  'main',
];

export const HUMAN_HANDOFF_KEYWORDS = [
  '#admin',
  'แอดมิน',
  'คุยกับคน',
  'คุยกับแอดมิน',
];

export const AI_HISTORY_LIMIT = 10;

/**
 * Bot จะตอบใน group/room เฉพาะเมื่อข้อความขึ้นต้นด้วย prefix นี้ (case-insensitive)
 * หรือ user @mention bot
 */
export const GROUP_PREFIXES = ['/zen', '/bot', '/zenityx', '@zen'];
